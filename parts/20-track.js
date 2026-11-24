/* =========================================================================
   2  TRACKS

   A track is a handful of control points. A closed Catmull-Rom spline runs
   through them and is resampled at a fixed spacing, which gives every point
   on the lap a distance-along-the-lap number.

   Almost everything else leans on that number: lap counting, race position,
   where the AI is aiming, how far off the road you are, and the minimap. Get
   it right once and the rest is bookkeeping.
   ========================================================================= */

var SPACING = 4;              // metres between resampled centreline points

var TRACKS = {
  ring: {
    name: 'Cannery Ring',
    desc: 'Short, wide and forgiving. Two real corners and a back straight.',
    width: 13, laps: 3, grass: 0x1d2a16, runoff: 0x6d6149, scene: 'trees',
    pts: [[0,-150],[90,-130],[140,-60],[140,30],[100,110],[20,150],[-70,140],
          [-130,80],[-140,-10],[-110,-90],[-50,-145]]
  },
  docks: {
    name: 'Dockside',
    desc: 'Tight, square and unforgiving. Brake early or meet the barrier.',
    width: 11, laps: 4, grass: 0x1b1f26, runoff: 0x383b43, scene: 'crates',
    pts: [[-120,-120],[0,-140],[120,-120],[150,-40],[110,20],[30,10],[-10,60],
          [40,110],[10,160],[-80,150],[-150,90],[-160,-20]]
  },
  ridge: {
    name: 'Ridgeback',
    desc: 'Long, fast and flowing. Rewards a car that can hold a line.',
    width: 14, laps: 2, grass: 0x18241d, runoff: 0x5e5544, scene: 'trees',
    pts: [[0,-210],[120,-190],[210,-110],[230,10],[190,120],[90,190],[-30,215],
          [-150,185],[-225,95],[-240,-30],[-190,-140],[-90,-200]]
  },

  /* A quarter mile and a bit, dead straight. `shape: 'strip'` means the
     points are laid out by hand rather than run through the spline - a
     Catmull-Rom curve through collinear points is very nearly straight, and
     very nearly is not good enough when the whole event is whether you held
     a lane for 402 metres. */
  strip: {
    name: 'Mill Road Strip',
    desc: 'A quarter mile, a pair of lanes and a set of lights. Nothing to steer around.',
    width: 20, laps: 1, grass: 0x1a1d22, runoff: 0x3e4148, scene: 'poles',
    shape: 'strip', length: 530, turn: 46
  },

  /* Nothing to win. `open: true` takes the barrier away, so the road is a
     suggestion and the field around it is the point. */
  roam: {
    name: 'Mill Road',
    desc: 'No clock, no grid, no laps. Drive wherever you like, including off it.',
    width: 16, laps: 0, grass: 0x1b2a18, open: true, runoff: 0x5e5949, scene: 'trees',
    pts: [[0,-260],[170,-230],[290,-130],[320,20],[250,170],[110,250],[-40,280],
          [-190,240],[-300,130],[-330,-30],[-260,-180],[-120,-260]]
  }
};

/* The drag strip, laid out rather than splined. Start line at (0,0) pointing
   straight down +z, then a U-turn at each end so the loop still closes and
   everything downstream - distance along, the minimap, the road ribbon - keeps
   working without knowing this track is a special case. The return lane is
   never driven: a quarter mile is well short of the first turn. */
function stripPoints(def){
  var out = [], i;
  var L = def.length || 530, R = def.turn || 46, gap = R * 2;

  /* Each section is divided into a whole number of steps so that it ends
     exactly where the next one begins. Spacing has to stay even all the way
     round: the AI looks a fixed number of points ahead. */
  var ns = Math.max(4, Math.round(L / SPACING)), ds = L / ns;
  var na = Math.max(8, Math.round(Math.PI * R / SPACING));

  for(i = 0; i < ns; i++) out.push({ x: 0, z: i * ds });                 // the strip
  for(i = 0; i < na; i++){                                               // far U-turn
    var a = Math.PI * (i / na);
    out.push({ x: R - R * Math.cos(a), z: L + R * Math.sin(a) });
  }
  for(i = 0; i < ns; i++) out.push({ x: gap, z: L - i * ds });           // return lane
  for(i = 0; i < na; i++){                                               // near U-turn
    var b = Math.PI * (i / na);
    out.push({ x: R + R * Math.cos(b), z: -R * Math.sin(b) });
  }
  return out;
}

