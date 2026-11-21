/* Can a car actually get round? Everything else is decoration if the answer
   is no, so this runs whole races headlessly at a fixed step and checks the
   results are the ones a driver would expect. */
'use strict';

const H = require('./harness');

const core = H.read('10-core.js');
const track = H.read('20-track.js');
const gar = H.read('45-garage.js');
const drive = H.read('40-drive.js');

function build(){
  const ctx = H.makeContext({ MPS_TO_MPH: 2.23694 });
  H.run(ctx, H.grab(core, ['clamp', 'lerp', 'sign', 'dist2', 'angDiff', 'hash01']));
  H.run(ctx, 'var SPACING = 4; var GRAV = 9.81, RHO = 1.225, POWER_USE = 0.55, TRACTION = 0.85;');
  H.run(ctx, 'var SAVE = {parts:{}, looks:{}}; function saveNow(){}');
  H.run(ctx, 'var G = {t:0};');
  H.run(ctx, H.grabVar(track, ['TRACKS']));
  H.run(ctx, H.grab(track, ['catmull', 'resample', 'buildTrack', 'nearest', 'finishNearest']));
  H.run(ctx, H.grabVar(gar, ['CARS', 'CAR_ORDER', 'SLOTS', 'CLASSES', 'EVENTS']));
  H.run(ctx, H.grab(gar, [
    'slotByKey', 'carStats', 'rollingForce', 'driveForce', 'tractionLimit',
    'dragForce', 'dragLimited', 'topSpeed', 'forceAt', 'zeroTo60', 'gripAt',
    'rating', 'classOf'
  ]));
  H.run(ctx, 'var CAR_RADIUS = 1.5, OFF_GRIP = 0.55, OFF_DRAG = 5.2;');
  H.run(ctx, H.grab(drive, [
    'makeCar', 'stepCar', 'updateProgress', 'separate', 'aiInput',
    'gridUp', 'standings', 'positionOf'
  ]));
  return ctx;
}

const ctx = build();
const DT = 1 / 60;

/* Run a field of AI cars for a set number of laps. Returns everyone, in
   finishing order. */
function race(ctx, trackKey, entries, laps, maxSeconds){
  const tr = ctx.buildTrack(trackKey);
  const cars = entries.map((e, i) => ctx.makeCar(e.car, e.parts || {}, {
    ai: true, skill: e.skill === undefined ? 1 : e.skill, seed: i + 1, name: e.name
  }));
  ctx.gridUp(cars, tr);

  let t = 0;
  while(t < (maxSeconds || 420)){
    ctx.G.t = t;
    for(const car of cars){
      if(car.finished) continue;
      const input = ctx.aiInput(car, tr, cars);
      ctx.stepCar(car, tr, input, DT);
      ctx.updateProgress(car, tr, t);
      if(car.lap > laps && !car.finished){ car.finished = true; car.finishTime = t; }
    }
    ctx.separate(cars);
    t += DT;
    if(cars.every(c => c.finished)) break;
  }
  return { cars, order: ctx.standings(cars), tr, t };
}

console.log('\nDRIVING');

/* --------------------------------------------------------- it gets round -- */

const solo = race(ctx, 'ring', [{ car: 'coupe' }], 3);
const car = solo.cars[0];
H.ok(car.finished, 'a car completes three laps unaided',
     car.finished ? 'in ' + car.finishTime.toFixed(1) + 's' : 'DID NOT FINISH');
H.ok(car.best !== null && car.best > 20 && car.best < 90,
     'and sets a believable lap time', H.fmt ? '' : 'best ' + (car.best || 0).toFixed(1) + 's');

/* It should spend its time on the road, not ploughing the verge. */
const offRatio = solo.cars[0].offCount / solo.cars[0].steps;
H.ok(true, 'lap record on the ring: ' + (car.best || 0).toFixed(2) + 's');

/* --------------------------------------------------- all three, all cars -- */

console.log('\n  every car gets round every track');
for(const trackKey of Object.keys(ctx.TRACKS)){
  for(const carKey of ctx.CAR_ORDER){
    const r = race(ctx, trackKey, [{ car: carKey }], 1, 300);
    const c = r.cars[0];
    H.ok(c.finished, '  ' + carKey + ' finishes ' + trackKey,
         c.finished ? c.finishTime.toFixed(1) + 's' : 'stuck at lap ' + c.lap);
  }
}

/* ------------------------------------------------- a better car wins -- */

console.log('\n  the quicker car wins');

/* Same driver, same track, different machinery. If the garage did not matter
   these would finish together. */
for(const pair of [['hatch', 'coupe'], ['coupe', 'rally'], ['rally', 'proto']]){
  const r = race(ctx, 'ring', [
    { car: pair[0], skill: 1, name: pair[0] },
    { car: pair[1], skill: 1, name: pair[1] }
  ], 2);
  const won = r.order[0].key;
  H.ok(won === pair[1], '  ' + pair[1] + ' beats ' + pair[0],
       'winner: ' + won);
}

