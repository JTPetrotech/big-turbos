/* =========================================================================
   4  DRIVING

   A single-body model solved in the car's own frame. Velocity is split into
   forward and sideways components; the engine and brakes work on the first,
   tyre friction works on the second, and steering rotates the body rather
   than the velocity.

   That last point is the whole trick. Turning the wheel does not turn the
   car's momentum - it turns the shell, which creates a sideways velocity
   the tyres then have to fight. When they can fight it, the car corners.
   When they cannot, it slides. Both fall out of the same two lines rather
   than being special cases, which is why a grippier tyre and a heavier car
   and a faster corner all interact the way a player expects.
   ========================================================================= */

var CAR_RADIUS = 1.5;         // for car-to-car contact, metres
var OFF_GRIP = 0.55;          // what is left of your grip on the grass
var OFF_DRAG = 5.2;           // extra deceleration out there, m/s^2

function makeCar(carKey, parts, opts){
  opts = opts || {};
  var stats = carStats(carKey, parts || {});
  return {
    key: carKey,
    name: opts.name || CARS[carKey].name,
    stats: stats,
    vMax: topSpeed(stats),

    x: 0, z: 0, yaw: 0,
    vf: 0, vl: 0,                  // forward and lateral speed, car frame
    yawRate: 0,
    steer: 0,                      // smoothed steering position, -1..1

    lap: 0, along: 0, lastAlong: 0, hint: null, progress: 0,
    lateral: 0, off: false,

    ai: !!opts.ai,
    skill: opts.skill === undefined ? 1 : opts.skill,
    seed: opts.seed || 1,

    finished: false, finishTime: null,
    lapStart: 0, lapTimes: [], best: null,
    obj: null
  };
}

/* ------------------------------------------------------------ one car, one step -- */

function stepCar(car, track, input, dt){
  var s = car.stats;

  /* ---- what the driver is asking for ---- */
  var throttle = input.throttle, brake = input.brake, wantSteer = input.steer;
  var hand = input.hand;

  /* Steering moves towards the request rather than snapping. Quick cars with
     good suspension get there faster, and everything gets calmer with speed -
     full lock at 150 mph would simply spin the car, and no real steering rack
     is that direct. */
  var rate = 5.4 * (s.steer / 2.3);
  car.steer += clamp(wantSteer - car.steer, -rate * dt, rate * dt);

  var speed = Math.abs(car.vf);
  var speedEase = clamp(1 - speed / 95, 0.28, 1);

  /* ---- grip available right now ---- */
  var grip = gripAt(s, speed);
  if(car.off) grip *= OFF_GRIP;
  if(hand) grip *= 0.42;               // handbrake: deliberately break traction
  var gripForce = grip * s.mass * GRAV;

  /* ---- forward ---- */
  var drive = forceAt(s, Math.max(speed, 0), car.vMax) * throttle;
  var resist = dragForce(s, speed) + rollingForce(s);

  var af = (drive - resist) / s.mass;

  if(brake > 0){
    if(car.vf > 0.4) af -= s.brake * brake;
    else af -= s.brake * brake * 0.55;      // held on, it reverses out
  }
  if(car.off){
    /* Resistance, not a wall. At racing speed the full penalty applies,
       which is what stops the grass being a shortcut; but held constant it
       also came to more than some cars' entire reverse authority, so a car
       stopped on the grass could never get going again. It eases off near
       standstill, the way soft ground really behaves. */
    af -= OFF_DRAG * clamp(speed / 6, 0.15, 1) * sign(car.vf);
  }

  car.vf += af * dt;
  if(Math.abs(car.vf) < 0.05 && throttle === 0) car.vf = 0;
  car.vf = clamp(car.vf, -12, car.vMax * 1.02);

  /* ---- yaw ---- */
  /* The body rotates with steering, scaled at both ends of the speed range.
     speedEase takes lock away as speed rises, because full lock at 150 mph
     would only ever spin the car. rolling takes it away as speed falls to
     nothing: a parked car with the wheel turned does not rotate, it just
     sits there with its wheels turned, and without this the car pirouettes
     on the spot the moment it stops. */
  var rolling = clamp(speed / 5, 0, 1);
  var want = car.steer * s.steer * speedEase * rolling * sign(car.vf || 1);
  car.yawRate += (want - car.yawRate) * clamp(dt * 9, 0, 1);
  car.yaw += car.yawRate * dt;

  /* ---- sideways ---- */
  /* Rotating the body left the velocity pointing where it was, which shows up
     here as lateral speed. Tyres resist it, up to what grip allows. */
  car.vl += -car.yawRate * car.vf * dt;             // the body turned under the velocity

  var need = Math.abs(car.vl) * s.mass / Math.max(dt, 1e-4);
  var can = gripForce;
  var killed = Math.min(need, can) / s.mass * dt;
  car.vl -= sign(car.vl) * killed;

  /* A light car with the interior removed rotates further once it is already
     sliding: less inertia to stop the back coming round. This is the one
     place the weight tiers' downside is felt, and it is deliberately felt on
     the limit rather than everywhere. */
  if(Math.abs(car.vl) > 0.9){
    car.yaw += sign(car.vl) * (1 - s.stability) * Math.abs(car.vl) * 0.16 * dt;
  }

  /* ---- into the world ---- */
  var sy = Math.sin(car.yaw), cy = Math.cos(car.yaw);
  var vx = car.vf * sy + car.vl * cy;
  var vz = car.vf * cy - car.vl * sy;
  car.x += vx * dt;
  car.z += vz * dt;

  /* ---- where that leaves us ---- */
  var where = nearest(track, car.x, car.z, car.hint);
  car.hint = where.i;
  car.lateral = where.lateral;
  car.off = Math.abs(where.lateral) > track.width / 2;
  car.lastAlong = car.along;
  car.along = where.along;

  /* A barrier a couple of metres beyond the kerb, rather than open country:
     it keeps a spin from putting anyone half a mile into the scenery.

     Only the velocity heading *into* the barrier is taken away. Scaling the
     whole of vf instead pinned any car that arrived nose-first: every frame
     it touched, its speed was cut by nearly half, and because steering
     authority fades to nothing below walking pace, it could neither
     accelerate off nor turn away. Killing just the outward component leaves
     whatever was running along the barrier, so the car scrubs down it, keeps
     enough speed to steer, and can be driven or reversed back to the road. */
  var limit = track.width / 2 + 7;
  if(Math.abs(where.lateral) > limit){
    var over = Math.abs(where.lateral) - limit;
    var p = track.pts[where.i];
    var side = sign(where.lateral);
    var ox = Math.cos(p.dir) * side, oz = -Math.sin(p.dir) * side;   // away from the road
    car.x -= ox * over;
    car.z -= oz * over;

    var by = Math.sin(car.yaw), bc = Math.cos(car.yaw);
    var wx = car.vf * by + car.vl * bc;
    var wz = car.vf * bc - car.vl * by;

    var into = wx * ox + wz * oz;          // how fast we are still leaving the road
    if(into > 0){                          // a car already heading back is left alone
      wx -= into * ox;
      wz -= into * oz;
    }
    /* Nothing is scrubbed off along the barrier on purpose: the car is off
       the road already, so grass drag and the tyres fighting the slide take
       their cut anyway. An extra per-frame factor here compounds for as long
       as you stay in contact, which is what made a long graze stop you dead. */
    car.vf = wx * by + wz * bc;
    car.vl = wx * bc - wz * by;
  }
}

