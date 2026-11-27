/* =========================================================================
   4.6  THE GARAGE, ON SCREEN

   Everything here reads from carStats, including the preview. Hovering a
   part shows what it would do by building the stats it would produce and
   drawing the difference - not by looking up a number someone typed into a
   table twice. If the two ever disagreed, the preview would be a lie, and a
   shop that lies about what it sells is worse than no shop.
   ========================================================================= */

var garageSlot = 'engine';       // which tab is open
var garagePreview = null;        // {slot, tier} being hovered

/* Kit names are typed by whoever is playing and then go into innerHTML. It is
   their own browser and nobody else's, but a name with a < in it should make
   a kit with a < in its name, not a broken screen. */
function esc(s){
  return String(s === undefined || s === null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* One line about money, printed wherever money is discussed, with the switch
   sitting right next to it rather than buried in a settings screen. */
function walletLine(){
  var btn = '<button class="mini" id="btnMoneyMode" style="font-size:13px;' +
            'padding:4px 10px;margin-left:8px;vertical-align:middle">' +
            (freeBuild() ? 'Make me earn it' : 'Unlimited') + '</button>';
  var said = freeBuild()
    ? '<b style="color:var(--amber)">Money: unlimited</b>'
    : '<b style="color:var(--amber)">' + money(SAVE.credits) + '</b> in hand.';
  return said + btn;
}

/* Wire whichever copy of the switch is on screen. Flipping it redraws the
   screen that drew it, because every price on it has just changed. */
function wireMoneyMode(redraw){
  var b = $('btnMoneyMode');
  if(!b) return;
  b.onclick = function(){
    SAVE.freeBuild = !freeBuild();
    saveNow();
    updateMenu();
    if(redraw) redraw();
  };
}

/* The ranges each bar is drawn against. Not the min and max of what exists -
   a bit of headroom at each end so a stock car does not read as empty and a
   fully built one does not peg everything. */
/* Power leads with horsepower because that is the number people have, with
   the kilowatts the model actually runs on kept alongside it rather than
   replaced. Brakes were a bare "9.2", which is metres per second squared
   and means nothing to anybody; they now read as the stopping distance
   that figure produces from 60. */
var BARS = [
  { key: 'power', name: 'Power', lo: 60, hi: 1150,
    fmt: function(s){ return Math.round(hpOf(s)) + ' hp<small> ' + Math.round(s.power) + ' kW</small>'; } },
  { key: 'mass', name: 'Weight', lo: 2900, hi: 600,
    fmt: function(s){ return Math.round(s.mass) + ' kg'; } },
  { key: 'grip', name: 'Grip', lo: 0.85, hi: 2.0,
    fmt: function(s){ return gripAt(s, 30).toFixed(2) + 'g'; } },
  { key: 'brake', name: '60 to 0', lo: 8, hi: 17,
    fmt: function(s){ return Math.round(stopFrom60(s)) + ' ft'; } },
  { key: 'top', name: 'Top speed', lo: 85, hi: 260,
    fmt: function(s){ return Math.round(flatOut(s) * MPS_TO_MPH) + ' mph'; } },
  { key: 'sixty', name: '0-60', lo: 11, hi: 2,
    fmt: function(s){ var z = zeroTo60(s); return z > 50 ? '--' : z.toFixed(1) + 's'; } }
];

function barValue(key, s){
  if(key === 'top') return flatOut(s) * MPS_TO_MPH;
  if(key === 'sixty') return zeroTo60(s);
  if(key === 'grip') return gripAt(s, 30);
  return s[key];
}

/* lo may be greater than hi - that is how "less is better" is expressed. */
function barPct(bar, s){
  var v = barValue(bar.key, s);
  return clamp((v - bar.lo) / (bar.hi - bar.lo), 0, 1) * 100;
}

/* ---------------------------------------------------------- the stat bars -- */

function renderStats(host, carKey, parts, previewParts){
  var now = carStats(carKey, parts);
  var next = previewParts ? carStats(carKey, previewParts) : null;
  var html = '';

  for(var i = 0; i < BARS.length; i++){
    var bar = BARS[i];
    var a = barPct(bar, now);
    var b = next ? barPct(bar, next) : a;
    var better = b > a + 0.4, worse = b < a - 0.4;

    /* The ghost is the part of the bar that would be gained or lost. Drawn
       behind the number so the change reads at a glance without having to
       compare two screens. */
    var ghost = '';
    if(next && (better || worse)){
      var from = Math.min(a, b), to = Math.max(a, b);
      ghost = '<div class="ghost' + (worse ? ' down' : '') + '" style="left:' +
              from.toFixed(1) + '%;width:' + (to - from).toFixed(1) + '%"></div>';
    }

    var delta = '';
    if(next){
      var va = barValue(bar.key, now), vb = barValue(bar.key, next);
      var up = bar.hi > bar.lo ? vb > va : vb < va;
      if(Math.abs(vb - va) > 1e-6){
        delta = ' <em class="' + (up ? 'up' : 'dn') + '">' + (up ? '▲' : '▼') + '</em>';
      }
    }

    html += '<div class="stat"><div class="n">' + bar.name + '</div>' +
            '<div class="bar">' + ghost +
            '<div class="fill" style="width:' + Math.min(a, b).toFixed(1) + '%"></div></div>' +
            '<div class="v">' + bar.fmt(next || now) + delta + '</div></div>';
  }

  /* The headline number, because events are gated on it. */
  var r = rating(next || now);
  var rNow = rating(now);
  var cls = classOf(r);
  var shift = next && r !== rNow ? ' <em class="' + (r > rNow ? 'up' : 'dn') + '">' +
    (r > rNow ? '+' : '') + (r - rNow) + '</em>' : '';
  html += '<div class="stat"><div class="n">Rating</div>' +
          '<div class="bar"><div class="fill" style="width:' +
          clamp(r / 1100, 0, 1) * 100 + '%;background:var(--amber)"></div></div>' +
          '<div class="v">' + r + shift + '</div></div>' +
          '<p class="note2">Class <b>' + cls + '</b>' +
          (next && classOf(rNow) !== cls ? ' — this part moves you out of class ' + classOf(rNow) : '') +
          '</p>';

  /* What all of that adds up to, in words. The point of this line is the
     moment it changes: fit the quad turbo and watch the car go from
     Straightforward to A handful before you have spent anything. A rating
     going up tells you the car got faster; it does not tell you that you
     are about to spin it at the first corner. */
  var handNow = handlingOf(now);
  var handNext = handlingOf(next || now);
  var moved = next && handNext.n !== handNow.n;
  html += '<p class="note2 handline"><span class="chip ' + handClass(next || now) + '">' +
          handNext.n + '</span> ' + handNext.why +
          (moved ? ' <b>Was: ' + handNow.n + '.</b>' : '') + '</p>';

  host.innerHTML = html;
}

/* ------------------------------------------------------------ the garage -- */

function openGarage(){
  hideAll();
  show('ovGarage');
  garagePreview = null;
  drawGarage();
}

function drawGarage(){
  var carKey = SAVE.car;
  var car = CARS[carKey];
  var parts = partsFor(carKey);

  $('gName').textContent = car.name;
  $('gSub').innerHTML = car.desc + '<br>' + walletLine();

  var preview = null;
  if(garagePreview){
    preview = Object.assign({}, parts);
    preview[garagePreview.slot] = garagePreview.tier;
  }
  renderStats($('gStats'), carKey, parts, preview);

  /* Switching from a truck to a car with the lift tab open would leave the
     garage on a slot that car cannot have. */
  if(!slotFits(slotByKey(garageSlot) || {}, carKey)) garageSlot = 'engine';

  /* tabs */
  var tabs = '';
  for(var i = 0; i < SLOTS.length; i++){
    var s = SLOTS[i];
    /* The lift kit tab only exists on a truck. carStats ignores the slot for
       anything else, so showing it here would be selling a part that does
       nothing. */
    if(!slotFits(s, carKey)) continue;
    var fitted = tierOf(carKey, s.key);
    tabs += '<button class="tab' + (s.key === garageSlot ? ' on' : '') +
            '" data-slot="' + s.key + '">' + s.name +
            (fitted > 0 ? ' <span style="color:var(--green)">●</span>' : '') + '</button>';
  }
  $('gTabs').innerHTML = tabs;
  Array.prototype.forEach.call($('gTabs').children, function(btn){
    btn.onclick = function(){
      garageSlot = btn.getAttribute('data-slot');
      garagePreview = null;
      drawGarage();
    };
  });

  /* parts in the open tab */
  var slot = slotByKey(garageSlot);
  var fittedTier = tierOf(carKey, garageSlot);
  var html = '<p class="note2">' + slot.blurb + '</p>';
  var selTier = garagePreview ? garagePreview.tier : fittedTier;

  for(var t = 0; t < slot.tiers.length; t++){
    var tier = slot.tiers[t];
    var free = freeBuild();
    var owned = free || ownsPart(carKey, garageSlot, t);
    var isFitted = t === fittedTier;
    var afford = free || SAVE.credits >= tier.cost;

    var cost;
    if(isFitted) cost = '<span class="cost have">Fitted</span>';
    else if(owned) cost = '<span class="cost have">Fit</span>';
    else if(afford) cost = '<span class="cost">' + money(tier.cost) + '</span>';
    else cost = '<span class="cost cant">' + money(tier.cost) + '</span>';

    /* With money off, "Owned" is not a thing any more - everything is to
       hand, so a chip saying so on every row is just noise. */
    var marks = (isFitted ? '<span class="chip" style="color:var(--green)">On the car</span>' : '') +
                (!isFitted && owned && !free ? '<span class="chip">Owned</span>' : '');

    html += '<div class="row' + (t === selTier ? ' on' : '') +
            (!owned && !afford ? ' locked' : '') + '" data-tier="' + t + '">' +
            '<div class="grow"><div class="t">' + tier.name + '</div>' +
            '<div class="d">' + tier.d + '</div>' +
            (marks ? '<div style="margin-top:5px">' + marks + '</div>' : '') +
            '</div>' + cost + '</div>';
  }

  /* One explicit button rather than buying on the row tap. Selecting a part
     shows what it would do to the car; a second, deliberate press is what
     spends the money. A list where a mis-tap costs $38,000 is not a
     shop, it is a trap - and on a phone there is no hover to preview with. */
  var selOwned = freeBuild() || ownsPart(carKey, garageSlot, selTier);
  var selCost = slot.tiers[selTier].cost;
  var label, action = null;
  if(selTier === fittedTier) label = 'Already on the car';
  else if(selOwned){ label = 'Fit the ' + slot.tiers[selTier].name.toLowerCase(); action = 'fit'; }
  else if(SAVE.credits >= selCost){ label = 'Buy for ' + money(selCost); action = 'buy'; }
  else label = money(selCost - SAVE.credits) + ' credits short';

  html += '<div class="btns"><button class="go' + (action ? (action === 'buy' ? ' gr' : '') : ' alt') +
          '" id="btnFit"' + (action ? '' : ' disabled') + '>' + label + '</button></div>';

  $('gList').innerHTML = html;

  Array.prototype.forEach.call($('gList').querySelectorAll('.row'), function(row){
    var t = parseInt(row.getAttribute('data-tier'), 10);
    function select(){
      var want = (t === tierOf(SAVE.car, garageSlot)) ? null : { slot: garageSlot, tier: t };
      /* drawGarage rebuilds these rows under the cursor, which fires
         mouseenter again. Without this guard that is an endless loop. */
      var same = (want === null && garagePreview === null) ||
                 (want && garagePreview && garagePreview.tier === want.tier &&
                  garagePreview.slot === want.slot);
      if(same) return;
      garagePreview = want;
      drawGarage();
    }
    row.onclick = select;
    /* On a desktop, running the mouse down the list previews each one, which
       is the quickest way to compare. Touch gets the same thing from a tap. */
    row.onmouseenter = function(){ if(!('ontouchstart' in window)) select(); };
  });

  var fitBtn = $('btnFit');
  if(fitBtn && action){
    fitBtn.onclick = function(){
      var res = action === 'fit'
        ? { ok: fitPart(SAVE.car, garageSlot, selTier) }
        : buyPart(SAVE.car, garageSlot, selTier);
      if(!res.ok){ flash($('gSub'), 'Not enough money for that one.'); return; }
      garagePreview = null;
      drawGarage();
      refreshCarPreview();
    };
  }

  wireMoneyMode(function(){ garagePreview = null; drawGarage(); });
}

function fromSlot(slotKey, tier){ var o = {}; o[slotKey] = tier; return o; }

function flash(el, msg){
  var old = el.innerHTML;
  el.innerHTML = '<span style="color:var(--red)">' + msg + '</span>';
  setTimeout(function(){ if(el.innerHTML.indexOf(msg) !== -1) el.innerHTML = old; }, 1600);
}

/* ---------------------------------------------------------- the showroom -- */

function openShowroom(){
  hideAll();
  show('ovShow');
  drawShowroom();
}

/* A car's portrait, ready to drop into a row. It goes in empty and gets
   filled a frame at a time by fillShots below: sixteen of them take about a
   second to take, and a showroom that freezes for a second when you open it
   is worse than one whose pictures arrive over the next few frames. The
   picture is decoration, so it is hidden from anything reading the page
   aloud - the name beside it is the real label. */
/* Portraits of cars that are not yours and are not stock - the four you
   just raced, each in the paint it raced in. The looks cannot go in an
   attribute, so they wait here and the frame carries the slot. Emptied at
   the start of every list that uses it, so it does not grow all evening. */
var SHOT_WEAR = [];
function wornShot(carKey, looks, cls){
  SHOT_WEAR.push(looks);
  return '<canvas class="' + cls + '" data-shot="' + carKey + '" data-wear="' +
         (SHOT_WEAR.length - 1) + '" aria-hidden="true"></canvas>';
}

/* A car's portrait, ready to drop into a row. It goes in as an empty frame
   and is filled by fillShots once the list is on the page - the picture
   needs a canvas that exists to be drawn into. It is decoration, so it is
   hidden from anything reading the page aloud; the name beside it is the
   real label. */
function shotOf(carKey){
  return '<canvas class="shot" data-shot="' + carKey + '" aria-hidden="true"></canvas>';
}

/* Fill every empty frame in a list, one per animation frame. A picture is
   about three milliseconds, so sixteen of them could be done in one go -
   but the showcase car is turning behind the menu while this happens, and
   spreading the work keeps that turning smooth. A machine that will not
   give us a second renderer gets no pictures and keeps its empty frames,
   which is the showroom it had before they existed. */
function fillShots(el){
  var want = Array.prototype.slice.call(el.querySelectorAll('[data-shot]'));
  function next(){
    if(!want.length) return;
    var frame = want.shift();
    /* The list may have been redrawn under us - a card clicked, a car
       bought - in which case this frame belongs to nothing any more. */
    if(frame.isConnected){
      var key = frame.getAttribute('data-shot');
      var wear = frame.getAttribute('data-wear');
      var ok = paintCar(frame, key, wear === null ? showLooks(key) : SHOT_WEAR[wear]);
      if(!ok) return;
      frame.removeAttribute('data-shot');
    }
    requestAnimationFrame(next);
  }
  requestAnimationFrame(next);
}

/* Green for a car anyone can drive, red for one that will catch you out. */
function handClass(s){
  var i = HANDLING.indexOf(handlingOf(s));
  return ['ok', 'ok', 'warn', 'bad'][i] || '';
}

/* The three numbers that tell you how big the thing is, off the same BODIES
   table the picture was taken from. */
function bodyLine(carKey){
  var b = BODIES[CARS[carKey].body] || BODIES.coupe;
  return b.len.toFixed(2) + ' x ' + b.wide.toFixed(2) + ' x ' +
         (b.ride + b.roof).toFixed(2) + ' m';
}

function drawShowroom(){
  var html = '<p class="note2">' + walletLine() + '</p>';

  for(var i = 0; i < CAR_ORDER.length; i++){
    var key = CAR_ORDER[i];
    var car = CARS[key];
    var owned = ownsCar(key);
    var driving = SAVE.car === key;
    var s = carStats(key, owned ? partsFor(key) : {});
    var r = rating(s);
    var afford = freeBuild() || SAVE.credits >= car.price;

    var right;
    if(driving) right = '<span class="cost have">Driving</span>';
    else if(owned) right = '<span class="cost have">Drive</span>';
    else right = '<span class="cost' + (afford ? '' : ' cant') + '">' + money(car.price) + '</span>';

    html += '<div class="row car' + (driving ? ' on' : '') +
            (!owned && !afford ? ' locked' : '') + '" data-car="' + key + '">' +
            shotOf(key) +
            '<div class="grow"><div class="t">' + car.name + '</div>' +
            '<div class="d">' + car.desc + ' <b>' + handlingOf(s).why + '</b></div>' +
            '<div class="chips">' +
            '<span class="chip cls">Class ' + classOf(r) + '</span>' +
            '<span class="chip">' + Math.round(flatOut(s) * MPS_TO_MPH) + ' mph</span>' +
            '<span class="chip">0-60 ' + zeroTo60(s).toFixed(1) + 's</span>' +
            '<span class="chip">' + Math.round(hpOf(s)) + ' hp</span>' +
            '<span class="chip">' + Math.round(s.mass) + ' kg</span>' +
            '<span class="chip ' + handClass(s) + '">' + handlingOf(s).n + '</span>' +
            '</div></div>' + right + '</div>';
  }
  $('showList').innerHTML = html;
  fillShots($('showList'));

  Array.prototype.forEach.call($('showList').querySelectorAll('.row'), function(row){
    var key = row.getAttribute('data-car');
    row.onclick = function(){
      if(ownsCar(key)){
        SAVE.car = key;
        saveNow();
      } else {
        var res = buyCar(key);
        if(!res.ok){ flash($('showList'), 'Not enough money.'); return; }
      }
      drawShowroom();
      refreshCarPreview();
    };
  });

  wireMoneyMode(function(){ drawShowroom(); refreshCarPreview(); });
}

/* -------------------------------------------------------------- the looks -- */

function openPaint(){
  hideAll();
  show('ovPaint');
  drawPaint();
}

/* ---------------------------------------------------------- the Workbench -- */

/* The draft on the bench. It is put straight onto the car you are looking at
   while you work, so every change is visible on the thing itself rather than
   in a list - which is the whole point of a bench. The car's real kit is put
   back if you leave without saving. */
var benchDraft = null;
var benchWas = 0;

function openBench(){
  hideAll();
  show('ovBench');
  benchDraft = newKit();
  benchWas = looksFor(SAVE.car).kit || 0;
  drawBench();
}

function closeBench(){
  /* Leaving without saving puts the car back in what it was wearing. */
  looksFor(SAVE.car).kit = benchWas;
  benchDraft = null;
  saveNow();
  refreshCarPreview();
  backToMenu();
}

/* The draft is shown by parking it at the end of the kit list and pointing
   the car at it, so the preview uses exactly the same path a saved kit does.
   No second rendering route means no way for the preview to lie. */
function previewDraft(){
  if(!SAVE.kits) SAVE.kits = [];
  var at = KITS.length + SAVE.kits.length;      // one past the end
  SAVE.kits.push(benchDraft);
  looksFor(SAVE.car).kit = at;
  refreshCarPreview();
  SAVE.kits.pop();                              // it is a draft, not a kit
}

function drawBench(){
  var html = '';

  for(var i = 0; i < BENCH_PARTS.length; i++){
    var part = BENCH_PARTS[i];
    var on = benchStep(benchDraft, part);
    html += '<h2 style="font-size:20px;margin-top:16px">' + part.name + '</h2>' +
            '<p class="note2" style="margin:0 0 7px">' + part.d + '</p>' +
            '<div class="nav" style="justify-content:flex-start">';
    for(var s = 0; s < part.steps.length; s++){
      html += '<button class="mini' + (s === on ? ' hot' : '') +
              '" data-part="' + part.key + '" data-v="' + part.steps[s].v + '"' +
              (s === on ? ' style="border-color:var(--red);color:var(--text)"' : '') +
              '>' + part.steps[s].n + '</button>';
    }
    html += '</div>';
  }

  var mine = (SAVE.kits || []).length;
  html += '<h2 style="font-size:20px;margin-top:18px">Name it</h2>' +
          '<input id="benchName" maxlength="22" value="' + esc(benchDraft.n) +
          '" placeholder="Widebody mk1" style="width:100%;box-sizing:border-box;' +
          'padding:10px 13px;font-family:var(--display);font-size:20px;letter-spacing:.06em;' +
          'background:var(--panel2);color:var(--text);border:1px solid var(--line);' +
          'border-radius:10px">' +
          '<p class="note2" style="margin-top:7px">' + mine + ' of ' + MAX_KITS +
          ' slots on the bench used.</p>';

  if(mine){
    html += '<h2 style="font-size:20px;margin-top:18px">Already built</h2><div id="benchMine">';
    for(var m = 0; m < SAVE.kits.length; m++){
      var idx = KITS.length + m;
      html += '<div class="row"><div class="grow"><div class="t">' +
              esc(SAVE.kits[m].n) + '</div><div class="d">' + kitWords(SAVE.kits[m]) +
              '</div></div>' +
              '<span class="cost cant" data-del="' + idx + '" ' +
              'style="cursor:pointer">Scrap it</span></div>';
    }
    html += '</div>';
  }

  $('benchBody').innerHTML = html;

  Array.prototype.forEach.call($('benchBody').querySelectorAll('[data-part]'), function(b){
    b.onclick = function(){
      benchDraft[b.getAttribute('data-part')] = parseFloat(b.getAttribute('data-v'));
      drawBench();
      previewDraft();
    };
  });

  Array.prototype.forEach.call($('benchBody').querySelectorAll('[data-del]'), function(b){
    b.onclick = function(){
      var idx = parseInt(b.getAttribute('data-del'), 10);
      /* Deleting shifts the kits after it down one, and benchWas is an index
         into that same list, so it has to move with them. */
      if(benchWas === idx) benchWas = 0;
      else if(benchWas > idx) benchWas -= 1;
      deleteKit(idx);
      drawBench();
      previewDraft();
    };
  });

  var nameIn = $('benchName');
  if(nameIn) nameIn.oninput = function(){ benchDraft.n = nameIn.value; };

  previewDraft();
}

/* What a kit is, in words, for the list of ones already built. */
function kitWords(kit){
  var bits = [];
  for(var i = 0; i < BENCH_PARTS.length; i++){
    var part = BENCH_PARTS[i];
    var step = benchStep(kit, part);
    if(step > 0) bits.push(part.steps[step].n.toLowerCase() + ' ' + part.name.toLowerCase());
  }
  return bits.length ? bits.join(', ') : 'nothing on it at all';
}

function drawPaint(){
  var carKey = SAVE.car;
  var l = looksFor(carKey);
  var html = '';

  /* The shop's colours plus this car's own on the end, so the colour it
     arrived in is always one you can go back to. */
  var pal = swatchesFor(carKey);
  html += '<h2 style="font-size:22px;margin-top:14px">Paint</h2><div class="swatches">';
  for(var i = 0; i < pal.length; i++){
    html += '<div class="sw' + (l.paint === i ? ' on' : '') + '" data-k="paint" data-i="' + i +
            '" title="' + pal[i].n + '" style="background:#' +
            pal[i].c.toString(16).padStart(6, '0') + '"></div>';
  }
  html += '</div>';

  html += '<h2 style="font-size:22px;margin-top:16px">Wheels</h2><div class="swatches">';
  for(var w = 0; w < WHEELS.length; w++){
    html += '<div class="sw' + (l.wheel === w ? ' on' : '') + '" data-k="wheel" data-i="' + w +
            '" title="' + WHEELS[w].n + '" style="background:#' +
            WHEELS[w].c.toString(16).padStart(6, '0') + '"></div>';
  }
  html += '</div>';

  html += '<h2 style="font-size:22px;margin-top:16px">Stripe</h2><div class="swatches">';
  for(var st = 0; st < STRIPES.length; st++){
    var c = STRIPES[st].c;
    html += '<div class="sw' + (l.stripe === st ? ' on' : '') + '" data-k="stripe" data-i="' + st +
            '" title="' + STRIPES[st].n + '" style="background:' +
            (c === null ? 'repeating-linear-gradient(45deg,#222,#222 5px,#444 5px,#444 10px)'
                        : '#' + c.toString(16).padStart(6, '0')) + '"></div>';
  }
  html += '</div>';

  /* A kit built on the Workbench says what wing the car has, so while one of
     those is on, this toggle has nothing to do. Say so rather than letting it
     look broken. */
  var kitWing = (kitAt(l.kit || 0).wing || 0) > 0;
  html += '<div class="row' + (l.spoiler && !kitWing ? ' on' : '') + '" data-k="spoiler" style="margin-top:16px">' +
          '<div class="grow"><div class="t">Spoiler</div>' +
          '<div class="d">Bolted to the bootlid. Does nothing at all for grip — ' +
          'that is what the aero in the garage is for.' +
          (kitWing ? ' Your body kit is already carrying its own wing, so this ' +
                     'is doing nothing right now.' : '') +
          '</div></div>' +
          '<span class="cost have">' + (kitWing ? 'Overridden' : (l.spoiler ? 'On' : 'Off')) +
          '</span></div>';

  /* Presets and anything built on the Workbench, in one list. */
  var kits = allKits();
  html += '<h2 style="font-size:22px;margin-top:16px">Body kit</h2><div id="kitRows">';
  for(var kk = 0; kk < kits.length; kk++){
    html += '<div class="row' + (l.kit === kk ? ' on' : '') + '" data-k="kit" data-i="' + kk +
            '"><div class="grow"><div class="t">' + esc(kits[kk].n) + '</div>' +
            (isCustomKit(kk) ? '<div class="d">Yours, off the Workbench.</div>' : '') +
            '</div><span class="cost have">' + (l.kit === kk ? 'On' : 'Fit') + '</span></div>';
  }
  html += '</div>';

  html += '<h2 style="font-size:22px;margin-top:16px">Wheel size</h2><div>';
  for(var ws = 0; ws < WHEEL_SIZES.length; ws++){
    html += '<div class="row' + (l.size === ws ? ' on' : '') + '" data-k="size" data-i="' + ws +
            '"><div class="grow"><div class="t">' + WHEEL_SIZES[ws].n + '</div></div>' +
            '<span class="cost have">' + (l.size === ws ? 'On' : 'Fit') + '</span></div>';
  }
  html += '</div>';

  html += '<h2 style="font-size:22px;margin-top:16px">Numberplate</h2>' +
          '<p class="note2" style="margin-bottom:8px">Eight characters, on the front ' +
          'and the back. It follows you between cars rather than belonging to one.</p>' +
          '<input id="plateIn" maxlength="8" value="' +
          String(SAVE.plate || '').replace(/"/g, '&quot;') +
          '" placeholder="BIGTURBO" style="width:100%;box-sizing:border-box;padding:11px 13px;' +
          'font-family:var(--display);font-size:22px;letter-spacing:.12em;text-align:center;' +
          'text-transform:uppercase;background:#e9e4d0;color:#14161a;border:2px solid var(--line);' +
          'border-radius:10px">';

  $('paintBody').innerHTML = html;

  var plateIn = $('plateIn');
  if(plateIn){
    plateIn.oninput = function(){
      SAVE.plate = plateIn.value.toUpperCase().replace(/[^A-Z0-9 -]/g, '');
      saveNow();
      refreshCarPreview();
    };
  }

  Array.prototype.forEach.call($('paintBody').querySelectorAll('[data-k]'), function(el){
    el.onclick = function(){
      var k = el.getAttribute('data-k');
      if(k === 'spoiler') l.spoiler = !l.spoiler;
      else l[k] = parseInt(el.getAttribute('data-i'), 10);
      saveNow();
      drawPaint();
      refreshCarPreview();
    };
  });
}

/* ------------------------------------------------------------ the career -- */

function openEvents(){
  hideAll();
  show('ovEvents');
  drawEvents();
}

function drawEvents(){
  var carKey = SAVE.car;
  var r = rating(statsOf(carKey));
  $('evSub').innerHTML = 'Driving the <b>' + CARS[carKey].name + '</b> — rating ' + r +
    ', class ' + classOf(r) + '. <b style="color:var(--amber)">' + money(SAVE.credits) +
    '</b>.';

  var html = '';
  for(var i = 0; i < EVENTS.length; i++){
    var ev = EVENTS[i];
    var open = eventOpen(i);
    var best = SAVE.done[ev.id];
    var eligible = r <= ev.max;
    var tr = TRACKS[ev.track];

    var right;
    if(!open) right = '<span class="cost cant">Locked</span>';
    else if(!eligible) right = '<span class="cost cant">Over class</span>';
    else right = '<span class="cost">' + money(ev.prize[0]) + '</span>';

    var badge = best !== undefined
      ? '<span class="chip" style="color:var(--green)">Best: P' + best + '</span>' : '';

    html += '<div class="row' + (!open || !eligible ? ' locked' : '') +
            '" data-ev="' + i + '">' +
            '<div class="grow"><div class="t">' + ev.name + '</div>' +
            '<div class="d">' + ev.d + '</div>' +
            '<div style="margin-top:6px">' + badge +
            '<span class="chip">' + tr.name + '</span>' +
            '<span class="chip">' + ev.laps + ' laps</span>' +
            '<span class="chip cls">' + (ev.max > 2000 ? 'Open' : 'Max ' + ev.max) + '</span>' +
            '</div></div>' + right + '</div>';
  }
  /* ---- championships, under the one-off events ---- */
  html += '<p class="sub" style="margin:22px 0 10px">Championships</p>';

  for(var c = 0; c < CHAMPIONSHIPS.length; c++){
    var ch = CHAMPIONSHIPS[c];
    var st = champState(ch.id);
    var chOpen = champOpen(c);
    var chEligible = r <= ch.max;

    var chRight;
    if(!chOpen) chRight = '<span class="cost cant">Locked</span>';
    else if(st.done) chRight = '<span class="cost" style="color:var(--green)">Done</span>';
    else if(!chEligible) chRight = '<span class="cost cant">Over class</span>';
    else chRight = '<span class="cost">' + money(ch.prize[0]) + '</span>';

    /* The standings are the point of a season, so they are on the card, not
       hidden behind it. */
    var table = '';
    if(st.round > 0){
      var rows = champStandings(ch);
      for(var q = 0; q < rows.length; q++){
        table += '<span class="chip"' +
                 (rows[q].name === 'You' ? ' style="color:var(--amber)"' : '') + '>' +
                 rows[q].name + ' ' + rows[q].pts + '</span>';
      }
    }

    html += '<div class="row' + (!chOpen || (!chEligible && !st.done) ? ' locked' : '') +
            '" data-ch="' + c + '">' +
            '<div class="grow"><div class="t">' + ch.name + '</div>' +
            '<div class="d">' + ch.d + '</div>' +
            '<div style="margin-top:6px">' +
            '<span class="chip">Round ' + Math.min(st.round + 1, ch.rounds.length) +
            ' of ' + ch.rounds.length + '</span>' +
            '<span class="chip cls">' + (ch.max > 2000 ? 'Open' : 'Max ' + ch.max) + '</span>' +
            table + '</div></div>' + chRight + '</div>';
  }

  $('evList').innerHTML = html;

  Array.prototype.forEach.call($('evList').querySelectorAll('.row'), function(row){
    var evi = row.getAttribute('data-ev');
    var chi = row.getAttribute('data-ch');

    if(evi !== null){
      var i = parseInt(evi, 10);
      row.onclick = function(){
        var ev = EVENTS[i];
        if(!eventOpen(i)){ flash($('evSub'), 'Finish the one before it first.'); return; }
        if(rating(statsOf(SAVE.car)) > ev.max){
          flash($('evSub'), 'Your car is over the class limit for this one.');
          return;
        }
        openGrid(ev);
      };
      return;
    }

    var ci = parseInt(chi, 10);
    row.onclick = function(){
      var ch2 = CHAMPIONSHIPS[ci];
      var st2 = champState(ch2.id);
      if(!champOpen(ci)){ flash($('evSub'), 'Win the season before it first.'); return; }
      if(st2.done){ flash($('evSub'), 'That season is already in the books.'); return; }
      if(rating(statsOf(SAVE.car)) > ch2.max){
        flash($('evSub'), 'Your car is over the class limit for this season.');
        return;
      }
      openGrid(champRound(ch2, st2.round));
    };
  });
}

/* ---------------------------------------------------------- the pre-race -- */

var pendingEvent = null;

function openGrid(ev){
  pendingEvent = ev;
  hideAll();
  show('ovGrid');

  var tr = TRACKS[ev.track];
  $('gridName').textContent = ev.name;
  $('gridSub').innerHTML = '<b>' + tr.name + '</b> — ' + tr.desc +
    '<br>' + ev.laps + ' laps, ' + (ev.field + 1) + ' cars. Win pays <b style="color:var(--amber)">' +
    money(ev.prize[0]) + '</b>, second ' + money(ev.prize[1]) + ', third ' + money(ev.prize[2]) + '.';

  renderStats($('gridStats'), SAVE.car, partsFor(SAVE.car), null);

  var best = SAVE.best[ev.track];
  $('gridNote').textContent = best
    ? 'Your best lap here: ' + fmtTime(best)
    : 'You have not set a lap here yet.';

  renderWager(ev);
}

/* ---------------------------------------------------------------- the bet -- */

/* The only way to lose money in the game. Prize money alone means your pile
   only ever goes up, which makes every number on it meaningless after an
   hour; a bet you can lose is what gives the rest of the economy weight.
   It is still money won by driving - nothing here can be topped up, and the
   stake is capped at what you are holding. */
var WAGER_STEPS = [0, 2500, 10000, 40000, 150000];
var wagerStake = 0;

/* Longer odds for taking on a field that outclasses your car, because that
   is the bet actually worth offering. */
function wagerOdds(ev){
  var mine = rating(statsOf(SAVE.car));
  var theirs = fieldRating(ev);
  var edge = theirs / Math.max(mine, 1);
  return clamp(Math.round(edge * 20) / 10, 1.4, 4.0);
}

function fieldRating(ev){
  var best = 0;
  for(var i = 0; i < CAR_ORDER.length; i++){
    var r = rating(carStats(CAR_ORDER[i], {}));
    if(r <= ev.max && r > best) best = r;
  }
  return best || rating(statsOf(SAVE.car));
}

function renderWager(ev){
  /* A bet you cannot lose is not a bet. With money unlimited there is nothing
     to stake, so the box goes away rather than sitting there pretending. */
  var box = $('wagerBox');
  if(freeBuild()){
    wagerStake = 0;
    if(box) box.hidden = true;
    return;
  }
  if(box) box.hidden = false;

  var odds = wagerOdds(ev);
  if(wagerStake > SAVE.credits) wagerStake = 0;

  $('wagerOdds').innerHTML = '&middot; win pays <b style="color:var(--amber)">' +
    odds.toFixed(1) + 'x</b>';

  var html = '';
  for(var i = 0; i < WAGER_STEPS.length; i++){
    var v = WAGER_STEPS[i];
    if(v > SAVE.credits && v !== 0) continue;
    html += '<button data-bet="' + v + '"' + (v === wagerStake ? ' class="on"' : '') +
            '>' + (v === 0 ? 'No bet' : money(v)) + '</button>';
  }
  $('wagerBtns').innerHTML = html;
  Array.prototype.forEach.call($('wagerBtns').children, function(b){
    b.onclick = function(){
      wagerStake = parseInt(b.getAttribute('data-bet'), 10) || 0;
      renderWager(ev);
    };
  });

  $('wagerNote').innerHTML = wagerStake === 0
    ? 'Race for the prize money only.'
    : 'Win and you take <b style="color:var(--green)">' +
      money(Math.round(wagerStake * odds)) + '</b> on top. Finish anywhere else and ' +
      'the <b style="color:var(--red)">' + money(wagerStake) + '</b> is gone.';
}

/* ------------------------------------------------------- the Speed Demon -- */

/* The workshop screen: a rolling road with the dials underneath it, so a
   change and its consequence are on the same page. Everything drawn here is
   produced by dynoPull and dynoPeak, which are the driving model's own sums -
   there is no second idea of how much power this car makes. */

var demonSweep = null;        // timestamp of the pull currently being drawn

function openDemon(){
  hideAll();
  show('ovDemon');
  drawDemon();
  dynoRun();
}

function closeDemon(){
  demonSweep = null;
  backToMenu();
}

function tick(){
  return (typeof performance !== 'undefined' && performance.now)
    ? performance.now() : Date.now();
}

/* A pull sweeps across rather than appearing, because that is what watching
   one is like, and because it makes a changed dial obvious. */
function dynoRun(){
  var started = tick();
  demonSweep = started;
  function frame(){
    if(demonSweep !== started) return;        // a newer pull took this over
    var p = clamp((tick() - started) / 620, 0, 1);
    drawDyno(p);
    if(p < 1){ requestAnimationFrame(frame); return; }
    demonSweep = null;
    var peak = dynoPeak(statsOf(SAVE.car));
    var beat = logDyno(SAVE.car, peak);
    var best = (SAVE.dyno || {})[SAVE.car];
    /* The figures were drawn before the pull finished, so the best-pull
       one is a run out of date by the time there is a best pull. */
    if(beat) drawDemon();
    $('demonNote').textContent = beat
      ? 'Best pull yet for the ' + CARS[SAVE.car].name + ': ' +
        Math.round(peak.kw) + ' kW at the wheels.'
      : 'Best this car has put down: ' + Math.round(best.kw) + ' kW at ' +
        Math.round(best.mph) + ' mph.';
  }
  requestAnimationFrame(frame);
}

/* The graph is thrust against road speed, not power against rpm, and the
   comment on dynoPull says why. Two lines: what the wheels can push, and
   what the air and the tyres take back. The gap between them is the only
   thing that makes a car accelerate, so it is shaded in - when it closes,
   you have arrived at your top speed, and you can see it coming. */
function drawDyno(p){
  var cv = $('dynoChart');
  if(!cv) return;
  var g = cv.getContext('2d');
  var w = Math.max(cv.clientWidth || 0, 280), h = 300;
  var dpr = window.devicePixelRatio || 1;
  if(cv.width !== Math.round(w * dpr)){
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
  }
  cv.style.height = h + 'px';
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);

  var s = statsOf(SAVE.car);
  var peak = dynoPeak(s);
  var pull = peak.pull;
  /* The untouched car, faintly, whenever the dials have been moved: the
     point of a dial is the difference it makes, and a difference needs the
     thing it is different from. */
  var stock = isTuned(tuneFor(SAVE.car))
    ? dynoPull(carStats(SAVE.car, partsFor(SAVE.car), neutralTune())) : null;

  var x0 = 48, x1 = w - 12, y0 = 14, y1 = h - 28;
  var maxMph = Math.max(peak.topMph, 60) * 1.08;
  var maxN = 10;
  for(var i = 0; i < pull.length; i++) maxN = Math.max(maxN, pull[i].push, pull[i].hold);
  if(stock) for(var j = 0; j < stock.length; j++) maxN = Math.max(maxN, stock[j].push);
  maxN *= 1.1;
  function X(m){ return x0 + (x1 - x0) * clamp(m / maxMph, 0, 1); }
  function Y(n){ return y1 - (y1 - y0) * clamp(n / maxN, 0, 1); }

  /* --- grid and labels --- */
  g.font = '10px "Barlow",Arial,sans-serif';
  g.lineWidth = 1;
  var mphStep = maxMph > 220 ? 50 : 25;
  for(var m = 0; m <= maxMph; m += mphStep){
    var gx = Math.round(X(m)) + 0.5;
    g.strokeStyle = '#1b2029';
    g.beginPath(); g.moveTo(gx, y0); g.lineTo(gx, y1); g.stroke();
    g.fillStyle = '#5c6677';
    g.textAlign = 'center';
    g.fillText(String(m), gx, y1 + 14);
  }
  var nStep = maxN > 14000 ? 5000 : (maxN > 6000 ? 2000 : 1000);
  for(var n = 0; n <= maxN; n += nStep){
    var gy = Math.round(Y(n)) + 0.5;
    g.strokeStyle = '#1b2029';
    g.beginPath(); g.moveTo(x0, gy); g.lineTo(x1, gy); g.stroke();
    g.fillStyle = '#5c6677';
    g.textAlign = 'right';
    g.fillText(n >= 1000 ? (n / 1000) + 'k' : String(n), x0 - 6, gy + 3);
  }
  g.fillStyle = '#5c6677';
  g.textAlign = 'left';
  g.fillText('newtons at the wheels', x0 + 3, y0 + 9);
  g.textAlign = 'right';
  g.fillText('mph', x1, y1 + 14);

  /* --- where the turbo is still asleep --- */
  if(peak.boost > 0 && peak.boostBy > 0){
    g.fillStyle = 'rgba(74,158,255,.06)';
    g.fillRect(X(0), y0, X(peak.boostFrom) - X(0), y1 - y0);
    g.fillStyle = 'rgba(74,158,255,.11)';
    g.fillRect(X(peak.boostFrom), y0, X(peak.boostBy) - X(peak.boostFrom), y1 - y0);
  }

  var cut = Math.max(2, Math.ceil(pull.length * p));

  /* --- the gap, which is the acceleration --- */
  g.beginPath();
  var opened = false, last = 0;
  for(var a = 0; a < Math.min(cut, pull.length); a++){
    if(pull[a].push <= pull[a].hold) break;
    if(!opened){ g.moveTo(X(pull[a].mph), Y(pull[a].push)); opened = true; }
    else g.lineTo(X(pull[a].mph), Y(pull[a].push));
    last = a;
  }
  if(opened){
    for(var b = last; b >= 0; b--) g.lineTo(X(pull[b].mph), Y(pull[b].hold));
    g.closePath();
    g.fillStyle = 'rgba(255,59,48,.10)';
    g.fill();
  }

  function line(samples, pick, colour, width, dashed){
    g.beginPath();
    for(var i2 = 0; i2 < Math.min(cut, samples.length); i2++){
      var sx = X(samples[i2].mph), sy = Y(pick(samples[i2]));
      if(i2 === 0) g.moveTo(sx, sy); else g.lineTo(sx, sy);
    }
    g.strokeStyle = colour;
    g.lineWidth = width;
    g.setLineDash(dashed ? [4, 4] : []);
    g.stroke();
    g.setLineDash([]);
  }

  if(stock) line(stock, function(d){ return d.push; }, 'rgba(238,242,247,.3)', 1.6, true);
  line(pull, function(d){ return d.hold; }, '#4a9eff', 1.8, false);

  /* The thrust line is drawn in two colours: where the engine is the limit,
     and where the tyres are. A car that is amber a long way up the graph is
     not short of power, it is short of grip, and no amount of turbo will fix
     that. The distinction is most of what a rolling road is for. */
  for(var i3 = 1; i3 < Math.min(cut, pull.length); i3++){
    g.beginPath();
    g.moveTo(X(pull[i3 - 1].mph), Y(pull[i3 - 1].push));
    g.lineTo(X(pull[i3].mph), Y(pull[i3].push));
    g.strokeStyle = pull[i3].slip ? '#ffd166' : '#ff3b30';
    g.lineWidth = 2.6;
    g.stroke();
  }

  /* --- where the two meet, which is as fast as it goes --- */
  if(p >= 1){
    var tx = X(peak.topMph);
    g.strokeStyle = 'rgba(238,242,247,.34)';
    g.setLineDash([3, 3]);
    g.beginPath(); g.moveTo(tx, y0); g.lineTo(tx, y1); g.stroke();
    g.setLineDash([]);
    g.fillStyle = '#eef2f7';
    g.font = '600 11px "Barlow",Arial,sans-serif';
    g.textAlign = tx > x1 - 86 ? 'right' : 'left';
    g.fillText(Math.round(peak.topMph) + ' mph flat out',
               tx + (tx > x1 - 86 ? -6 : 6), y0 + 11);
  }
}

function dynoFigure(name, value, unit){
  return '<div class="fig"><div class="n">' + name + '</div><div class="v">' +
         value + (unit ? ' <small>' + unit + '</small>' : '') + '</div></div>';
}

function drawDemon(){
  var s = statsOf(SAVE.car);
  var peak = dynoPeak(s);
  var r = rating(s);
  var best = (SAVE.dyno || {})[SAVE.car];

  $('demonFigs').innerHTML =
    dynoFigure('On the badge', Math.round(peak.flywheel), 'kW') +
    dynoFigure('Through the gears', Math.round(peak.kw), 'kW') +
    dynoFigure('Hardest it pulls', (peak.push / 1000).toFixed(1), 'kN') +
    dynoFigure('Top speed', Math.round(peak.topMph), 'mph') +
    dynoFigure('0&ndash;60', peak.zeroTo60 > 60 ? '&mdash;' : peak.zeroTo60.toFixed(1), 's') +
    dynoFigure('Boost in by',
           peak.boost > 0 ? Math.round(peak.boostBy) : '&mdash;',
           peak.boost > 0 ? 'mph' : 'no turbo') +
    dynoFigure('Grip-limited to',
           peak.slipTo > 0 ? Math.round(peak.slipTo) : '&mdash;',
           peak.slipTo > 0 ? 'mph' : 'never') +
    dynoFigure('Class', classOf(r), r + ' rating') +
    dynoFigure('Best pull', best ? Math.round(best.kw) : '&mdash;', best ? 'kW' : 'not yet');

  var tune = tuneFor(SAVE.car);
  var html = '<h2 style="font-size:20px;margin-top:18px">The dials</h2>' +
    '<p class="note2" style="margin:0">Finer than anything in the parts list, and free. ' +
    'Each one gives with one hand and takes with the other, and the graph above ' +
    'redraws so you can see which hand won.</p>';

  for(var i = 0; i < TUNE_DIALS.length; i++){
    var dial = TUNE_DIALS[i];
    var dead = dial.needs === 'boost' && !(s.boost > 0);
    html += '<h2 style="font-size:19px;margin-top:15px">' + dial.name +
            (dead ? ' <span class="chip">nothing to turn up</span>' : '') + '</h2>' +
            '<p class="note2" style="margin:0 0 7px">' + dial.d + '</p>' +
            '<div class="nav" style="justify-content:flex-start">';
    for(var st = 0; st < dial.steps.length; st++){
      var on = tune[dial.key] === st;
      html += '<button class="mini" data-dial="' + dial.key + '" data-step="' + st + '"' +
              (dead ? ' disabled style="opacity:.4"' : '') +
              (on ? ' style="border-color:var(--red);color:var(--text);background:#241318"' : '') +
              '>' + dial.steps[st].n + '</button>';
    }
    html += '</div>';
  }
  $('demonDials').innerHTML = html;

  Array.prototype.forEach.call($('demonDials').querySelectorAll('[data-dial]'), function(b){
    b.onclick = function(){
      setTune(SAVE.car, b.getAttribute('data-dial'),
              parseInt(b.getAttribute('data-step'), 10));
      drawDemon();
      dynoRun();
    };
  });
}