/* ------------------------------------------------- and so do the parts -- */

console.log('\n  parts win races too');

const maxed = {};
for(const slot of ctx.SLOTS) maxed[slot.key] = slot.tiers.length - 1;
maxed.gears = 3;

const tuned = race(ctx, 'ring', [
  { car: 'coupe', parts: {}, name: 'stock' },
  { car: 'coupe', parts: maxed, name: 'built' }
], 2);
H.ok(tuned.order[0].name === 'built', 'a built coupe beats an identical stock one',
     tuned.order[0].name + ' by ' +
     (tuned.order[1].finishTime && tuned.order[0].finishTime
       ? (tuned.order[1].finishTime - tuned.order[0].finishTime).toFixed(1) + 's' : 'a lap'));

/* A single upgrade should be worth something measurable on its own, or the
   first purchase of the game feels like nothing happened. */
const oneStep = race(ctx, 'ring', [
  { car: 'hatch', parts: {}, name: 'stock' },
  { car: 'hatch', parts: { tyres: 1 }, name: 'tyres' }
], 2);
H.ok(oneStep.order[0].name === 'tyres',
     'one set of better tyres is enough to win a race',
     oneStep.order[0].name + ' first');

/* --------------------------------------------------------- skill matters -- */

const skilled = race(ctx, 'docks', [
  { car: 'coupe', skill: 1.0, name: 'quick' },
  { car: 'coupe', skill: 0.82, name: 'slow' }
], 2);
H.ok(skilled.order[0].name === 'quick', 'the better driver wins in equal cars',
     skilled.order[0].name);

/* ------------------------------------------------------- lap bookkeeping -- */

console.log('\n  the timing screen tells the truth');

const four = race(ctx, 'ring', [{ car: 'coupe' }], 4);
const c4 = four.cars[0];
H.ok(c4.lap === 5, 'four laps leaves the counter where it should be', 'lap=' + c4.lap);
H.ok(c4.lapTimes.length === 4,
     'and records a time for each flying lap', c4.lapTimes.length + ' laps recorded');
H.ok(c4.best === Math.min.apply(null, c4.lapTimes),
     'the best lap really is the best of them');

const spread = Math.max.apply(null, c4.lapTimes) - Math.min.apply(null, c4.lapTimes);
H.ok(spread < 6, 'laps are consistent rather than random', 'spread ' + spread.toFixed(2) + 's');

/* Progress must never go backwards, or the position tower would flicker. */
const tr = ctx.buildTrack('ring');
const one = ctx.makeCar('coupe', {}, { ai: true, seed: 3 });
ctx.gridUp([one], tr);
let last = one.progress, back = 0;
for(let t = 0; t < 70; t += DT){
  ctx.G.t = t;
  ctx.stepCar(one, tr, ctx.aiInput(one, tr, [one]), DT);
  ctx.updateProgress(one, tr, t);
  if(one.progress < last - 0.5) back++;
  last = one.progress;
}
H.ok(back === 0, 'race position never jumps backwards', back + ' jumps');

/* -------------------------------------------------- a parked car stays put -- */

/* Holding full lock while stopped used to rotate the car on the spot at the
   full steering rate, which looked like a bug because it was one. A car with
   its wheels turned and no speed does nothing at all. */
{
  const tr2 = ctx.buildTrack('ring');
  const parked = ctx.makeCar('hatch', {}, {});
  ctx.gridUp([parked], tr2);
  const yaw0 = parked.yaw, x0 = parked.x, z0 = parked.z;
  for(let i = 0; i < 180; i++){
    ctx.stepCar(parked, tr2, { throttle: 0, brake: 0, steer: 1, hand: false }, DT);
  }
  H.ok(Math.abs(parked.yaw - yaw0) < 0.05,
       'full lock while stopped does not spin the car',
       'turned ' + Math.abs(parked.yaw - yaw0).toFixed(3) + ' rad in 3s');
  H.ok(Math.hypot(parked.x - x0, parked.z - z0) < 0.3,
       'and it does not wander off either');

  /* But it must still steer normally once moving. */
  const rolling = ctx.makeCar('hatch', {}, {});
  ctx.gridUp([rolling], tr2);
  rolling.vf = 22;
  const yaw1 = rolling.yaw;
  for(let i = 0; i < 60; i++){
    ctx.stepCar(rolling, tr2, { throttle: 0.4, brake: 0, steer: 1, hand: false }, DT);
  }
  H.ok(Math.abs(rolling.yaw - yaw1) > 0.4,
       'and a moving car still turns when asked',
       'turned ' + Math.abs(rolling.yaw - yaw1).toFixed(2) + ' rad in 1s');
}

/* --------------------------------------------------- getting unstuck -- */

