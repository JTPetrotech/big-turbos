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
  'partCost', 'eventOpen',
  'freeBuild', 'listPrice', 'ownsCar', 'ownsPart', 'buyPart', 'fitPart', 'buyCar',
  'newKit', 'benchStep', 'allKits', 'kitAt', 'isCustomKit', 'saveKit', 'deleteKit'
]));
H.run(ctx, H.grabVar(gar, ['BENCH_PARTS']));
/* grabVar lifts tables, not plain numbers, so this one is read out of the
   source rather than typed here as well. Change it in the game and the test
   follows; type it twice and it rots. */
H.run(ctx, 'var MAX_KITS = ' + Number(/var MAX_KITS\s*=\s*(\d+)/.exec(gar)[1]) + ';');

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

/* Induction: nothing below the threshold, a lot above it.
   Compared as acceleration rather than force, because induction adds mass and
   more mass means more traction - which raises the force a car can put down
   while leaving what it does with it exactly the same.

   Every tier is checked against its own `lag` rather than one hardcoded tier
   index. The index version of this test silently changed meaning the moment a
   new option was slotted in above it, and passed while checking the wrong
   part. A supercharger has no lag at all, so it gets the opposite check. */
const accel = (s, v) => ctx.driveForce(s, v) / s.mass;
ctx.slotByKey('turbo').tiers.forEach((tier, i) => {
  if(i === 0) return;                                  // stock, nothing fitted
  const s = carStats('coupe', { turbo: i });
  const up = Math.max(tier.lag + 20, 22);              // comfortably spinning

  if(tier.lag > 0){
    const low = tier.lag * 0.6;
    H.ok(accel(s, low) <= accel(base, low) + 1e-9,
         tier.name + ' gives nothing below the speed it comes in at',
         'at ' + Math.round(low * MPH) + ' mph');
  } else {
    H.ok(accel(s, 10) > accel(base, 10) - 1e-9,
         tier.name + ' has nothing to wait for',
         'pulls from a standstill');
  }

  H.ok(accel(s, up) > accel(base, up) * 1.1,
       'and ' + tier.name + ' is worth real acceleration once it is on',
       '+' + Math.round((accel(s, up) / accel(base, up) - 1) * 100) +
       '% at ' + Math.round(up * MPH) + ' mph');
});

/* The point of the supercharger is that it trades peak for immediacy, so it
   must not also be the most powerful thing on the shelf. */
const blown = ctx.slotByKey('turbo').tiers.filter(t => t.lag === 0 && t.boost > 0)[0];
const biggest = ctx.slotByKey('turbo').tiers.reduce((a, b) => b.boost > a.boost ? b : a);
H.ok(blown && blown.boost < biggest.boost,
     'the supercharger buys its immediacy with peak power',
     blown ? '+' + Math.round(blown.boost * 100) + '% against ' +
             biggest.name + ' at +' + Math.round(biggest.boost * 100) + '%' : 'none found');

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
  /* Looks live in SAVE.looks, never in parts, so carStats cannot see them.
     This is the test that keeps it that way, and it only works if it
     actually puts a kit on the car: the version before this one compared
     carStats('rx', {}) with carStats('rx', {}) and never set anything, so it
     was true no matter what a kit did. */
  const plain = carStats('rx', {});
  const keys = Object.keys(plain);
  const untouched = () => keys.every(k =>
    Math.abs(plain[k] - carStats('rx', {})[k]) < 1e-9);

  const kits = ctx.allKits();
  for(let k = 0; k < kits.length; k++){
    ctx.SAVE.looks.rx = { paint: 3, wheel: 2, stripe: 1, spoiler: true, kit: k, size: 3 };
    H.ok(untouched(), 'body kit ' + kits[k].n + ' leaves the car untouched');
  }

  /* And the most extreme thing the Workbench can produce - every component
     wound all the way up. If a kit is ever quietly given a stat, it will be
     this one. */
  const maxed = ctx.newKit();
  ctx.BENCH_PARTS.forEach(p => { maxed[p.key] = p.steps[p.steps.length - 1].v; });
  maxed.n = 'Everything at once';
  const made = ctx.saveKit(maxed);
  H.ok(made.ok && ctx.isCustomKit(made.index),
       'a kit built on the Workbench saves and lands past the presets',
       'index ' + made.index);

  ctx.SAVE.looks.rx = { kit: made.index };
  H.ok(untouched(), 'and the wildest kit the bench can make is still only shape');
  H.ok(ctx.kitAt(made.index).n === 'Everything at once',
       'the kit list serves it back by the index it was given');

  ctx.SAVE.looks.rx = {};
}

