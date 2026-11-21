/* =========================================================================
   4.5  THE GARAGE

   The whole point of the game. Every part here changes a number the driving
   model actually reads, so a purchase is felt on the next lap rather than
   just printed on a card.

   Two rules the tables below stick to:

   1. No part is free money. The expensive ones buy a trade, not a straight
      win - aero costs you the straights, short gearing costs you top speed,
      a stripped shell is quick and nervous. A shopping list with an obvious
      right answer is not a garage, it is a queue.

   2. Nothing costs real money, ever. The money comes from driving. There is no
      shop, no currency, no ads, and nothing that can be bought with a card.
   ========================================================================= */

var GRAV = 9.81;
var RHO = 1.225;              // air, kg/m^3

/* ------------------------------------------------------------------ cars -- */
/* mass kg, power kW, grip as a lateral g coefficient, brake in m/s^2,
   steer in rad/s, cda is drag area in m^2. */

var CARS = {
  hatch: {
    name: 'Kestrel 1.6', nick: 'The hatch',
    desc: 'Front-drive, light, and gutless in a straight line. It corners far better than it has any right to.',
    price: 0, mass: 1010, power: 85, grip: 0.98, brake: 9.2, steer: 2.5, cda: 0.72,
    body: 'hatch', colour: 0x4a9eff
  },
  coupe: {
    name: 'Vantor GT', nick: 'The coupe',
    desc: 'The sensible step up. Nothing it does is remarkable and nothing it does is wrong.',
    price: 24000, mass: 1290, power: 165, grip: 1.08, brake: 10.4, steer: 2.3, cda: 0.64,
    body: 'coupe', colour: 0xe8463c
  },
  muscle: {
    name: 'Kingsnake 7.0', nick: 'The muscle',
    desc: 'Enormous power, enormous weight, brakes from an earlier decade. Terrifying and fast in that order.',
    price: 46000, mass: 1620, power: 290, grip: 1.02, brake: 9.6, steer: 1.95, cda: 0.81,
    body: 'muscle', colour: 0xf2a33c
  },
  rally: {
    name: 'Alba Quattro', nick: 'The rally car',
    desc: 'All four wheels driven. Climbs out of corners in a way nothing else here manages.',
    price: 72000, mass: 1345, power: 230, grip: 1.26, brake: 11.4, steer: 2.55, cda: 0.76,
    body: 'rally', colour: 0xe8e8ea
  },
  proto: {
    name: 'Sabre R', nick: 'The prototype',
    desc: 'Barely a road car. Stiff, loud, and utterly unforgiving of a lazy line.',
    price: 155000, mass: 980, power: 375, grip: 1.42, brake: 13.2, steer: 2.75, cda: 0.58,
    body: 'proto', colour: 0x2fd39a
  },

  /* ---------------------------------------------------------------------
     The turbo cars the game is named after, and the big supercharged stuff
     that answers them. Figures are the real ones for the cars these are
     drawn from: kilowatts, kilograms, and a drag area that a two-and-a-half
     tonne truck really does have. Nothing here is scaled to feel fair.

     `boost` and `lag` on a car are its factory induction, before anything
     in the garage. A sequential twin-turbo is on song almost off idle; a
     single big one is not; a supercharger has no lag at all and so carries
     none of this, just a lot of power.
     --------------------------------------------------------------------- */

  a80: {
    name: 'Apex A80 Twin-Turbo', nick: 'The A80',
    desc: 'Sequential turbos, so it pulls from almost nothing and never stops. Heavy, and it hides it well.',
    price: 58000, mass: 1570, power: 239, grip: 1.14, brake: 10.6, steer: 2.25, cda: 0.70,
    boost: 0.16, lag: 10,
    body: 'a80', colour: 0xe8562c
  },
  a90: {
    name: 'Apex A90', nick: 'The A90',
    desc: 'Shorter, stiffer and sharper than the car it is named after. One big turbo and a very short wheelbase.',
    price: 78000, mass: 1540, power: 285, grip: 1.18, brake: 11.0, steer: 2.40, cda: 0.63,
    boost: 0.14, lag: 8,
    body: 'a90', colour: 0xd8d8dc
  },
  hellcoupe: {
    name: 'Hellion 6.2 Coupe', nick: 'The Hellion',
    desc: 'Supercharged, so all of it arrives at once. Two tonnes of it. The tyres are a formality.',
    price: 118000, mass: 1975, power: 527, grip: 1.04, brake: 10.2, steer: 1.90, cda: 0.86,
    body: 'hellcoupe', colour: 0x6b2fd0
  },
  hellsedan: {
    name: 'Hellion 6.2 Sedan', nick: 'The four-door',
    desc: 'The same engine with two more doors and a longer wheelbase. Calmer, heavier, every bit as silly.',
    price: 112000, mass: 2050, power: 527, grip: 1.02, brake: 10.0, steer: 1.85, cda: 0.90,
    body: 'hellsedan', colour: 0x1d1f24
  },
  hellwagon: {
    name: 'Hellion Wagon', nick: 'The fast SUV',
    desc: 'Three rows of seats and seven hundred horsepower. Physics has opinions about the corners.',
    price: 104000, mass: 2470, power: 529, grip: 0.95, brake: 9.8, steer: 1.75, cda: 1.08,
    body: 'suv', colour: 0x2a6e4a
  },
  rx: {
    name: 'Kaido 13B', nick: 'The rotary',
    desc: 'A rotary, so it revs past where everything else has given up. Light, delicate, and allergic to neglect.',
    price: 64000, mass: 1280, power: 188, grip: 1.22, brake: 11.2, steer: 2.60, cda: 0.62,
    boost: 0.15, lag: 11, stability: 0.96,
    body: 'rx', colour: 0xf2e9d8
  },
  evo: {
    name: 'Lancet RS', nick: 'The Evo',
    desc: 'Four driven wheels and a turbo, in a shell with no interior worth mentioning. It simply goes where you point it.',
    price: 84000, mass: 1410, power: 206, grip: 1.34, brake: 11.8, steer: 2.65, cda: 0.74,
    boost: 0.18, lag: 9,
    body: 'evo', colour: 0xe8e8ea
  },
  gtr: {
    name: 'Nakagawa R34', nick: 'The Skyline',
    desc: 'Twin turbos, all-wheel drive and more computers than the rest of this showroom combined. Heavy, and it never once feels it.',
    price: 88000, mass: 1560, power: 206, grip: 1.32, brake: 11.6, steer: 2.45, cda: 0.68,
    boost: 0.17, lag: 10,
    body: 'gtr', colour: 0x5aa8e8
  },
  rear: {
    name: 'Pelican 930', nick: 'The widowmaker',
    desc: 'Engine behind the back axle and a turbo that arrives all at once at 36 mph. Quick, and it has opinions about lifting mid-corner.',
    price: 128000, mass: 1470, power: 283, grip: 1.30, brake: 11.9, steer: 2.50, cda: 0.60,
    boost: 0.22, lag: 16, stability: 0.88,
    body: 'rear', colour: 0xf2d04a
  },
  super: {
    name: 'Toro SV', nick: 'The supercar',
    desc: 'Mid-engined, naturally aspirated and completely impractical. The fastest thing here that still has a numberplate.',
    price: 140000, mass: 1525, power: 471, grip: 1.38, brake: 12.6, steer: 2.60, cda: 0.64,
    body: 'super', colour: 0x8ad83c
  },
  trx: {
    name: 'Warhawk TRX', nick: 'The truck',
    desc: 'Supercharged pickup on knobbly tyres. Hopeless in a corner, hilarious everywhere else, and it does not care about grass.',
    price: 96000, mass: 2900, power: 523, grip: 0.88, brake: 9.2, steer: 1.60, cda: 1.95,
    offroad: 0.35,
    body: 'pickup', colour: 0xb8902c
  }
};

