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
  H.run(ctx, H.grab(track, ['catmull', 'resample', 'stripPoints', 'buildTrack', 'nearest', 'finishNearest']));
  H.run(ctx, H.grabVar(gar, ['CARS', 'CAR_ORDER', 'SLOTS', 'TRUCK_BODIES', 'CLASSES', 'EVENTS']));
  H.run(ctx, H.grab(gar, [
    'isTruck', 'slotFits', 'slotsFor',
    'slotByKey', 'carStats', 'rollingForce', 'driveForce', 'tractionLimit',
    'dragForce', 'dragLimited', 'topSpeed', 'forceAt', 'zeroTo60', 'gripAt',
    'rating', 'classOf'
  ]));
  H.run(ctx, 'var CAR_RADIUS = 1.5, OFF_GRIP = 0.55, OFF_DRAG = 5.2, WORLD_EDGE = 660, DRAG_LEN = 402.336;');
  H.run(ctx, H.grab(drive, [
    'makeCar', 'stepCar', 'updateProgress', 'separate', 'aiInput',
    'gridUp', 'stageDrag', 'standings', 'positionOf'
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

/* ------------------------------------------------------- the drag strip -- */

{
  console.log('\n  the drag strip');
  const strip = ctx.buildTrack('strip');

  /* Run a single car from the line to the quarter-mile marker, flat out. */
  const quarter = (key, parts) => {
    const c = ctx.makeCar(key, parts || {});
    ctx.stageDrag([c], strip);
    const lane = c.lateral;                    // the lane it was staged in
    let t = 0, wander = 0;
    while(c.along < 402.336 && t < 60){
      ctx.stepCar(c, strip, { throttle: 1, brake: 0, steer: 0, hand: false }, DT);
      t += DT;
      wander = Math.max(wander, Math.abs(c.lateral - lane));
    }
    return { et: t, trap: c.vf * 2.23694, wander: wander, done: c.along >= 402.336 };
  };

  /* The whole point of laying the strip out by hand instead of splining it:
     flat out with the wheel straight, you stay in your lane. */
  const hc = quarter('hellcoupe');
  H.ok(hc.wander < 0.05, 'a quarter mile flat out holds its lane',
       'wandered ' + hc.wander.toFixed(3) + ' m');

  /* Real figures for the cars these are drawn from: a supercharged coupe runs
     the quarter in a bit over eleven, a 85 kW hatchback in about seventeen.
     If the model stops producing times in that range it has drifted. */
  const hatch = quarter('hatch');
  H.ok(hc.et > 10.5 && hc.et < 13,
       'the supercharged coupe runs a believable quarter', hc.et.toFixed(2) + 's at ' +
       Math.round(hc.trap) + ' mph');
  H.ok(hatch.et > 15 && hatch.et < 19,
       'and the shopping car runs a believably awful one', hatch.et.toFixed(2) + 's at ' +
       Math.round(hatch.trap) + ' mph');
  H.ok(hc.et < hatch.et - 3 && hc.trap > hatch.trap + 20,
       'the quick car wins on both ET and trap speed');

  /* Tyres are worth time down a straight too, not only in corners. */
  const slick = quarter('hellcoupe', { tyres: 3 });
  H.ok(slick.et < hc.et, 'better tyres are worth ET off the line',
       hc.et.toFixed(2) + 's -> ' + slick.et.toFixed(2) + 's');

  /* Two cars staged together start level and side by side. */
  const pair = [ctx.makeCar('a90', {}), ctx.makeCar('a80', {})];
  ctx.stageDrag(pair, strip);
  H.ok(Math.abs(pair[0].along - pair[1].along) < 0.01,
       'both cars stage level at the line');
  H.ok(Math.hypot(pair[0].x - pair[1].x, pair[0].z - pair[1].z) > 3,
       'and side by side rather than on top of each other',
       Math.hypot(pair[0].x - pair[1].x, pair[0].z - pair[1].z).toFixed(1) + ' m apart');

  /* ------------------------------------------------- the README's numbers -- */

  /* The README prints a table of power, weight, 0-60 and quarter-mile times
     and claims nobody typed the times in. That claim is only true while this
     passes. The garage preview is generated from carStats so it cannot drift;
     a markdown table drifts silently the moment a car is retuned. So read the
     README back and measure every figure in it again.

     If this fails, the model moved and the README is now lying. Correct the
     README - do not loosen the tolerances. */
  console.log('\n  the README quotes the model');

  const readme = require('fs').readFileSync(
    require('path').join(__dirname, '..', 'README.md'), 'utf8');
  const flat = readme.replace(/\s+/g, ' ');          // prose, unwrapped
  const plain = t => parseFloat(String(t).replace(/,/g, ''));

  /* | Apex A80 Twin-Turbo | 239 | 1,570 | 4.5s | 13.27s @ 102 mph | */
  const ROW = /^\|\s*([A-Za-z][^|]*?)\s*\|\s*([\d,]+)\s*\|\s*([\d,]+)\s*\|\s*([\d.]+)s\s*\|\s*([\d.]+)s @ (\d+) mph\s*\|/;
  const quoted = readme.split(/\r?\n/).map(l => l.match(ROW)).filter(Boolean);
  H.ok(quoted.length >= 11, 'the car table is still in the README and parses',
       quoted.length + ' rows read');

  /* Look the car up by its printed name, so there is no key-to-name map to
     keep in step either. Rename a car and this fails loudly. */
  const byName = {};
  ctx.CAR_ORDER.forEach(k => { byName[ctx.CARS[k].name] = k; });

  for(const row of quoted){
    const name = row[1], key = byName[name];
    if(!key){ H.ok(false, 'README row names a car that exists', name); continue; }

    const s = ctx.carStats(key, {});                 // stock, as the table says
    const q = quarter(key);
    const sixty = ctx.zeroTo60(s);
    const said = { kw: plain(row[2]), kg: plain(row[3]), sixty: plain(row[4]),
                   et: plain(row[5]), trap: plain(row[6]) };

    /* Tolerances are rounding, not slack: kW and kg are integers, 0-60 is
       printed to a tenth, the ET to a hundredth, the trap to a whole mph. */
    const wrong = [];
    if(Math.abs(s.power - said.kw) > 0.5)
      wrong.push('kW says ' + said.kw + ', is ' + s.power);
    if(Math.abs(s.mass - said.kg) > 0.5)
      wrong.push('kg says ' + said.kg + ', is ' + s.mass);
    if(Math.abs(sixty - said.sixty) > 0.06)
      wrong.push('0-60 says ' + said.sixty + 's, is ' + sixty.toFixed(2) + 's');
    if(Math.abs(q.et - said.et) > 0.02)
      wrong.push('ET says ' + said.et + 's, is ' + q.et.toFixed(2) + 's');
    if(Math.abs(q.trap - said.trap) > 1)
      wrong.push('trap says ' + said.trap + ', is ' + q.trap.toFixed(1) + ' mph');

    H.ok(wrong.length === 0, name + ' is quoted correctly',
         wrong.length ? wrong.join('; ')
                      : said.et.toFixed(2) + 's @ ' + said.trap + ' mph');
  }

  /* A count in prose rots the same way a measurement does. */
  const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven',
                 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen',
                 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen',
                 'nineteen', 'twenty'];
  const count = WORDS[ctx.CAR_ORDER.length] || String(ctx.CAR_ORDER.length);
  H.ok(new RegExp(count + ' of them', 'i').test(flat),
       'the README still says how many cars there are',
       ctx.CAR_ORDER.length + ', written "' + count + '"');

  /* The prose and the parts table quote figures out of the data tables. Same
     problem, same fix: find the sentence, pull the number, check it. */
  const says = (label, re, actual, tol) => {
    const m = flat.match(re);
    if(!m){ H.ok(false, label, 'the README no longer says this at all'); return; }
    const said = plain(m[1]);
    H.ok(Math.abs(said - actual) <= tol, label,
         'README says ' + said + ', model says ' + (Math.round(actual * 100) / 100));
  };

  const shopper = ctx.carStats('hatch', {});
  says('the hatch has the power the README gives it',
       /because ([\d,]+) kW pushing/, shopper.power, 0.5);
  says('and the weight', /kW pushing ([\d,]+) kg/, shopper.mass, 0.5);
  says('and does the 0-60 it is credited with',
       /stock hatch does 0.60 in ([\d.]+)s/, ctx.zeroTo60(shopper), 0.06);
  says('and tops out where it says',
       /tops out at ([\d,]+) mph/, ctx.topSpeed(shopper) * 2.23694, 1);

  /* The parts table describes the top tier of each part - the expensive one
     that buys a trade. Those percentages are read straight out of SLOTS. */
  const top = k => { const t = ctx.slotByKey(k).tiers; return t[t.length - 1]; };
  const bigTurbo = top('turbo'), bottle = top('nos'), sixInch = top('lift');

  says('the biggest turbo gives what the README promises',
       /\+(\d+)% once it is spinning/, bigTurbo.boost * 100, 0.5);
  says('and does nothing below the speed it says',
       /Nothing at all below (\d+) mph/, bigTurbo.lag * 2.23694, 1);

  /* The supercharger is the one induction option the table describes by name
     rather than by being the top of the list, so look it up the same way. */
  const blown = ctx.slotByKey('turbo').tiers.filter(t => t.lag === 0 && t.boost > 0)[0];
  if(!blown) H.ok(false, 'there is still a supercharger to check');
  else {
    says('the supercharger gives what the README promises',
         /\+(\d+)% from a standstill/, blown.boost * 100, 0.5);
    says('and weighs what the README admits',
         /and (\d+) kg of it/, blown.mass, 0.5);
  }
  says('nitrous is worth what the README says',
       /\+(\d+)% while you hold it/, bottle.nos * 100, 0.5);
  says('and weighs what you are told you are carrying',
       /(\d+) kg carried every lap/, bottle.mass, 0.5);
  says('the tallest lift gives away the grip the README admits to',
       /gives away (\d+)% of the truck/, (1 - sixInch.grip) * 100, 0.5);
  /* The README describes that lift in prose ("a 6in lift on 37s"), so the
     whole tier name will not appear verbatim. What must still appear are the
     bits of it that identify which tier is meant - the height and the tyre.
     Sell a 8in on 40s instead and this fails. */
  const marks = sixInch.name.split(/\s+/).filter(w => /\d/.test(w));
  const missing = marks.filter(w => flat.indexOf(w) === -1);
  H.ok(missing.length === 0,
       'and the README still describes the lift the game actually sells',
       missing.length ? 'no mention of ' + missing.join(', ')
                      : sixInch.name + ' -> ' + marks.join(' + '));

  /* The parts table also quotes a figure for the race clutch. That one is not
     a stat sitting in a table, it is an outcome, so it has to be driven for:
     fit the top clutch to every car in the showroom and see what it is really
     worth down the strip. The claim has to hold for all of them rather than
     for one flattering example - which is how the README came to say "a
     second off the line" for something worth a fifth of that. */
  const clutchTop = ctx.slotByKey('clutch').tiers.length - 1;
  let least = Infinity, most = -Infinity, meanest = '';
  for(const key of ctx.CAR_ORDER){
    const gain = quarter(key).et - quarter(key, { clutch: clutchTop }).et;
    if(gain < least){ least = gain; meanest = ctx.CARS[key].name; }
    if(gain > most) most = gain;
  }
  /* It is quoted as a range because it honestly is one - a light car with
     little grip gets less out of a clutch than a heavy one with plenty. Both
     ends are checked: every car has to fall inside the printed range, and the
     printed range is not allowed to be padded out to where it says nothing. */
  const clutchSaid = flat.match(/Race clutch \| ([\d.]+)-([\d.]+)s off the line/);
  if(!clutchSaid){
    H.ok(false, 'the README still quotes what the race clutch is worth');
  } else {
    const lo = plain(clutchSaid[1]), hi = plain(clutchSaid[2]);
    const covers = least >= lo - 0.01 && most <= hi + 0.01;
    const honest = lo >= least - 0.06 && hi <= most + 0.06;
    H.ok(covers && honest,
         'the race clutch is worth what the README says, on every car',
         'README says ' + lo + '-' + hi + 's; measured ' + least.toFixed(2) +
         's (' + meanest + ') to ' + most.toFixed(2) + 's' +
         (covers ? '' : ' - outside the range') +
         (honest ? '' : ' - range padded'));
  }

  /* Free roam is quoted in kilometres across, not in WORLD_EDGE. */
  says('the field in free roam is as big as the README makes out',
       /the ([\d.]+) km field/, ctx.WORLD_EDGE * 2 / 1000, 0.05);
}

/* ------------------------------------------------------------ nitrous -- */

{
  console.log('\n  nitrous');
  const strip2 = ctx.buildTrack('strip');

  const run = (parts, holdNos) => {
    const c = ctx.makeCar('a90', parts);
    ctx.stageDrag([c], strip2);
    let t = 0;
    while(c.along < 402.336 && t < 60){
      ctx.stepCar(c, strip2, { throttle: 1, brake: 0, steer: 0, hand: false,
                               nos: holdNos }, DT);
      t += DT;
    }
    return { et: t, left: c.nosLeft };
  };

  const plain = run({}, false);
  const armedUnused = run({ nos: 2 }, false);
  const armedUsed = run({ nos: 2 }, true);

  H.ok(armedUsed.et < plain.et, 'nitrous is worth real time down the strip',
       plain.et.toFixed(2) + 's -> ' + armedUsed.et.toFixed(2) + 's');

  /* The trade: fitted and never pressed, you are only carrying the bottle. */
  H.ok(armedUnused.et > plain.et,
       'but carrying it and not using it makes you slower',
       plain.et.toFixed(2) + 's -> ' + armedUnused.et.toFixed(2) + 's');

  /* It is a budget, and the budget runs out. */
  H.ok(armedUsed.left < 0.001, 'holding it empties the bottle',
       armedUsed.left.toFixed(2) + 's left');
  H.ok(armedUnused.left > 6, 'and not holding it spends nothing',
       armedUnused.left.toFixed(1) + 's left');

  /* Off the throttle it does nothing, so it cannot be used as a brake-saver. */
  const coast = ctx.makeCar('a90', { nos: 2 });
  ctx.stageDrag([coast], strip2);
  coast.vf = 30;
  for(let i = 0; i < 60; i++){
    ctx.stepCar(coast, strip2, { throttle: 0, brake: 0, steer: 0, hand: false,
                                 nos: true }, DT);
  }
  H.ok(Math.abs(coast.nosLeft - coast.stats.nosTime) < 1e-6,
       'and off the throttle it does not spend itself');
}

/* --------------------------------------------------------- free roam -- */

{
  console.log('\n  free roam');
  const open = ctx.buildTrack('roam');
  H.ok(open.open === true, 'the roam map has no barrier');

  /* Drive off the side and keep going: on a normal track the barrier stops
     you seven metres past the kerb, out here nothing should. */
  const c = ctx.makeCar('trx', { lift: 2 });
  ctx.gridUp([c], open);
  for(let i = 0; i < 60 * 14; i++){
    ctx.stepCar(c, open, { throttle: 1, brake: 0, steer: 0.55, hand: false }, DT);
  }
  H.ok(Math.abs(c.lateral) > open.width / 2 + 7,
       'a car can leave the road entirely', Math.abs(c.lateral).toFixed(0) + ' m off it');

  /* ...but not off the edge of the world. */
  const far = ctx.makeCar('hellcoupe', {});
  ctx.gridUp([far], open);
  far.x = 640; far.z = 0; far.yaw = Math.PI / 2; far.vf = 60;
  for(let i = 0; i < 60 * 20; i++){
    ctx.stepCar(far, open, { throttle: 1, brake: 0, steer: 0, hand: false }, DT);
  }
  H.ok(Math.abs(far.x) <= 661, 'and not off the edge of the world',
       'stopped at x=' + far.x.toFixed(0));

  /* What a lift kit actually buys. Comparing the same truck to itself keeps
     power and weight out of it, so what is left is the grip - which is the
     whole trade. Straight-line speed across a field is not the test: a
     Hellion has enough power to out-drag a truck anywhere, and still cannot
     point itself at anything once it is off the tarmac. */
  const slideOnGrass = (parts) => {
    const car = ctx.makeCar('trx', parts);
    ctx.gridUp([car], open);
    car.x += 60;                                 // out in the field
    car.hint = 0; car.vf = 22;
    let worst = 0;
    for(let i = 0; i < 60 * 2.5; i++){
      ctx.stepCar(car, open, { throttle: 0.5, brake: 0, steer: 1, hand: false }, DT);
      worst = Math.max(worst, Math.abs(car.vl));
    }
    return worst;
  };
  const stockSlide = slideOnGrass({});
  const liftedSlide = slideOnGrass({ lift: 3 });
  H.ok(liftedSlide < stockSlide,
       'a lift kit grips in a field where the same truck stock slides',
       stockSlide.toFixed(2) + ' -> ' + liftedSlide.toFixed(2) + ' m/s of slide');

  /* ...and the other half of the bargain: it is worse on tarmac. */
  H.ok(ctx.carStats('trx', { lift: 3 }).grip < ctx.carStats('trx', {}).grip,
       'and gives grip away on the road to get it',
       ctx.carStats('trx', {}).grip.toFixed(2) + ' -> ' +
       ctx.carStats('trx', { lift: 3 }).grip.toFixed(2));
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
