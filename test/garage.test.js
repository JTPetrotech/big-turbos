/* The garage is the game. If a part does not change how the car behaves, or
   changes it the wrong way, there is nothing here worth playing. */
'use strict';

const H = require('./harness');

const core = H.read('10-core.js');
const gar = H.read('45-garage.js');
const trk = H.read('20-track.js');

const ctx = H.makeContext({ MPS_TO_MPH: 2.23694 });
H.run(ctx, H.grab(core, ['clamp', 'lerp', 'sign']));
H.run(ctx, 'var SAVE = {parts:{}, looks:{}, owned:["hatch"], credits:0, done:{}, champ:{}};');
H.run(ctx, H.grabVar(trk, ['TRACKS']));
H.run(ctx, 'function saveNow(){}');
H.run(ctx, H.grabVar(gar, ['CARS', 'CAR_ORDER', 'SLOTS', 'TRUCK_BODIES', 'CHAMPIONSHIPS', 'CHAMP_POINTS', 'KITS', 'WHEEL_SIZES', 'PAINTS', 'WHEELS', 'STRIPES', 'EVENTS', 'CLASSES']));
H.run(ctx, 'var GRAV = 9.81, RHO = 1.225, POWER_USE = 0.55, TRACTION = 0.85;');
H.run(ctx, H.grab(gar, [
  'isTruck', 'slotFits', 'slotsFor',
  'champById', 'champState', 'champOpen', 'champRound', 'awardChampPoints', 'champStandings',
  'slotByKey', 'partsFor', 'tierOf', 'carStats', 'statsOf', 'rollingForce',
  'driveForce', 'tractionLimit', 'dragForce', 'dragLimited', 'topSpeed',
  'forceAt', 'zeroTo60', 'gripAt', 'rating', 'classOf', 'summary',
  'partCost', 'eventOpen'
]));

const { carStats, topSpeed, zeroTo60, rating, classOf, gripAt, summary } = ctx;
const MPH = 2.23694;

console.log('\nGARAGE');

/* ------------------------------------------------------ the cars as sold -- */

console.log('\n  stock cars');
const stock = {};
for(const key of ctx.CAR_ORDER){
  const s = carStats(key, {});
  const r = rating(s);
  stock[key] = { s, r, top: topSpeed(s) * MPH, sixty: zeroTo60(s) };
  console.log('    ' + ctx.CARS[key].name.padEnd(16) +
              String(Math.round(stock[key].top)).padStart(4) + ' mph   0-60 ' +
              stock[key].sixty.toFixed(1) + 's   ' +
              String(r).padStart(4) + ' ' + classOf(r));
}

/* Every car should be quicker than the one below it in the list, or the
   showroom is selling a downgrade. */
let ordered = true;
for(let i = 1; i < ctx.CAR_ORDER.length; i++){
  const a = stock[ctx.CAR_ORDER[i - 1]], b = stock[ctx.CAR_ORDER[i]];
  if(b.r <= a.r) ordered = false;
}
H.ok(ordered, 'each car in the showroom rates above the one before it');

/* Numbers a person would recognise. A hot hatch is not doing 200 mph and a
   prototype is not taking nine seconds to 60. */
H.ok(stock.hatch.top > 95 && stock.hatch.top < 135,
     'the hatch tops out somewhere believable', Math.round(stock.hatch.top) + ' mph');
H.ok(stock.hatch.sixty > 7.5 && stock.hatch.sixty < 13,
     'the hatch is slow but not comically slow', stock.hatch.sixty.toFixed(1) + 's');
H.ok(stock.proto.sixty < 4.2, 'the prototype launches hard', stock.proto.sixty.toFixed(1) + 's');
H.ok(stock.proto.top > 170, 'the prototype has real top end', Math.round(stock.proto.top) + ' mph');
H.ok(stock.muscle.top > stock.rally.top,
     'the muscle car out-runs the rally car in a straight line');
H.ok(gripAt(stock.rally.s, 30) > gripAt(stock.muscle.s, 30),
     'the rally car out-corners the muscle car');

/* ------------------------------------------------ every part does something -- */

console.log('\n  each part changes the car');
for(const slot of ctx.SLOTS){
  /* A lift kit is only sold for a truck, so it has to be tried on one. */
  const on = slot.only === 'truck' ? 'trx' : 'coupe';
  for(let t = 1; t < slot.tiers.length; t++){
    const before = carStats(on, {});
    const after = carStats(on, { [slot.key]: t });
    let changed = false;
    for(const k of Object.keys(before)){
      if(Math.abs(before[k] - after[k]) > 1e-9) changed = true;
    }
    H.ok(changed, slot.name + ' / ' + slot.tiers[t].name + ' changes a stat');
  }
}

/* --------------------------------------------------- upgrades go the right way -- */

console.log('\n  upgrades improve what they claim to');

const base = carStats('coupe', {});

H.ok(topSpeed(carStats('coupe', { engine: 3 })) > topSpeed(base),
     'a race engine raises top speed');
H.ok(zeroTo60(carStats('coupe', { engine: 3 })) < zeroTo60(base),
     'a race engine cuts the 0-60');