/* Which bodies are trucks. A lift kit is only offered to these, and they are
   the only things that come out of the factory with any off-road ability. */
var TRUCK_BODIES = { suv: true, pickup: true };
function isTruck(carKey){
  var c = CARS[carKey];
  return !!(c && TRUCK_BODIES[c.body]);
}

/* Showroom order, and the order the AI picks from. Sorted by rating, which
   the tests enforce - a showroom that is not in order is a showroom that
   lies about which car is the step up. */
var CAR_ORDER = ['hatch', 'coupe', 'trx', 'a80', 'gtr', 'rx', 'muscle', 'evo',
                 'rally', 'hellwagon', 'a90', 'rear', 'hellsedan', 'hellcoupe',
                 'super', 'proto'];

/* ----------------------------------------------------------------- parts -- */
/* Every tier lists what it does to the car in plain terms, because a player
   deciding between two parts should not have to guess. Tier 0 is always the
   stock item and always costs nothing. */

var SLOTS = [
  {
    key: 'engine', name: 'Engine', blurb: 'Power, and the weight that comes with it.',
    tiers: [
      { name: 'Stock', cost: 0, power: 1.00, mass: 0, d: 'What it left the factory with.' },
      { name: 'Fast road', cost: 4200, power: 1.14, mass: 4, d: 'Breathes better. A useful 14% everywhere.' },
      { name: 'Built', cost: 13500, power: 1.32, mass: 12, d: 'Forged internals. Heavier, and worth it.' },
      { name: 'Race', cost: 38000, power: 1.55, mass: 22, d: 'Wants revs and maintenance. Enormous.' }
    ]
  },
  {
    key: 'turbo', name: 'Induction', blurb: 'Big power, but only once it is spinning.',
    tiers: [
      { name: 'None', cost: 0, boost: 0, lag: 0, mass: 0, d: 'Natural aspiration. Instant, if modest.' },
      { name: 'Small turbo', cost: 7800, boost: 0.18, lag: 14, mass: 16, d: '+18% up top. Comes in early, around 30 mph.' },
      { name: 'Big turbo', cost: 21000, boost: 0.42, lag: 26, mass: 24, d: '+42%, but nothing happens below 58 mph.' }
    ]
  },
  {
    key: 'tyres', name: 'Tyres', blurb: 'The only four patches that touch the road.',
    tiers: [
      { name: 'Budget', cost: 0, grip: 1.00, d: 'Hard compound. Cheap, and they feel it.' },
      { name: 'Performance', cost: 3600, grip: 1.12, d: 'Noticeably more bite on turn-in.' },
      { name: 'Semi-slick', cost: 11000, grip: 1.26, d: 'Road legal, barely.' },
      { name: 'Slick', cost: 29000, grip: 1.42, d: 'Astonishing grip. No tread at all.' }
    ]
  },
  {
    key: 'susp', name: 'Suspension', blurb: 'How quickly it answers the wheel.',
    tiers: [
      { name: 'Stock', cost: 0, grip: 1.00, steer: 1.00, d: 'Soft, and it leans like it.' },
      { name: 'Lowered', cost: 2900, grip: 1.05, steer: 1.08, d: 'Less roll, quicker to take a set.' },
      { name: 'Coilovers', cost: 9400, grip: 1.11, steer: 1.16, d: 'Properly damped. Turns in the instant you ask.' },
      { name: 'Race-spec', cost: 26500, grip: 1.18, steer: 1.26, d: 'Darts at the apex. Punishing over kerbs.' }
    ]
  },
  {
    key: 'brakes', name: 'Brakes', blurb: 'Where the lap time actually hides.',
    tiers: [
      { name: 'Stock', cost: 0, brake: 1.00, mass: 0, d: 'Fine for one lap. Not for four.' },
      { name: 'Fast road', cost: 3100, brake: 1.15, mass: -2, d: 'Better pads, better pedal.' },
      { name: 'Big discs', cost: 10200, brake: 1.32, mass: 6, d: 'Brake markers move a long way later.' },
      { name: 'Carbon', cost: 31000, brake: 1.52, mass: -8, d: 'Lighter and enormously stronger.' }
    ]
  },
  {
    key: 'aero', name: 'Aero', blurb: 'Grip that arrives with speed, and drag that never leaves.',
    tiers: [
      { name: 'None', cost: 0, down: 0, cda: 1.00, d: 'Whatever shape the car already is.' },
      { name: 'Lip and splitter', cost: 4800, down: 0.10, cda: 1.03, d: 'A little planted. Barely costs you.' },
      { name: 'Wing', cost: 14500, down: 0.26, cda: 1.11, d: 'Sticks hard in fast corners. Slower down the straight.' },
      { name: 'Full kit', cost: 34000, down: 0.44, cda: 1.22, d: 'Glued down. You will lose real top speed for it.' }
    ]
  },
  {
    key: 'gears', name: 'Gearbox', blurb: 'Acceleration or top speed. Pick one.',
    tiers: [
      { name: 'Stock', cost: 0, force: 1.00, top: 1.00, d: 'A compromise, as fitted.' },
      { name: 'Short ratios', cost: 6400, force: 1.13, top: 0.90, d: 'Leaps out of corners. Runs out of road.' },
      { name: 'Long ratios', cost: 6400, force: 0.92, top: 1.09, d: 'Lazy away, enormous down a long straight.' },
      { name: 'Close-ratio race', cost: 19000, force: 1.09, top: 1.02, d: 'Always in the right gear. Costs accordingly.' }
    ]
  },
  {
    key: 'nos', name: 'Nitrous', blurb: 'Everything at once, and then nothing.',
    tiers: [
      { name: 'None', cost: 0, d: 'Nothing in the boot.' },
      { name: 'Single shot', cost: 9500, nos: 0.30, nosTime: 4, mass: 14,
        d: '+30% while you hold it, for four seconds a race. The bottle weighs 14 kg for all of it.' },
      { name: 'Twin bottle', cost: 24000, nos: 0.45, nosTime: 7, mass: 26,
        d: '+45% for seven seconds. Heavier, and you will still run out before the flag.' },
      { name: 'Direct port', cost: 52000, nos: 0.62, nosTime: 11, mass: 34,
        d: '+62% for eleven seconds, and 34 kg you carry round every corner of every lap.' }
    ]
  },
  {
    key: 'diff', name: 'Differential', blurb: 'Drive off the apex, push wide into it.',
    tiers: [
      { name: 'Open', cost: 0, d: 'Whichever wheel gives up first gets the power.' },
      { name: 'Limited slip', cost: 7200, diff: 0.45,
        d: 'Puts the power down leaving a corner. A little lazy turning into one.' },
      { name: 'Plated LSD', cost: 18000, diff: 0.75,
        d: 'Drives off the apex hard. Noticeably reluctant to change direction.' },
      { name: 'Spool', cost: 31000, diff: 1.00,
        d: 'Both wheels locked together, always. Superb in a straight line, stubborn everywhere else.' }
    ]
  },
  {
    key: 'clutch', name: 'Clutch', blurb: 'What happens in the first second.',
    tiers: [
      { name: 'Stock', cost: 0, d: 'Slips a little, saves the gearbox.' },
      { name: 'Uprated', cost: 4100, launch: 1.12, d: 'Bites harder off the line.' },
      { name: 'Twin plate', cost: 14500, launch: 1.26, mass: -4,
        d: 'Launches hard. Grabby at walking pace.' },
      { name: 'Carbon twin', cost: 33000, launch: 1.40, mass: -9,
        d: 'Vicious off the line, and nothing subtle about it anywhere else.' }
    ]
  },
  {
    key: 'lift', name: 'Lift kit', blurb: 'Ride height, and everything it costs you.',
    only: 'truck',
    tiers: [
      { name: 'Stock', cost: 0, d: 'However it left the dealer.' },
      { name: '2in on A/Ts', cost: 6800, lift: 0.07, grip: 0.96, cda: 1.06,
        stability: 0.97, offroad: 0.30,
        d: 'All-terrains. A little vaguer on tarmac, a lot better off it.' },
      { name: '4in on 35s', cost: 18500, lift: 0.14, grip: 0.91, cda: 1.14,
        stability: 0.93, steer: 0.94, offroad: 0.55,
        d: 'A proper lift. It leans, it drags, and it goes where nothing else here goes.' },
      { name: '6in on 37s', cost: 37000, lift: 0.22, grip: 0.84, cda: 1.26,
        stability: 0.87, steer: 0.88, offroad: 0.80,
        d: 'Absurd. Slower everywhere there is tarmac, unstoppable where there is not.' }
    ]
  },
  {
    key: 'weight', name: 'Weight', blurb: 'Quicker everywhere, and nervous with it.',
    tiers: [
      { name: 'Standard', cost: 0, mass: 0, stability: 1.00, d: 'Carpets, seats, sound deadening, the lot.' },
      { name: 'Stripped', cost: 5200, mass: -70, stability: 0.94, d: 'Interior gone. Quicker, and it moves around more.' },
      { name: 'Panels', cost: 17000, mass: -130, stability: 0.89, d: 'Composite panels. Light and noticeably edgy.' },
      { name: 'Shell', cost: 44000, mass: -215, stability: 0.82, d: 'A cage and two seats. Brilliant, and it bites.' }
    ]
  }
];

