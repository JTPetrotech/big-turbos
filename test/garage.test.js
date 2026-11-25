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
H.run(ctx, H.grabVar(H.read('30-cars.js'), ['BODIES']));
H.run(ctx, 'function saveNow(){}');
H.run(ctx, H.grabVar(gar, ['CARS', 'CAR_ORDER', 'SLOTS', 'TRUCK_BODIES', 'CHAMPIONSHIPS', 'CHAMP_POINTS', 'KITS', 'WHEEL_SIZES', 'PAINTS', 'WHEELS', 'STRIPES', 'EVENTS', 'CLASSES']));
H.run(ctx, 'var GRAV = 9.81, RHO = 1.225, POWER_USE = 0.55, TRACTION = 0.85;');
H.run(ctx, H.grab(gar, [
  'isTruck', 'slotFits', 'slotsFor',
  'champById', 'champState', 'champOpen', 'champRound', 'awardChampPoints', 'champStandings',
  'slotByKey', 'partsFor', 'tierOf', 'carStats', 'statsOf', 'rollingForce',
  'driveForce', 'tractionLimit', 'dragForce', 'dragLimited', 'topSpeed',
  'forceAt', 'flatOut', 'zeroTo60', 'gripAt', 'rating', 'classOf', 'summary',
  'partCost', 'eventOpen',
  'freeBuild', 'listPrice', 'ownsCar', 'ownsPart', 'buyPart', 'fitPart', 'buyCar',
  'newKit', 'benchStep', 'allKits', 'kitAt', 'isCustomKit', 'saveKit', 'deleteKit',
  'gripCeiling', 'dialByKey', 'neutralTune', 'tuneFor', 'setTune', 'resetTune',
  'isTuned', 'applyTune', 'dynoPull', 'dynoPeak', 'logDyno',
  'looksFor', 'swatchesFor', 'defaultPaint', 'paintColour',
  'revsOf', 'cycleHz', 'firingHz'
]));
/* Plain numbers, so grabVar cannot lift them: read out of the source the
   same way MAX_KITS is, rather than typed in here where they would rot. */
H.run(ctx, 'var GEARS_SHOWN = ' + Number(/var GEARS_SHOWN\s*=\s*(\d+)/.exec(gar)[1]) +
           ', IDLE_RPM = ' + Number(/IDLE_RPM\s*=\s*(\d+)/.exec(gar)[1]) + ';');
H.run(ctx, H.grab(H.read('35-sound.js'), ['engineVoice', 'voiceLevels', 'engineSmooth']));
H.run(ctx, H.grabVar(gar, ['BENCH_PARTS', 'TUNE_DIALS']));
/* grabVar lifts tables, not plain numbers, so this one is read out of the
   source rather than typed here as well. Change it in the game and the test
   follows; type it twice and it rots. */
H.run(ctx, 'var MAX_KITS = ' + Number(/var MAX_KITS\s*=\s*(\d+)/.exec(gar)[1]) + ';');

/* How many colours the paint shop holds as written down in the source. The
   whole of the colour test below hangs on this being read before anything
   has had the chance to change it. */
const PAINTS_AT_LOAD = ctx.PAINTS.length;

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


/* ------------------------------------------------------- the Speed Demon -- */

console.log('\n  the dials');

const { neutralTune, tuneFor, setTune, resetTune, isTuned, flatOut,
        dynoPull, dynoPeak, logDyno, gripCeiling, dragForce, rollingForce,
        forceAt, driveForce } = ctx;

/* Which way is up for each stat a dial can touch. A step that moves nothing
   on this list the wrong way is a free lunch, and this garage does not do
   free lunches. */
const BETTER = { grip: 1, force: 1, top: 1, boost: 1, down: 1, cda: -1, lag: -1 };

ctx.SAVE.tune = {};
const untouched = tuneFor('coupe');
H.ok(!isTuned(untouched), 'a car nobody has touched has every dial on its middle notch',
     JSON.stringify(untouched));

/* The neutral tune has to be indistinguishable from no tune at all, or the
   whole garage shifts underneath every car the day this screen is added. */
