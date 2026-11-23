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

var BODIES = {
  hatch:  { len: 3.9, wide: 1.72, ride: 0.30, hood: 0.52, roof: 0.78,
            cabF: -0.15, cabL: 1.75, nose: 0.42, tail: 0.30, wheel: 0.31, arch: 0.07 },
  coupe:  { len: 4.4, wide: 1.80, ride: 0.26, hood: 0.46, roof: 0.66,
            cabF: -0.35, cabL: 1.70, nose: 0.62, tail: 0.46, wheel: 0.33, arch: 0.08 },
  muscle: { len: 4.9, wide: 1.94, ride: 0.28, hood: 0.52, roof: 0.64,
            cabF: -0.55, cabL: 1.72, nose: 0.78, tail: 0.58, wheel: 0.35, arch: 0.10 },
  rally:  { len: 4.2, wide: 1.86, ride: 0.36, hood: 0.54, roof: 0.82,
            cabF: -0.10, cabL: 1.86, nose: 0.46, tail: 0.34, wheel: 0.34, arch: 0.13 },
  proto:  { len: 4.6, wide: 1.96, ride: 0.17, hood: 0.34, roof: 0.52,
            cabF: -0.25, cabL: 1.34, nose: 0.82, tail: 0.54, wheel: 0.34, arch: 0.11 },

  /* The turbo cars: long bonnet, low roof, cabin pushed well back. */
  a80:    { len: 4.51, wide: 1.81, ride: 0.24, hood: 0.46, roof: 0.68,
            cabF: -0.45, cabL: 1.55, nose: 0.80, tail: 0.42, wheel: 0.33, arch: 0.08 },
  a90:    { len: 4.38, wide: 1.85, ride: 0.24, hood: 0.48, roof: 0.68,
            cabF: -0.42, cabL: 1.42, nose: 0.72, tail: 0.40, wheel: 0.33, arch: 0.09 },

  /* The supercharged ones: long, wide and flat-roofed. */
  hellcoupe: { len: 5.02, wide: 1.92, ride: 0.26, hood: 0.54, roof: 0.72,
            cabF: -0.40, cabL: 1.80, nose: 0.70, tail: 0.56, wheel: 0.34, arch: 0.09 },
  hellsedan: { len: 5.10, wide: 1.90, ride: 0.27, hood: 0.52, roof: 0.74,
            cabF: -0.25, cabL: 2.10, nose: 0.66, tail: 0.52, wheel: 0.34, arch: 0.09 },

  /* The rest of the showroom: a rotary coupe, a boxy AWD saloon, the Skyline,
     a rear-engined thing with its mass in the wrong place, and a supercar
     that is mostly windscreen and wheelbase. */
  rx:     { len: 4.30, wide: 1.76, ride: 0.22, hood: 0.42, roof: 0.64,
            cabF: -0.38, cabL: 1.48, nose: 0.74, tail: 0.44, wheel: 0.32, arch: 0.08 },
  evo:    { len: 4.49, wide: 1.81, ride: 0.33, hood: 0.56, roof: 0.88,
            cabF: -0.08, cabL: 1.98, nose: 0.50, tail: 0.40, wheel: 0.33, arch: 0.11 },
  gtr:    { len: 4.60, wide: 1.79, ride: 0.27, hood: 0.50, roof: 0.76,
            cabF: -0.22, cabL: 1.74, nose: 0.62, tail: 0.46, wheel: 0.34, arch: 0.10 },
  rear:   { len: 4.29, wide: 1.78, ride: 0.24, hood: 0.44, roof: 0.70,
            cabF: 0.10, cabL: 1.52, nose: 0.52, tail: 0.66, wheel: 0.33, arch: 0.12 },
  super:  { len: 4.78, wide: 2.03, ride: 0.16, hood: 0.36, roof: 0.58,
            cabF: 0.14, cabL: 1.30, nose: 0.86, tail: 0.60, wheel: 0.35, arch: 0.10 },

  /* Trucks. Tall, upright, and sitting on much larger wheels. The pickup
     carries a `bed`, which is the length of open cargo area behind its cab -
     the one piece of bodywork nothing else here has. */
  suv:    { len: 5.08, wide: 1.94, ride: 0.52, hood: 0.78, roof: 1.34,
            cabF: -0.10, cabL: 2.45, nose: 0.52, tail: 0.34, wheel: 0.42, arch: 0.12 },
  pickup: { len: 5.70, wide: 2.08, ride: 0.62, hood: 0.86, roof: 1.46,
            cabF: 0.70, cabL: 1.70, nose: 0.58, tail: 0.22, wheel: 0.47, arch: 0.15,
            bed: 2.00 }
};