/* A lift kit belongs on a truck and nowhere else. Rather than let the garage
   offer it to a prototype and have carStats quietly ignore it, both sides ask
   this, so what you are shown and what you get can never disagree. */
function slotFits(slot, carKey){
  if(slot.only === 'truck') return isTruck(carKey);
  return true;
}

function slotsFor(carKey){
  var out = [];
  for(var i = 0; i < SLOTS.length; i++) if(slotFits(SLOTS[i], carKey)) out.push(SLOTS[i]);
  return out;
}

function slotByKey(key){
  for(var i = 0; i < SLOTS.length; i++) if(SLOTS[i].key === key) return SLOTS[i];
  return null;
}

/* ------------------------------------------------------------ fitted kit -- */

function partsFor(carKey){
  if(!SAVE.parts[carKey]) SAVE.parts[carKey] = {};
  return SAVE.parts[carKey];
}
function tierOf(carKey, slotKey){
  var p = SAVE.parts[carKey];
  var t = p ? p[slotKey] : 0;
  var slot = slotByKey(slotKey);
  if(!slot) return 0;
  return clamp(t || 0, 0, slot.tiers.length - 1);
}

/* ------------------------------------------------------------- the stats -- */

/* Everything the driving model reads about a car comes out of here. Given a
   car and its fitted parts it is a pure function - no globals, no state -
   which is what makes it testable and what makes the garage preview honest:
   the numbers shown before you buy are produced by this same call. */