let drift = 0;
for(const key of ctx.CAR_ORDER){
  const bare = carStats(key, {});
  const mid = carStats(key, {}, neutralTune());
  for(const stat in bare) if(Math.abs(bare[stat] - mid[stat]) > 1e-9) drift++;
}
H.ok(drift === 0, 'and the middle notch changes nothing at all about any car',
     drift + ' stats moved');

/* Pick a car that has something to turn up, so the boost dial is live. */
const turboCar = ctx.CAR_ORDER.find(k => carStats(k, {}).boost > 0);
H.ok(!!turboCar, 'and there is a turbocharged car to test the boost dial on',
     turboCar && ctx.CARS[turboCar].name);

let freeLunch = 0, pureLoss = 0;
for(const dial of ctx.TUNE_DIALS){
  const base = carStats(turboCar, {}, neutralTune());
  for(let st = 0; st < dial.steps.length; st++){
    if(st === dial.mid) continue;
    const t = neutralTune();
    t[dial.key] = st;
    const s = carStats(turboCar, {}, t);
    let gained = false, given = false;
    for(const stat in BETTER){
      const moved = (s[stat] - base[stat]) * BETTER[stat];
      if(moved > 1e-9) gained = true;
      if(moved < -1e-9) given = true;
    }
    if(!given) freeLunch++;
    if(!gained) pureLoss++;
  }
}
H.ok(freeLunch === 0, 'no step on any dial is a free lunch',
     freeLunch + ' gave something for nothing');
H.ok(pureLoss === 0, 'and none of them is a pure downgrade either',
     pureLoss + ' took without giving');

/* A dial that pretends to do something it cannot is worse than no dial. */
const na = ctx.CAR_ORDER.find(k => !(carStats(k, {}).boost > 0));
const naUp = neutralTune(); naUp.boost = 3;
H.ok(carStats(na, {}, naUp).boost === 0,
     'turning up the boost on a car with no turbo conjures none out of nothing',
     ctx.CARS[na].name);
const turboUp = neutralTune(); turboUp.boost = 3;
H.ok(carStats(turboCar, {}, turboUp).boost > carStats(turboCar, {}, neutralTune()).boost,
     'but on one that has a turbo it really does turn it up');

/* The one that started all this: gearing used to be invisible to the rating
   in the direction that mattered. */
const shortT = neutralTune(); shortT.gear = ctx.TUNE_DIALS[0].steps.length - 1;
const shortS = carStats(turboCar, {}, shortT), midS = carStats(turboCar, {}, neutralTune());
H.ok(ctx.zeroTo60(shortS) < ctx.zeroTo60(midS), 'short gears buy acceleration',
     ctx.zeroTo60(midS).toFixed(2) + 's -> ' + ctx.zeroTo60(shortS).toFixed(2) + 's');
H.ok(flatOut(shortS) < flatOut(midS), 'and pay for it in top speed',
     Math.round(flatOut(midS) * MPH) + ' -> ' + Math.round(flatOut(shortS) * MPH) + ' mph');
H.ok(rating(shortS) > rating(midS),
     'and the rating goes up, so you cannot gear your way into a slower class',
     rating(midS) + ' -> ' + rating(shortS));

/* The dials are per car and they survive being written down. */
setTune('coupe', 'gear', 4);
H.ok(tuneFor('coupe').gear === 4 && tuneFor('a90').gear === 2,
     'a dial turned on one car stays on that car');
H.ok(isTuned(tuneFor('coupe')), 'and the car is marked as having been got at');
resetTune('coupe');
H.ok(!isTuned(tuneFor('coupe')), 'and putting the dials back really puts them back');

/* ------------------------------------------------------------- the dyno -- */

console.log('\n  the rolling road');

const demo = carStats(turboCar, { turbo: 2, tyres: 1 });
const peak = dynoPeak(demo);