/* ------------------------------------------------------ spline resampling -- */

/* Catmull-Rom through p1->p2, with p0/p3 setting the tangents. Closed loop,
   so the indices wrap and there is no seam at the start line. */
function catmull(p0, p1, p2, p3, t){
  var t2 = t * t, t3 = t2 * t;
  return [
    0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t +
           (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
           (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
    0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t +
           (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
           (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
  ];
}

/* Walk the spline finely, then drop a point every SPACING metres. Even
   spacing matters: the AI looks a fixed number of points ahead, and uneven
   samples would make it look further ahead on straights than in corners -
   exactly backwards. */
function resample(pts, spacing){
  var fine = [];
  var n = pts.length;
  for(var i = 0; i < n; i++){
    var p0 = pts[(i - 1 + n) % n], p1 = pts[i],
        p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    for(var s = 0; s < 40; s++) fine.push(catmull(p0, p1, p2, p3, s / 40));
  }

  /* Walk the fine polyline carrying the leftover distance between segments,
     emitting a point every `spacing` metres of arc length. */
  var out = [{ x: fine[0][0], z: fine[0][1] }];
  var since = 0;                                   // distance since last emit
  for(var j = 0; j < fine.length; j++){
    var a = fine[j], b = fine[(j + 1) % fine.length];
    var dx = b[0] - a[0], dz = b[1] - a[1];
    var seg = Math.sqrt(dx * dx + dz * dz);
    if(seg < 1e-9) continue;
    var pos = 0;                                   // how far into this segment
    while(since + (seg - pos) >= spacing){
      pos += spacing - since;
      var f = pos / seg;
      out.push({ x: a[0] + dx * f, z: a[1] + dz * f });
      since = 0;
    }
    since += seg - pos;
  }

  /* Drop the last point if it landed on top of the first - a closed loop
     with a duplicate seam makes the heading at the line jump. */
  var first = out[0], last = out[out.length - 1];
  if(Math.hypot(first.x - last.x, first.z - last.z) < spacing * 0.5) out.pop();
  return out;
}

/* ------------------------------------------------------------ build track -- */

function buildTrack(key){
  var def = TRACKS[key];
  if(!def) throw new Error('no track called ' + key);

  var pts = def.shape === 'strip' ? stripPoints(def) : resample(def.pts, SPACING);
  var n = pts.length;

  /* Direction and cumulative distance at every sample. */
  var total = 0;
  for(var i = 0; i < n; i++){
    var a = pts[i], b = pts[(i + 1) % n];
    var dx = b.x - a.x, dz = b.z - a.z;
    a.seg = Math.sqrt(dx * dx + dz * dz);
    a.dir = Math.atan2(dx, dz);          // heading, 0 = +z, matching the cars
    a.cum = total;
    total += a.seg;
  }

  /* Curvature at each point, used by the AI to pick a corner speed and by the
     renderer to decide where kerbs go. Measured as the heading change over a
     short look-ahead, divided by the distance covered. */
  for(var c = 0; c < n; c++){
    var ahead = pts[(c + 3) % n];
    var d = Math.abs(angDiff(pts[c].dir, ahead.dir));
    pts[c].curve = d / (SPACING * 3);
  }
  /* Smooth it, or a single noisy sample makes the AI stab the brakes. */
  var sm = pts.map(function(_, i){
    var s = 0;
    for(var k = -2; k <= 2; k++) s += pts[(i + k + n) % n].curve;
    return s / 5;
  });
  for(var m = 0; m < n; m++) pts[m].curve = sm[m];

  return {
    key: key, name: def.name, desc: def.desc,
    width: def.width, laps: def.laps, grass: def.grass,
    runoff: def.runoff, scene: def.scene,
    open: !!def.open, shape: def.shape || 'loop',
    pts: pts, n: n, total: total
  };
}

/* ------------------------------------------------------------- where am I -- */

/* Nearest centreline point to (x,z). `hint` is where the car was last frame;
   searching outward from there turns a whole-lap scan into a few comparisons.
   Without the hint this is the hottest function in the game. */
function nearest(track, x, z, hint){
  var n = track.n, pts = track.pts;
  var bi = 0, bd = Infinity;

  if(hint !== undefined && hint !== null){
    /* 24 points either side covers roughly 190 m, far more than anything can
       travel in a frame, but still cheap. */
    for(var k = -24; k <= 24; k++){
      var i = (hint + k + n * 2) % n;
      var d = dist2(x, z, pts[i].x, pts[i].z);
      if(d < bd){ bd = d; bi = i; }
    }
    /* If the best is at the edge of the window the hint was stale - fall
       through to the full scan rather than tracking the wrong part of the
       circuit, which would scramble lap counting. */
    var off = Math.abs(((bi - hint + n + n / 2) % n) - n / 2);
    if(off < 22) return finishNearest(track, x, z, bi, bd);
  }

  for(var j = 0; j < n; j++){
    var dd = dist2(x, z, pts[j].x, pts[j].z);
    if(dd < bd){ bd = dd; bi = j; }
  }
  return finishNearest(track, x, z, bi, bd);
}

function finishNearest(track, x, z, i, d2){
  var pts = track.pts, n = track.n;
  var p = pts[i];
  /* Signed distance from the centreline: positive right of the racing
     direction, negative left. Used for the off-track penalty and for keeping
     cars apart on the grid. */
  var dx = x - p.x, dz = z - p.z;
  var rx = Math.cos(p.dir), rz = -Math.sin(p.dir);   // right-hand normal
  var lateral = dx * rx + dz * rz;
  /* How far along the centreline the car has projected, so progress is
     smooth between samples instead of stepping every 4 m. */
  var fx = Math.sin(p.dir), fz = Math.cos(p.dir);
  var ahead = clamp(dx * fx + dz * fz, 0, p.seg);
  return { i: i, lateral: lateral, along: p.cum + ahead, dist: Math.sqrt(d2) };
}

/* ------------------------------------------------------------- the scenery -- */

var scene = null, camera = null, renderer = null;
var trackGroup = null;

function initScene(){
  scene = new T.Scene();
  scene.background = new T.Color(0x05070d);
  /* Fog the colour of the horizon rather than of the zenith, so distance
     fades into the sky instead of into a dark band across the middle of
     it. Pushed back as well: 420 m put the far side of Ridgeback in a
     fog bank you could not see a corner through. */
  scene.fog = new T.Fog(0x232a3a, 240, 620);

  camera = new T.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.4, 900);

  renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  /* Capped at 2: a phone at 3x spends every frame on pixels nobody can see. */
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  document.body.appendChild(renderer.domElement);

  var sun = new T.DirectionalLight(0xfff2dd, 1.05);
  sun.position.set(-70, 120, 50);
  scene.add(sun);
  scene.add(new T.HemisphereLight(0x6e86b0, 0x14160e, 0.55));

  /* A gradient dome instead of a flat background colour. It is drawn with
     fog off and depth writing off, so it sits behind everything without
     the fog eating it and without needing to be sorted. */
  scene.add(skyDome());

  window.addEventListener('resize', onResize);
}

function onResize(){
  if(!renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

/* Road, kerbs, start line and barrier posts, all as a few merged meshes so a
   whole circuit costs a handful of draw calls rather than hundreds. */
/* ----------------------------------------------------------------- sky -- */

/* A dome with a vertical gradient painted into an 8 by 128 canvas. A flat
   background colour gives you no horizon at all, and a horizon is most of
   how a flat world reads as a landscape. Fog is off on it because fog is
   meant to fade things INTO the sky, and depth writing is off so it never
   has to be sorted against anything. */
function skyDome(){
  var c = document.createElement('canvas');
  c.width = 8; c.height = 128;
  var g = c.getContext('2d');
  var grd = g.createLinearGradient(0, 0, 0, 128);
  grd.addColorStop(0.00, '#04060b');
  grd.addColorStop(0.45, '#0a1020');
  grd.addColorStop(0.78, '#1a2132');
  grd.addColorStop(0.95, '#2b3345');
  grd.addColorStop(1.00, '#39405070'.slice(0, 7));
  g.fillStyle = grd;
  g.fillRect(0, 0, 8, 128);
  var t = new T.CanvasTexture(c);
  var dome = new T.Mesh(
    new T.SphereGeometry(620, 24, 16),
    new T.MeshBasicMaterial({ map: t, side: T.BackSide, fog: false,
                              depthWrite: false })
  );
  dome.renderOrder = -2;
  return dome;
}

/* ------------------------------------------------------------- surfaces -- */

/* Scenery makes its own materials rather than borrowing the cars cache.
   disposeTree disposes everything in the track group when a track is torn
   down, and a shared material disposed out from under the showroom is a
   car that renders black for the rest of the session. */
function lam(colour){ return new T.MeshLambertMaterial({ color: colour }); }

/* Flat colour is what makes a big surface look like a sheet of card. A few
   hundred soft specks, drawn once into a 64 px canvas and tiled, is enough
   to stop that happening and costs one texture for the whole ground. The
   specks come out of hash01 rather than Math.random, so a track looks the
   same every time it is built. */
var GRAIN_CACHE = {};
function grainTexture(hex, spread, repeat, seed){
  var key = hex + '|' + spread + '|' + repeat + '|' + seed;
  if(GRAIN_CACHE[key]) return GRAIN_CACHE[key];
  var S = 64;
  var c = document.createElement('canvas');
  c.width = c.height = S;
  var g = c.getContext('2d');
  var r0 = (hex >> 16) & 255, g0 = (hex >> 8) & 255, b0 = hex & 255;
  g.fillStyle = 'rgb(' + r0 + ',' + g0 + ',' + b0 + ')';
  g.fillRect(0, 0, S, S);
  for(var i = 0; i < 420; i++){
    var h = hash01(i * 1.37 + seed), h2 = hash01(i * 3.91 + seed), h3 = hash01(i * 7.13 + seed);
    var d = (hash01(i * 2.57 + seed) - 0.5) * 2 * spread;
    g.fillStyle = 'rgba(' + clamp(r0 + d, 0, 255).toFixed(0) + ',' +
                            clamp(g0 + d, 0, 255).toFixed(0) + ',' +
                            clamp(b0 + d, 0, 255).toFixed(0) + ',0.55)';
    g.beginPath();
    g.arc(h * S, h2 * S, 0.6 + h3 * 2.2, 0, Math.PI * 2);
    g.fill();
  }
  var t = new T.CanvasTexture(c);
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  if(renderer) t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  GRAIN_CACHE[key] = t;
  return t;
}

/* A band that follows the centreline. Each edge is given as a lateral offset
   and a height, which is all it takes to be either a flat surface or a
   standing one - the road, the run-off either side of it, the painted lines
   along its edges and the barrier rail are every one of them this. */
function band(pts, n, A, B, material, metresPerTile){
  var v = [], idx = [], uv = [];
  for(var i = 0; i < n; i++){
    var p = pts[i];
    var nx = Math.cos(p.dir), nz = -Math.sin(p.dir);
    v.push(p.x + nx * A.off, A.y, p.z + nz * A.off);
    v.push(p.x + nx * B.off, B.y, p.z + nz * B.off);
    var u = p.cum / (metresPerTile || 8);
    uv.push(0, u, 1, u);
  }
  for(var j = 0; j < n; j++){
    var a = j * 2, b = ((j + 1) % n) * 2;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  var g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(v, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return new T.Mesh(g, material);
}

/* --------------------------------------------------------------- scenery -- */

/* Where the roadside furniture goes. Everything is placed off hash01 from
   the point index, so a lap looks the same every time you drive it, and far
   enough out to be clear of anywhere a car can reach - except on free roam,
   where there is no barrier and the only honest answer is to keep the
   scenery a long way off. */
function scatterSpots(track, pts, n, every, keep, near, far){
  var out = [];
  for(var i = 0; i < n; i += every){
    for(var s = -1; s <= 1; s += 2){
      var seed = i * 2.7 + (s > 0 ? 0 : 101);
      if(hash01(seed) > keep) continue;
      var p = pts[i];
      var off = near + hash01(seed * 1.9 + 3) * (far - near);
      var along = (hash01(seed * 3.3 + 7) - 0.5) * SPACING * 2.5;
      var nx = Math.cos(p.dir), nz = -Math.sin(p.dir);
      out.push({
        x: p.x + nx * off * s + Math.sin(p.dir) * along,
        z: p.z + nz * off * s + Math.cos(p.dir) * along,
        turn: hash01(seed * 5.7 + 11) * 6.283,
        size: 0.72 + hash01(seed * 8.1 + 13) * 0.8
      });
    }
  }
  return out;
}

function placeInstances(geo, material, spots, y, scaleY, group){
  if(!spots.length) return;
  var m = new T.InstancedMesh(geo, material, spots.length);
  var d = new T.Object3D();
  for(var i = 0; i < spots.length; i++){
    var sp = spots[i];
    d.position.set(sp.x, y * sp.size * (scaleY || 1), sp.z);
    d.rotation.set(0, sp.turn, 0);
    d.scale.set(sp.size, sp.size * (scaleY || 1), sp.size);
    d.updateMatrix();
    m.setMatrixAt(i, d.matrix);
  }
  group.add(m);
}

/* Three kinds of roadside, because a dockyard with pine trees in it is a
   dockyard nobody believes. Each one is two instanced meshes at most, so a
   hundred and fifty of anything is still two draw calls. */
function buildScenery(track, pts, n, group){
  var kind = track.scene || 'trees';
  var hw = track.width / 2;
  /* Clear of the barrier on a circuit; a long way out where there is none. */
  var near = track.open ? 96 : hw + 12;

  if(kind === 'poles'){
    var poles = scatterSpots(track, pts, n, 16, 1.1, hw + 9, hw + 10);
    placeInstances(new T.CylinderGeometry(0.16, 0.22, 9, 6),
                   lam(0x6a7280), poles, 4.5, 1, group);
    placeInstances(new T.BoxGeometry(1.9, 0.3, 0.6),
                   lam(0xdfe6ef), poles, 9.1, 1, group);
    return;
  }

  if(kind === 'crates'){
    /* Shipping containers, at the real 6.06 by 2.44 by 2.59 metres, stacked
       one high and two high in roughly equal measure. */
    var lo = scatterSpots(track, pts, n, 5, 0.5, near, near + 30);
    var hi = scatterSpots(track, pts, n, 9, 0.3, near + 6, near + 34);
    var crate = new T.BoxGeometry(2.44, 2.59, 6.06);
    placeInstances(crate, lam(0x8a4a3a), lo, 1.3, 1, group);
    placeInstances(crate, lam(0x3f6276), hi, 1.3, 1, group);
    placeInstances(crate, lam(0x6d7355), hi, 3.9, 1, group);
    return;
  }

  var trees = scatterSpots(track, pts, n, 3, 0.58, near, near + 36);
  placeInstances(new T.CylinderGeometry(0.17, 0.26, 2.4, 6),
                 lam(0x3b2f24), trees, 1.2, 1, group);
  placeInstances(new T.ConeGeometry(1.85, 4.4, 7),
                 lam(0x1f3a22), trees, 4.4, 1, group);
}

function buildTrackMesh(track){
  if(trackGroup){ scene.remove(trackGroup); disposeTree(trackGroup); }
  trackGroup = new T.Group();

  var n = track.n, pts = track.pts, hw = track.width / 2;

  /* Where the physics actually puts the wall. The posts used to stand 2.2 m
     off the kerb while the barrier that stops you was out at 7, so the thing
     you could see and the thing you hit were nearly five metres apart - you
     drove straight through the posts and then bounced off nothing. A track
     should not lie about where its edges are any more than a garage should
     lie about a car. */
  var WALL = hw + 7;

  /* --- ground --- */
  var ground = new T.Mesh(
    new T.PlaneGeometry(1400, 1400),
    new T.MeshLambertMaterial({ map: grainTexture(track.grass, 22, 150, 1.7) })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.06;
  trackGroup.add(ground);

  /* --- run-off, between the kerb and the barrier --- */
  var runMat = new T.MeshLambertMaterial({
    map: grainTexture(track.runoff || 0x4a463f, 24, 26, 5.1)
  });
  for(var rs = -1; rs <= 1; rs += 2){
    trackGroup.add(band(pts, n, { off: hw * rs, y: -0.01 },
                                { off: WALL * rs, y: -0.03 }, runMat, 9));
  }

  /* --- the road --- */
  trackGroup.add(band(pts, n, { off: -hw, y: 0 }, { off: hw, y: 0 },
    new T.MeshLambertMaterial({ map: grainTexture(0x45484f, 11, 7, 2.3) }), 7));

  /* --- a painted line down each edge of it --- */
  var lineMat = new T.MeshLambertMaterial({ color: 0xcfd6de });
  for(var ls = -1; ls <= 1; ls += 2){
    trackGroup.add(band(pts, n, { off: (hw - 0.22) * ls, y: 0.012 },
                                { off: (hw - 0.02) * ls, y: 0.012 }, lineMat, 8));
  }

  /* --- kerbs, only where it actually bends --- */
  var kerbGeo = new T.BoxGeometry(1.5, 0.12, SPACING * 1.02);
  var kerbA = new T.MeshLambertMaterial({ color: 0xd94040 });
  var kerbB = new T.MeshLambertMaterial({ color: 0xe8e8e8 });
  var kerbs = [];
  for(var k = 0; k < n; k++){
    if(pts[k].curve < 0.011) continue;
    kerbs.push(k);
  }
  if(kerbs.length){
    var km = new T.InstancedMesh(kerbGeo, kerbA, kerbs.length * 2);
    var km2 = new T.InstancedMesh(kerbGeo, kerbB, kerbs.length * 2);
    var dummy = new T.Object3D();
    var cA = 0, cB = 0;
    for(var q = 0; q < kerbs.length; q++){
      var pi = kerbs[q], pp = pts[pi];
      var nx = Math.cos(pp.dir), nz = -Math.sin(pp.dir);
      for(var side = -1; side <= 1; side += 2){
        dummy.position.set(pp.x + nx * hw * side, 0.06, pp.z + nz * hw * side);
        dummy.rotation.set(0, pp.dir, 0);
        dummy.updateMatrix();
        if((pi + (side > 0 ? 0 : 1)) % 2 === 0){ km.setMatrixAt(cA++, dummy.matrix); }
        else { km2.setMatrixAt(cB++, dummy.matrix); }
      }
    }
    km.count = cA; km2.count = cB;
    trackGroup.add(km); trackGroup.add(km2);
  }

  /* --- start line --- */
  var line = new T.Mesh(
    new T.PlaneGeometry(track.width, 2.4),
    new T.MeshBasicMaterial({ color: 0xffffff })
  );
  line.rotation.x = -Math.PI / 2;
  line.position.set(pts[0].x, 0.02, pts[0].z);
  line.rotation.z = -pts[0].dir;
  trackGroup.add(line);

  /* --- the barrier, standing exactly where the wall is --- */
  if(!track.open){
    var railMat = new T.MeshLambertMaterial({ color: 0x9199a6, side: T.DoubleSide });
    var rail2 = new T.MeshLambertMaterial({ color: 0x6e7684, side: T.DoubleSide });
    for(var bs = -1; bs <= 1; bs += 2){
      trackGroup.add(band(pts, n, { off: WALL * bs, y: 0.52 },
                                  { off: WALL * bs, y: 0.86 }, railMat, 6));
      trackGroup.add(band(pts, n, { off: WALL * bs, y: 0.2 },
                                  { off: WALL * bs, y: 0.4 }, rail2, 6));
    }

    var postGeo = new T.BoxGeometry(0.2, 0.95, 0.2);
    var postMat = new T.MeshLambertMaterial({ color: 0x5c636f });
    var posts = new T.InstancedMesh(postGeo, postMat, Math.ceil(n / 3) * 2 + 4);
    var d2 = new T.Object3D();
    var pc = 0;
    for(var b2 = 0; b2 < n; b2 += 3){
      var bp = pts[b2];
      var bx = Math.cos(bp.dir), bz = -Math.sin(bp.dir);
      for(var s2 = -1; s2 <= 1; s2 += 2){
        d2.position.set(bp.x + bx * (WALL + 0.16) * s2, 0.47,
                        bp.z + bz * (WALL + 0.16) * s2);
        d2.rotation.set(0, bp.dir, 0);
        d2.updateMatrix();
        posts.setMatrixAt(pc++, d2.matrix);
      }
    }
    posts.count = pc;
    trackGroup.add(posts);
  }

  /* --- and whatever stands beyond it --- */
  buildScenery(track, pts, n, trackGroup);

  scene.add(trackGroup);
}

function disposeTree(obj){
  obj.traverse(function(o){
    if(o.geometry) o.geometry.dispose();
    if(o.material){
      if(Array.isArray(o.material)) o.material.forEach(function(m){ m.dispose(); });
      else o.material.dispose();
    }
  });
}