/* ------------------------------------------------------- the Workbench -- */

console.log('\n  the Workbench');
{
  ctx.SAVE.kits = [];
  ctx.SAVE.looks = {};

  /* Every component has an off position, and it has to be first - a new kit
     starts as nothing at all rather than as a wing you did not ask for. */
  const blank = ctx.newKit();
  ctx.BENCH_PARTS.forEach(p => {
    H.ok(p.steps[0].v === 0, p.name + ' starts at nothing');
    H.ok((blank[p.key] || 0) === 0, 'and a new kit has no ' + p.name.toLowerCase());
    H.ok(ctx.benchStep(blank, p) === 0, 'and reads back as off');
  });

  /* A name is never required of anyone, so one gets made up. */
  const unnamed = ctx.saveKit(ctx.newKit());
  H.ok(unnamed.ok && ctx.kitAt(unnamed.index).n.length > 0,
       'a kit saved without a name still gets one', ctx.kitAt(unnamed.index).n);

  /* The bench is finite, and says so rather than silently dropping one. */
  while(ctx.SAVE.kits.length < ctx.MAX_KITS) ctx.saveKit(ctx.newKit());
  const full = ctx.saveKit(ctx.newKit());
  H.ok(!full.ok, 'a full bench refuses rather than losing one', full.why || '');
  H.ok(ctx.SAVE.kits.length === ctx.MAX_KITS, 'and holds exactly what it said it would',
       ctx.MAX_KITS + '');

  /* Scrapping one shifts every later kit down an index. Any car wearing one
     of those has to come with it, or it silently changes clothes. */
  ctx.SAVE.kits = [];
  const a = ctx.saveKit({ n: 'A', wing: 3 }).index;
  const b = ctx.saveKit({ n: 'B', wing: 2 }).index;
  const c = ctx.saveKit({ n: 'C', wing: 1 }).index;
  ctx.SAVE.looks = { hatch: { kit: a }, coupe: { kit: b }, rx: { kit: c } };

  ctx.deleteKit(b);
  H.ok(ctx.SAVE.looks.hatch.kit === a, 'scrapping a kit leaves earlier ones alone');
  H.ok(ctx.SAVE.looks.coupe.kit === 0,
       'the car that was wearing it goes back to standard');
  H.ok(ctx.kitAt(ctx.SAVE.looks.rx.kit).n === 'C',
       'and a car wearing a later one still has the same kit on it',
       'index ' + ctx.SAVE.looks.rx.kit);

  H.ok(!ctx.deleteKit(0), 'the presets cannot be scrapped');

  ctx.SAVE.kits = [];
  ctx.SAVE.looks = {};
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

/* ------------------------------------------ the text the game shows you -- */

/* Every number printed in the garage is a claim about a stat sitting a few
   lines away from it in the same file, and nothing stops the two drifting
   apart. A wrong description is worse than a wrong README: the player reads
   it while deciding what to spend money they earned on.

   So find every number in every piece of player-facing text and insist it
   can be derived from the stats of the thing it describes. There is no list
   of expected values here on purpose - that would be the same table typed
   twice over again, which is the problem rather than the fix. */

{
  console.log('\n  the text the game shows you');

  /* What a number in a tier's description is allowed to mean. Every entry
     reads the tier's own stats, so retuning a part changes what its own text
     is permitted to say. */
  const meanings = t => {
    const m = [];
    const add = (v, what) => {
      if(typeof v === 'number' && isFinite(v)) m.push({ v: v, what: what });
    };
    const pct = (v, what) => add(Math.abs(1 - v) * 100, what);

    if(t.power !== undefined) pct(t.power, 'the power change');
    if(t.boost !== undefined) add(t.boost * 100, 'the boost it adds');
    if(t.lag !== undefined) add(t.lag * MPH, 'the speed it comes in at');
    if(t.nos !== undefined) add(t.nos * 100, 'the nitrous it adds');
    if(t.nosTime !== undefined) add(t.nosTime, 'seconds of nitrous');
    if(t.mass !== undefined) add(Math.abs(t.mass), 'the weight');
    if(t.grip !== undefined) pct(t.grip, 'the grip change');
    if(t.steer !== undefined) pct(t.steer, 'the steering change');
    if(t.brake !== undefined) pct(t.brake, 'the braking change');
    if(t.down !== undefined) add(t.down * 100, 'the downforce');
    if(t.cda !== undefined) pct(t.cda, 'the drag change');
    if(t.force !== undefined) pct(t.force, 'the gearing change');
    if(t.top !== undefined) pct(t.top, 'the top speed change');
    if(t.diff !== undefined) add(t.diff * 100, 'how far it locks');
    if(t.launch !== undefined) pct(t.launch, 'the launch change');
    if(t.lift !== undefined) add(t.lift * 39.3701, 'inches of ride height');
    if(t.offroad !== undefined) add(t.offroad * 100, 'the off-road grip');
    if(t.stability !== undefined) pct(t.stability, 'the stability change');
    return m;
  };

  /* A car's stats are absolute, not multipliers, so they read differently. */
  const carMeanings = c => {
    const m = [];
    const add = (v, what) => {
      if(typeof v === 'number' && isFinite(v)) m.push({ v: v, what: what });
    };
    add(c.power, 'its kW');
    add(c.power * 1.34102, 'its horsepower');
    add(c.mass, 'its weight');
    if(c.lag !== undefined) add(c.lag * MPH, 'the speed its turbo comes in at');
    if(c.boost !== undefined) add(c.boost * 100, 'its factory boost');
    return m;
  };

  /* "around 30 mph" is allowed to be 31.3. An unqualified number is not. */
  const APPROX = /\b(around|about|roughly|nearly|almost|some)\s*$/i;

  const checkText = (label, text, allowed) => {
    const found = text.match(/\d+(?:\.\d+)?/g);
    if(!found) return;                        // nothing claimed, nothing to check
    const bad = [];
    const matched = [];
    for(const raw of found){
      const at = text.indexOf(raw);
      const before = text.slice(Math.max(0, at - 12), at);
      const tol = APPROX.test(before) ? 2.5 : 1;
      const said = parseFloat(raw);
      const hit = allowed.filter(a => Math.abs(a.v - said) <= tol)[0];
      if(hit) matched.push(raw + ' = ' + hit.what);
      else bad.push('"' + raw + '" matches nothing on it' +
                    (allowed.length ? ' (nearest: ' + allowed
                       .slice().sort((x, y) => Math.abs(x.v - said) - Math.abs(y.v - said))[0]
                       .v.toFixed(1) + ')' : ''));
    }
    H.ok(bad.length === 0, label, bad.length ? bad.join('; ') : matched.join(', '));
  };

  /* Tier descriptions. Tier *names* are deliberately left alone: "6in on 37s"
     is a name for a build, and the 37 is a tyre diameter the model has no
     stat for. Inventing a rule for it would be making a spec up rather than
     checking one. */
  for(const slot of ctx.SLOTS){
    for(const tier of slot.tiers){
      if(tier.d) checkText(slot.name + ' / ' + tier.name + ' says only what it does',
                           tier.d, meanings(tier));
    }

    /* A slot's blurb covers every tier at once, so it can only ever be right
       about one of them. It must not quote a number. */
    H.ok(!/\d/.test(slot.blurb || ''),
         slot.name + ' blurb makes no numeric promise it cannot keep',
         slot.blurb);
  }

  /* Car descriptions, same rule. */
  for(const key of ctx.CAR_ORDER){
    const car = ctx.CARS[key];
    if(car.desc) checkText(car.name + ' is described accurately',
                           car.desc, carMeanings(car));
  }

  /* Two claims are spelled out in words rather than digits. */
  const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven',
                 'eight', 'nine', 'ten', 'eleven', 'twelve'];

  /* "for four seconds a race" has to be the bottle's actual budget. */
  for(const tier of ctx.slotByKey('nos').tiers){
    if(!tier.nosTime) continue;
    const word = WORDS[tier.nosTime] || String(tier.nosTime);
    H.ok(new RegExp(word + ' seconds?').test(tier.d),
         'Nitrous / ' + tier.name + ' quotes the seconds it really gives you',
         tier.nosTime + 's, written "' + word + '"');
  }

  /* "seven hundred horsepower" has to round to the car's actual output. */
  let hundreds = 0;
  for(const key of ctx.CAR_ORDER){
    const car = ctx.CARS[key];
    const m = (car.desc || '').match(/(\w+) hundred horsepower/i);
    if(!m) continue;
    hundreds++;
    const said = (WORDS.indexOf(m[1].toLowerCase()) + 0) * 100;
    const real = car.power * 1.34102;
    H.ok(Math.abs(said - real) <= 50,
         car.name + ' really has the horsepower it boasts about',
         'says ' + said + ' hp, has ' + Math.round(real) + ' hp');
  }
  H.ok(hundreds > 0, 'and that check found a car to run on', hundreds + ' of them');
}