function carStats(carKey, parts){
  var base = CARS[carKey];
  if(!base) throw new Error('no car called ' + carKey);
  parts = parts || {};

  var s = {
    mass: base.mass,
    power: base.power,
    grip: base.grip,
    brake: base.brake,
    steer: base.steer,
    cda: base.cda,
    down: 0,            // downforce coefficient, grip gained per (m/s)^2
    boost: base.boost || 0,   // extra power fraction once spooled, factory included
    lag: base.lag || 0,       // m/s below which the turbo does nothing
    force: 1,           // gearing force multiplier
    top: 1,             // gearing top-speed multiplier
    stability: base.stability || 1,   // how settled the back end is
    offroad: base.offroad || 0,  // 0 = a road car on grass, 1 = barely notices
    lift: 0,            // ride height added, metres - visual and centre of gravity
    nos: 0,             // extra power fraction while the bottle is open
    nosTime: 0,         // seconds of it you get, per race
    diff: 0,            // 0 = open, 1 = welded solid
    launch: 1           // clutch bite below walking-out-of-a-corner speed
  };

  for(var i = 0; i < SLOTS.length; i++){
    var slot = SLOTS[i];
    if(!slotFits(slot, carKey)) continue;
    var tier = slot.tiers[clamp(parts[slot.key] || 0, 0, slot.tiers.length - 1)];
    if(!tier) continue;
    if(tier.power) s.power *= tier.power;
    if(tier.grip) s.grip *= tier.grip;
    if(tier.brake) s.brake *= tier.brake;
    if(tier.steer) s.steer *= tier.steer;
    if(tier.cda) s.cda *= tier.cda;
    if(tier.mass) s.mass += tier.mass;
    if(tier.down) s.down += tier.down;
    if(tier.boost) s.boost += tier.boost;
    if(tier.lag) s.lag = Math.max(s.lag, tier.lag);
    if(tier.force) s.force *= tier.force;
    if(tier.top) s.top *= tier.top;
    if(tier.stability) s.stability *= tier.stability;
    if(tier.offroad) s.offroad += tier.offroad;
    if(tier.lift) s.lift += tier.lift;
    if(tier.nos) s.nos = Math.max(s.nos, tier.nos);
    if(tier.nosTime) s.nosTime += tier.nosTime;
    if(tier.diff) s.diff = Math.max(s.diff, tier.diff);
    if(tier.launch) s.launch *= tier.launch;
  }
  s.offroad = clamp(s.offroad, 0, 1);

  /* A locked differential drags the car straight: it is why a spool puts
     power down and why it will not turn. Both halves come off the one
     number, so you cannot have the first without the second. */
  s.steer *= 1 - 0.07 * s.diff;

  /* A car cannot be lighter than its own cage and engine. Without this the
     weight tiers on the lightest car would walk it down towards nothing. */
  s.mass = Math.max(s.mass, 620);
  return s;
}