let highest = 0, hardest = 0;
for(const p of peak.pull){ highest = Math.max(highest, p.kw); hardest = Math.max(hardest, p.push); }
H.near(peak.kw, highest, 1e-9, 'the peak is read off the samples the graph is drawn from');
H.near(peak.push, hardest, 1e-9, 'and so is the hardest it pulls');

/* The graph says "this is as fast as it goes" by drawing a line where the
   red curve meets the blue one. That claim is only worth making if the two
   are the same number. */
let crossed = null;
for(const p of peak.pull) if(p.push <= p.hold){ crossed = p.mph; break; }
H.ok(crossed !== null, 'the two lines do cross somewhere on the graph');
H.near(crossed, peak.topMph, 2.5,
       'and they cross at the top speed printed beside it');

/* Amber on the graph means the tyres are the limit. It had better mean it. */
let amberWrong = 0;
for(const p of peak.pull){
  const limited = p.push >= gripCeiling(demo, p.v) - 0.5;
  if(limited !== p.slip) amberWrong++;
}
H.ok(amberWrong === 0, 'every amber stretch really is where the tyres are the limit',
     amberWrong + ' samples disagreed');

const small = dynoPeak(carStats(turboCar, { turbo: 1 }));
const big = dynoPeak(carStats(turboCar, { turbo: 5 }));
H.ok(big.kw > small.kw, 'a bigger turbo shows up on the rollers as more power',
     Math.round(small.kw) + ' -> ' + Math.round(big.kw) + ' kW');
H.ok(big.boostBy > small.boostBy, 'and as boost that arrives later',
     Math.round(small.boostBy) + ' -> ' + Math.round(big.boostBy) + ' mph');

ctx.SAVE.dyno = {};
H.ok(logDyno('coupe', big) === true, 'the first pull of the day is a record');
H.ok(logDyno('coupe', small) === false, 'a worse one after it is not');
H.near(ctx.SAVE.dyno.coupe.kw, big.kw, 1e-9,
       'and the best pull is the one that is kept');

/* --------------------------------------------- the top speed it quotes -- */

console.log('\n  the top speed on the card');

/* Walked out with the same forces the race loop uses, at a step fine enough
   that the answer is the car's and not the integrator's. If the garage says
   180 mph, the straight had better eventually show 180 mph. */
function settlesAt(s){
  const vMax = ctx.topSpeed(s);
  let v = 0;
  for(let i = 0; i < 300000; i++){
    const a = (forceAt(s, v, vMax) - dragForce(s, v) - rollingForce(s)) / s.mass;
    if(a < 1e-5) break;
    v += a * 0.002;
  }
  return v;
}
let worstGap = 0, worstCar = '';
for(const key of ctx.CAR_ORDER){
  for(const gears of [0, 1, 2, 3]){
    const s = carStats(key, { gears });
    const gap = Math.abs(flatOut(s) - settlesAt(s)) * MPH;
    if(gap > worstGap){ worstGap = gap; worstCar = ctx.CARS[key].name + ' / gears ' + gears; }
  }
}
H.ok(worstGap < 1, 'every car reaches the top speed the garage prints for it',
     'worst miss ' + worstGap.toFixed(2) + ' mph, on the ' + worstCar);
H.ok(flatOut(carStats('coupe', {})) <= ctx.topSpeed(carStats('coupe', {})) + 1e-9,
     'and it is never more than the gearing could ever allow');

/* ------------------------------------------- the picture on the card -- */

console.log('\n  the picture on the card');

/* Every car in the showroom is photographed with buildCar, which looks its
   shape up in BODIES by the `body` name on the car. A car naming a body
   that is not there would fall back to the coupe and be sold to you as a
   picture of something else, so the two tables have to agree. */
let bodyless = [];
for(const key of ctx.CAR_ORDER){
  if(!ctx.BODIES[ctx.CARS[key].body]) bodyless.push(ctx.CARS[key].name);
}
H.ok(bodyless.length === 0, 'every car has a body to be drawn from',
     bodyless.join(', ') + ' name a body that does not exist');

/* And the shape it is drawn from is the shape the card quotes. The chip
   reads length x width x height, and height is the floor of the bodywork
   plus the roof above it - not `roof` on its own, which is what it used to
   be mistaken for. */