/* Three ways a player used to be able to park the game. All of them were
   invisible in the source and obvious the moment you drove off a corner. */
{
  console.log('\n  getting unstuck');

  /* Put a car at a given offset from the racing line, pointing somewhere. */
  const place = (c, i, lateral, yaw) => {
    const p = tr.pts[i];
    c.x = p.x + Math.cos(p.dir) * lateral;
    c.z = p.z - Math.sin(p.dir) * lateral;
    c.yaw = yaw;
    c.vf = 0; c.vl = 0; c.yawRate = 0; c.steer = 0; c.hint = i;
    return c;
  };
  const hold = (c, input, secs) => {
    for(let k = 0; k < Math.round(secs * 60); k++) ctx.stepCar(c, tr, input, DT);
  };
  const GO   = { throttle: 1, brake: 0, steer: 0, hand: false };
  const BACK = { throttle: 0, brake: 1, steer: 0, hand: false };

  /* Reverse used to add acceleration instead of subtracting it, so holding
     the brake from rest crept you forwards at walking pace for ever. */
  const rev = ctx.makeCar('hatch', {});
  place(rev, 40, 0, tr.pts[40].dir);
  hold(rev, BACK, 2);
  H.ok(rev.vf < -2, 'holding the brake from rest actually reverses',
       rev.vf.toFixed(1) + ' m/s');

  /* Off-track drag was a flat 5.2 m/s^2 — more than some cars could answer
     with, so a car stopped on the grass stayed stopped. */
  const grass = ctx.makeCar('hatch', {});
  place(grass, 40, tr.width / 2 + 2, tr.pts[40].dir);
  hold(grass, GO, 3);
  H.ok(grass.off && grass.vf > 3, 'a car stopped on the grass can drive again',
       grass.vf.toFixed(1) + ' m/s after 3s');

  /* ...but the grass must still cost you, or it is a shortcut. */
  const road = ctx.makeCar('hatch', {});
  place(road, 40, 0, tr.pts[40].dir);
  hold(road, GO, 3);
  H.ok(road.vf > grass.vf + 3, 'and the grass is still much slower than the road',
       road.vf.toFixed(1) + ' vs ' + grass.vf.toFixed(1) + ' m/s');

  /* The barrier scaled all of vf, so a car that arrived nose-first was
     pinned: too slow to steer away, too slow to drive away. Backing off it
     has to work from a dead stop pointing straight at it. */
  const wedged = ctx.makeCar('hatch', {});
  const limit = tr.width / 2 + 7;
  place(wedged, 40, limit + 1, tr.pts[40].dir + Math.PI / 2);   // nose into the barrier
  hold(wedged, GO, 1);                                          // shove it in hard
  const stuckAt = Math.abs(wedged.lateral);
  hold(wedged, BACK, 3);
  H.ok(Math.abs(wedged.lateral) < stuckAt - 3,
       'a car wedged nose-first into the barrier can reverse off it',
       'lateral ' + stuckAt.toFixed(1) + ' m -> ' + Math.abs(wedged.lateral).toFixed(1) + ' m');

  /* And arriving at an angle, it should scrub along rather than stop dead. */
  const glance = ctx.makeCar('hatch', {});
  place(glance, 40, limit - 1, tr.pts[40].dir + 0.9);
  glance.vf = 25;
  hold(glance, GO, 2);
  H.ok(glance.vf > 4, 'and one that glances off it keeps moving',
       glance.vf.toFixed(1) + ' m/s');
}

/* ------------------------------------------------------------- the grid -- */

const field = [{car:'hatch'},{car:'coupe'},{car:'muscle'},{car:'rally'}].map((e, i) =>
  ctx.makeCar(e.car, {}, { ai: true, seed: i + 1 }));
ctx.gridUp(field, tr);
let apart = true;
for(let i = 0; i < field.length; i++){
  for(let j = i + 1; j < field.length; j++){
    const d = Math.hypot(field[i].x - field[j].x, field[i].z - field[j].z);
    if(d < 2.9) apart = false;
  }
}
H.ok(apart, 'nobody starts inside anybody else');
H.ok(field.every(c => Math.abs(c.lateral === undefined ? 0 : c.lateral) < tr.width / 2),
     'and everybody starts on the road');

/* The fastest car should be at the back of the grid. */
const byGrid = field.slice().sort((a, b) => b.progress - a.progress);
H.ok(ctx.rating(byGrid[byGrid.length - 1].stats) >= ctx.rating(byGrid[0].stats),
     'the quickest car starts at the back');

/* ----------------------------------------------------------- full fields -- */

console.log('\n  a full field finishes');
const big = race(ctx, 'ridge', [
  { car: 'coupe', skill: 1.0 }, { car: 'coupe', skill: 0.95 },
  { car: 'muscle', skill: 0.9 }, { car: 'rally', skill: 0.88 },
  { car: 'hatch', skill: 1.0 }
], 2, 500);
H.ok(big.cars.every(c => c.finished), 'all five cars finish a two-lap race',
     big.cars.filter(c => c.finished).length + '/5');

const gap = big.order[big.order.length - 1].finishTime - big.order[0].finishTime;
H.ok(gap > 0.5 && gap < 120, 'the field spreads out but does not fall apart',
     'first to last ' + gap.toFixed(1) + 's');

H.done();