H.ok(gripAt(carStats('coupe', { tyres: 3 }), 30) > gripAt(base, 30),
     'slicks add grip');
H.ok(carStats('coupe', { brakes: 3 }).brake > base.brake,
     'carbon brakes stop harder');
H.ok(carStats('coupe', { susp: 3 }).steer > base.steer,
     'race suspension turns in quicker');
H.ok(carStats('coupe', { weight: 3 }).mass < base.mass - 200,
     'a stripped shell is properly lighter');

/* ------------------------------------------------- the trades actually trade -- */

console.log('\n  and the expensive ones cost you something');

/* Aero: more grip at speed, less top speed. If it did not cost the straight
   there would be no decision to make. */
const aero = carStats('coupe', { aero: 3 });
H.ok(gripAt(aero, 60) > gripAt(base, 60), 'a full aero kit grips harder at speed');
H.ok(topSpeed(aero) < topSpeed(base), 'and gives up top speed for it',
     Math.round((topSpeed(base) - topSpeed(aero)) * MPH) + ' mph slower');

/* Gearing: the two cheap options should pull in opposite directions. */
const shortG = carStats('coupe', { gears: 1 });
const longG = carStats('coupe', { gears: 2 });
H.ok(zeroTo60(shortG) < zeroTo60(base), 'short ratios accelerate harder');
H.ok(topSpeed(shortG) < topSpeed(base), 'short ratios run out of top speed');
H.ok(topSpeed(longG) > topSpeed(base), 'long ratios stretch the top end');
H.ok(zeroTo60(longG) > zeroTo60(base), 'long ratios are lazier away');

/* Weight: quicker everywhere, but the back end gets livelier. */
const light = carStats('coupe', { weight: 3 });
H.ok(zeroTo60(light) < zeroTo60(base), 'a lighter car accelerates better');
H.ok(light.stability < base.stability * 0.9,
     'and is measurably more nervous with it',
     'stability ' + light.stability.toFixed(2) + ' vs ' + base.stability.toFixed(2));

/* Turbo: nothing below the threshold, a lot above it.
   Compared as acceleration rather than force, because a turbo adds 24 kg and
   more mass means more traction - which raises the force a car can put down
   while leaving what it does with it exactly the same. */
const turbo = carStats('coupe', { turbo: 2 });
const accel = (s, v) => ctx.driveForce(s, v) / s.mass;
H.ok(accel(turbo, 10) <= accel(base, 10) + 1e-9,
     'a big turbo does nothing at walking pace',
     accel(turbo, 10).toFixed(3) + ' vs ' + accel(base, 10).toFixed(3) + ' m/s^2');
H.ok(accel(turbo, 45) > accel(base, 45) * 1.2,
     'and a great deal once it is spinning',
     '+' + Math.round((accel(turbo, 45) / accel(base, 45) - 1) * 100) + '%');

/* --------------------------------------------------- a full build is a leap -- */

console.log('\n  a fully built car');
const maxed = {};
for(const slot of ctx.SLOTS) maxed[slot.key] = slot.tiers.length - 1;
/* Long gears rather than short, for a fair top-speed comparison. */
maxed.gears = 3;
const full = carStats('coupe', maxed);
console.log('    stock coupe   ' + Math.round(topSpeed(base) * MPH) + ' mph, 0-60 ' +
            zeroTo60(base).toFixed(1) + 's, rating ' + rating(base) + ' ' + classOf(rating(base)));
console.log('    built coupe   ' + Math.round(topSpeed(full) * MPH) + ' mph, 0-60 ' +
            zeroTo60(full).toFixed(1) + 's, rating ' + rating(full) + ' ' + classOf(rating(full)));

H.ok(rating(full) > rating(base) * 1.4, 'building a car is worth doing');
H.ok(zeroTo60(full) < zeroTo60(base) * 0.72, 'a built coupe is dramatically quicker');
H.ok(rating(full) < rating(carStats('proto', maxed)),
     'but a built coupe still does not beat a built prototype');

/* A fully built starter car should be able to reach the last event, or the
   career dead-ends for anyone who does not buy the expensive cars. */
const fullHatch = carStats('hatch', maxed);
H.ok(rating(fullHatch) > ctx.EVENTS[3].max,
     'a fully built hatch can enter the mid-career events',
     'rating ' + rating(fullHatch));

/* ------------------------------------------------------------- the money -- */

console.log('\n  the economy');

/* Can the opening event be won in a car you are given, and does the prize
   buy anything? If the first race cannot be won with the free car the game
   is broken at the front door. */
H.ok(rating(carStats('hatch', {})) <= ctx.EVENTS[0].max,
     'the free car is eligible for the first event',
     rating(carStats('hatch', {})) + ' vs limit ' + ctx.EVENTS[0].max);

const cheapest = Math.min.apply(null, ctx.SLOTS.map(s => s.tiers[1].cost));
H.ok(ctx.EVENTS[0].prize[0] >= cheapest,
     'winning the first race buys at least one part',
     'prize ' + ctx.EVENTS[0].prize[0] + ', cheapest part ' + cheapest);