let impossible = [];
for(const key of ctx.CAR_ORDER){
  const b = ctx.BODIES[ctx.CARS[key].body];
  const tall = b.ride + b.roof;
  if(!(b.len > 3 && b.len < 7)) impossible.push(ctx.CARS[key].name + ' is ' + b.len + ' m long');
  if(!(b.wide > 1.5 && b.wide < 2.4)) impossible.push(ctx.CARS[key].name + ' is ' + b.wide + ' m wide');
  if(!(tall > 1 && tall < 2.2)) impossible.push(ctx.CARS[key].name + ' is ' + tall.toFixed(2) + ' m tall');
  if(!(b.hood < b.roof)) impossible.push(ctx.CARS[key].name + ' has a waist above its roof');
}
H.ok(impossible.length === 0, 'and every one of them is the size of a real car',
     impossible.join('; '));

/* ------------------------------------------------- the colour it keeps -- */

console.log('\n  the colour a car keeps');

/* A car's own colour sits one past the end of the paint shop's sixteen, and
   that slot has to mean the same thing every time the game starts. It used
   to be an entry pushed onto PAINTS the first time a car was asked about,
   so the number written into the save pointed at a different colour - or at
   nothing - the next time round, and every car you had driven came back in
   Signal red. */
let wrongColour = [];
for(const key of ctx.CAR_ORDER){
  const slot = ctx.defaultPaint(key);
  const got = ctx.swatchesFor(key)[slot].c;
  if(got !== ctx.CARS[key].colour){
    wrongColour.push(ctx.CARS[key].name + ' wanted ' + ctx.CARS[key].colour.toString(16) +
                     ', slot ' + slot + ' holds ' + got.toString(16));
  }
}
H.ok(wrongColour.length === 0, 'every car arrives in its own colour',
     wrongColour.join('; '));

/* And the shop has to be exactly the size it is written down as, however
   many cars have been asked about. The save keeps a number, not a colour,
   and the only reason a number survives a restart is that the list it
   counts along is rebuilt identical every time. */
for(const key of ctx.CAR_ORDER){ ctx.defaultPaint(key); ctx.swatchesFor(key); ctx.looksFor(key); }
H.ok(ctx.PAINTS.length === PAINTS_AT_LOAD,
     'and asking about one does not change the paint shop',
     'the shop went from ' + PAINTS_AT_LOAD + ' colours to ' + ctx.PAINTS.length +
     ', so every number written into a save before now points somewhere else');

/* Which is the same thing said from the save's side: whatever number a car
   writes down, it must still be inside a shop of the size it was built
   with - the size the next run of the game will rebuild. */
let outOfRange = [];
for(const key of ctx.CAR_ORDER){
  const saved = ctx.looksFor(key).paint;
  if(saved > PAINTS_AT_LOAD){
    outOfRange.push(ctx.CARS[key].name + ' saves paint ' + saved);
  }
}
H.ok(outOfRange.length === 0, 'so a saved colour still means that colour next time',
     outOfRange.join('; ') + ', past the end of a shop ' + PAINTS_AT_LOAD + ' long');

/* ------------------------------------------------------------ the noise -- */

console.log('\n  the noise it makes');

/* Every car has to have an engine in it, and it has to be an engine that
   could exist. A cylinder count and a redline are the only two numbers the
   sound is built from, so a typo in either is a car that sounds wrong and
   nothing else in the game would ever notice. */
let noEngine = [];
for(const key of ctx.CAR_ORDER){
  const c = ctx.CARS[key];
  if(!(c.cyl >= 3 && c.cyl <= 12)) noEngine.push(c.name + ' has ' + c.cyl + ' cylinders');
  if(!(c.redline >= 5000 && c.redline <= 9500)) noEngine.push(c.name + ' redlines at ' + c.redline);
  if(!c.engine) noEngine.push(c.name + ' does not say what engine it has');
}
H.ok(noEngine.length === 0, 'every car has an engine that could exist',
     noEngine.join('; '));