/* Materials get reused across every car on the grid - five cars each making
   their own copies of the same black plastic is wasted memory and wasted
   draw calls. Keyed by colour so a repaint still only ever makes one. */
var MAT_CACHE = {};
function mat(colour, opts){
  var key = colour + '|' + (opts ? JSON.stringify(opts) : '');
  if(MAT_CACHE[key]) return MAT_CACHE[key];
  var m = new T.MeshLambertMaterial(Object.assign({ color: colour }, opts || {}));
  MAT_CACHE[key] = m;
  return m;
}

var GLASS = 0x1b2430, TYRE = 0x14161a, DARK = 0x23262c;

function box(w, h, d, colour, x, y, z, opts){
  var m = new T.Mesh(new T.BoxGeometry(w, h, d), mat(colour, opts));
  m.position.set(x, y, z);
  return m;
}

/* A wedge: a box with its top face slid along z, for bonnets and tails that
   should not look like bricks. Built by hand because three.js has no such
   primitive and a rotated box leaves a visible seam. */
function wedge(w, h, d, dz, colour){
  var hw = w / 2, hh = h / 2, hd = d / 2;
  var v = [
    -hw, -hh, -hd,  hw, -hh, -hd,  hw, -hh, hd,  -hw, -hh, hd,          // base
    -hw,  hh, -hd + dz,  hw,  hh, -hd + dz,  hw,  hh, hd + dz,  -hw,  hh, hd + dz
  ];
  var idx = [
    0,1,2, 0,2,3,        // bottom
    4,6,5, 4,7,6,        // top
    0,4,5, 0,5,1,        // -z end
    3,2,6, 3,6,7,        // +z end
    0,3,7, 0,7,4,        // left
    1,5,6, 1,6,2         // right
  ];
  var g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(v, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return new T.Mesh(g, mat(colour));
}

/* ------------------------------------------------------------- the wheel -- */

function buildWheel(radius, width, rimColour){
  var g = new T.Group();
  var tyre = new T.Mesh(
    new T.CylinderGeometry(radius, radius, width, 16),
    mat(TYRE)
  );
  tyre.rotation.z = Math.PI / 2;        // lay the cylinder on its side
  g.add(tyre);

  /* A rim face on each side, slightly proud, so a spinning wheel reads as
     spinning instead of as a black smudge. */
  for(var s = -1; s <= 1; s += 2){
    var rim = new T.Mesh(
      new T.CylinderGeometry(radius * 0.66, radius * 0.66, 0.04, 12),
      mat(rimColour)
    );
    rim.rotation.z = Math.PI / 2;
    rim.position.x = s * (width / 2 + 0.005);
    g.add(rim);
    /* One spoke, so rotation is visible at a glance. */
    var spoke = new T.Mesh(
      new T.BoxGeometry(0.05, radius * 1.15, 0.09),
      mat(rimColour)
    );
    spoke.position.x = s * (width / 2 + 0.02);
    g.add(spoke);
  }
  return g;
}

/* --------------------------------------------------------------- the car -- */

/* `lift` is ride height added by a lift kit, in metres, straight off
   carStats - so the truck you see on the grid is the one the physics is
   driving, down to how far off the ground it is sitting. Bigger tyres come
   with it, because that is what a lift kit actually is. */
/* A numberplate with whatever the player typed on it, drawn once into a
   canvas and used as a texture. It is the only texture in the game, and it
   is generated at runtime like everything else, so the file still has no
   external references. */
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

  var root = new T.Group();
  var hull = new T.Group();
  hull.position.y = b.ride + lift;
  root.add(hull);

  var L = b.len, W = b.wide;

  /* main body */
  hull.add(box(W, b.hood, L - b.nose - b.tail, paint, 0, b.hood / 2, 0));

  /* nose and tail, wedged so the car has a front and a back */
  var nose = wedge(W * 0.96, b.hood * 0.86, b.nose, -b.nose * 0.3, paint);
  nose.position.set(0, b.hood * 0.43, (L - b.nose - b.tail) / 2 + b.nose / 2);
  hull.add(nose);

  var tail = wedge(W * 0.96, b.hood * 0.9, b.tail, b.tail * 0.22, paint);
  tail.position.set(0, b.hood * 0.45, -(L - b.nose - b.tail) / 2 - b.tail / 2);
  hull.add(tail);

  /* cabin, narrower than the body and set back */
  var cabW = W * 0.86;
  hull.add(box(cabW, b.roof - b.hood, b.cabL, paint, 0, (b.roof + b.hood) / 2, b.cabF));

  /* glass: a thin shell just outside the cabin, on the sides and both ends */
  var glassH = (b.roof - b.hood) * 0.62;
  var glassY = b.hood + glassH / 2 + (b.roof - b.hood) * 0.16;
  hull.add(box(cabW + 0.03, glassH, b.cabL * 0.96, GLASS, 0, glassY, b.cabF));

  /* stripe down the middle, if one is on */
  if(stripe !== null && stripe !== undefined){
    hull.add(box(W * 0.17, 0.012, L - b.nose * 0.5 - b.tail * 0.5, stripe,
                 0, b.hood + 0.006, 0));
    hull.add(box(cabW * 0.2, 0.012, b.cabL * 0.98, stripe, 0, b.roof + 0.006, b.cabF));
  }

  /* lights */
  var lz = (L - b.nose - b.tail) / 2 + b.nose * 0.78;
  for(var s = -1; s <= 1; s += 2){
    hull.add(box(0.34, 0.1, 0.06, 0xfff0c8, s * W * 0.31, b.hood * 0.62, lz));
    hull.add(box(0.3, 0.09, 0.05, 0xd03028,
                 s * W * 0.31, b.hood * 0.66, -(L - b.nose - b.tail) / 2 - b.tail * 0.86));
  }

  /* body kit: a front splitter and wider arches, both cosmetic */
  if(kit.splitter > 0){
    hull.add(box(W * 1.02, 0.05, kit.splitter, DARK,
                 0, b.hood * 0.12, (L - b.nose - b.tail) / 2 + b.nose * 0.9));
  }
  if(kit.arch > 0){
    for(var ka = -1; ka <= 1; ka += 2){
      hull.add(box(kit.arch * 2, b.hood * 0.62, L * 0.62, paint,
                   ka * (W / 2 + kit.arch * 0.5), b.hood * 0.42, 0));
    }
  }

  /* numberplate, front and back */
  if(looks.plate){
    var pg = new T.PlaneGeometry(0.52, 0.13);
    var pm = new T.MeshBasicMaterial({ map: plateTexture(looks.plate) });
    var pf = new T.Mesh(pg, pm);
    pf.position.set(0, b.hood * 0.32, (L - b.nose - b.tail) / 2 + b.nose * 0.96);
    hull.add(pf);
    var pb = new T.Mesh(pg, pm);
    pb.position.set(0, b.hood * 0.34, -(L - b.nose - b.tail) / 2 - b.tail * 0.94);
    pb.rotation.y = Math.PI;
    hull.add(pb);
  }

  /* a sill each side, to kill the floating-brick look */
  for(var s2 = -1; s2 <= 1; s2 += 2){
    hull.add(box(0.1, b.hood * 0.5, L * 0.56, DARK, s2 * W / 2, b.hood * 0.16, 0));
  }

  /* side skirts, sitting just outboard of whatever the arches are doing */
  if(kit.skirt > 0){
    for(var ks = -1; ks <= 1; ks += 2){
      hull.add(box(0.06, kit.skirt, L * 0.5, DARK,
                   ks * (W / 2 + (kit.arch || 0) * 0.9),
                   kit.skirt * 0.5 - 0.02, 0));
    }
  }

  /* a scoop, on the bonnet or up on the roof like a rally car */
  if(kit.scoop === 1){
    hull.add(box(W * 0.30, 0.07, 0.34, DARK, 0, b.hood + 0.035,
                 (L - b.nose - b.tail) / 2 - 0.34));
  } else if(kit.scoop === 2){
    hull.add(box(W * 0.22, 0.09, 0.30, paint, 0, b.roof + 0.045,
                 b.cabF + b.cabL * 0.3));
  }

  /* The wing. A kit built on the Workbench says which one; the old on/off
     spoiler still works for saves and presets that do not. */
  var wing = kit.wing || (looks.spoiler ? 2 : 0);
  var sz = -(L - b.nose - b.tail) / 2 - b.tail * 0.7;
  if(wing === 1){
    hull.add(box(W * 0.80, 0.07, 0.18, paint, 0, b.roof * 0.72, sz));
  } else if(wing === 2){
    hull.add(box(W * 0.84, 0.05, 0.34, paint, 0, b.roof * 0.98, sz));
    for(var s3 = -1; s3 <= 1; s3 += 2){
      hull.add(box(0.07, b.roof * 0.3, 0.1, DARK,
                   s3 * W * 0.3, b.roof * 0.83, sz));
    }
  } else if(wing === 3){
    hull.add(box(W * 0.98, 0.04, 0.42, DARK, 0, b.roof * 1.24, sz));
    for(var s4 = -1; s4 <= 1; s4 += 2){
      hull.add(box(0.05, b.roof * 0.44, 0.26, DARK,
                   s4 * W * 0.40, b.roof * 1.02, sz + 0.05));
    }
  }

  /* a pickup's bed: an open box behind the cab, with a tailgate */
  if(b.bed){
    var bedZ = b.cabF - b.cabL / 2 - b.bed / 2;
    var wallH = (b.roof - b.hood) * 0.72;
    var wallY = b.hood + wallH / 2;
    for(var sw = -1; sw <= 1; sw += 2){
      hull.add(box(W * 0.07, wallH, b.bed, paint, sw * (W / 2 - W * 0.035), wallY, bedZ));
    }
    hull.add(box(W * 0.93, wallH, 0.09, paint, 0, wallY, bedZ + b.bed / 2));   // bulkhead
    hull.add(box(W * 0.93, wallH, 0.09, paint, 0, wallY, bedZ - b.bed / 2));   // tailgate
    hull.add(box(W * 0.88, 0.05, b.bed * 0.96, DARK, 0, b.hood + 0.03, bedZ)); // floor
  }

  /* ------------------------------------------------------------ wheels -- */

  /* A lift goes on tyres as well as springs, so the wheels grow with it. */
  var wr = b.wheel + lift * 0.42 + wsize, ww = 0.26 + lift * 0.22 + wsize * 0.5;
  var axleF = (L - b.nose - b.tail) / 2 - 0.18;
  var axleR = -(L - b.nose - b.tail) / 2 + 0.22;
  var halfTrack = W / 2 - ww / 2 + b.arch * 0.4;

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

    /* arch over each wheel, so the body does not float above them */
    hull.add(box(0.14, (b.arch + kit.arch) * 2, wr * 2.3, paint,
                 side * (W / 2 - 0.02 + kit.arch), b.hood * 0.9, z - b.ride - lift));
  }

  root.userData.paintMat = mat(paint);
  return root;
}

/* Spin the wheels and turn the front pair. Called every frame per car, so it
   stays arithmetic and touches nothing it does not have to. */
function animateCar(obj, speed, steer, dt){
  var u = obj.userData;
  if(!u || !u.wheels) return;
  var spin = (speed * dt) / 0.33;
  for(var i = 0; i < u.wheels.length; i++) u.wheels[i].rotation.x -= spin;
  for(var j = 0; j < u.steered.length; j++) u.steered[j].rotation.y = steer * 0.44;
}