function statsOf(carKey){ return carStats(carKey, partsFor(carKey)); }

/* ------------------------------------------------------------- derived -- */

/* Rolling resistance, as a force. Small, but it is why a car does not creep
   to its theoretical top speed forever. */
function rollingForce(s){ return 0.013 * s.mass * GRAV; }

/* A real car never spends a whole run at peak power: it is off the power
   between shifts, and below it everywhere except the top of each gear. Quoted
   figures come out roughly twice the textbook power-limited number because of
   it, so the model carries the same factor rather than producing cars that
   all reach 60 in four seconds. */
var POWER_USE = 0.55;

/* What the driven wheels can actually put down. Lower than the car's lateral
   grip: a road car's tyres do slightly less longitudinally, and only some of
   its weight sits over the driven axle. */
var TRACTION = 0.85;

/* Engine force available at a given speed. Power is what an engine has; force
   is what reaches the road, and the two are only the same at one speed. */
function driveForce(s, v){
  var p = s.power * 1000 * s.force * POWER_USE;
  if(s.boost > 0 && v > s.lag) {
    /* Boost arrives over about 8 m/s rather than switching on, so a turbo
       feels like it spools instead of flicking a switch. */
    p *= 1 + s.boost * clamp((v - s.lag) / 8, 0, 1);
  }
  /* Below walking pace, power/v runs away to infinity. Clamp to the traction
     limit, which is what actually stops a real car from launching harder. */
  var f = p / Math.max(v, 4);
  var limit = tractionLimit(s);

  /* A clutch only buys you anything while it is still slipping, so its help
     fades out by the time you are rolling properly. */
  if(s.launch && s.launch !== 1 && v < 14){
    limit *= 1 + (s.launch - 1) * (1 - v / 14);
  }
  return Math.min(f, limit);
}

function tractionLimit(s){
  return s.grip * s.mass * GRAV * TRACTION * (1 + 0.10 * (s.diff || 0));
}

function dragForce(s, v){ return 0.5 * RHO * s.cda * v * v; }

/* Where drive force and the forces resisting it meet, before gearing. Solved
   by walking up in 0.5 m/s steps - the closed form is a cubic and this is
   clearer, runs once per car per race, and is good to half a metre a second. */
function dragLimited(s){
  for(var v = 5; v < 180; v += 0.5){
    if(driveForce(s, v) <= dragForce(s, v) + rollingForce(s)) return v;
  }
  return 180;
}