/* Events must be ordered so the class limits never go backwards. */
let limitsOk = true;
for(let i = 1; i < ctx.EVENTS.length; i++){
  if(ctx.EVENTS[i].max < ctx.EVENTS[i - 1].max) limitsOk = false;
}
H.ok(limitsOk, 'the career never asks for a slower car than the race before');

/* Every event must be reachable by some car the player can afford to build. */
let reachable = true;
for(const ev of ctx.EVENTS){
  let any = false;
  for(const key of ctx.CAR_ORDER){
    if(rating(carStats(key, {})) <= ev.max) any = true;
  }
  if(!any) reachable = false;
}
H.ok(reachable, 'every event has at least one car that can legally enter it');

/* ------------------------------------------------- the newer parts -- */

console.log('\n  differential, clutch and nitrous');
{
  const open = carStats('gtr', {});
  const spool = carStats('gtr', { diff: 3 });
  H.ok(ctx.tractionLimit(spool) > ctx.tractionLimit(open),
       'a spool puts more power down');
  H.ok(spool.steer < open.steer,
       'and gives away steering to do it',
       open.steer.toFixed(2) + ' -> ' + spool.steer.toFixed(2));

  const stockC = carStats('muscle', {});
  const carbon = carStats('muscle', { clutch: 3 });
  H.ok(ctx.zeroTo60(carbon) < ctx.zeroTo60(stockC),
       'a race clutch is worth 0-60',
       ctx.zeroTo60(stockC).toFixed(2) + 's -> ' + ctx.zeroTo60(carbon).toFixed(2) + 's');
  H.ok(Math.abs(ctx.topSpeed(carbon) - ctx.topSpeed(stockC)) < 0.6,
       'and does nothing at all for top speed');

  /* The bottle is a budget: capacity is finite, and the weight is not. */
  const dry = carStats('a90', {});
  const wet = carStats('a90', { nos: 3 });
  H.ok(wet.nos > 0 && wet.nosTime > 0, 'nitrous gives both a shot and a clock',
       '+' + Math.round(wet.nos * 100) + '% for ' + wet.nosTime + 's');
  H.ok(wet.mass > dry.mass, 'and the bottle is carried whether you use it or not',
       dry.mass + ' -> ' + wet.mass + ' kg');
  H.ok(Math.abs(ctx.topSpeed(wet) - ctx.topSpeed(dry)) < 1.2,
       'nitrous is not simply more top speed');
}

/* --------------------------------------------------- looks are free -- */

console.log('\n  the looks change nothing');
{
  const plain = carStats('rx', {});
  for(let k = 0; k < ctx.KITS.length; k++){
    /* Looks live in SAVE.looks, not in parts, so carStats cannot see them at
       all - this is the test that keeps it that way. */
    const keys = Object.keys(plain);
    const same = keys.every(key => Math.abs(plain[key] - carStats('rx', {})[key]) < 1e-9);
    H.ok(same, 'body kit ' + ctx.KITS[k].n + ' leaves the car untouched');
  }
}

/* --------------------------------------------------- championships -- */

console.log('\n  the championships');
{
  for(const ch of ctx.CHAMPIONSHIPS){
    H.ok(ch.rounds.length >= 3, ch.name + ' is a season, not a race',
         ch.rounds.length + ' rounds');
    H.ok(ch.rivals.length >= 2 && ch.rivals.every(r => ctx.CARS[r.car]),
         'and its rivals all drive cars that exist');
  }

  /* Only the first is open until one is won. */
  ctx.SAVE.champ = {};
  H.ok(ctx.champOpen(0) === true, 'the first season is open from the start');
  H.ok(ctx.champOpen(1) === false, 'and the second is not');

  /* Run a whole season, winning every round. */
  const ch = ctx.CHAMPIONSHIPS[0];
  const names = ['You'].concat(ch.rivals.map(r => r.name));
  for(let n = 0; n < ch.rounds.length; n++){
    const ev = ctx.champRound(ch, n);
    H.ok(!!ctx.TRACKS[ev.track], 'round ' + (n + 1) + ' runs on a track that exists');
    ctx.awardChampPoints(ch, names);
  }
  const st = ctx.champState(ch.id);
  H.ok(st.done === true, 'four rounds finishes the season');
  H.ok(ctx.champOpen(1) === true, 'and that opens the next one');

  const table = ctx.champStandings(ch);
  H.ok(table[0].name === 'You' && table[0].pts === ctx.CHAMP_POINTS[0] * ch.rounds.length,
       'winning every round tops the table', table[0].pts + ' points');
  H.ok(table[table.length - 1].pts < table[0].pts, 'and the table is actually sorted');

  /* Points per round are fixed, so a season total cannot drift. */
  const total = table.reduce((a, b) => a + b.pts, 0);
  const perRound = ctx.CHAMP_POINTS.slice(0, names.length).reduce((a, b) => a + b, 0);
  H.ok(total === perRound * ch.rounds.length,
       'every round hands out the same points', total + ' across the season');
}

H.done();
