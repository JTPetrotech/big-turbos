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

/* cyl is combustion events per two turns of the crank, which for a
   four-stroke is the cylinder count, and for the RX-7 two-rotor Wankel
   is four, because it fires twice every shaft revolution. With the
   redline it is what the engine note is built from, so a flat six does
   not sound like a V8 and the inline five warbles the way an inline
   five does. */
var CARS = {
  hatch: {
    name: 'Honda Civic Si', nick: 'The hatch',
    desc: 'Front-drive, light, and gutless in a straight line. It corners far better than it has any right to.',
    price: 0, mass: 1046, power: 92, grip: 0.98, brake: 9.2, steer: 2.5, cda: 0.72,
    cyl: 4, redline: 7800, engine: 'K20 inline four',
    body: 'hatch', colour: 0x4a9eff
  },
  coupe: {
    name: 'Toyota GR86', nick: 'The coupe',
    desc: 'The sensible step up. Nothing it does is remarkable and nothing it does is wrong.',
    price: 24000, mass: 1270, power: 174, grip: 1.08, brake: 10.4, steer: 2.3, cda: 0.64,
    cyl: 4, redline: 7400, engine: 'flat four',
    body: 'coupe', colour: 0xe8463c
  },
  muscle: {
    name: 'Plymouth Barracuda 426 Hemi', nick: 'The muscle',
    desc: 'Enormous power, enormous weight, brakes from an earlier decade. Terrifying and fast in that order.',
    price: 46000, mass: 1655, power: 317, grip: 1.02, brake: 9.6, steer: 1.95, cda: 0.81,
    cyl: 8, redline: 6000, engine: '426 Hemi V8',
    body: 'muscle', colour: 0xf2a33c
  },
  rally: {
    name: 'Audi Sport Quattro', nick: 'The rally car',
    desc: 'All four wheels driven. Climbs out of corners in a way nothing else here manages.',
    price: 72000, mass: 1298, power: 225, grip: 1.26, brake: 11.4, steer: 2.55, cda: 0.76,
    cyl: 5, redline: 6800, engine: 'inline five',
    body: 'rally', colour: 0xe8e8ea
  },
  proto: {
    name: 'Ultima GTR', nick: 'The prototype',
    desc: 'Barely a road car. Stiff, loud, and utterly unforgiving of a lazy line.',
    price: 155000, mass: 930, power: 395, grip: 1.42, brake: 13.2, steer: 2.75, cda: 0.58,
    cyl: 8, redline: 6500, engine: 'small block V8',
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
     none of this, just a lot of power - which is why the factory blown
     cars say `blown` instead. Nothing in the physics reads it; it is there
     so the Hellcats whine like Hellcats instead of sounding like a big
     naturally aspirated V8, which is the one thing they do not sound
     like.
     --------------------------------------------------------------------- */

  a80: {
    name: 'Toyota Supra RZ', nick: 'The A80',
    desc: 'Sequential turbos, so it pulls from almost nothing and never stops. Heavy, and it hides it well.',
    price: 58000, mass: 1570, power: 239, grip: 1.14, brake: 10.6, steer: 2.25, cda: 0.70,
    boost: 0.16, lag: 10,
    cyl: 6, redline: 7000, engine: '2JZ inline six',
    body: 'a80', colour: 0xe8562c
  },
  a90: {
    name: 'Toyota GR Supra', nick: 'The A90',
    desc: 'Shorter, stiffer and sharper than the car it is named after. One big turbo and a very short wheelbase.',
    price: 78000, mass: 1540, power: 285, grip: 1.18, brake: 11.0, steer: 2.40, cda: 0.63,
    boost: 0.14, lag: 8,
    cyl: 6, redline: 6500, engine: 'B58 inline six',
    body: 'a90', colour: 0xd8d8dc
  },
  hellcoupe: {
    name: 'Dodge Challenger Hellcat', nick: 'The Hellcat',
    desc: 'Supercharged, so all of it arrives at once. Two tonnes of it. The tyres are a formality.',
    price: 118000, mass: 1975, power: 527, grip: 1.04, brake: 10.2, steer: 1.90, cda: 0.86,
    blown: true,
    cyl: 8, redline: 6200, engine: 'supercharged 6.2 V8',
    body: 'hellcoupe', colour: 0x6b2fd0
  },
  hellsedan: {
    name: 'Dodge Charger Hellcat', nick: 'The four-door',
    desc: 'The same engine with two more doors and a longer wheelbase. Calmer, heavier, every bit as silly.',
    price: 112000, mass: 2050, power: 527, grip: 1.02, brake: 10.0, steer: 1.85, cda: 0.90,
    blown: true,
    cyl: 8, redline: 6200, engine: 'supercharged 6.2 V8',
    body: 'hellsedan', colour: 0x1d1f24
  },
  hellwagon: {
    name: 'Dodge Durango Hellcat', nick: 'The fast SUV',
    desc: 'Three rows of seats and seven hundred horsepower. Physics has opinions about the corners.',
    price: 104000, mass: 2470, power: 529, grip: 0.95, brake: 9.8, steer: 1.75, cda: 1.08,
    blown: true,
    cyl: 8, redline: 6200, engine: 'supercharged 6.2 V8',
    body: 'suv', colour: 0x2a6e4a
  },
  rx: {
    name: 'Mazda RX-7', nick: 'The rotary',
    desc: 'A rotary, so it revs past where everything else has given up. Light, delicate, and allergic to neglect.',
    price: 64000, mass: 1280, power: 188, grip: 1.22, brake: 11.2, steer: 2.60, cda: 0.62,
    boost: 0.15, lag: 11, stability: 0.96,
    cyl: 4, redline: 8000, engine: 'two-rotor Wankel',
    body: 'rx', colour: 0xf2e9d8
  },
  evo: {
    name: 'Mitsubishi Lancer Evo IX', nick: 'The Evo',
    desc: 'Four driven wheels and a turbo, in a shell with no interior worth mentioning. It simply goes where you point it.',
    price: 84000, mass: 1410, power: 206, grip: 1.34, brake: 11.8, steer: 2.65, cda: 0.74,
    boost: 0.18, lag: 9,
    cyl: 4, redline: 7000, engine: '4G63 inline four',
    body: 'evo', colour: 0xe8e8ea
  },
  gtr: {
    name: 'Nissan Skyline GT-R R34', nick: 'The Skyline',
    desc: 'Twin turbos, all-wheel drive and more computers than the rest of this showroom combined. Heavy, and it never once feels it.',
    price: 88000, mass: 1560, power: 206, grip: 1.32, brake: 11.6, steer: 2.45, cda: 0.68,
    boost: 0.17, lag: 10,
    cyl: 6, redline: 8000, engine: 'RB26 inline six',
    body: 'gtr', colour: 0x5aa8e8
  },
  rear: {
    name: 'Porsche 911 Turbo 3.6', nick: 'The widowmaker',
    desc: 'Engine behind the back axle and a turbo that arrives all at once at 36 mph. Quick, and it has opinions about lifting mid-corner.',
    price: 128000, mass: 1470, power: 265, grip: 1.30, brake: 11.9, steer: 2.50, cda: 0.60,
    boost: 0.22, lag: 16, stability: 0.88,
    cyl: 6, redline: 6700, engine: 'flat six',
    body: 'rear', colour: 0xf2d04a
  },
  super: {
    name: 'Lamborghini Aventador SV', nick: 'The supercar',
    desc: 'Mid-engined, naturally aspirated and completely impractical. The fastest thing here that still has a numberplate.',
    price: 140000, mass: 1525, power: 552, grip: 1.38, brake: 12.6, steer: 2.60, cda: 0.64,
    cyl: 12, redline: 8500, engine: 'V12',
    body: 'super', colour: 0x8ad83c
  },
  trx: {
    name: 'Ram 1500 TRX', nick: 'The truck',
    desc: 'Supercharged pickup on knobbly tyres. Hopeless in a corner, hilarious everywhere else, and it does not care about grass.',
    price: 96000, mass: 2900, power: 523, grip: 0.88, brake: 9.2, steer: 1.60, cda: 1.95,
    offroad: 0.35,
    blown: true,
    cyl: 8, redline: 6200, engine: 'supercharged 6.2 V8',
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
var CAR_ORDER = ['hatch', 'coupe', 'trx', 'a80', 'gtr', 'rx', 'muscle', 'rally',
                 'evo', 'hellwagon', 'a90', 'rear', 'hellsedan', 'hellcoupe',
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
      { name: 'Supercharger', cost: 12500, boost: 0.30, lag: 0, mass: 38,
        d: '+30% from a standstill. Belt driven, so there is no waiting for it - and no more of it higher up either. 38 kg.' },
      { name: 'Big turbo', cost: 21000, boost: 0.42, lag: 26, mass: 24, d: '+42%, but nothing happens below 58 mph.' },
      { name: 'Twin turbo', cost: 34000, boost: 0.56, lag: 18, mass: 31,
        d: '+56%, and the little one lights first, so it is all there by 40 mph.' },
      { name: 'Quad turbo', cost: 58000, boost: 0.74, lag: 31, mass: 52,
        d: '+74% once all four are lit, which is not until 69 mph. 52 kg of plumbing you carry everywhere, including round corners.' }
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
function carStats(carKey, parts, tune){
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

  /* The Speed Demon dials go on after the parts, because a dial adjusts
     what is fitted rather than standing in for it. */
  applyTune(s, tune);

  /* A locked differential drags the car straight: it is why a spool puts
     power down and why it will not turn. Both halves come off the one
     number, so you cannot have the first without the second. */
  s.steer *= 1 - 0.07 * s.diff;

  /* A car cannot be lighter than its own cage and engine. Without this the
     weight tiers on the lightest car would walk it down towards nothing. */
  s.mass = Math.max(s.mass, 620);
  return s;
}

function statsOf(carKey){ return carStats(carKey, partsFor(carKey), tuneFor(carKey)); }

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
  var limit = gripCeiling(s, v);

  return Math.min(f, limit);
}

/* The most the driven wheels can push at this speed. A clutch only buys you
   anything while it is still slipping, so its help fades out by the time you
   are rolling properly. The dyno asks this the same way the engine does, so
   the graph knows where a car is held back by grip rather than by power
   without a second copy of the sum to get out of step. */
function gripCeiling(s, v){
  var lim = tractionLimit(s);
  if(s.launch && s.launch !== 1 && v < 14) lim *= 1 + (s.launch - 1) * (1 - v / 14);
  return lim;
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

/* The speed the car actually stops gaining, which is not the speed its
   gearing could reach. dragLimited answers "where does thrust meet drag"
   with no rev limiter in the way; the limiter then fades the last few m/s
   out from under the car, so it settles a little short of that - about 8
   mph short, on every car in the game. Walking it with forceAt, the call
   the driving model makes every frame, is the only way to get a number the
   car will actually show you on the straight.

   This is what the garage quotes. topSpeed stays exactly what it was, the
   ceiling the gearbox sets, because that is what the driving model needs
   as vMax and what the rating has always been scaled against. */
function flatOut(s){
  var vMax = topSpeed(s);
  for(var v = 2; v < vMax; v += 0.25){
    if(forceAt(s, v, vMax) <= dragForce(s, v) + rollingForce(s)) return v;
  }
  return vMax;
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
  /* Gearing is thrust, and thrust is what fires a car off a corner, so the
     power term carries it. Without this, short ratios make a car quicker
     everywhere and LOWER its rating, because the only gearing the rating
     could see was the top speed it gives away - a free pass into a slower
     class, the same hole the quad turbo used to walk through. Every car as
     sold has force = 1, so no showroom number moves. */
  var pw = (s.power * 1000 * s.force) / s.mass;   // W/kg, geared
  /* Boost is a multiplier on power, so it is worth a share of the power term
     rather than a flat bonus - and only a share, because it does nothing at
     all below `lag`. Without this a quad turbo is free rating: the car stays
     in class D on paper and walks every event in it. */
  var r = pw * 1.65 * (1 + 0.7 * (s.boost || 0)) +
          s.grip * 170 + s.brake * 8.5 + topSpeed(s) * 0.9 +
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
    top: flatOut(s) * MPS_TO_MPH,
    sixty: zeroTo60(s),
    corner: gripAt(s, 30),
    mass: s.mass,
    power: s.power
  };
}

/* ------------------------------------------------------------ buying kit -- */

/* Unlimited money, on by default. The garage is the game, and the point of it
   is trying combinations rather than saving up for them.

   Switching it off puts the earning game back whole: prices, prize money, and
   the side bet that is the only way the number ever goes down. Nothing fitted
   while it is on is recorded as bought, so switching it off hands you the
   garage you actually paid for rather than everything you tried for free. */
function freeBuild(){ return SAVE.freeBuild !== false; }

function partCost(slotKey, tier){
  if(freeBuild()) return 0;
  var slot = slotByKey(slotKey);
  if(!slot || !slot.tiers[tier]) return 0;
  return slot.tiers[tier].cost;
}

/* The sticker price, whether or not anyone is being asked to pay it. The
   showroom still shows what a car is worth with money switched off. */
function listPrice(carKey){
  var car = CARS[carKey];
  return car ? car.price : 0;
}

function ownsCar(carKey){
  return freeBuild() || SAVE.owned.indexOf(carKey) !== -1;
}

/* Parts are bought outright, not rented, and fitting a cheaper one back is
   free - so experimenting with a build never costs anything once owned. */
function ownsPart(carKey, slotKey, tier){
  var owned = SAVE.parts[carKey + ':owned'];
  if(tier === 0) return true;
  return !!(owned && owned[slotKey] && owned[slotKey].indexOf(tier) !== -1);
}

function buyPart(carKey, slotKey, tier){
  /* Money off: fitting is all that happens. Nothing spent, nothing recorded. */
  if(freeBuild()){ fitPart(carKey, slotKey, tier); return { ok: true, free: true }; }

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
  if(!freeBuild() && !ownsPart(carKey, slotKey, tier)) return false;
  if(!slotFits(slotKey, carKey)) return false;
  partsFor(carKey)[slotKey] = tier;
  saveNow();
  return true;
}

function buyCar(carKey){
  var car = CARS[carKey];
  if(!car) return { ok: false, why: 'no such car' };
  /* Money off: every car is simply available, and taking one records nothing.
     Switch the earning game back on and the showroom is as you left it. */
  if(freeBuild()){ SAVE.car = carKey; saveNow(); return { ok: true, free: true }; }

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

/* ------------------------------------------------------- the Workbench -- */

/* The four above are off the shelf. The Workbench is where you make your own:
   pick each piece, name it, and it joins the list for every car you own.

   Every component here is geometry and nothing else. None of it reaches
   carStats, and there is a test that holds that line - a body kit that
   quietly added grip would make the whole garage a liar. */

var BENCH_PARTS = [
  { key: 'splitter', name: 'Front splitter', d: 'How far it juts out under the nose.',
    steps: [{ n: 'None', v: 0 }, { n: 'Lip', v: 0.14 },
            { n: 'Deep', v: 0.28 }, { n: 'Full tray', v: 0.42 }] },
  { key: 'arch', name: 'Arches', d: 'How much wider it sits over the wheels.',
    steps: [{ n: 'Standard', v: 0 }, { n: 'Flared', v: 0.05 },
            { n: 'Wide', v: 0.10 }, { n: 'Full wide-body', v: 0.16 }] },
  { key: 'skirt', name: 'Side skirts', d: 'How low it runs between the wheels.',
    steps: [{ n: 'None', v: 0 }, { n: 'Subtle', v: 0.04 }, { n: 'Deep', v: 0.08 }] },
  { key: 'wing', name: 'Wing', d: 'What is bolted to the back of it.',
    steps: [{ n: 'None', v: 0 }, { n: 'Ducktail', v: 1 },
            { n: 'Deck wing', v: 2 }, { n: 'Swan-neck GT', v: 3 }] },
  { key: 'scoop', name: 'Scoop', d: 'Where it takes its air from.',
    steps: [{ n: 'None', v: 0 }, { n: 'Bonnet', v: 1 }, { n: 'Roof', v: 2 }] }
];

var MAX_KITS = 12;          // enough to play with, small enough to save

function newKit(){
  var k = { n: '' };
  for(var i = 0; i < BENCH_PARTS.length; i++) k[BENCH_PARTS[i].key] = 0;
  return k;
}

/* Which step a kit is on for one component. Values come out of the steps, so
   an exact match is the normal case; the nearest is a fallback for a kit
   saved before a step list changed under it. */
function benchStep(kit, part){
  var best = 0, gap = Infinity;
  for(var i = 0; i < part.steps.length; i++){
    var d = Math.abs((kit[part.key] || 0) - part.steps[i].v);
    if(d < gap){ gap = d; best = i; }
  }
  return best;
}

/* Presets first, then everything built in the Workbench, in one index space -
   so `looks.kit` keeps meaning exactly what it always meant. */
function allKits(){
  return KITS.concat((SAVE && SAVE.kits) || []);
}
function kitAt(i){
  var all = allKits();
  return all[i || 0] || all[0];
}
function isCustomKit(i){ return (i || 0) >= KITS.length; }

function saveKit(kit){
  if(!SAVE.kits) SAVE.kits = [];
  if(SAVE.kits.length >= MAX_KITS) return { ok: false, why: 'the bench is full' };
  var made = newKit();
  for(var i = 0; i < BENCH_PARTS.length; i++){
    var key = BENCH_PARTS[i].key;
    made[key] = kit[key] || 0;
  }
  made.n = (kit.n || '').trim().slice(0, 22) || ('Kit ' + (SAVE.kits.length + 1));
  SAVE.kits.push(made);
  saveNow();
  return { ok: true, index: KITS.length + SAVE.kits.length - 1 };
}

/* Deleting one shifts every later kit down an index, so any car wearing one
   of those has to be walked back or it silently changes clothes. */
function deleteKit(index){
  if(!isCustomKit(index)) return false;
  var at = index - KITS.length;
  if(!SAVE.kits || !SAVE.kits[at]) return false;
  SAVE.kits.splice(at, 1);
  for(var carKey in SAVE.looks){
    var l = SAVE.looks[carKey];
    if(!l || typeof l.kit !== 'number') continue;
    if(l.kit === index) l.kit = 0;
    else if(l.kit > index) l.kit -= 1;
  }
  saveNow();
  return true;
}

/* ------------------------------------------------------- the Speed Demon -- */

/* Speed Demon is the workshop. A rolling road, a set of dials, and the bench
   you make body kits on, all in one place and all of it free - none of this
   is a part, it is your own evening with a spanner.

   Every dial is a trade with both halves welded to the same number, so you
   cannot take the first without the second. They are deliberately finer than
   anything in the parts list: a dial is the last half second after you have
   already bought the right gearbox, not a way around buying one.

   They are applied inside carStats, which is the whole point. The dyno, the
   garage preview, the class rating and the car that actually turns up on the
   grid are all reading the same build. A tune that made you quicker without
   moving your rating would be a way of sneaking an S-class car into a club
   race, so it moves your rating. */

var TUNE_DIALS = [
  {
    key: 'gear', name: 'Final drive', mid: 2,
    d: 'Short gears pull harder everywhere and run out of road sooner.',
    steps: [
      { n: 'Very long',  force: 0.90, top: 1.08 },
      { n: 'Long',       force: 0.95, top: 1.04 },
      { n: 'Standard',   force: 1.00, top: 1.00 },
      { n: 'Short',      force: 1.05, top: 0.96 },
      { n: 'Very short', force: 1.11, top: 0.91 }
    ]
  },
  {
    key: 'boost', name: 'Boost pressure', mid: 1,
    needs: 'boost',
    d: 'More of it, later. A bigger lungful takes longer to fill.',
    steps: [
      { n: 'Wastegate cracked', boost: -0.07, lag: -5 },
      { n: 'Factory',           boost: 0.00,  lag: 0 },
      { n: 'Turned up',         boost: 0.09,  lag: 5 },
      { n: 'All of it',         boost: 0.18,  lag: 11 }
    ]
  },
  {
    key: 'rake', name: 'Rake', mid: 1,
    d: 'Nose down, and the air presses it into the road on its way past.',
    steps: [
      { n: 'Level',     grip: 0.985, cda: 0.96 },
      { n: 'Factory' },
      { n: 'Raked',     down: 0.05,  cda: 1.05 },
      { n: 'Nose down', down: 0.11,  cda: 1.11 }
    ]
  }
];

function dialByKey(key){
  for(var i = 0; i < TUNE_DIALS.length; i++) if(TUNE_DIALS[i].key === key) return TUNE_DIALS[i];
  return null;
}

/* Everything sitting on its middle notch: a car nobody has touched. */
function neutralTune(){
  var t = {};
  for(var i = 0; i < TUNE_DIALS.length; i++) t[TUNE_DIALS[i].key] = TUNE_DIALS[i].mid;
  return t;
}

function tuneFor(carKey){
  if(!SAVE.tune) SAVE.tune = {};
  if(!SAVE.tune[carKey]) SAVE.tune[carKey] = neutralTune();
  var t = SAVE.tune[carKey];
  /* A save written before a dial existed is missing it rather than wrong. */
  for(var i = 0; i < TUNE_DIALS.length; i++){
    var dial = TUNE_DIALS[i];
    if(typeof t[dial.key] !== 'number') t[dial.key] = dial.mid;
    t[dial.key] = clamp(Math.round(t[dial.key]), 0, dial.steps.length - 1);
  }
  return t;
}

function setTune(carKey, dialKey, step){
  var dial = dialByKey(dialKey);
  if(!dial) return false;
  tuneFor(carKey)[dialKey] = clamp(Math.round(step), 0, dial.steps.length - 1);
  saveNow();
  return true;
}

function resetTune(carKey){
  SAVE.tune[carKey] = neutralTune();
  saveNow();
}

/* Has this car been touched at all? The garage says so on the card, because
   a build that is quick for reasons the parts list cannot explain is
   otherwise a mystery to anyone looking at it later. */
function isTuned(tune){
  for(var i = 0; i < TUNE_DIALS.length; i++){
    var dial = TUNE_DIALS[i];
    if((tune && tune[dial.key] !== undefined ? tune[dial.key] : dial.mid) !== dial.mid) return true;
  }
  return false;
}

/* Folded into the stats after the parts, because a dial adjusts what is
   fitted rather than replacing it. Boost is the exception worth stating: a
   car with no turbo on it has nothing to turn up, and the dial politely does
   nothing rather than conjuring boost out of a naturally aspirated engine. */
function applyTune(s, tune){
  if(!tune) return s;
  for(var i = 0; i < TUNE_DIALS.length; i++){
    var dial = TUNE_DIALS[i];
    var step = dial.steps[clamp(Math.round(tune[dial.key] === undefined ? dial.mid : tune[dial.key]),
                                0, dial.steps.length - 1)];
    if(!step) continue;
    if(dial.needs === 'boost' && !(s.boost > 0)) continue;
    if(step.grip) s.grip *= step.grip;
    if(step.force) s.force *= step.force;
    if(step.top) s.top *= step.top;
    if(step.cda) s.cda *= step.cda;
    if(step.down) s.down += step.down;
    if(step.boost) s.boost = Math.max(0, s.boost + step.boost);
    if(step.lag) s.lag = Math.max(0, s.lag + step.lag);
  }
  return s;
}

/* ------------------------------------------------------------- the dyno -- */

/* A rolling road, and honest about being one: these are figures at the
   wheels across road speed, not an engine on a bench with rpm along the
   bottom. This game has no gear ratios to put rpm on that axis with, and
   drawing one anyway would be inventing a number.

   Both thrust and power come back, because they tell different truths. The
   engine holds the same power at any speed once it is spinning - the
   gearbox is what keeps it there - so a power line is a flat line and says
   almost nothing. Thrust is that same power divided by speed, and the shape
   of it is the shape of the car: a flat ceiling where the tyres cannot take
   any more, a long fall where they can, and a cliff at the rev limiter.

   Every line comes out of the same calls the driving model makes, so the
   graph cannot flatter a car the track will not. */
function dynoPull(s){
  var vMax = topSpeed(s);
  var out = [];
  var ceiling = Math.max(vMax, 20) + 3;
  for(var v = 1; v <= ceiling; v += 1){
    var f = forceAt(s, v, vMax);
    out.push({
      v: v,
      mph: v * MPS_TO_MPH,
      push: f,                                          // thrust at the wheels, newtons
      hold: dragForce(s, v) + rollingForce(s),          // what it takes to stay there
      kw: f * v / 1000,                                 // the same thrust as power
      slip: f >= gripCeiling(s, v) - 0.5                // held back by grip, not power
    });
  }
  return out;
}

/* The numbers printed beside the graph. Peak is read off the same samples
   the graph is drawn from, so the dot and the figure can never disagree. */
function dynoPeak(s){
  var pull = dynoPull(s);
  var best = pull[0], hardest = pull[0], slipTo = 0;
  for(var i = 0; i < pull.length; i++){
    if(pull[i].kw > best.kw) best = pull[i];
    if(pull[i].push > hardest.push) hardest = pull[i];
    if(pull[i].slip) slipTo = pull[i].mph;
  }
  return {
    pull: pull,
    kw: best.kw,
    atMph: best.mph,
    push: hardest.push,
    pushAtMph: hardest.mph,
    flywheel: s.power * (1 + (s.boost || 0)),   // what the engine is claimed to make
    topMph: flatOut(s) * MPS_TO_MPH,
    slipTo: slipTo,                             // traction-limited below this
    boostFrom: s.boost > 0 ? s.lag * MPS_TO_MPH : 0,
    boostBy: s.boost > 0 ? (s.lag + 8) * MPS_TO_MPH : 0,
    boost: s.boost || 0,
    zeroTo60: zeroTo60(s)
  };
}

/* The best pull this car has ever put down, kept so a session of fiddling
   has something to beat. It is per car, not per build: the build is the bit
   you are changing. */
function logDyno(carKey, peak){
  if(!SAVE.dyno) SAVE.dyno = {};
  var was = SAVE.dyno[carKey];
  if(!was || peak.kw > was.kw + 0.05){
    SAVE.dyno[carKey] = { kw: peak.kw, mph: peak.atMph };
    saveNow();
    return true;
  }
  return false;
}

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
  if(l.paint === null || l.paint === undefined ||
     l.paint > PAINTS.length) l.paint = defaultPaint(carKey);
  return l;
}

/* The colours this particular car can wear: the shop's sixteen, and its own
   on the end if it is not already one of them.

   This used to be done by pushing the car's colour onto PAINTS itself and
   writing down the index - and that index was a lie the moment you closed
   the tab. PAINTS is rebuilt from its sixteen literals every load, and the
   extra entries were only ever added for cars looksFor happened to be
   asked about, in whatever order it was asked. So a save that said "paint
   16" came back pointing at nothing, fell through to PAINTS[0], and every
   car you had ever driven turned up in Signal red.

   Built fresh per car instead and never stored, so slot 16 means the same
   thing in the same car forever - and it is still a swatch you can see and
   go back to, which a colour held outside the list would not have been. */
function swatchesFor(carKey){
  var own = CARS[carKey].colour;
  for(var i = 0; i < PAINTS.length; i++) if(PAINTS[i].c === own) return PAINTS;
  return PAINTS.concat([{ n: CARS[carKey].nick, c: own }]);
}

/* A new car arrives in its own colour rather than whatever the last one
   was wearing. Reads the list; never changes it. */
function defaultPaint(carKey){
  var want = CARS[carKey].colour;
  for(var i = 0; i < PAINTS.length; i++) if(PAINTS[i].c === want) return i;
  return PAINTS.length;
}

/* The colour a set of looks comes out as, for a given car. */
function paintColour(carKey, looks){
  var pal = swatchesFor(carKey);
  return (pal[looks && looks.paint] || pal[0]).c;
}

/* ---------------------------------------------------------- the rev counter -- */

/* There is no gearbox in the physics - the model works in force against
   speed, and that is deliberate. But the dash shows a gear and a rev bar,
   and now the car makes a noise, and those two had better be the same
   number or the engine will scream while the needle sits still.

   So both read this. Six ratios spread evenly across the car's own top
   speed: the fraction of the way up the box tells you the gear, and the
   fraction of the way through that gear is the fraction of the way to the
   redline. Idle is where it sits when the fraction is nothing, because an
   engine at rest is not at zero rpm, it is idling.

   IDLE_RPM is one number rather than per car because the difference
   between a 700 rpm V8 and an 850 rpm four is not something anyone will
   hear over the exhaust. The redline is per car, and that one you hear. */
var GEARS_SHOWN = 6, IDLE_RPM = 820;

function revsOf(carKey, speed, vMax){
  var frac = clamp(Math.abs(speed) / (vMax || 1), 0, 1);
  var gear = Math.min(GEARS_SHOWN - 1, Math.floor(frac * GEARS_SHOWN));
  /* Revs inside a gear run from a standstill, not from the bottom of that
     gear's slice of the speed range. The difference sounds small and is
     not: taking the slice directly - frac * 6 - gear - puts you at a tenth
     of the redline in sixth at 85 mph of a 100 mph car, pulling away like
     a tractor, when the honest answer is 85 per cent of the redline.

     Top gear is geared so that the redline IS the top speed, so in gear g
     of six the engine reaches its redline at (g+1)/6 of the car's top
     speed, and at any speed below that it is the same fraction of the way
     up. Which also gives the right-sized drop at every change: first to
     second lands at half the redline, fifth to sixth at five sixths of it.
     Big drops low down, small ones high up. That is what a gearbox is. */
  var within = clamp(frac * GEARS_SHOWN / (gear + 1), 0, 1);
  var red = (CARS[carKey] && CARS[carKey].redline) || 7000;
  return {
    gear: gear + 1,
    within: within,
    rpm: IDLE_RPM + within * (red - IDLE_RPM),
    redline: red
  };
}

/* How often the engine fires, in events per second. A four-stroke fires
   every cylinder once per two turns of the crank, so the whole cycle comes
   round at rpm/120 - which is the frequency the note is built on, because
   working in cycles rather than revolutions is what lets a cross-plane V8
   have its half-order lumpiness at all. */
function cycleHz(rpm){ return rpm / 120; }

function firingHz(rpm, cyl){ return cycleHz(rpm) * (cyl || 4); }

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
