/* =========================================================================
   3  THE CARS, AS OBJECTS

   Five silhouettes built out of boxes and cylinders. There is no model
   loader and no texture - the whole game is one HTML file, so everything
   here is generated at runtime from numbers.

   A car is built facing +Z, which is the same direction the track's heading
   of 0 points. That means a car's yaw can be written straight onto
   root.rotation.y with no correction anywhere, and it is worth the small
   effort of being consistent about it.
   ========================================================================= */

/* Every number here is in metres off the ground, and they are the real ones.
   They did not used to be: a hatchback stood 1.08 m when the car it is drawn
   from stands 1.45, and the whole showroom was squashed by about a quarter.
   The two trucks were the only things in the game built to the right height,
   which is exactly why they were the only things that looked like vehicles.

   `ride` is the floor of the bodywork, `hood` the beltline above that floor
   and `roof` the top of it, so a car's real height is ride + roof and its
   waist is ride + hood. A greenhouse is the gap between the two, and it was
   that gap - 0.26 m on the hatch, against something near 0.55 on the real
   thing - that was doing the squashing. */

var BODIES = {
  hatch:  { len: 4.07, wide: 1.69, ride: 0.30, hood: 0.56, roof: 1.05,
            cabF: -0.15, cabL: 1.75, nose: 0.42, tail: 0.30, wheel: 0.31, arch: 0.07 },
  coupe:  { len: 4.27, wide: 1.78, ride: 0.26, hood: 0.56, roof: 1.05,
            cabF: -0.35, cabL: 1.70, nose: 0.62, tail: 0.46, wheel: 0.33, arch: 0.08 },
  muscle: { len: 4.84, wide: 1.93, ride: 0.28, hood: 0.58, roof: 1.02,
            cabF: -0.55, cabL: 1.72, nose: 0.78, tail: 0.58, wheel: 0.35, arch: 0.10 },
  rally:  { len: 4.16, wide: 1.78, ride: 0.36, hood: 0.54, roof: 0.99,
            cabF: -0.10, cabL: 1.86, nose: 0.46, tail: 0.34, wheel: 0.34, arch: 0.13 },
  proto:  { len: 4.44, wide: 1.88, ride: 0.17, hood: 0.45, roof: 0.92,
            cabF: -0.25, cabL: 1.34, nose: 0.82, tail: 0.54, wheel: 0.34, arch: 0.11 },

  /* The turbo cars: long bonnet, low roof, cabin pushed well back. */
  a80:    { len: 4.51, wide: 1.81, ride: 0.24, hood: 0.54, roof: 1.03,
            cabF: -0.45, cabL: 1.55, nose: 0.80, tail: 0.42, wheel: 0.33, arch: 0.08 },
  a90:    { len: 4.38, wide: 1.85, ride: 0.24, hood: 0.56, roof: 1.06,
            cabF: -0.42, cabL: 1.42, nose: 0.72, tail: 0.40, wheel: 0.33, arch: 0.09 },

  /* The supercharged ones: long, wide and flat-roofed. */
  hellcoupe: { len: 5.02, wide: 1.92, ride: 0.26, hood: 0.62, roof: 1.19,
            cabF: -0.40, cabL: 1.80, nose: 0.70, tail: 0.56, wheel: 0.34, arch: 0.09 },
  hellsedan: { len: 5.10, wide: 1.90, ride: 0.27, hood: 0.61, roof: 1.21,
            cabF: -0.25, cabL: 2.10, nose: 0.66, tail: 0.52, wheel: 0.34, arch: 0.09 },

  /* The rest of the showroom: a rotary coupe, a boxy AWD saloon, the Skyline,
     a rear-engined thing with its mass in the wrong place, and a supercar
     that is mostly windscreen and wheelbase. */
  rx:     { len: 4.30, wide: 1.76, ride: 0.22, hood: 0.52, roof: 1.01,
            cabF: -0.38, cabL: 1.48, nose: 0.74, tail: 0.44, wheel: 0.32, arch: 0.08 },
  evo:    { len: 4.49, wide: 1.77, ride: 0.33, hood: 0.58, roof: 1.12,
            cabF: -0.08, cabL: 1.98, nose: 0.50, tail: 0.40, wheel: 0.33, arch: 0.11 },
  gtr:    { len: 4.60, wide: 1.79, ride: 0.27, hood: 0.57, roof: 1.10,
            cabF: -0.22, cabL: 1.74, nose: 0.62, tail: 0.46, wheel: 0.34, arch: 0.10 },
  rear:   { len: 4.29, wide: 1.78, ride: 0.24, hood: 0.54, roof: 1.06,
            cabF: 0.10, cabL: 1.52, nose: 0.52, tail: 0.66, wheel: 0.33, arch: 0.12 },
  super:  { len: 4.78, wide: 2.03, ride: 0.16, hood: 0.50, roof: 0.98,
            cabF: 0.14, cabL: 1.30, nose: 0.86, tail: 0.60, wheel: 0.35, arch: 0.10 },

  /* Trucks. Tall, upright, and sitting on much larger wheels. The pickup
     carries a `bed`, which is the length of open cargo area behind its cab -
     the one piece of bodywork nothing else here has. */
  suv:    { len: 5.10, wide: 1.93, ride: 0.52, hood: 0.60, roof: 1.28,
            cabF: -0.10, cabL: 2.45, nose: 0.52, tail: 0.34, wheel: 0.42, arch: 0.12 },
  pickup: { len: 5.89, wide: 2.23, ride: 0.62, hood: 0.58, roof: 1.41,
            cabF: 0.70, cabL: 1.70, nose: 0.58, tail: 0.22, wheel: 0.47, arch: 0.15,
            bed: 2.00 }
};

/* Materials get reused across every car on the grid - five cars each making
   their own copies of the same black plastic is wasted memory and wasted
   draw calls. Keyed by colour so a repaint still only ever makes one. */
