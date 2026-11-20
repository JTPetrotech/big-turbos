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
    width: 13, laps: 3, grass: 0x1d2a16,
    pts: [[0,-150],[90,-130],[140,-60],[140,30],[100,110],[20,150],[-70,140],
          [-130,80],[-140,-10],[-110,-90],[-50,-145]]
  },
  docks: {
    name: 'Dockside',
    desc: 'Tight, square and unforgiving. Brake early or meet the barrier.',
    width: 11, laps: 4, grass: 0x1b1f26,
    pts: [[-120,-120],[0,-140],[120,-120],[150,-40],[110,20],[30,10],[-10,60],
          [40,110],[10,160],[-80,150],[-150,90],[-160,-20]]
  },
  ridge: {
    name: 'Ridgeback',
    desc: 'Long, fast and flowing. Rewards a car that can hold a line.',
    width: 14, laps: 2, grass: 0x18241d,
    pts: [[0,-210],[120,-190],[210,-110],[230,10],[190,120],[90,190],[-30,215],
          [-150,185],[-225,95],[-240,-30],[-190,-140],[-90,-200]]
  }
};

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

  var pts = resample(def.pts, SPACING);
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
  scene.background = new T.Color(0x0a0d14);
  scene.fog = new T.Fog(0x0a0d14, 160, 420);

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
function buildTrackMesh(track){
  if(trackGroup){ scene.remove(trackGroup); disposeTree(trackGroup); }
  trackGroup = new T.Group();

  var n = track.n, pts = track.pts, hw = track.width / 2;

  /* --- ground --- */
  var ground = new T.Mesh(
    new T.PlaneGeometry(1400, 1400),
    new T.MeshLambertMaterial({ color: track.grass })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.06;
  trackGroup.add(ground);

  /* --- road ribbon --- */
  var rv = [], ri = [], ruv = [];
  for(var i = 0; i < n; i++){
    var p = pts[i];
    var rx = Math.cos(p.dir), rz = -Math.sin(p.dir);
    rv.push(p.x - rx * hw, 0, p.z - rz * hw);
    rv.push(p.x + rx * hw, 0, p.z + rz * hw);
    ruv.push(0, p.cum / 8, 1, p.cum / 8);
  }
  for(var j = 0; j < n; j++){
    var a = j * 2, b = ((j + 1) % n) * 2;
    ri.push(a, b, a + 1, b, b + 1, a + 1);
  }
  var road = new T.BufferGeometry();
  road.setAttribute('position', new T.Float32BufferAttribute(rv, 3));
  road.setAttribute('uv', new T.Float32BufferAttribute(ruv, 2));
  road.setIndex(ri);
  road.computeVertexNormals();
  trackGroup.add(new T.Mesh(road, new T.MeshLambertMaterial({ color: 0x45484f })));

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

  /* --- barrier posts, so the edge of the road reads at speed --- */
  var postGeo = new T.BoxGeometry(0.34, 1.05, 0.34);
  var postMat = new T.MeshLambertMaterial({ color: 0x9aa4b2 });
  var posts = new T.InstancedMesh(postGeo, postMat, Math.ceil(n / 3) * 2 + 4);
  var d2 = new T.Object3D();
  var pc = 0;
  for(var b2 = 0; b2 < n; b2 += 3){
    var bp = pts[b2];
    var bx = Math.cos(bp.dir), bz = -Math.sin(bp.dir);
    for(var s2 = -1; s2 <= 1; s2 += 2){
      d2.position.set(bp.x + bx * (hw + 2.2) * s2, 0.5, bp.z + bz * (hw + 2.2) * s2);
      d2.rotation.set(0, bp.dir, 0);
      d2.updateMatrix();
      posts.setMatrixAt(pc++, d2.matrix);
    }
  }
  posts.count = pc;
  trackGroup.add(posts);

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
