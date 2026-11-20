/* The garage is the game. If a part does not change how the car behaves, or
   changes it the wrong way, there is nothing here worth playing. */
'use strict';

const H = require('./harness');

const core = H.read('10-core.js');
const gar = H.read('45-garage.js');

const ctx = H.makeContext({ MPS_TO_MPH: 2.23694 });
H.run(ctx, H.grab(core, ['clamp', 'lerp', 'sign']));
H.run(ctx, 'var SAVE = {parts:{}, looks:{}, owned:["hatch"], credits:0, done:{}};');
H.run(ctx, 'function saveNow(){}');
H.run(ctx, H.grabVar(gar, ['CARS', 'CAR_ORDER', 'SLOTS', 'PAINTS', 'WHEELS', 'STRIPES', 'EVENTS', 'CLASSES']));
H.run(ctx, 'var GRAV = 9.81, RHO = 1.225, POWER_USE = 0.55, TRACTION = 0.85;');
H.run(ctx, H.grab(gar, [
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
  for(let t = 1; t < slot.tiers.length; t++){
    const before = carStats('coupe', {});
    const after = carStats('coupe', { [slot.key]: t });
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

H.done();
