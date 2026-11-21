/* =========================================================================
   5  THE LOOP

   Sets the scene up, runs the race, draws the HUD, and wires every button.
   Physics runs on a clamped delta rather than a fixed accumulator: the model
   is stable enough not to need one, and a tab left in the background then
   resumes rather than fast-forwarding through a corner.
   ========================================================================= */

var carObjs = [];
var showcase = null;             // the car turning slowly behind the menus
var showcaseAngle = 0;
var camPos = new T.Vector3(0, 6, -12);
var camLook = new T.Vector3();
var lastFrame = 0;
var bannerTimer = 0;

/* ------------------------------------------------------------------ boot -- */

function init(){
  loadSave();
  initScene();
  wire();
  enterShowcase();

  if(isTouch()) show('touch');
  ['padL|left', 'padR|right', 'padG|go', 'padB|brake', 'padH|hand'].forEach(function(p){
    var bits = p.split('|');
    bindPad(bits[0], bits[1]);
  });

  var load = $('loading');
  if(load) load.style.display = 'none';
  updateMenu();
  requestAnimationFrame(frame);
}

/* ------------------------------------------------------------- showcase -- */

/* The menus sit in front of the car you are about to spend money on, which
   makes paint and wheels worth choosing and the garage feel like a place. */
function enterShowcase(){
  G.mode = 'menu';
  G.track = null;
  clearCars();
  if(trackGroup){ scene.remove(trackGroup); disposeTree(trackGroup); trackGroup = null; }

  showcase = new T.Group();

  var pad = new T.Mesh(
    new T.CircleGeometry(9, 48),
    new T.MeshLambertMaterial({ color: 0x14171f })
  );
  pad.rotation.x = -Math.PI / 2;
  showcase.add(pad);

  var ring = new T.Mesh(
    new T.RingGeometry(8.6, 9, 48),
    new T.MeshBasicMaterial({ color: 0xff3b30, side: T.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.01;
  showcase.add(ring);

  scene.add(showcase);
  refreshCarPreview();
  hide('hud');
}

function refreshCarPreview(){
  if(!showcase) return;
  if(showcase.userData.car){
    showcase.remove(showcase.userData.car);
    disposeTree(showcase.userData.car);
  }
  var car = buildCar(SAVE.car, looksFor(SAVE.car), statsOf(SAVE.car).lift);
  showcase.add(car);
  showcase.userData.car = car;
  updateMenu();
}

function updateMenu(){
  var el = $('vCredits');
  if(el) el.textContent = money(SAVE.credits);
  var note = $('menuNote');
  if(note){
    var r = rating(statsOf(SAVE.car));
    note.innerHTML = 'In the garage: <b>' + CARS[SAVE.car].name + '</b>, rating ' +
      r + ' (class ' + classOf(r) + ').';
  }
}

/* ------------------------------------------------------------- the race -- */

function clearCars(){
  for(var i = 0; i < carObjs.length; i++){
    scene.remove(carObjs[i]);
    disposeTree(carObjs[i]);
  }
  carObjs = [];
  G.cars = [];
  G.you = null;
}

/* The field you are up against. Their cars are picked to sit just under the
   event's class limit and their skill is spread, so the race has a front and
   a back rather than four identical machines in a line. */
function buildField(ev){
  var out = [];
  var names = ['Vega', 'Ruiz', 'Kowalski', 'Osei', 'Lindqvist', 'Tanaka', 'Mbeki'];
  var yourRating = rating(statsOf(SAVE.car));

  for(var i = 0; i < ev.field; i++){
    /* Pick the quickest car that still fits the class, then add parts until
       it is in the same neighbourhood as the player's. */
    var pick = 'hatch';
    for(var c = 0; c < CAR_ORDER.length; c++){
      if(rating(carStats(CAR_ORDER[c], {})) <= Math.min(ev.max, yourRating * 1.08)) {
        pick = CAR_ORDER[c];
      }
    }

    var parts = {};
    var tries = 0;
    /* Tune them up towards the player, so buying parts is rewarded by
       closer racing rather than by the field standing still. */
    while(rating(carStats(pick, parts)) < yourRating * (0.88 + i * 0.045) && tries < 40){
      var slot = SLOTS[tries % SLOTS.length];
      var cur = parts[slot.key] || 0;
      if(cur < slot.tiers.length - 1 && slot.key !== 'gears') parts[slot.key] = cur + 1;
      tries++;
      if(rating(carStats(pick, parts)) > ev.max){ parts[slot.key] = cur; break; }
    }

    out.push({
      car: pick, parts: parts,
      name: names[i % names.length],
      skill: 0.86 + (ev.field - i) * 0.035
    });
  }
  return out;
}

function startRace(opts){
  hideAll();
  G.event = opts.event || null;
  G.kind = opts.kind || 'race';      // 'race', 'drag' or 'roam'
  G.laps = opts.laps;
  G.track = buildTrack(opts.track);

  clearCars();
  buildTrackMesh(G.track);
  if(showcase){ scene.remove(showcase); disposeTree(showcase); showcase = null; }

  var you = makeCar(SAVE.car, partsFor(SAVE.car), { name: 'You', seed: 1 });
  you.isYou = true;
  G.cars = [you];
  G.you = you;

  var field = opts.field || [];
  for(var i = 0; i < field.length; i++){
    var e = field[i];
    G.cars.push(makeCar(e.car, e.parts, {
      ai: true, skill: e.skill, seed: i + 2, name: e.name
    }));
  }

  if(G.kind === 'drag') stageDrag(G.cars, G.track);
  else gridUp(G.cars, G.track);

  for(var c = 0; c < G.cars.length; c++){
    var car = G.cars[c];
    var looks = car.isYou ? looksFor(SAVE.car)
                          : { paint: (c * 5) % PAINTS.length, wheel: c % WHEELS.length,
                              stripe: 0, spoiler: c % 2 === 0 };
    var obj = buildCar(car.key, looks, car.stats.lift);
    car.obj = obj;
    scene.add(obj);
    carObjs.push(obj);
  }

  G.t = 0;
  /* Free roam has nothing to wait for. A drag race gets three ambers rather
     than a rolling countdown, and a reaction time to go with them. */
  G.countdown = G.kind === 'drag' ? 2.1 : 3.6;
  G.started = G.kind === 'roam';
  G.foul = false;
  G.react = null;
  G.mode = 'race';
  G.finished = [];
  G.lastTime = 0;
  G.lastCount = null;

  show('hud');
  placeCamera(true);
  if(G.kind === 'drag') banner(TRACKS[opts.track].name, 'a quarter mile');
  else if(G.kind === 'roam') banner(TRACKS[opts.track].name, 'drive wherever you like');
  else banner(TRACKS[opts.track].name, G.laps + ' laps');
}

/* ------------------------------------------------------- the other modes -- */

function startDrag(){
  startRace({ track: 'strip', laps: 1, kind: 'drag',
              field: buildField({ field: 1, max: 9999 }) });
}

function startRoam(){
  startRace({ track: 'roam', laps: 0, kind: 'roam', field: [] });
}

function restartRace(){
  if(!G.track) return;
  if(G.kind === 'drag'){ startDrag(); return; }
  if(G.kind === 'roam'){ startRoam(); return; }
  startRace({
    track: G.track.key, laps: G.laps, event: G.event, kind: G.kind,
    field: G.event ? buildField(G.event) : quickField()
  });
}

function quickField(){
  return buildField({ field: 3, max: 9999 });
}

/* --------------------------------------------------------------- stepping -- */

function raceStep(dt){
  if(!G.started){
    G.countdown -= dt;
    if(G.kind === 'drag'){
      /* Three ambers, then green. Touching the throttle before the green is
         a red light, exactly as it would be: the run still happens, but the
         result card says what you did. */
      if(INPUT.throttle > 0) G.foul = true;
      var amb = Math.ceil(G.countdown / 0.7);
      if(G.countdown > 0){
        if(amb !== G.lastCount){
          G.lastCount = amb;
          var dots = '';
          for(var a = 0; a < amb; a++) dots += '●';
          banner('<span style="color:var(--amber)">' + dots + '</span>', 'stand by');
        }
      } else {
        G.started = true;
        banner('GREEN', '');
      }
    } else {
      var n = Math.ceil(G.countdown - 0.6);
      if(G.countdown > 0.6){
        if(n !== G.lastCount){ G.lastCount = n; banner(String(n), ''); }
      } else {
        G.started = true;
        banner('GO', '');
      }
    }
  } else {
    G.t += dt;
    /* Reaction time: green to throttle, measured once. */
    if(G.kind === 'drag' && G.react === null && INPUT.throttle > 0) G.react = G.t;
  }

  for(var i = 0; i < G.cars.length; i++){
    var car = G.cars[i];
    if(car.finished) continue;

    var input;
    if(!G.started) input = { throttle: 0, brake: 0, steer: 0, hand: false };
    else if(car.ai) input = aiInput(car, G.track, G.cars);
    else input = gatherInput();

    stepCar(car, G.track, input, dt);
    updateProgress(car, G.track, G.t);

    if(G.kind === 'drag'){
      /* Elapsed time in drag racing runs from the car rolling out of the
         beams, not from the green - reaction is a separate number, and
         adding the two is what decides the race. Keeping them apart is the
         difference between a quoted ET and a quoted ET that means anything. */
      if(car.launchAt === undefined && Math.abs(car.vf) > 0.1) car.launchAt = G.t;
      if(car.along >= DRAG_LEN && !car.finished){
        car.finished = true;
        car.finishTime = G.t;                              // decides who won
        car.et = G.t - (car.launchAt === undefined ? 0 : car.launchAt);
        car.trap = Math.abs(car.vf);                       // speed through the traps
        G.finished.push(car);
        if(car.isYou) endRace();
      }
    } else if(G.kind !== 'roam' && car.lap > G.laps && !car.finished){
      car.finished = true;
      car.finishTime = G.t;
      G.finished.push(car);
      if(car.isYou) endRace();
    }
  }
  separate(G.cars);

  /* Draw every car where the model says it is. */
  for(var j = 0; j < G.cars.length; j++){
    var c = G.cars[j];
    if(!c.obj) continue;
    c.obj.position.set(c.x, 0, c.z);
    c.obj.rotation.y = c.yaw;
    animateCar(c.obj, c.vf, c.steer, dt);
  }

  /* Once you are home the race is over, but the field should still be moving
     behind the results card rather than frozen mid-corner. */
  placeCamera(false);
  drawHUD();
}

/* --------------------------------------------------------------- camera -- */

function placeCamera(snap){
  var you = G.you;
  if(!you) return;

  var speed = Math.abs(you.vf);
  /* Pull back and widen out with speed. Both are cheap tricks and both are
     most of why fast feels fast. */
  var back = 8.2 + speed * 0.10;
  var high = 3.4 + speed * 0.022;

  var sy = Math.sin(you.yaw), cy = Math.cos(you.yaw);
  var want = new T.Vector3(you.x - sy * back, high, you.z - cy * back);

  if(snap) camPos.copy(want);
  else camPos.lerp(want, clamp(0.12 + speed * 0.0016, 0, 0.3));

  camera.position.copy(camPos);

  /* Look a little up the road rather than at the car, so corners open up
     before you arrive at them. */
  var ahead = 7 + speed * 0.26;
  camLook.lerp(new T.Vector3(you.x + sy * ahead, 1.1, you.z + cy * ahead),
               snap ? 1 : 0.2);
  camera.lookAt(camLook);

  var wantFov = 62 + clamp(speed * 0.17, 0, 17);
  camera.fov += (wantFov - camera.fov) * 0.08;
  camera.updateProjectionMatrix();
}

function showcaseStep(dt){
  showcaseAngle += dt * 0.34;
  var r = 10.5;
  camera.position.set(Math.sin(showcaseAngle) * r, 2.1, Math.cos(showcaseAngle) * r);
  /* Aimed above the car rather than at it, which drops the car into the
     lower part of the frame - the menu card sits dead centre, and a car
     hidden behind it is no use to someone choosing paint. */
  camera.lookAt(0, 4.4, 0);
  camera.fov += (58 - camera.fov) * 0.1;
  camera.updateProjectionMatrix();
  if(showcase && showcase.userData.car) showcase.userData.car.rotation.y += dt * 0.12;
}

/* ------------------------------------------------------------------ HUD -- */

function drawHUD(){
  var you = G.you;
  if(!you) return;

  var mph = Math.abs(you.vf) * MPS_TO_MPH;
  $('spd').textContent = Math.round(mph);

  /* Six gears spread across the car's own top speed. There is no gearbox in
     the physics - this is a readout, and an honest one: it is derived from
     the same speed and ceiling the model is using. */
  var frac = clamp(Math.abs(you.vf) / you.vMax, 0, 1);
  var gear = Math.min(5, Math.floor(frac * 5.999));
  var within = frac * 6 - gear;
  $('gear').textContent = gear + 1;
  $('gear').className = within > 0.93 ? 'flash' : '';
  $('rev').style.width = (within * 100).toFixed(0) + '%';

  var split = $('vSplit');

  if(G.kind === 'drag'){
    /* Short enough to fit a phone: a long '132/402 M' wrapped out of its
       tile and over the clock. */
    $('lblLap').textContent = 'To go';
    $('vLap').textContent = Math.max(0, Math.round(DRAG_LEN - you.along)) + ' m';
    $('vPos').textContent = positionOf(G.cars, you) + '/' + G.cars.length;
    $('vTime').textContent = fmtTime(G.started ? G.t : 0);
    split.textContent = G.foul ? 'red light'
                      : (G.react !== null ? 'RT ' + G.react.toFixed(3) : 'stage');
    split.className = 'split ' + (G.foul ? 'up' : '');

  } else if(G.kind === 'roam'){
    $('lblLap').textContent = 'Where';
    $('vLap').textContent = you.off ? 'Field' : 'Road';
    $('vPos').textContent = '—';
    $('vTime').textContent = fmtTime(G.t);
    split.textContent = '';
    split.className = 'split';

  } else {
    $('lblLap').textContent = 'Lap';
    $('vLap').textContent = clamp(you.lap, 1, G.laps) + '/' + G.laps;
    $('vPos').textContent = positionOf(G.cars, you) + '/' + G.cars.length;
    $('vTime').textContent = fmtTime(G.started ? G.t - you.lapStart : 0);

    var best = SAVE.best[G.track.key];
    if(best && you.best){
      var d = you.best - best;
      split.textContent = fmtGap(d);
      split.className = 'split ' + (d > 0 ? 'up' : 'dn');
    } else {
      split.textContent = you.best ? 'best ' + fmtTime(you.best) : '';
      split.className = 'split';
    }
  }

  if(bannerTimer > 0){
    bannerTimer -= 1 / 60;
    if(bannerTimer <= 0) $('banner').classList.remove('show');
  }

  drawMap();
}

function banner(big, small){
  var el = $('banner');
  el.innerHTML = big + (small ? '<small>' + small + '</small>' : '');
  el.classList.add('show');
  bannerTimer = 1.5;
}

/* --------------------------------------------------------------- minimap -- */

var mapBounds = null;

function drawMap(){
  var cv = $('map');
  if(!cv || !G.track) return;
  var g = cv.getContext('2d');
  var W = cv.width, H = cv.height;

  if(!mapBounds || mapBounds.key !== G.track.key){
    var xs = G.track.pts.map(function(p){ return p.x; });
    var zs = G.track.pts.map(function(p){ return p.z; });
    var minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
    var minZ = Math.min.apply(null, zs), maxZ = Math.max.apply(null, zs);
    var pad = 16;
    var scale = Math.min((W - pad * 2) / (maxX - minX), (H - pad * 2) / (maxZ - minZ));
    mapBounds = {
      key: G.track.key, minX: minX, minZ: minZ, scale: scale,
      ox: (W - (maxX - minX) * scale) / 2,
      oy: (H - (maxZ - minZ) * scale) / 2
    };
  }
  var b = mapBounds;
  function px(x){ return b.ox + (x - b.minX) * b.scale; }
  function py(z){ return b.oy + (z - b.minZ) * b.scale; }

  g.clearRect(0, 0, W, H);

  g.strokeStyle = '#3a4150';
  g.lineWidth = 11;
  g.lineJoin = 'round';
  g.beginPath();
  for(var i = 0; i < G.track.n; i++){
    var p = G.track.pts[i];
    if(i === 0) g.moveTo(px(p.x), py(p.z)); else g.lineTo(px(p.x), py(p.z));
  }
  g.closePath();
  g.stroke();

  /* start line */
  var s0 = G.track.pts[0];
  g.strokeStyle = '#e8e8ea';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(px(s0.x) - 6, py(s0.z));
  g.lineTo(px(s0.x) + 6, py(s0.z));
  g.stroke();

  for(var c = 0; c < G.cars.length; c++){
    var car = G.cars[c];
    g.fillStyle = car.isYou ? '#ffd166' : '#8b97a8';
    g.beginPath();
    g.arc(px(car.x), py(car.z), car.isYou ? 7 : 5, 0, Math.PI * 2);
    g.fill();
  }
}

/* --------------------------------------------------------------- results -- */

function endRace(){
  G.mode = 'done';
  var you = G.you;
  var order = standings(G.cars);
  var pos = order.indexOf(you) + 1;

  if(G.kind === 'drag'){ endDrag(order, pos); return; }

  /* Best lap is kept per track, across every race run there. */
  if(you.best !== null){
    var prev = SAVE.best[G.track.key];
    if(!prev || you.best < prev) SAVE.best[G.track.key] = you.best;
  }

  var prize = 0;
  if(G.event){
    prize = G.event.prize[pos - 1] || Math.round(G.event.prize[2] * 0.35);
    var was = SAVE.done[G.event.id];
    if(was === undefined || pos < was) SAVE.done[G.event.id] = pos;
  } else {
    prize = Math.max(400, Math.round(1800 / pos));
  }
  SAVE.credits += prize;
  saveNow();

  $('resTitle').textContent = pos === 1 ? 'Won it' : 'P' + pos;
  $('resSub').innerHTML = G.event
    ? G.event.name + ' at ' + G.track.name + ', ' + G.laps + ' laps.'
    : 'Quick race at ' + G.track.name + '.';

  var rows = '';
  for(var i = 0; i < order.length; i++){
    var car = order[i];
    var t = car.finished
      ? (i === 0 ? fmtTime(car.finishTime)
                 : '+' + (car.finishTime - order[0].finishTime).toFixed(1))
      : 'DNF';
    rows += '<tr' + (car.isYou ? ' class="you"' : '') + '>' +
            '<td class="p">' + (i + 1) + '</td>' +
            '<td>' + car.name + '</td>' +
            '<td style="color:var(--muted);font-size:11.5px">' + CARS[car.key].name + '</td>' +
            '<td class="t">' + t + '</td></tr>';
  }
  $('resTable').innerHTML = rows;

  var note = '<b style="color:var(--amber)">+' + money(prize) + '</b> credits.';
  if(you.best !== null) note += ' Best lap ' + fmtTime(you.best) + '.';
  if(SAVE.best[G.track.key] === you.best && you.best !== null) note += ' A new record here.';
  $('resNote').innerHTML = note;

  updateMenu();
  show('ovResult');
}

/* A drag result is a different set of numbers from a race result: elapsed
   time and trap speed, and the reaction that decided half of it. */
function endDrag(order, pos){
  var you = G.you;
  var prize = pos === 1 ? 2600 : 900;
  SAVE.credits += prize;

  /* Best quarter mile is kept per car, so improving the car shows up. */
  if(!SAVE.bestEt) SAVE.bestEt = {};
  var prev = SAVE.bestEt[you.key];
  var isBest = you.finished && (!prev || you.finishTime < prev);
  if(isBest) SAVE.bestEt[you.key] = you.finishTime;
  saveNow();

  $('resTitle').textContent = G.foul ? 'Red light' : (pos === 1 ? 'Won it' : 'Lost it');
  $('resSub').innerHTML = 'A quarter mile at ' + G.track.name + '.';

  var rows = '';
  for(var i = 0; i < order.length; i++){
    var car = order[i];
    var et = car.finished ? car.et.toFixed(3) + 's' : 'DNF';
    var tr = car.finished ? Math.round(car.trap * MPS_TO_MPH) + ' mph' : '-';
    rows += '<tr' + (car.isYou ? ' class="you"' : '') + '>' +
            '<td class="p">' + (i + 1) + '</td>' +
            '<td>' + car.name + '</td>' +
            '<td style="color:var(--muted);font-size:11.5px">' + CARS[car.key].name + '</td>' +
            '<td class="t">' + et + ' &middot; ' + tr + '</td></tr>';
  }
  $('resTable').innerHTML = rows;

  var note = '<b style="color:var(--amber)">+' + money(prize) + '</b> credits.';
  if(G.react !== null) note += ' Reaction ' + G.react.toFixed(3) + 's.';
  if(G.foul) note += ' You left before the green.';
  if(isBest) note += ' Your best quarter in this car.';
  $('resNote').innerHTML = note;

  updateMenu();
  show('ovResult');
}

/* ----------------------------------------------------------------- pause -- */

function togglePause(){
  if(G.mode === 'race'){
    G.mode = 'paused';
    $('pauseSub').textContent = G.event ? G.event.name : 'Quick race';
    show('ovPause');
  } else if(G.mode === 'paused'){
    hide('ovPause');
    G.mode = 'race';
  }
}

/* ------------------------------------------------------------------ loop -- */

function frame(ts){
  requestAnimationFrame(frame);
  var dt = lastFrame ? (ts - lastFrame) / 1000 : 0;
  lastFrame = ts;
  dt = Math.min(dt, DT_MAX);
  if(dt <= 0) return;

  if(G.mode === 'race') raceStep(dt);
  else if(G.mode === 'menu') showcaseStep(dt);
  else if(G.mode === 'done' && G.cars.length){
    /* Keep the field running behind the results card. */
    for(var i = 0; i < G.cars.length; i++){
      var car = G.cars[i];
      if(car.finished) continue;
      stepCar(car, G.track, aiInput(car, G.track, G.cars), dt);
      updateProgress(car, G.track, G.t);
      if(car.obj){ car.obj.position.set(car.x, 0, car.z); car.obj.rotation.y = car.yaw; }
    }
    G.t += dt;
  }

  renderer.render(scene, camera);
}

/* ---------------------------------------------------------------- wiring -- */

function wire(){
  $('btnCareer').onclick = openEvents;
  $('btnDrag').onclick = startDrag;
  $('btnRoam').onclick = startRoam;
  $('btnQuick').onclick = function(){
    var keys = Object.keys(TRACKS);
    var pick = keys[Math.floor(Math.random() * keys.length)];
    startRace({ track: pick, laps: TRACKS[pick].laps, field: quickField() });
  };
  $('btnGarage').onclick = openGarage;
  $('btnShowroom').onclick = openShowroom;
  $('btnPaint').onclick = openPaint;
  $('btnHelp').onclick = function(){ hideAll(); show('ovHelp'); drawHelp(); };

  $('btnGarageBack').onclick = backToMenu;
  $('btnShowBack').onclick = backToMenu;
  $('btnPaintBack').onclick = backToMenu;
  $('btnEventsBack').onclick = backToMenu;
  $('btnHelpBack').onclick = backToMenu;
  $('btnGridBack').onclick = openEvents;

  $('btnGridGarage').onclick = function(){
    openGarage();
    /* Coming out of the garage from here should go back to the grid, not to
       the menu - you came in to change something for this race. */
    $('btnGarageBack').onclick = function(){ openGrid(pendingEvent); };
  };

  $('btnGo').onclick = function(){
    var ev = pendingEvent;
    startRace({ track: ev.track, laps: ev.laps, event: ev, field: buildField(ev) });
  };

  $('btnResume').onclick = togglePause;
  $('btnRestart').onclick = function(){ hide('ovPause'); restartRace(); };
  $('btnQuit').onclick = function(){ hideAll(); enterShowcase(); show('ovMenu'); };

  $('btnAgain').onclick = function(){ hideAll(); restartRace(); };
  $('btnResGarage').onclick = function(){
    enterShowcase();
    openGarage();
    $('btnGarageBack').onclick = backToMenu;
  };
  $('btnResMenu').onclick = backToMenu;
}

function backToMenu(){
  hideAll();
  if(G.mode !== 'menu') enterShowcase();
  $('btnGarageBack').onclick = backToMenu;
  updateMenu();
  show('ovMenu');
}

function drawHelp(){
  $('helpBody').innerHTML =
    '<p><b>Keyboard</b><br>' +
    'W or Up — throttle<br>' +
    'S or Down — brake, then reverse<br>' +
    'A / D or Left / Right — steer<br>' +
    'Space — handbrake<br>' +
    'P or Esc — pause, R — restart</p>' +
    '<p><b>Gamepad</b><br>Triggers for throttle and brake, left stick to steer, ' +
    'B for the handbrake. Press a button first — browsers hide a pad until you do.</p>' +
    '<p><b>Phone</b><br>Arrows bottom left, GO and BRAKE bottom right.</p>' +
    '<p style="color:var(--muted);margin-top:14px">Everything here is earned by driving. ' +
    'There is nothing to buy with real money, and there never will be.</p>';
}

/* Off we go. */
init();