/* And the note it makes has to be a note you can hear. Firing frequency at
   the redline: a V12 at 8,500 is the highest thing here and a Hemi at
   6,000 the lowest, and both want to come out somewhere a laptop speaker
   can reproduce. */
let outOfBand = [];
for(const key of ctx.CAR_ORDER){
  const c = ctx.CARS[key];
  const hz = ctx.firingHz(c.redline, c.cyl);
  if(hz < 90 || hz > 1000) outOfBand.push(c.name + ' fires at ' + hz.toFixed(0) + ' Hz flat out');
}
H.ok(outOfBand.length === 0, 'and one that comes out in the audible middle',
     outOfBand.join('; '));

/* The dial and the noise are the same number, which is the whole reason
   revsOf exists rather than the HUD keeping its own arithmetic. */
const loop50 = H.read('50-loop.js');
H.ok(/revsOf\(you\.key, you\.vf, you\.vMax\)/.test(loop50),
     'the rev counter is read off the same revsOf the engine is built on');

/* Idle is idle, the redline is the redline, and in between the revs saw up
   and drop at every change - which is what having gears means. */
const sample = ctx.carStats('coupe', {});
const vMax = ctx.topSpeed(sample);
H.ok(Math.abs(ctx.revsOf('coupe', 0, vMax).rpm - ctx.IDLE_RPM) < 1,
     'a stopped car is idling, not stopped dead',
     ctx.revsOf('coupe', 0, vMax).rpm.toFixed(0) + ' rpm');
H.ok(Math.abs(ctx.revsOf('coupe', vMax, vMax).rpm - ctx.CARS.coupe.redline) < 1,
     'and flat out it is on the limiter',
     ctx.revsOf('coupe', vMax, vMax).rpm.toFixed(0) + ' rpm');

let drops = 0, gears = new Set();
let prev = ctx.revsOf('coupe', 0, vMax).rpm;
for(let i = 1; i <= 600; i++){
  const r = ctx.revsOf('coupe', vMax * i / 600, vMax);
  gears.add(r.gear);
  if(r.rpm < prev - 100) drops++;
  prev = r.rpm;
}
H.ok(gears.size === 6, 'there are six gears to go up through', gears.size + ' of them');
H.ok(drops === 5, 'and the revs drop five times getting there, once per change',
     drops + ' drops');

/* The size of those drops is the shape of a gearbox. First to second
   halves the revs; fifth to sixth barely touches them. A model that gave
   every gear an equal slice of the road speed dropped to a tenth of the
   redline every time, which is a tractor. */
const dropTo = [];
for(let g = 1; g <= 5; g++){
  const justAbove = ctx.revsOf('coupe', vMax * (g / 6 + 0.0005), vMax);
  dropTo.push(justAbove.rpm / ctx.CARS.coupe.redline);
}
H.ok(dropTo[0] > 0.45 && dropTo[0] < 0.56,
     'first to second drops the revs by about half',
     'to ' + (dropTo[0] * 100).toFixed(0) + ' per cent of the redline');
H.ok(dropTo[4] > 0.78 && dropTo[4] < 0.88,
     'and fifth to sixth hardly drops them at all',
     'to ' + (dropTo[4] * 100).toFixed(0) + ' per cent');
let widening = true;
for(let i = 1; i < dropTo.length; i++) if(dropTo[i] <= dropTo[i - 1]) widening = false;
H.ok(widening, 'with every change up landing higher than the one before it',
     dropTo.map(function(d){ return (d * 100).toFixed(0); }).join(' -> ') + ' per cent');

/* And top gear has to pull. The old model had a car at 85 per cent of its
   top speed sitting at a tenth of its redline. */
H.ok(ctx.revsOf('coupe', vMax * 0.85, vMax).rpm > ctx.CARS.coupe.redline * 0.7,
     'a car near its top speed is revving near its redline',
     Math.round(ctx.revsOf('coupe', vMax * 0.85, vMax).rpm) + ' rpm at 85 per cent of top speed');