/* ------------------------------------------------------------ lap counting -- */

/* Progress is the only thing race position is sorted on, so it has to keep
   rising. The wrap from the end of the lap back to zero is the one place it
   would not, which is what this watches for. */
function updateProgress(car, track, now){
  var half = track.total / 2;

  if(car.lastAlong > track.total - half && car.along < half &&
     car.lastAlong - car.along > half){
    car.lap++;
    if(car.lap > 0){
      var t = now - car.lapStart;
      /* The out-lap from the grid is not a flying lap and is not recorded. */
      if(car.lap > 1){
        car.lapTimes.push(t);
        if(car.best === null || t < car.best) car.best = t;
      }
      car.lapStart = now;
    }
  }
  /* Going backwards over the line takes the lap back off you, so reversing
     across it cannot be used to farm laps. */
  else if(car.along > track.total - half && car.lastAlong < half &&
          car.along - car.lastAlong > half){
    car.lap--;
  }

  car.progress = car.lap * track.total + car.along;
}

/* ------------------------------------------------------------- car contact -- */

/* Cars push each other apart rather than colliding properly. A real impulse
   solver would be more correct and much more likely to launch somebody into
   orbit over a rounding error. */
function separate(cars){
  for(var i = 0; i < cars.length; i++){
    for(var j = i + 1; j < cars.length; j++){
      var a = cars[i], b = cars[j];
      var dx = b.x - a.x, dz = b.z - a.z;
      var d2 = dx * dx + dz * dz;
      var min = CAR_RADIUS * 2;
      if(d2 > min * min || d2 < 1e-6) continue;

      var d = Math.sqrt(d2);
      var push = (min - d) / 2;
      var nx = dx / d, nz = dz / d;
      a.x -= nx * push; a.z -= nz * push;
      b.x += nx * push; b.z += nz * push;

      /* Whoever was going faster loses a little more, so punting someone out
         of the way is not free. */
      var fast = Math.abs(a.vf) > Math.abs(b.vf) ? a : b;
      fast.vf *= 0.955;
      a.vl += nx * 0.4; b.vl -= nx * 0.4;
    }
  }
}

/* ------------------------------------------------------------------- the AI -- */

/* Aims at a point up the road, and picks a speed from how hard the corner
   it can see is. It does not know the racing line as such - it widens its
   aim point on the way into a bend and tightens it at the apex, which
   produces something close enough to one, and never produces the sort of
   rail-riding that makes a player feel like scenery. */