/* The gearbox sets where the engine runs out of revs in top, which is a hard
   ceiling regardless of how much power is left. Short ratios pull harder and
   stop sooner; long ratios do the reverse. Without this the `top` figure on
   the gearbox tiers would be decoration. */
function topSpeed(s){ return dragLimited(s) * s.top; }

/* Engine force with the gear ceiling applied: it fades out over the last few
   m/s instead of stopping dead, which is what a rev limiter feels like. This
   is the call the driving model makes every frame. */
function forceAt(s, v, vMax){
  var f = driveForce(s, v);
  if(vMax && v > vMax - 4) f *= clamp((vMax - v) / 4, 0, 1);
  return f;
}

/* Standing start to 60 mph, integrated exactly the way the race loop does it,
   ceiling and all. The garage quotes this number, so it had better be the
   same number the car then delivers on track. */
function zeroTo60(s){
  var v = 0, t = 0, target = 60 / MPS_TO_MPH, dt = 0.02;
  var vMax = topSpeed(s);
  if(vMax <= target) return 99;              // geared so short it never gets there
  while(v < target && t < 60){
    var f = forceAt(s, v, vMax) - dragForce(s, v) - rollingForce(s);
    v += (f / s.mass) * dt;
    t += dt;
    if(v < 0) return 99;
  }
  return t;
}

/* Lateral grip at a given speed, downforce included. This is the number the
   driving model uses to decide when you are asking too much. */
function gripAt(s, v){ return s.grip + s.down * v * v / 1000; }

/* A single number for the car, so events can be gated and two builds can be
   compared. Weighted towards the things that actually win races: power to
   weight and grip, then brakes. */
function rating(s){
  var pw = (s.power * 1000) / s.mass;             // W/kg
  var r = pw * 1.65 + s.grip * 170 + s.brake * 8.5 + topSpeed(s) * 0.9 +
          (s.nos || 0) * 55 + (s.launch ? (s.launch - 1) * 90 : 0);
  return Math.round(r);
}

var CLASSES = [
  { max: 430, name: 'D' }, { max: 530, name: 'C' }, { max: 650, name: 'B' },
  { max: 790, name: 'A' }, { max: Infinity, name: 'S' }
];
function classOf(ratingValue){
  for(var i = 0; i < CLASSES.length; i++) if(ratingValue < CLASSES[i].max) return CLASSES[i].name;
  return 'S';
}

/* Everything the garage screen prints about a build. */
function summary(carKey, parts){
  var s = carStats(carKey, parts || partsFor(carKey));
  var r = rating(s);
  return {
    stats: s,
    rating: r,
    cls: classOf(r),
    top: topSpeed(s) * MPS_TO_MPH,
    sixty: zeroTo60(s),
    corner: gripAt(s, 30),
    mass: s.mass,
    power: s.power
  };
}

/* ------------------------------------------------------------ buying kit -- */

function partCost(slotKey, tier){
  var slot = slotByKey(slotKey);
  if(!slot || !slot.tiers[tier]) return 0;
  return slot.tiers[tier].cost;
}

/* Parts are bought outright, not rented, and fitting a cheaper one back is
   free - so experimenting with a build never costs anything once owned. */
function ownsPart(carKey, slotKey, tier){
  var owned = SAVE.parts[carKey + ':owned'];
  if(tier === 0) return true;
  return !!(owned && owned[slotKey] && owned[slotKey].indexOf(tier) !== -1);
}

function buyPart(carKey, slotKey, tier){
  var cost = partCost(slotKey, tier);
  if(ownsPart(carKey, slotKey, tier)) return { ok: true, already: true };
  if(SAVE.credits < cost) return { ok: false, why: 'not enough credits' };

  SAVE.credits -= cost;
  if(!SAVE.parts[carKey + ':owned']) SAVE.parts[carKey + ':owned'] = {};
  var owned = SAVE.parts[carKey + ':owned'];
  if(!owned[slotKey]) owned[slotKey] = [];
  owned[slotKey].push(tier);
  fitPart(carKey, slotKey, tier);
  saveNow();
  return { ok: true, spent: cost };
}

function fitPart(carKey, slotKey, tier){
  if(!ownsPart(carKey, slotKey, tier)) return false;
  partsFor(carKey)[slotKey] = tier;
  saveNow();
  return true;
}

function buyCar(carKey){
  var car = CARS[carKey];
  if(!car) return { ok: false, why: 'no such car' };
  if(SAVE.owned.indexOf(carKey) !== -1) return { ok: true, already: true };
  if(SAVE.credits < car.price) return { ok: false, why: 'not enough credits' };
  SAVE.credits -= car.price;
  SAVE.owned.push(carKey);
  SAVE.car = carKey;
  saveNow();
  return { ok: true, spent: car.price };
}

/* ------------------------------------------------------------ the looks -- */
/* Free, all of it. Paint should never be a thing you grind for. */