/* What each car's induction should and should not be heard doing. A turbo
   whistles and a blower whines, and the difference is audible in a real
   car park, so it had better be audible here. */
const voiceAt = (key, frac, over) => {
  const st = ctx.carStats(key, (over && over.parts) || {});
  const car = Object.assign({
    key: key, stats: st, vMax: ctx.topSpeed(st),
    vf: ctx.topSpeed(st) * frac, vl: 0, off: false, nosOn: false
  }, over || {});
  const input = (over && over.input) || { throttle: 1, brake: 0, steer: 0, hand: false };
  return ctx.voiceLevels(ctx.engineVoice(car, input));
};

H.ok(voiceAt('muscle', 0.5).turbo === 0 && voiceAt('muscle', 0.5).blower === 0,
     'a naturally aspirated car has nothing to whistle or whine about');
H.ok(voiceAt('rear', 0.5).turbo > 0 && voiceAt('rear', 0.5).blower === 0,
     'a turbo car whistles and does not whine');
H.ok(voiceAt('hellcoupe', 0.5).blower > 0 && voiceAt('hellcoupe', 0.5).turbo === 0,
     'a supercharged one whines and does not whistle');
H.ok(voiceAt('hatch', 0.5, { parts: { turbo: 2 } }).blower > 0,
     'and a supercharger bought in the garage whines like one');

/* Lag is the whole point of a big turbo, and silence below the threshold
   is what it sounds like. */
const bigTurbo = { parts: { turbo: 3 } };
H.ok(voiceAt('hatch', 0.08, bigTurbo).turbo === 0,
     'a big turbo makes no noise before it is spinning',
     'nothing at 8 per cent of top speed');
H.ok(voiceAt('hatch', 0.7, bigTurbo).turbo > 0,
     'and does once it is', voiceAt('hatch', 0.7, bigTurbo).turbo.toFixed(3) + ' of full');
H.ok(voiceAt('hatch', 0.7, Object.assign({ input: { throttle: 0, brake: 0, steer: 0, hand: false } }, bigTurbo)).turbo === 0,
     'and goes quiet the moment you lift');

/* Coasting is not the same as pulling. */
H.ok(voiceAt('coupe', 0.5, { input: { throttle: 0, brake: 0, steer: 0, hand: false } }).engine <
     voiceAt('coupe', 0.5).engine,
     'an engine off the throttle is quieter than one on it');

/* Slip, grass and nitrous each have to actually do something. */
H.ok(voiceAt('coupe', 0.5, { vl: 11 }).tyre > voiceAt('coupe', 0.5).tyre,
     'sliding makes the tyres squeal');
H.ok(voiceAt('coupe', 0.5, { off: true }).tyre > voiceAt('coupe', 0.5).tyre,
     'and the grass makes its own noise');
H.ok(voiceAt('coupe', 0.5, { nosOn: true }).nos > 0, 'nitrous hisses while it is held');
H.ok(voiceAt('coupe', 0.9).wind > voiceAt('coupe', 0.3).wind,
     'and the faster you go the more wind there is');

/* Nothing may ever add up past one. Web Audio clips hard, and clipping is
   the difference between a game with sound and a game you turn the sound
   off on. Every car, every speed, every awful combination at once. */
let worst = 0, worstWhere = '';
for(const key of ctx.CAR_ORDER){
  for(const parts of [{}, { turbo: 2 }, { turbo: 5 }, { nos: 2 }]){
    for(let f = 0; f <= 1.0001; f += 0.05){
      const L = voiceAt(key, f, { parts: parts, vl: 40, off: true, nosOn: true });
      const sum = L.engine + L.engineUp + L.roar + L.turbo + L.blower +
                  L.tyre + L.wind + L.nos;
      if(sum > worst){ worst = sum; worstWhere = ctx.CARS[key].name; }
    }
  }
}
H.ok(worst < 0.92, 'and everything at once still cannot clip the output',
     'worst case ' + worst.toFixed(3) + ' of full scale, on the ' + worstWhere);

H.done();