function aiInput(car, track, cars){
  var s = car.stats;
  var skill = car.skill;

  /* Look further ahead the faster we are going - about a second and a half
     of road, which is roughly where a person looks too. */
  var ahead = clamp(Math.round(Math.abs(car.vf) * 1.5 / SPACING) + 4, 5, 46);
  var i = car.hint === null ? 0 : car.hint;
  var target = track.pts[(i + ahead) % track.n];

  /* How hard is the next bit? Take the worst curvature in the window rather
     than the curvature at one point, or the car brakes too late for a corner
     that tightens. */
  var worst = 0;
  for(var k = 2; k < ahead; k++){
    var c = track.pts[(i + k) % track.n].curve;
    if(c > worst) worst = c;
  }

  /* The fastest a corner of that curvature can be taken, from the grip the
     car actually has. Solved against speed because downforce means grip
     depends on the answer. */
  var vCorner = car.vMax;
  if(worst > 1e-4){
    var radius = 1 / worst;
    for(var v = 8; v < car.vMax; v += 2){
      if(v * v / radius > gripAt(s, v) * GRAV * 0.93 * skill){ vCorner = v; break; }
    }
  }

  /* Aim off the centreline: outside on the way in, tight at the apex. The
     offsets are small because the tracks are not wide. */
  var lean = clamp(worst * 160, 0, 1);
  var apex = track.pts[(i + Math.round(ahead * 0.6)) % track.n];
  var turnDir = sign(angDiff(track.pts[i].dir, apex.dir));
  var offset = -turnDir * lean * (track.width * 0.3);

  var rx = Math.cos(target.dir), rz = -Math.sin(target.dir);
  var tx = target.x + rx * offset, tz = target.z + rz * offset;

  /* Steer towards it. */
  var wantYaw = Math.atan2(tx - car.x, tz - car.z);
  var err = angDiff(car.yaw, wantYaw);
  var steer = clamp(err * 2.0, -1, 1);

  /* Pace. A skill below 1 both corners slower and hesitates on the throttle,
     so the back of the field is beatable without being stationary. */
  var speed = Math.abs(car.vf);
  var throttle = 0, brake = 0;
  if(speed < vCorner * 0.97) throttle = 1;
  else if(speed > vCorner * 1.06) brake = clamp((speed - vCorner) / 9, 0.25, 1);
  else throttle = 0.45;

  /* Nudge around whoever is directly in front, rather than driving into them
     and pushing them down the road. */
  for(var c2 = 0; c2 < cars.length; c2++){
    var o = cars[c2];
    if(o === car || o.finished) continue;
    var dx = o.x - car.x, dz = o.z - car.z;
    var d2 = dx * dx + dz * dz;
    if(d2 > 110) continue;
    var fwd = dx * Math.sin(car.yaw) + dz * Math.cos(car.yaw);
    if(fwd < 1.2) continue;                    // alongside or behind: ignore
    var side = dx * Math.cos(car.yaw) - dz * Math.sin(car.yaw);
    steer += (side > 0 ? -0.5 : 0.5);
    if(Math.abs(side) < 2.1) throttle *= 0.82;
  }

  /* A little wobble, individual to each driver, so a pack does not drive as
     one organism and the same race is not identical every time. */
  var wob = (hash01(car.seed * 7.3 + Math.floor(G.t * 2.1)) - 0.5) * 0.1 * (2 - skill);

  return {
    throttle: clamp(throttle * (0.84 + skill * 0.16), 0, 1),
    brake: clamp(brake, 0, 1),
    steer: clamp(steer + wob, -1, 1),
    hand: false
  };
}

/* --------------------------------------------------------------- the grid -- */

/* Line the field up behind the start line, two abreast, in reverse rating
   order so the quickest car starts at the back and has to earn it. */
function gridUp(cars, track){
  var ordered = cars.slice().sort(function(a, b){
    return rating(a.stats) - rating(b.stats);
  });

  for(var i = 0; i < ordered.length; i++){
    var car = ordered[i];
    var back = 8 + Math.floor(i / 2) * 7.5;
    var side = (i % 2 === 0 ? -1 : 1) * track.width * 0.22;

    var along = (track.total - back) % track.total;
    var idx = Math.floor(along / SPACING) % track.n;
    var p = track.pts[idx];
    var rx = Math.cos(p.dir), rz = -Math.sin(p.dir);

    car.x = p.x + rx * side;
    car.z = p.z + rz * side;
    car.yaw = p.dir;
    car.vf = 0; car.vl = 0; car.yawRate = 0; car.steer = 0;
    car.lap = 0; car.hint = idx;
    car.along = along; car.lastAlong = along;
    car.progress = along - track.total;        // negative until the line
    car.finished = false; car.finishTime = null;
    car.lapTimes = []; car.best = null; car.lapStart = 0;
    car.off = false;
  }
}

/* -------------------------------------------------------------- positions -- */

function standings(cars){
  return cars.slice().sort(function(a, b){
    if(a.finished && b.finished) return a.finishTime - b.finishTime;
    if(a.finished) return -1;
    if(b.finished) return 1;
    return b.progress - a.progress;
  });
}

function positionOf(cars, car){
  var order = standings(cars);
  for(var i = 0; i < order.length; i++) if(order[i] === car) return i + 1;
  return order.length;
}