var PAINTS = [
  { n: 'Signal red', c: 0xe8463c }, { n: 'Kingfisher', c: 0x2f7fe0 },
  { n: 'Acid', c: 0xc8e23c }, { n: 'Mint', c: 0x2fd39a },
  { n: 'Satsuma', c: 0xf2843c }, { n: 'Plum', c: 0x8a3fd0 },
  { n: 'Chalk', c: 0xe8e8ea }, { n: 'Graphite', c: 0x3a3f48 },
  { n: 'Midnight', c: 0x18233d }, { n: 'Cream', c: 0xe6d8b8 },
  { n: 'Gulf blue', c: 0x5fc8e8 }, { n: 'Bronze', c: 0xa8793c },
  { n: 'Lilac', c: 0xc9a8e8 }, { n: 'Forest', c: 0x2a5e3a },
  { n: 'Rose', c: 0xe88aa8 }, { n: 'Mustard', c: 0xd8b03c }
];

var WHEELS = [
  { n: 'Steel', c: 0x6a7078 }, { n: 'Silver', c: 0xc0c6cc },
  { n: 'Anthracite', c: 0x33383f }, { n: 'Gold', c: 0xc9a227 },
  { n: 'Bronze', c: 0x9c6b3f }, { n: 'White', c: 0xe4e8ec }
];

var STRIPES = [
  { n: 'None', c: null }, { n: 'White', c: 0xf0f2f4 }, { n: 'Black', c: 0x14171c },
  { n: 'Red', c: 0xd93a30 }, { n: 'Gold', c: 0xd8b03c }, { n: 'Blue', c: 0x3a7fd0 }
];

/* All free, all cosmetic, none of it touches carStats. A body kit that
   secretly added grip would make the garage dishonest, and the garage being
   honest is the whole point of it. */
var KITS = [
  { n: 'Standard', arch: 0, splitter: 0 },
  { n: 'Lip kit', arch: 0.03, splitter: 0.26 },
  { n: 'Wide arch', arch: 0.09, splitter: 0.16 },
  { n: 'Full wide-body', arch: 0.15, splitter: 0.34 }
];

var WHEEL_SIZES = [
  { n: 'Stock', d: 0 }, { n: 'Plus one', d: 0.025 },
  { n: 'Plus two', d: 0.05 }, { n: 'Dish', d: 0.075 }
];

function looksFor(carKey){
  if(!SAVE.looks[carKey]){
    SAVE.looks[carKey] = { paint: null, wheel: 1, stripe: 0, spoiler: false,
                           kit: 0, size: 0 };
  }
  var l = SAVE.looks[carKey];
  if(l.kit === undefined) l.kit = 0;
  if(l.size === undefined) l.size = 0;
  if(l.paint === null || l.paint === undefined) l.paint = defaultPaint(carKey);
  return l;
}

/* A new car arrives in its own colour rather than whatever the last one was. */
function defaultPaint(carKey){
  var want = CARS[carKey].colour;
  for(var i = 0; i < PAINTS.length; i++) if(PAINTS[i].c === want) return i;
  PAINTS.push({ n: CARS[carKey].nick, c: want });
  return PAINTS.length - 1;
}

/* ------------------------------------------------------------- the career -- */

/* Each event names the class it is for, so the garage has a point: you tune
   up to meet the entry, rather than grinding money against a wall. */
var EVENTS = [
  { id: 'e1', name: 'Cannery Cup', track: 'ring', laps: 3, field: 3, max: 470,
    prize: [5200, 2600, 1300], d: 'Club night. Anything road-legal, anything slow.' },
  { id: 'e2', name: 'Dockyard Sprint', track: 'docks', laps: 3, field: 3, max: 470,
    prize: [6400, 3200, 1600], d: 'Same crowd, worse corners.' },
  { id: 'e3', name: 'Ridgeback Open', track: 'ridge', laps: 2, field: 4, max: 560,
    prize: [9500, 4800, 2400], d: 'Longer, faster, and the first one that needs a real car.' },
  { id: 'e4', name: 'Cannery Reversal', track: 'ring', laps: 4, field: 4, max: 560,
    prize: [11000, 5500, 2700], d: 'Four laps. Brakes start to matter.' },
  { id: 'e5', name: 'Dock Nationals', track: 'docks', laps: 5, field: 4, max: 680,
    prize: [17000, 8500, 4200], d: 'Five laps of stop and go. Bring brakes.' },
  { id: 'e6', name: 'Ridge Endurance', track: 'ridge', laps: 4, field: 5, max: 680,
    prize: [21000, 10500, 5200], d: 'The long one. Top speed finally pays.' },
  { id: 'e7', name: 'Invitational', track: 'ridge', laps: 3, field: 5, max: 820,
    prize: [34000, 17000, 8500], d: 'They asked for you. Bring everything you have.' },
  { id: 'e8', name: 'The Redline', track: 'docks', laps: 6, field: 5, max: 9999,
    prize: [60000, 30000, 15000], d: 'No class limit. Six laps. Whatever shows up, shows up.' }
];