var MAT_CACHE = {};
function mat(colour, opts){
  var key = 'L' + colour + '|' + (opts ? JSON.stringify(opts) : '');
  if(MAT_CACHE[key]) return MAT_CACHE[key];
  var m = new T.MeshLambertMaterial(Object.assign({ color: colour }, opts || {}));
  MAT_CACHE[key] = m;
  return m;
}

/* Paint, glass and metal are Phong rather than Lambert, and that one change
   does more for how a car looks than any amount of extra geometry. Lambert
   has no highlight at all, so a red car reads as a red shape; the moment a
   specular rolls across the bonnet it reads as a painted panel. The sun is a
   directional light, so the highlight moves as the car turns, which is the
   whole point of having one.

   Flat shading, deliberately. The panels below share vertices along their
   edges, and smooth normals would round every crease off into a lump. */
function shiny(colour, spec, gloss, opts, reflect){
  var key = 'P' + colour + '|' + spec + '|' + gloss + '|' + (reflect || 0) +
            '|' + (opts ? JSON.stringify(opts) : '');
  if(MAT_CACHE[key]) return MAT_CACHE[key];
  var def = Object.assign({
    color: colour, specular: spec, shininess: gloss, flatShading: true
  }, opts || {});
  /* A reflection of the world, mixed in over the paint. Kept out of the
     cache key as an object - it is one shared cube and the strength is the
     only thing that varies, so the number is what the key needs. */
  if(reflect){
    def.envMap = envCube();
    def.combine = T.MixOperation;
    def.reflectivity = reflect;
  }
  var m = new T.MeshPhongMaterial(def);
  MAT_CACHE[key] = m;
  return m;
}

/* ------------------------------------------------------- what paint sees -- */

/* Six small canvases making a cube of sky, horizon and ground for the paint
   to reflect.

   This is the difference between a red shape and a red car, and it is not
   really about shininess. A specular highlight is one bright spot where the
   sun happens to be; a car in daylight is covered in a dark band of ground
   along its lower half and a pale band of sky along its upper, with the
   line between them running along the shoulder - and that band moves as the
   car turns. Nothing about a single light source can produce it. A cube map
   can, for six 32-pixel canvases and no files.

   The colours are the ones the track is actually built from, so a car
   reflects the sky it is driving under rather than a generic grey room. */
var ENV_CUBE = null;
function envCube(){
  if(ENV_CUBE) return ENV_CUBE;
  var S = 32;
  var faces = [];
  function make(paint){
    var cv = document.createElement('canvas');
    cv.width = cv.height = S;
    paint(cv.getContext('2d'), S);
    return cv;
  }
  /* the four sides: ground below the horizon, sky above it */
  function side(g, S){
    /* Bright. The first version of this used the night-ish colours the sky
       dome is painted in, and mixing those into the paint made every car
       darker than it had been before it could reflect anything - which is
       backwards. What a car reflects along its upper half is a sky that is
       far brighter than the paint, and along its lower half a road that is
       darker. The band between the two is the whole effect. */
    var grd = g.createLinearGradient(0, 0, 0, S);
    grd.addColorStop(0.00, '#6f8bb6');
    grd.addColorStop(0.44, '#b9cbdf');
    grd.addColorStop(0.50, '#4a5260');
    grd.addColorStop(1.00, '#1c1f25');
    g.fillStyle = grd;
    g.fillRect(0, 0, S, S);
  }
  var px = make(side), nx = make(side), pz = make(side), nz = make(side);
  /* the sun lives in the sky face, up and to one side, so a panel tipping
     towards it catches a bright patch rather than a flat wash */
  var py = make(function(g, S){
    g.fillStyle = '#5d7aa6';
    g.fillRect(0, 0, S, S);
    var sun = g.createRadialGradient(S * 0.3, S * 0.34, 1, S * 0.3, S * 0.34, S * 0.66);
    sun.addColorStop(0, '#fffaf0');
    sun.addColorStop(0.3, '#c9d6e8');
    sun.addColorStop(1, 'rgba(93,122,166,0)');
    g.fillStyle = sun;
    g.fillRect(0, 0, S, S);
  });
  var ny = make(function(g, S){
    g.fillStyle = '#191c21';
    g.fillRect(0, 0, S, S);
  });
  faces = [px, nx, py, ny, pz, nz];
  ENV_CUBE = new T.CubeTexture(faces);
  ENV_CUBE.needsUpdate = true;
  return ENV_CUBE;
}
/* The same colour, darkened, for whatever needs a quieter version of it. */
function dim(colour, f){
  return ((((colour >> 16) & 255) * f | 0) << 16) |
         ((((colour >> 8) & 255) * f | 0) << 8) |
         (((colour & 255) * f) | 0);
}

/* A whisper of emissive in the car own colour. There is one sun here and
   no bounced light at all, so a panel facing away from it went to pure
   black and every car read as a bright top half sitting on a black one.
   Real paint in real shade still shows you what colour it is. */
function paintOf(colour){
  return shiny(colour, 0x5a5d66, 46, { emissive: dim(colour, 0.1) }, 0.33);
}
function chromeOf(colour){ return shiny(colour, 0xc2c8d4, 86, null, 0.6); }

/* A lamp is lit from the inside, so it is the one thing here that should not
   care which way the sun is. Basic material, no shading at all. */
function lampOf(colour){
  var key = 'B' + colour;
  if(MAT_CACHE[key]) return MAT_CACHE[key];
  MAT_CACHE[key] = new T.MeshBasicMaterial({ color: colour });
  return MAT_CACHE[key];
}

var GLASS = 0x1b2430, TYRE = 0x14161a, DARK = 0x23262c, SHADE = 0x101216;

function glassOf(){
  /* A tight highlight rather than a broad one. These are big flat panes,
     and a soft specular lights the whole windscreen at once, which reads
     as white card. A narrow one catches the sun only at the angle that
     should catch it, and glints as the car turns. */
  return shiny(GLASS, 0x7f93a8, 220, { transparent: true, opacity: 0.82 }, 0.42);
}

