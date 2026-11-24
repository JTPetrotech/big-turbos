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
  hatch:  { len: 3.9, wide: 1.72, ride: 0.30, hood: 0.58, roof: 1.15,
            cabF: -0.15, cabL: 1.75, nose: 0.42, tail: 0.30, wheel: 0.31, arch: 0.07 },
  coupe:  { len: 4.4, wide: 1.80, ride: 0.26, hood: 0.56, roof: 1.05,
            cabF: -0.35, cabL: 1.70, nose: 0.62, tail: 0.46, wheel: 0.33, arch: 0.08 },
  muscle: { len: 4.9, wide: 1.94, ride: 0.28, hood: 0.60, roof: 1.10,
            cabF: -0.55, cabL: 1.72, nose: 0.78, tail: 0.58, wheel: 0.35, arch: 0.10 },
  rally:  { len: 4.2, wide: 1.86, ride: 0.36, hood: 0.56, roof: 1.11,
            cabF: -0.10, cabL: 1.86, nose: 0.46, tail: 0.34, wheel: 0.34, arch: 0.13 },
  proto:  { len: 4.6, wide: 1.96, ride: 0.17, hood: 0.45, roof: 0.88,
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
  evo:    { len: 4.49, wide: 1.81, ride: 0.33, hood: 0.59, roof: 1.15,
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
  suv:    { len: 5.08, wide: 1.94, ride: 0.52, hood: 0.60, roof: 1.43,
            cabF: -0.10, cabL: 2.45, nose: 0.52, tail: 0.34, wheel: 0.42, arch: 0.12 },
  pickup: { len: 5.70, wide: 2.08, ride: 0.62, hood: 0.56, roof: 1.35,
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
function shiny(colour, spec, gloss, opts){
  var key = 'P' + colour + '|' + spec + '|' + gloss + '|' + (opts ? JSON.stringify(opts) : '');
  if(MAT_CACHE[key]) return MAT_CACHE[key];
  var m = new T.MeshPhongMaterial(Object.assign({
    color: colour, specular: spec, shininess: gloss, flatShading: true
  }, opts || {}));
  MAT_CACHE[key] = m;
  return m;
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
  return shiny(colour, 0x5a5d66, 46, { emissive: dim(colour, 0.1) });
}
function chromeOf(colour){ return shiny(colour, 0xc2c8d4, 86); }

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
  return shiny(GLASS, 0x7f93a8, 220, { transparent: true, opacity: 0.82 });
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

function buildWheel(radius, width, rimColour){
  var g = new T.Group();
  var tyre = new T.Mesh(
    new T.CylinderGeometry(radius, radius, width, 20),
    mat(TYRE)
  );
  tyre.rotation.z = Math.PI / 2;        // lay the cylinder on its side
  g.add(tyre);

  /* Everything else is outboard only. The inside face of a wheel is never
     once seen from a chase camera, and the budget is better spent on the
     side that is: a rim set inside the tyre so a sidewall shows round it,
     four spokes off two crossed bars, and a hub over the middle of them. */
  var out = width / 2 + 0.004;

  var face = new T.Mesh(
    new T.CylinderGeometry(radius * 0.72, radius * 0.72, 0.03, 14),
    chromeOf(rimColour)
  );
  face.rotation.z = Math.PI / 2;
  face.position.x = out;
  g.add(face);

  for(var k = 0; k < 2; k++){
    var bar = new T.Mesh(
      new T.BoxGeometry(0.04, radius * 1.36, 0.075),
      chromeOf(rimColour)
    );
    bar.position.x = out + 0.012;
    bar.rotation.x = k * Math.PI / 2;
    g.add(bar);
  }

  var hub = new T.Mesh(
    new T.CylinderGeometry(radius * 0.2, radius * 0.2, 0.05, 10),
    chromeOf(rimColour)
  );
  hub.rotation.z = Math.PI / 2;
  hub.position.x = out + 0.022;
  g.add(hub);

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
  var grd = g.createRadialGradient(32, 32, 1, 32, 32, 31);
  grd.addColorStop(0, 'rgba(0,0,0,0.5)');
  grd.addColorStop(0.5, 'rgba(0,0,0,0.3)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
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

  var paint = (PAINTS[looks.paint] || PAINTS[0]).c;
  var rim = (WHEELS[looks.wheel] || WHEELS[1]).c;
  var stripe = (STRIPES[looks.stripe] || STRIPES[0]).c;

  var skin = paintOf(paint);
  var glass = glassOf();

  var root = new T.Group();
  var hull = new T.Group();
  hull.position.y = b.ride + lift;
  root.add(hull);

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
  var lz = zF + b.nose * 0.74;
  var bz = zR - b.tail * 0.88;
  for(var s = -1; s <= 1; s += 2){
    hull.add(box(0.3, 0.085, 0.05, lampOf(0xfff0c8), s * W * 0.28, b.hood * 0.6, lz));
    hull.add(box(0.26, 0.075, 0.04, lampOf(0xd03028), s * W * 0.3, b.hood * 0.7, bz));
  }
  /* a bar between the tail lights, the way everything has had since 2015 */
  hull.add(box(W * 0.44, 0.035, 0.03, lampOf(0x8e1c18), 0, b.hood * 0.7, bz));

  hull.add(box(W * 0.44, b.hood * 0.2, 0.05, SHADE, 0, b.hood * 0.44,
               zF + b.nose * 0.88));
  hull.add(box(W * 0.58, b.hood * 0.16, 0.05, SHADE, 0, b.hood * 0.17,
               zF + b.nose * 0.84));

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

  /* a sill each side, to kill the floating-brick look */
  for(var s2 = -1; s2 <= 1; s2 += 2){
    hull.add(box(0.1, b.hood * 0.5, L * 0.56, DARK, s2 * hw, b.hood * 0.16, 0));
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
    var w = buildWheel(wr, ww, rim);
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
function animateCar(obj, speed, steer, dt){
  var u = obj.userData;
  if(!u || !u.wheels) return;
  var spin = (speed * dt) / 0.33;
  for(var i = 0; i < u.wheels.length; i++) u.wheels[i].rotation.x -= spin;
  /* Negated, because rotation.y turns a wheel to its left and the steer this
     is handed is positive for right. The front wheels used to point the way
     the car was not going, which is a quiet confirmation of the same slip. */
  for(var j = 0; j < u.steered.length; j++) u.steered[j].rotation.y = -steer * 0.44;
}