/* ------------------------------------------------------ championships -- */

/* A season rather than a one-off. The same three rivals turn up in the same
   cars every round, so the standings table is about people you recognise
   instead of a fresh anonymous grid each time. Points are the familiar
   shape: win a round, take ten. */
var CHAMP_POINTS = [10, 6, 4, 2, 1];

var CHAMPIONSHIPS = [
  { id: 'ch1', name: 'Clubman Trophy', max: 560,
    d: 'Four rounds, three tracks, and the same three drivers all season.',
    prize: [46000, 22000, 11000],
    rivals: [ { name: 'Vega', car: 'coupe', skill: 0.93 },
              { name: 'Mertz', car: 'muscle', skill: 0.90 },
              { name: 'Okafor', car: 'a80', skill: 0.95 } ],
    rounds: [ { track: 'ring', laps: 3 }, { track: 'docks', laps: 3 },
              { track: 'ridge', laps: 2 }, { track: 'ring', laps: 4 } ] },

  { id: 'ch2', name: 'Turbo Cup', max: 700,
    d: 'Boost only. Everyone here is running something that spools.',
    prize: [88000, 42000, 21000],
    rivals: [ { name: 'Okafor', car: 'a90', skill: 0.96 },
              { name: 'Brandt', car: 'gtr', skill: 0.94 },
              { name: 'Sauer', car: 'evo', skill: 0.95 } ],
    rounds: [ { track: 'ridge', laps: 3 }, { track: 'docks', laps: 4 },
              { track: 'ring', laps: 4 }, { track: 'ridge', laps: 3 } ] },

  { id: 'ch3', name: 'The Big Turbos', max: 9999,
    d: 'No class limit and no sympathy. Whatever you have, bring it.',
    prize: [180000, 85000, 42000],
    rivals: [ { name: 'Okafor', car: 'hellcoupe', skill: 0.98 },
              { name: 'Brandt', car: 'rear', skill: 0.97 },
              { name: 'Ilves', car: 'super', skill: 0.99 } ],
    rounds: [ { track: 'ridge', laps: 4 }, { track: 'docks', laps: 5 },
              { track: 'ring', laps: 5 }, { track: 'ridge', laps: 4 } ] }
];

function champById(id){
  for(var i = 0; i < CHAMPIONSHIPS.length; i++) if(CHAMPIONSHIPS[i].id === id) return CHAMPIONSHIPS[i];
  return null;
}

function champState(id){
  if(!SAVE.champ) SAVE.champ = {};
  if(!SAVE.champ[id]) SAVE.champ[id] = { round: 0, pts: {}, done: false };
  return SAVE.champ[id];
}

/* A championship opens once the one before it has been finished. */
function champOpen(i){
  if(i === 0) return true;
  return champState(CHAMPIONSHIPS[i - 1].id).done === true;
}

/* The round as an event the rest of the game already understands. */
function champRound(ch, n){
  var r = ch.rounds[n];
  return {
    id: ch.id + 'r' + n,
    name: ch.name + ' — round ' + (n + 1),
    track: r.track, laps: r.laps, field: ch.rivals.length, max: ch.max,
    prize: [Math.round(ch.prize[0] / 6), Math.round(ch.prize[1] / 6),
            Math.round(ch.prize[2] / 6)],
    d: ch.d, champ: ch.id, roundNo: n
  };
}

function awardChampPoints(ch, orderNames){
  var st = champState(ch.id);
  for(var i = 0; i < orderNames.length; i++){
    var pts = CHAMP_POINTS[i] || 0;
    st.pts[orderNames[i]] = (st.pts[orderNames[i]] || 0) + pts;
  }
  st.round = Math.min(st.round + 1, ch.rounds.length);
  if(st.round >= ch.rounds.length) st.done = true;
  saveNow();
  return st;
}

function champStandings(ch){
  var st = champState(ch.id);
  var names = ['You'];
  for(var i = 0; i < ch.rivals.length; i++) names.push(ch.rivals[i].name);
  var rows = names.map(function(n){ return { name: n, pts: st.pts[n] || 0 }; });
  rows.sort(function(a, b){ return b.pts - a.pts; });
  return rows;
}

/* An event is open once the one before it has been finished at all - placing
   last still moves you on, because being stuck behind a race you cannot win
   with a car you cannot afford is where these games lose people. */
function eventOpen(i){
  if(i === 0) return true;
  return SAVE.done[EVENTS[i - 1].id] !== undefined;
}
function eventEligible(ev, carKey){
  return rating(statsOf(carKey)) <= ev.max;
}