/* ------------------------------------------------------------- the money -- */

/* Unlimited money is how the game ships, and it has to mean two separate
   things: nothing has a price, and nothing taken for free is recorded as
   bought. Without the second, switching the earning game back on would hand
   you a garage you never paid for, and the prices would be theatre. */

{
  console.log('\n  money, switched on and off');

  const slotKey = ctx.SLOTS[0].key;
  const top = ctx.SLOTS[0].tiers.length - 1;
  const price = ctx.SLOTS[0].tiers[top].cost;

  ctx.SAVE.parts = {};
  ctx.SAVE.credits = 0;
  ctx.SAVE.freeBuild = true;

  H.ok(ctx.freeBuild(), 'unlimited money is the default');
  H.ok(ctx.partCost(slotKey, top) === 0, 'so nothing has a price',
       ctx.SLOTS[0].tiers[top].name + ', normally ' + price);
  H.ok(ctx.listPrice('proto') > 0,
       'though the showroom still knows what a car is worth',
       ctx.listPrice('proto') + '');

  const free = ctx.buyPart('hatch', slotKey, top);
  H.ok(free.ok && ctx.tierOf('hatch', slotKey) === top,
       'the dearest part goes on with no money at all');
  H.ok(ctx.SAVE.credits === 0, 'and nothing was taken for it');
  H.ok(!ctx.ownsPart('hatch', slotKey, top),
       'and it is not recorded as bought, so the prices stay real');

  /* Switched off, the shop is a shop again. */
  ctx.SAVE.freeBuild = false;
  H.ok(ctx.partCost(slotKey, top) === price, 'switching it off puts the price back',
       price + '');
  H.ok(!ctx.buyPart('hatch', slotKey, top).ok,
       'and with an empty wallet you cannot have it');

  ctx.SAVE.credits = price;
  const bought = ctx.buyPart('hatch', slotKey, top);
  H.ok(bought.ok && ctx.SAVE.credits === 0 && ctx.ownsPart('hatch', slotKey, top),
       'pay for it and it is yours, and the money is gone');

  /* Cars work the same way round. */
  const dear = ctx.CAR_ORDER[ctx.CAR_ORDER.length - 1];
  H.ok(!ctx.ownsCar(dear), 'a car you have not bought is not yours', dear);
  ctx.SAVE.freeBuild = true;
  H.ok(ctx.ownsCar(dear), 'and with money off, every car is', dear);
  H.ok(ctx.SAVE.owned.indexOf(dear) === -1,
       'without being written into the save as owned');

  ctx.SAVE.freeBuild = true;        // leave it as the game ships
  ctx.SAVE.parts = {};
  ctx.SAVE.credits = 0;
}

H.done();