/* Anything that takes a colour takes a material just as happily, so the
   painted parts can be glossy without every call site growing an argument. */
function useMat(c){ return (c && typeof c === 'object') ? c : mat(c); }

function box(w, h, d, colour, x, y, z, opts){
  var m = new T.Mesh(new T.BoxGeometry(w, h, d), opts ? mat(colour, opts) : useMat(colour));
  m.position.set(x, y, z);
  return m;
}

/* An eight-cornered panel: a back face at z0 and a front face at z1, each
   with its own bottom and top height, its own half-width at the bottom and
   at the top, and its own rake - how far the top edge sits forward of the
   bottom one.

   Nearly every panel on a car is one of these, and not one of them is a box.
   A body tucks under at the sills and pinches in towards the nose. A
   greenhouse leans inwards at the roof and rakes back hard at the
   windscreen. The difference between a car and a brick is mostly this
   function, which is why it replaced the wedge that used to live here. */
function panel(z0, z1, back, front, colour){
  var v = [
    -back.wb,  back.yb,  z0,            back.wb,  back.yb,  z0,
     front.wb, front.yb, z1,           -front.wb, front.yb, z1,
    -back.wt,  back.yt,  z0 + (back.rz || 0),
     back.wt,  back.yt,  z0 + (back.rz || 0),
     front.wt, front.yt, z1 + (front.rz || 0),
    -front.wt, front.yt, z1 + (front.rz || 0)
  ];
  var idx = [
    0,1,2, 0,2,3,        // bottom
    4,6,5, 4,7,6,        // top
    0,4,5, 0,5,1,        // back
    3,2,6, 3,6,7,        // front
    0,3,7, 0,7,4,        // left
    1,5,6, 1,6,2         // right
  ];
  var g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(v, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return new T.Mesh(g, useMat(colour));
}

/* ------------------------------------------------------------- the wheel -- */

/* A wheel face, drawn once into a canvas per rim colour.

   It used to be geometry: a disc, two crossed bars for spokes and a hub, so
   five meshes a wheel and twenty a car before the body had been built. A
   wheel is the one part of a car that is nearly flat and seen nearly
   face-on, which makes it the one part where a picture does the job
   properly - five spokes with the light falling off down each one, lug
   nuts, a brake disc turning behind them and a caliper over it. All of that
   is two triangles and a texture, and it reads better than the geometry
   did at any distance you ever see a wheel from.

   Transparent outside the rim, so the tyre's own black face shows through
   and the sidewall still reads as rubber. */
var RIM_CACHE = {};
function rimTexture(rimColour){
  if(RIM_CACHE[rimColour]) return RIM_CACHE[rimColour];
  var S = 256, R = S / 2;
  var cv = document.createElement('canvas');
  cv.width = cv.height = S;
  var g = cv.getContext('2d');
  var hex = function(n){ return '#' + ('000000' + (n >>> 0).toString(16)).slice(-6); };
  var rim = hex(rimColour), lit = hex(dim(rimColour, 1.0)), shade = hex(dim(rimColour, 0.45));

  g.translate(R, R);

  /* Behind everything: the brake disc, and a caliper sitting over it at
     about four o'clock where one usually is. */
  g.fillStyle = '#2b2e34';
  g.beginPath(); g.arc(0, 0, R * 0.70, 0, 6.2832); g.fill();
  g.strokeStyle = '#3c4047';
  g.lineWidth = R * 0.03;
  for(var d = 0; d < 7; d++){
    g.beginPath(); g.arc(0, 0, R * (0.30 + d * 0.055), 0, 6.2832); g.stroke();
  }
  g.fillStyle = '#6d2f2a';
  g.beginPath();
  g.arc(0, 0, R * 0.68, 0.5, 1.35);
  g.arc(0, 0, R * 0.40, 1.35, 0.5, true);
  g.closePath(); g.fill();

  /* The rim: an outer lip catching the light at the top, a darker inner
     barrel, then the spokes over both. */
  var lipGrad = g.createLinearGradient(0, -R, 0, R);
  lipGrad.addColorStop(0, lit);
  lipGrad.addColorStop(0.55, rim);
  lipGrad.addColorStop(1, shade);
  g.strokeStyle = lipGrad;
  g.lineWidth = R * 0.11;
  g.beginPath(); g.arc(0, 0, R * 0.80, 0, 6.2832); g.stroke();
  g.strokeStyle = shade;
  g.lineWidth = R * 0.04;
  g.beginPath(); g.arc(0, 0, R * 0.73, 0, 6.2832); g.stroke();

  var SPOKES = 5;
  for(var k = 0; k < SPOKES; k++){
    g.save();
    g.rotate(k * 6.2832 / SPOKES);
    var sg = g.createLinearGradient(-R * 0.1, 0, R * 0.1, 0);
    sg.addColorStop(0, shade);
    sg.addColorStop(0.42, lit);
    sg.addColorStop(1, rim);
    g.fillStyle = sg;
    g.beginPath();
    g.moveTo(-R * 0.115, -R * 0.14);
    g.lineTo(R * 0.115, -R * 0.14);
    g.lineTo(R * 0.075, -R * 0.78);
    g.lineTo(-R * 0.075, -R * 0.78);
    g.closePath();
    g.fill();
    g.restore();
  }

  /* The hub, and five nuts on it. */
  var hg = g.createLinearGradient(0, -R * 0.3, 0, R * 0.3);
  hg.addColorStop(0, lit);
  hg.addColorStop(1, shade);
  g.fillStyle = hg;
  g.beginPath(); g.arc(0, 0, R * 0.235, 0, 6.2832); g.fill();
  g.fillStyle = shade;
  for(var n = 0; n < 5; n++){
    var a = n * 6.2832 / 5 - 1.57;
    g.beginPath();
    g.arc(Math.cos(a) * R * 0.145, Math.sin(a) * R * 0.145, R * 0.034, 0, 6.2832);
    g.fill();
  }
  g.fillStyle = '#1a1d22';
  g.beginPath(); g.arc(0, 0, R * 0.072, 0, 6.2832); g.fill();

  var t = new T.CanvasTexture(cv);
  if(renderer) t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  RIM_CACHE[rimColour] = t;
  return t;
}

/* Tread, drawn round the circumference. A plain black cylinder is a plain
   black cylinder however fast it is turning; blocks with a groove between
   them tell you the wheel is rotating, which is most of what a tyre is
   there to say. */
var TREAD_TEX = null;
function treadTexture(){
  if(TREAD_TEX) return TREAD_TEX;
  var W = 32, H = 32;
  var cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  var g = cv.getContext('2d');
  g.fillStyle = '#17191d';
  g.fillRect(0, 0, W, H);
  /* shoulder blocks down each edge, and a groove either side of centre */
  g.fillStyle = '#23262b';
  for(var i = 0; i < 4; i++){
    g.fillRect(i * 8 + 1, 1, 6, 8);
    g.fillRect(i * 8 + 1, H - 9, 6, 8);
    g.fillRect(i * 8 + 3, 11, 4, 10);
  }
  g.fillStyle = '#0e1013';
  g.fillRect(0, 9, W, 2);
  g.fillRect(0, H - 11, W, 2);
  var t = new T.CanvasTexture(cv);
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.repeat.set(9, 1);
  if(renderer) t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  TREAD_TEX = t;
  return t;
}

/* A grille, drawn rather than built. Slats are the sort of thing that
   wants eight thin boxes and deserves none of them. */
var GRILLE_CACHE = {};
function grilleTexture(slats){
  if(GRILLE_CACHE[slats]) return GRILLE_CACHE[slats];
  var W = 64, H = 32;
  var cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  var g = cv.getContext('2d');
  g.fillStyle = '#0a0b0e';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#262a31';
  var gap = H / slats;
  for(var i = 0; i < slats; i++){
    g.fillRect(0, i * gap + gap * 0.22, W, gap * 0.4);
  }
  /* a highlight along the top edge of each slat, which is what makes a
     grille read as metal rather than as stripes */
  g.fillStyle = '#464c57';
  for(var j = 0; j < slats; j++){
    g.fillRect(0, j * gap + gap * 0.22, W, Math.max(1, gap * 0.12));
  }
  var t = new T.CanvasTexture(cv);
  if(renderer) t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  GRILLE_CACHE[slats] = t;
  return t;
}

var GRILLE_MATS = {};
function grilleMat(slats){
  if(!GRILLE_MATS[slats]){
    GRILLE_MATS[slats] = new T.MeshPhongMaterial({
      color: 0xffffff, map: grilleTexture(slats), specular: 0x40454e, shininess: 30
    });
  }
  return GRILLE_MATS[slats];
}

var TYRE_MAT = null;
function tyreMat(){
  if(!TYRE_MAT){
    TYRE_MAT = new T.MeshPhongMaterial({
      color: 0xffffff, map: treadTexture(), specular: 0x1c1f24, shininess: 8
    });
  }
  return TYRE_MAT;
}

var RIM_MATS = {};
function rimMat(rimColour){
  if(!RIM_MATS[rimColour]){
    RIM_MATS[rimColour] = new T.MeshBasicMaterial({
      map: rimTexture(rimColour), transparent: true, side: T.DoubleSide
    });
  }
  return RIM_MATS[rimColour];
}

/* Two meshes: a tyre, and a picture of a wheel on the outboard end of it.
   The inboard side is never once seen from a chase camera - but which side
   is outboard depends on which side of the car the wheel is bolted to, and
   getting that wrong puts the back of every near-side wheel towards you. */
function buildWheel(radius, width, rimColour, side){
  var g = new T.Group();

  var tyre = new T.Mesh(
    new T.CylinderGeometry(radius, radius, width, 24),
    tyreMat()
  );
  tyre.rotation.z = Math.PI / 2;        // lay the cylinder on its side
  g.add(tyre);

  var face = new T.Mesh(new T.PlaneGeometry(radius * 2, radius * 2),
                        rimMat(rimColour));
  face.rotation.y = (side < 0 ? -1 : 1) * Math.PI / 2;
  face.position.x = (side < 0 ? -1 : 1) * (width / 2 + 0.006);
  g.add(face);

  return g;
}

/* --------------------------------------------------------------- the car -- */

/* `lift` is ride height added by a lift kit, in metres, straight off
   carStats - so the truck you see on the grid is the one the physics is
   driving, down to how far off the ground it is sitting. Bigger tyres come
   with it, because that is what a lift kit actually is. */

/* Two textures, both drawn into a canvas at runtime like everything else
   here, so the file still has no external references.

   The numberplate carries whatever the player typed on it. */
var PLATE_CACHE = {};
function plateTexture(text){
  var key = text || '';
  if(PLATE_CACHE[key]) return PLATE_CACHE[key];
  var c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  var g = c.getContext('2d');
  g.fillStyle = '#e9e4d0'; g.fillRect(0, 0, 256, 64);
  g.fillStyle = '#14161a';
  g.font = 'bold 42px ui-monospace, Menlo, Consolas, monospace';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(key.toUpperCase().slice(0, 8), 128, 34);
  var t = new T.CanvasTexture(c);
  PLATE_CACHE[key] = t;
  return t;
}

/* The other is a soft dark blob that goes on the road under each car. There
   are no real shadows in this renderer - they would cost a depth pass per
   frame for every car on the grid - and without something down there a car
   reads as hovering a foot above the track. One fuzzy ellipse fixes that,
   and it is the cheapest realism in the whole file. */
var SHADOW_TEX = null;
function shadowTexture(){
  if(SHADOW_TEX) return SHADOW_TEX;
  var c = document.createElement('canvas');
  c.width = c.height = 64;
  var g = c.getContext('2d');
  /* Darkest down the middle where the floor of the car is closest to the
     road, and darker again at the four corners where a tyre is actually
     touching it. One even blob read as a car hovering over a smudge. */
  var grd = g.createRadialGradient(32, 32, 1, 32, 32, 31);
  grd.addColorStop(0, 'rgba(0,0,0,0.46)');
  grd.addColorStop(0.55, 'rgba(0,0,0,0.26)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  var spots = [[20, 15], [44, 15], [20, 49], [44, 49]];
  for(var i = 0; i < spots.length; i++){
    var t = g.createRadialGradient(spots[i][0], spots[i][1], 0.5,
                                   spots[i][0], spots[i][1], 10);
    t.addColorStop(0, 'rgba(0,0,0,0.5)');
    t.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = t;
    g.fillRect(spots[i][0] - 10, spots[i][1] - 10, 20, 20);
  }
  SHADOW_TEX = new T.CanvasTexture(c);
  return SHADOW_TEX;
}

function buildCar(carKey, looks, lift){
  var def = CARS[carKey];
  var b = BODIES[def.body] || BODIES.coupe;
  lift = lift || 0;
  looks = looks || { paint: defaultPaint(carKey), wheel: 1, stripe: 0, spoiler: false,
                     kit: 0, size: 0 };
  var kit = kitAt(looks.kit || 0);
  var wsize = (WHEEL_SIZES[looks.size || 0] || WHEEL_SIZES[0]).d;

  var paint = paintColour(carKey, looks);
  var rim = (WHEELS[looks.wheel] || WHEELS[1]).c;
  var stripe = (STRIPES[looks.stripe] || STRIPES[0]).c;

  var skin = paintOf(paint);
  var glass = glassOf();

  var root = new T.Group();
  var hull = new T.Group();
  hull.position.y = b.ride + lift;
  root.add(hull);
  /* The body is kept separate from the wheels so it can lean on them. It
     rotates about its own origin, which sits on the centreline at ride
     height - near enough where a real roll centre is that the car pivots
     where it looks like it should. */
  root.userData.hull = hull;

  var L = b.len, W = b.wide, hw = W / 2;
  var mid = L - b.nose - b.tail;
  var zF = mid / 2, zR = -mid / 2;        // where the nose and the tail begin

  /* ---- the body, tucked under at the sills ---- */
  hull.add(panel(zR, zF,
    { yb: 0.02, yt: b.hood, wb: hw * 0.92, wt: hw },
    { yb: 0.02, yt: b.hood, wb: hw * 0.92, wt: hw }, skin));

  /* ---- the nose: bonnet dropping away and the whole thing narrowing ---- */
  hull.add(panel(zF, zF + b.nose,
    { yb: 0.03, yt: b.hood,        wb: hw * 0.92, wt: hw },
    { yb: 0.11, yt: b.hood * 0.78, wb: hw * 0.70, wt: hw * 0.76,
      rz: -b.nose * 0.12 }, skin));

  /* ---- and the tail, which rises instead of falling ---- */
  hull.add(panel(zR - b.tail, zR,
    { yb: 0.10, yt: b.hood * 1.02, wb: hw * 0.72, wt: hw * 0.80,
      rz: b.tail * 0.1 },
    { yb: 0.02, yt: b.hood,        wb: hw * 0.92, wt: hw }, skin));

  /* ---- the greenhouse: leaning in at the roof, raked at both screens ---- */
  var cabW = W * 0.86, chw = cabW / 2;
  var cz0 = b.cabF - b.cabL / 2, cz1 = b.cabF + b.cabL / 2;
  var roofW = chw * 0.80;
  hull.add(panel(cz0, cz1,
    { yb: b.hood, yt: b.roof, wb: chw, wt: roofW, rz: b.cabL * 0.17 },
    { yb: b.hood, yt: b.roof, wb: chw, wt: roofW, rz: -b.cabL * 0.27 }, skin));

  /* Glass sits just proud of it in the same shape, stopping short at both
     ends so the pillars stay painted. */
  var gLo = b.hood + (b.roof - b.hood) * 0.17;
  var gHi = b.hood + (b.roof - b.hood) * 0.82;
  var gz0 = cz0 + b.cabL * 0.07, gz1 = cz1 - b.cabL * 0.07;
  hull.add(panel(gz0, gz1,
    { yb: gLo, yt: gHi, wb: chw + 0.012, wt: roofW + 0.012, rz: b.cabL * 0.14 },
    { yb: gLo, yt: gHi, wb: chw + 0.012, wt: roofW + 0.012, rz: -b.cabL * 0.22 },
    glass));

  /* ---- a mirror on each door ---- */
  for(var sm = -1; sm <= 1; sm += 2){
    hull.add(box(0.15, 0.055, 0.085, skin,
                 sm * (chw + 0.1), b.hood + (b.roof - b.hood) * 0.26,
                 b.cabF + b.cabL * 0.34));
  }

  /* ---- stripe down the middle, if one is on ---- */
  if(stripe !== null && stripe !== undefined){
    var sw = W * 0.085;
    hull.add(box(sw * 2, 0.012, mid, stripe, 0, b.hood + 0.007, 0));
    hull.add(box(cabW * 0.2, 0.012, b.cabL * 0.9, stripe, 0, b.roof + 0.006, b.cabF));
    /* over the bonnet too, following it down rather than floating off it */
    hull.add(panel(zF, zF + b.nose * 0.9,
      { yb: b.hood, yt: b.hood + 0.012, wb: sw, wt: sw },
      { yb: b.hood * 0.80, yt: b.hood * 0.80 + 0.012, wb: sw, wt: sw,
        rz: -b.nose * 0.11 }, stripe));
  }

  /* ---- lights, grille and pipes ---- */

  /* A lamp is three things, not one: a dark housing sunk into the body, a
     lens sitting proud in it, and a bright element behind the lens. One
     flat rectangle of light had the whole car reading as a toy, because a
     headlight on a real car is a hole in the bodywork with something shiny
     at the bottom of it. */
  var lz = zF + b.nose * 0.74;
  var bz = zR - b.tail * 0.88;
  for(var s = -1; s <= 1; s += 2){
    /* headlight: housing, lens, and a strip of running light under it */
    hull.add(box(0.34, 0.115, 0.055, SHADE, s * W * 0.28, b.hood * 0.6, lz - 0.012));
    hull.add(box(0.30, 0.082, 0.045, lampOf(0xf2ecd8), s * W * 0.28, b.hood * 0.605, lz));
    hull.add(box(0.26, 0.018, 0.04, lampOf(0xbfd8ff), s * W * 0.28, b.hood * 0.52, lz + 0.004));
    /* an indicator out at the corner, amber, where they all are */
    hull.add(box(0.075, 0.05, 0.04, lampOf(0xd98018), s * W * 0.44, b.hood * 0.58, lz - 0.03));

    /* tail light: the same idea in red, with a darker surround */
    hull.add(box(0.30, 0.105, 0.045, SHADE, s * W * 0.3, b.hood * 0.7, bz + 0.01));
    hull.add(box(0.26, 0.072, 0.04, lampOf(0xc8251d), s * W * 0.3, b.hood * 0.7, bz));
    hull.add(box(0.085, 0.03, 0.035, lampOf(0xe8e2d4), s * W * 0.22, b.hood * 0.64, bz + 0.002));
  }
  /* a bar between the tail lights, the way everything has had since 2015 */
  hull.add(box(W * 0.44, 0.035, 0.03, lampOf(0x8e1c18), 0, b.hood * 0.7, bz));

  /* The grille, and the intake under it. Both are one mesh carrying a
     picture of slats; the upper one is finer than the lower, because that
     is how they are made. */
  var gUp = new T.Mesh(new T.BoxGeometry(W * 0.44, b.hood * 0.2, 0.05), grilleMat(5));
  gUp.position.set(0, b.hood * 0.44, zF + b.nose * 0.88);
  hull.add(gUp);
  var gLo = new T.Mesh(new T.BoxGeometry(W * 0.58, b.hood * 0.16, 0.05), grilleMat(3));
  gLo.position.set(0, b.hood * 0.17, zF + b.nose * 0.84);
  hull.add(gLo);

  for(var sp = -1; sp <= 1; sp += 2){
    var pipe = new T.Mesh(
      new T.CylinderGeometry(0.045, 0.045, 0.11, 8),
      chromeOf(0x9aa2ae)
    );
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(sp * W * 0.24, 0.1, zR - b.tail * 0.95);
    hull.add(pipe);
  }

  /* body kit: a front splitter and wider arches, both cosmetic */
  if(kit.splitter > 0){
    hull.add(box(W * 1.02, 0.05, kit.splitter, DARK, 0, b.hood * 0.1,
                 zF + b.nose * 0.86));
  }
  /* Wide arches are not a plank down each flank, which is what they were:
     they are a bulge over each wheel and nothing in between. The arch lip
     built with the wheels below already knows how wide the kit is, so it
     does the whole job and there is nothing to add here. */

  /* numberplate, front and back */
  if(looks.plate){
    var pg = new T.PlaneGeometry(0.52, 0.13);
    var pm = new T.MeshBasicMaterial({ map: plateTexture(looks.plate) });
    var pf = new T.Mesh(pg, pm);
    pf.position.set(0, b.hood * 0.3, zF + b.nose * 0.9);
    hull.add(pf);
    var pb = new T.Mesh(pg, pm);
    pb.position.set(0, b.hood * 0.36, zR - b.tail * 0.93);
    pb.rotation.y = Math.PI;
    hull.add(pb);
  }

  /* A rocker panel each side, to kill the floating-brick look. Body
     coloured, because on nearly every car it is - as a dark plank it put a
     black band down the whole flank and made every car look like it was
     sitting in its own shadow. The dark part is the thin shut line under
     it, which is all that should be dark. */
  for(var s2 = -1; s2 <= 1; s2 += 2){
    hull.add(box(0.07, b.hood * 0.34, L * 0.56, skin, s2 * hw, b.hood * 0.21, 0));
    hull.add(box(0.075, 0.022, L * 0.56, SHADE, s2 * hw, b.hood * 0.05, 0));
  }

  /* Door shuts and a handle on each one. A flank with no line down it is a
     panel; two lines and something to pull turn it into a door, and it is
     the cheapest detail on the whole car - a shut is a dark sliver a
     centimetre wide sunk into the side.

     Where they go follows the cabin, not the car: the front shut sits just
     behind the windscreen and the rear one at the back of the glass, so a
     long-cabin saloon gets two doors a side and a short-cabin coupe gets
     one that reaches most of the way back. */
  var longCab = b.cabL > 1.8 && !b.bed;
  var shutZ = longCab
    ? [cz1 - b.cabL * 0.06, b.cabF - b.cabL * 0.04, cz0 + b.cabL * 0.04]
    : [cz1 - b.cabL * 0.06, cz0 + b.cabL * 0.1];
  for(var sd = -1; sd <= 1; sd += 2){
    for(var q = 0; q < shutZ.length; q++){
      hull.add(box(0.016, (b.hood - b.ride * 0.2) * 0.74, 0.014, SHADE,
                   sd * (hw - 0.005), b.hood * 0.52, shutZ[q]));
    }
    /* one handle per door, tucked just under the glass line */
    for(var q2 = 0; q2 < shutZ.length - 1; q2++){
      var mz = (shutZ[q2] + shutZ[q2 + 1]) / 2;
      hull.add(box(0.022, 0.035, 0.13, chromeOf(0x9aa2ae),
                   sd * (hw + 0.004), b.hood * 0.8, mz));
    }
  }

  /* side skirts, sitting just outboard of whatever the arches are doing */
  if(kit.skirt > 0){
    for(var ks = -1; ks <= 1; ks += 2){
      hull.add(box(0.06, kit.skirt, L * 0.5, DARK,
                   ks * (hw + (kit.arch || 0) * 0.9),
                   kit.skirt * 0.5 - 0.02, 0));
    }
  }

  /* a scoop, on the bonnet or up on the roof like a rally car */
  if(kit.scoop === 1){
    hull.add(box(W * 0.3, 0.07, 0.34, DARK, 0, b.hood + 0.035, zF - 0.34));
  } else if(kit.scoop === 2){
    hull.add(box(W * 0.22, 0.09, 0.3, skin, 0, b.roof + 0.045,
                 b.cabF + b.cabL * 0.3));
  }

  /* The wing. A kit built on the Workbench says which one; the old on/off
     spoiler still works for saves and presets that do not. */
  var wing = kit.wing || (looks.spoiler ? 2 : 0);
  var sz = zR - b.tail * 0.7;
  /* Wing heights hang off the bootlid, not off the roof. They were a
     fraction of the roof height, which only ever looked right because the
     roof was too low - give a car its real height and a ducktail floats a
     foot above the boot it is supposed to be bolted to. */
  if(wing === 1){
    hull.add(box(W * 0.8, 0.07, 0.18, skin, 0, b.hood + 0.05, sz));
  } else if(wing === 2){
    hull.add(box(W * 0.84, 0.05, 0.34, skin, 0, b.hood + 0.3, sz));
    for(var s3 = -1; s3 <= 1; s3 += 2){
      hull.add(box(0.07, 0.26, 0.1, DARK, s3 * W * 0.3, b.hood + 0.15, sz));
    }
  } else if(wing === 3){
    hull.add(box(W * 0.98, 0.04, 0.42, DARK, 0, b.hood + 0.55, sz));
    for(var s4 = -1; s4 <= 1; s4 += 2){
      hull.add(box(0.05, 0.46, 0.26, DARK,
                   s4 * W * 0.4, b.hood + 0.3, sz + 0.05));
    }
  }

  /* a pickup's bed: an open box behind the cab, with a tailgate */
  if(b.bed){
    var bedZ = b.cabF - b.cabL / 2 - b.bed / 2;
    var wallH = (b.roof - b.hood) * 0.72;
    var wallY = b.hood + wallH / 2;
    for(var sw2 = -1; sw2 <= 1; sw2 += 2){
      hull.add(box(W * 0.07, wallH, b.bed, skin, sw2 * (hw - W * 0.035), wallY, bedZ));
    }
    hull.add(box(W * 0.93, wallH, 0.09, skin, 0, wallY, bedZ + b.bed / 2));   // bulkhead
    hull.add(box(W * 0.93, wallH, 0.09, skin, 0, wallY, bedZ - b.bed / 2));   // tailgate
    hull.add(box(W * 0.88, 0.05, b.bed * 0.96, DARK, 0, b.hood + 0.03, bedZ)); // floor
  }

  /* ------------------------------------------------------------ wheels -- */

  /* A lift goes on tyres as well as springs, so the wheels grow with it. */
  var wr = b.wheel + lift * 0.42 + wsize, ww = 0.26 + lift * 0.22 + wsize * 0.5;
  var axleF = zF - 0.18;
  var axleR = zR + 0.22;
  var halfTrack = hw - ww / 2 + b.arch * 0.4;

  root.userData.wheels = [];
  root.userData.steered = [];
  var spots = [[axleF, 1], [axleF, -1], [axleR, 1], [axleR, -1]];
  for(var i = 0; i < spots.length; i++){
    var z = spots[i][0], side = spots[i][1];
    var holder = new T.Group();                 // steering turns this
    holder.position.set(side * halfTrack, wr, z);
    var w = buildWheel(wr, ww, rim, side);
    holder.add(w);
    root.add(holder);
    root.userData.wheels.push(w);
    if(i < 2) root.userData.steered.push(holder);

    /* An arch lip over each wheel, so the body does not float above them.
       The hull is raised by the ride height, which puts a wheel centre
       BELOW zero in hull space - and that correction used to be subtracted
       from z rather than y, which slid every arch a foot back from the
       wheel it belonged to and left it sticking out of the flank like a
       shelf. It is only obvious once the body has a shape to stick out of. */
    var archY = Math.min(b.hood * 0.92,
                Math.max(b.hood * 0.34, 2 * wr - b.ride - lift));
    hull.add(box(0.12 + kit.arch, (b.arch + kit.arch) * 2, wr * 2.1, skin,
                 side * (hw - 0.04 + kit.arch * 0.5), archY, z));
  }

  /* ---- and the blob on the road underneath all of it ---- */
  var shadow = new T.Mesh(
    new T.PlaneGeometry(W * 1.7, L * 1.12),
    new T.MeshBasicMaterial({ map: shadowTexture(), transparent: true,
                              depthWrite: false, opacity: 0.85 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.015;
  shadow.renderOrder = -1;
  root.add(shadow);

  root.userData.paintMat = skin;
  return root;
}

/* Spin the wheels and turn the front pair. Called every frame per car, so it
   stays arithmetic and touches nothing it does not have to. */
function animateCar(obj, speed, steer, dt, roll, pitch, hand){
  var u = obj.userData;
  if(!u || !u.wheels) return;
  var spin = (speed * dt) / 0.33;
  for(var i = 0; i < u.wheels.length; i++){
    /* The back two stop turning when the handbrake locks them, which is
       the whole of what a handbrake looks like from outside the car. They
       are the last two because that is the order buildCar adds them in:
       front pair, then rear pair. */
    var locked = hand && i >= 2;
    u.wheels[i].rotation.x -= locked ? 0 : spin;
  }
  /* Negated, because rotation.y turns a wheel to its left and the steer this
     is handed is positive for right. The front wheels used to point the way
     the car was not going, which is a quiet confirmation of the same slip. */
  for(var j = 0; j < u.steered.length; j++) u.steered[j].rotation.y = -steer * 0.44;
  /* The body leans and dips; the wheels stay on the road, because they are
     on the root and the body is not. */
  if(u.hull){
    u.hull.rotation.z = roll || 0;
    u.hull.rotation.x = pitch || 0;
  }
}

/* ---------------------------------------------------------- portraits -- */

/* A picture of each car, taken with the car builder itself.

   Sixteen names in a list do not tell you which one is the wide one, which
   one is the tall one or which one you are about to spend a hundred and
   fifty thousand on. A drawn icon would have fixed that and introduced a
   second description of a car - one that can quietly drift out of step with
   the first, which is exactly why the garage reads its figures out of
   carStats instead of a typed table. So these are photographs: the same
   buildCar, the same bodies, the same paint and wheels you fitted, shot
   three-quarters on.

   One small renderer of its own, built the first time a picture is asked
   for, and the result copied straight into a canvas sitting in the page.
   Straight, because the obvious way round - render, toDataURL, hand the
   string to an <img> - spends 43 of its 60 milliseconds encoding a PNG
   nothing will ever save. Copying the pixels across takes one, so the
   pictures cost about three milliseconds each and need no cache at all.

   If the machine will not hand over a second WebGL context, paintCar says
   so and the showroom goes back to being a list. */

/* A wide frame, because a car is a wide thing. Shot into 4:3 the car was
   a strip across the middle with sky above it and road below, and 93 per
   cent of the picture was neither. Two to one, which is about the shape a
   car turned three-quarters on actually makes once perspective has had its
   way with it - squarer than the side-on silhouette you picture. */
var THUMB_W = 152, THUMB_H = 76;
var THUMB = { ren: null, scene: null, cam: null, dead: false };

function thumbRig(){
  if(THUMB.ren || THUMB.dead) return THUMB.ren;
  try {
    /* preserveDrawingBuffer because the whole point is to read the pixels
       back out again afterwards. */
    var ren = new T.WebGLRenderer({ antialias: true, alpha: true,
                                    preserveDrawingBuffer: true });
    ren.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    ren.setSize(THUMB_W, THUMB_H, false);
    var sc = new T.Scene();
    /* Lit from over the camera's left shoulder, where a photographer would
       put the light: the highlight then runs along the shoulder line
       instead of sitting in the middle of the roof. */
    var sun = new T.DirectionalLight(0xfff4e2, 1.15);
    sun.position.set(-9, 11, 10);
    sc.add(sun);
    /* A fill from the other side at a third of the strength, the way a
       photographer puts a reflector opposite the light. Without it the
       shaded flank of every car went to the same near-black and the colour
       you are being sold only existed on one side of the car. */
    var fill = new T.DirectionalLight(0xbcd0f0, 0.42);
    fill.position.set(8, 4, -7);
    sc.add(fill);
    sc.add(new T.HemisphereLight(0x8ea6cc, 0x191c22, 0.72));
    THUMB.ren = ren;
    THUMB.scene = sc;
    THUMB.cam = new T.PerspectiveCamera(18.8, THUMB_W / THUMB_H, 0.4, 120);
  } catch(e){
    THUMB.dead = true;
  }
  return THUMB.ren;
}

/* Geometries only. Every material a car is made of comes out of MAT_CACHE
   and is shared with the car you are driving, so disposing those here would
   take the paint off the road as well. */
function dropGeometry(obj){
  obj.traverse(function(o){ if(o.geometry) o.geometry.dispose(); });
}

/* Photograph a car into a canvas that is already in the page. Answers
   whether it managed it. */
function paintCar(target, carKey, looks){
  if(!target || !CARS[carKey]) return false;
  if(!thumbRig()) return false;

  looks = looks || showLooks(carKey);
  var car = buildCar(carKey, looks, 0);
  var b = BODIES[CARS[carKey].body] || BODIES.coupe;
  THUMB.scene.add(car);

  /* Every car is shot from the same spot rather than zoomed to fill its
     card, so a pickup takes up most of the width of its picture and a
     hatchback three fifths of it - which is true of them in a car park, and
     is half of what you are trying to tell at a glance. Eight metres back
     and about ten degrees up: roughly where you would stand to take the
     photograph, low enough to be looking at the flank of the car rather
     than down onto its roof. The lens is a long one - nineteen degrees, so
     about a 135 mm - which is what it takes to fill the frame from eight
     metres away and is what anyone photographing a car would reach for,
     because a wide lens this close bends the body outwards. */
  var aim = new T.Vector3(0, (b.ride + b.roof) * 0.50, -0.1);
  var dir = new T.Vector3(-0.60, 0.17, 0.78).normalize().multiplyScalar(8.4);
  THUMB.cam.position.copy(aim).add(dir);
  THUMB.cam.lookAt(aim);
  THUMB.ren.render(THUMB.scene, THUMB.cam);

  var src = THUMB.ren.domElement;
  if(target.width !== src.width){ target.width = src.width; target.height = src.height; }
  var g = target.getContext('2d');
  g.clearRect(0, 0, target.width, target.height);
  g.drawImage(src, 0, 0);

  THUMB.scene.remove(car);
  dropGeometry(car);
  return true;
}

/* What a car should be photographed wearing. One you have dressed wears
   what you put on it; every other one wears the colour it arrives in.

   Deliberately SAVE.looks and not looksFor, which would have been the
   obvious call and is the wrong one: looksFor creates the entry it cannot
   find, and that writes to the save. Photographing the showroom would then
   have written sixteen entries into it every time you opened the door.
   Taking a picture of something should not change it. */
function showLooks(carKey){
  var worn = SAVE.looks && SAVE.looks[carKey];
  if(worn && worn.paint !== null && worn.paint !== undefined &&
     worn.paint <= PAINTS.length) return worn;
  return { paint: defaultPaint(carKey), wheel: worn ? worn.wheel : 1,
           stripe: worn ? worn.stripe : 0, spoiler: worn ? worn.spoiler : false,
           kit: worn ? worn.kit : 0, size: worn ? worn.size : 0 };
}
