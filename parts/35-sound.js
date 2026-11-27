/* =========================================================================
   3.5  THE NOISE

   Every sound in this game is made from scratch, in the browser, out of
   oscillators and filtered noise. Not one sample, not one file - the whole
   game is still a single HTML page with nothing to fetch, and a recording
   of a V8 is about two hundred kilobytes of thing-to-fetch.

   Synthesis is also the only way to get it RIGHT here, which is the better
   reason. A sample is one engine at one speed; it has to be pitched up and
   down and looped, and the loop is audible, and it cannot know that this
   particular car is a flat six at 6,700 rpm with a turbo on it. An engine
   built out of its own firing frequency can: give it the cylinder count and
   the redline and it comes out sounding like that engine, and the turbo
   whistle is a real function of the boost the physics is making.

   What is in here:

     the engine    a periodic wave at the engine's cycle frequency, with
                   the harmonics its layout actually emphasises
     induction     filtered noise that opens up with throttle and revs
     the turbo     a whistle that tracks boost, and a blow-off on lift
     the blower    a whine geared off the crank, for the supercharged cars
     the tyres     a squeal when the slip is real
     the road      wind and surface, rising with speed
     nitrous       a hiss while it is held

   All of it is one gain node away from silence, and it starts muted until
   the player has touched something, because every browser requires that
   and every browser is right to.
   ========================================================================= */

var AUDIO = {
  ctx: null,
  ready: false,
  failed: false,
  master: null,
  on: true,
  vol: 0.7,
  nodes: null,
  last: 0
};

/* --------------------------------------------------------------- waves -- */

/* The shape of an engine.

   An oscillator running at the engine's CYCLE frequency - one full
   four-stroke cycle, which is two turns of the crank, rpm/120 - has its
   harmonic k land on the k/2-th order of the engine. That factor of two is
   the whole trick, because it is what gives a cross-plane V8 somewhere to
   put the half-orders that make it burble. An oscillator at crank speed
   simply cannot express them.

   So harmonic `cyl` is the firing frequency, its multiples are the
   overtones, and everything in between is the unevenness: how much of it
   there is, and where, is most of what makes one engine sound unlike
   another. A V8 is lumpy, an inline six is not, a V12 is a turbine with a
   tune, and the rotary has no reciprocating mass at all and sounds like it.

   Built once per layout and cached - a PeriodicWave is not free to make
   and there are only ever a handful of shapes. */
var WAVE_CACHE = {};
function engineWave(ctx, cyl, smooth){
  var key = cyl + '|' + smooth;
  if(WAVE_CACHE[key]) return WAVE_CACHE[key];

  var N = 40;
  var re = new Float32Array(N), im = new Float32Array(N);
  for(var k = 1; k < N; k++){
    var a = 0;
    if(k % cyl === 0){
      /* On a firing order and its multiples: the note itself, falling away
         as the overtones climb. */
      var order = k / cyl;
      a = 1 / Math.pow(order, 1.25);
    } else {
      /* Between them: the rough edges. Odd harmonics of the cycle are the
         half-orders - the every-other-bang that a cross-plane crank gives
         you - and they are what a smooth engine has least of. */
      var odd = (k % 2) === 1;
      a = (odd ? 0.30 : 0.16) / Math.pow(k, 0.85);
      a *= (1 - smooth);
    }
    /* A little phase spread, so the harmonics do not all peak together and
       turn the waveform into a single spike with a flat line after it. */
    var phase = (k * 2.399) % 6.2832;
    re[k] = a * Math.cos(phase);
    im[k] = a * Math.sin(phase);
  }
  var w = ctx.createPeriodicWave(re, im, { disableNormalization: false });
  WAVE_CACHE[key] = w;
  return w;
}

/* How smooth an engine is, 0 to 1. An inline six and a flat six are
   famously balanced; a V12 is two of those end to end. A big cross-plane
   V8 is the opposite and is loved for it. The five is the odd one out in
   every sense - an odd number of cylinders cannot balance, which is the
   whole reason an Audi five-pot warbles. */
function engineSmooth(cyl){
  /* Twelve or sixteen: a W16 is four banks of four and is as smooth as
     anything with a crank in it. */
  if(cyl >= 12) return 0.92;
  if(cyl === 6) return 0.80;
  if(cyl === 5) return 0.34;
  if(cyl === 8) return 0.22;
  return 0.55;
}

/* ---------------------------------------------------------- noise source -- */

/* Two seconds of white noise, made once and looped. Everything that is not
   the engine note - induction, tyres, wind, nitrous - is this buffer
   through a different filter. */
function noiseBuffer(ctx){
  var len = ctx.sampleRate * 2;
  var buf = ctx.createBuffer(1, len, ctx.sampleRate);
  var d = buf.getChannelData(0);
  /* Deliberately not Math.random: hash01 gives the same noise every time,
     which makes anything odd in here reproducible. */
  for(var i = 0; i < len; i++) d[i] = hash01(i * 0.61803) * 2 - 1;
  return buf;
}

function noiseSource(ctx, buf){
  var n = ctx.createBufferSource();
  n.buffer = buf;
  n.loop = true;
  return n;
}

/* ------------------------------------------------------------- the rig -- */

/* Built once, the first time the player touches anything. Every node here
   runs for the life of the page and is steered by gain and frequency - no
   node is ever created or thrown away while driving, because that is what
   makes audio crackle. */
function audioStart(){
  if(AUDIO.ctx || AUDIO.failed) return AUDIO.ctx;
  var Ctor = window.AudioContext || window.webkitAudioContext;
  if(!Ctor){ AUDIO.failed = true; return null; }
  try {
    var ctx = new Ctor();
    var master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    var buf = noiseBuffer(ctx);
    var N = {};

    /* ---- the engine: two oscillators an octave apart ----
       The second one, half an octave down and quiet, is the weight. A
       single oscillator on a small screen's speaker loses everything below
       about 150 Hz and a V8 then sounds like a hairdryer; doubling an
       octave up gives the note something that survives a laptop. */
    N.eng = ctx.createOscillator();
    N.engUp = ctx.createOscillator();
    N.engGain = ctx.createGain();
    N.engUpGain = ctx.createGain();
    N.engGain.gain.value = 0;
    N.engUpGain.gain.value = 0;
    /* A gentle low-pass that opens with the throttle. A closed throttle is
       not a quieter engine, it is a duller one - that is most of what
       lifting off sounds like. */
    N.engTone = ctx.createBiquadFilter();
    N.engTone.type = 'lowpass';
    N.engTone.frequency.value = 900;
    N.engTone.Q.value = 0.6;
    N.eng.connect(N.engGain);
    N.engUp.connect(N.engUpGain);
    N.engGain.connect(N.engTone);
    N.engUpGain.connect(N.engTone);
    N.engTone.connect(master);

    /* ---- induction and exhaust roar ---- */
    N.roar = noiseSource(ctx, buf);
    N.roarBand = ctx.createBiquadFilter();
    N.roarBand.type = 'bandpass';
    N.roarBand.frequency.value = 300;
    N.roarBand.Q.value = 0.8;
    N.roarGain = ctx.createGain();
    N.roarGain.gain.value = 0;
    N.roar.connect(N.roarBand);
    N.roarBand.connect(N.roarGain);
    N.roarGain.connect(master);

    /* ---- the turbo: a whistle, and the dump valve after it ---- */
    N.turbo = ctx.createOscillator();
    N.turbo.type = 'sine';
    N.turbo.frequency.value = 2000;
    N.turboGain = ctx.createGain();
    N.turboGain.gain.value = 0;
    N.turbo.connect(N.turboGain);
    N.turboGain.connect(master);

    N.bov = noiseSource(ctx, buf);
    N.bovBand = ctx.createBiquadFilter();
    N.bovBand.type = 'bandpass';
    N.bovBand.frequency.value = 2600;
    N.bovBand.Q.value = 1.6;
    N.bovGain = ctx.createGain();
    N.bovGain.gain.value = 0;
    N.bov.connect(N.bovBand);
    N.bovBand.connect(N.bovGain);
    N.bovGain.connect(master);

    /* ---- the blower: geared to the crank, so it is a whine and not a
       whistle. That is the audible difference between the two, and the
       reason you can tell a Hellcat from a turbo car with your eyes shut. */
    N.blower = ctx.createOscillator();
    N.blower.type = 'sawtooth';
    N.blower.frequency.value = 400;
    N.blowerTone = ctx.createBiquadFilter();
    N.blowerTone.type = 'bandpass';
    N.blowerTone.frequency.value = 1800;
    N.blowerTone.Q.value = 3.5;
    N.blowerGain = ctx.createGain();
    N.blowerGain.gain.value = 0;
    N.blower.connect(N.blowerTone);
    N.blowerTone.connect(N.blowerGain);
    N.blowerGain.connect(master);

    /* ---- the tyres ---- */
    N.tyre = noiseSource(ctx, buf);
    N.tyreBand = ctx.createBiquadFilter();
    N.tyreBand.type = 'bandpass';
    N.tyreBand.frequency.value = 1500;
    N.tyreBand.Q.value = 6;
    N.tyreGain = ctx.createGain();
    N.tyreGain.gain.value = 0;
    N.tyre.connect(N.tyreBand);
    N.tyreBand.connect(N.tyreGain);
    N.tyreGain.connect(master);

    /* ---- wind and road ---- */
    N.wind = noiseSource(ctx, buf);
    N.windTone = ctx.createBiquadFilter();
    N.windTone.type = 'lowpass';
    N.windTone.frequency.value = 700;
    N.windGain = ctx.createGain();
    N.windGain.gain.value = 0;
    N.wind.connect(N.windTone);
    N.windTone.connect(N.windGain);
    N.windGain.connect(master);

    /* ---- nitrous ---- */
    N.nos = noiseSource(ctx, buf);
    N.nosTone = ctx.createBiquadFilter();
    N.nosTone.type = 'highpass';
    N.nosTone.frequency.value = 3200;
    N.nosGain = ctx.createGain();
    N.nosGain.gain.value = 0;
    N.nos.connect(N.nosTone);
    N.nosTone.connect(N.nosGain);
    N.nosGain.connect(master);

    N.eng.start(); N.engUp.start(); N.turbo.start(); N.blower.start();
    N.roar.start(); N.bov.start(); N.tyre.start(); N.wind.start(); N.nos.start();

    AUDIO.ctx = ctx;
    AUDIO.master = master;
    AUDIO.nodes = N;
    AUDIO.ready = true;
    AUDIO.cyl = 0;
  } catch(e){
    AUDIO.failed = true;
  }
  return AUDIO.ctx;
}

/* Browsers suspend a context that was made before the page was touched.
   Called from the first click or key press, and again whenever a race
   starts, because a tab left alone long enough gets suspended again. */
function audioWake(){
  audioStart();
  if(AUDIO.ctx && AUDIO.ctx.state === 'suspended') AUDIO.ctx.resume();
}

function audioQuiet(){
  if(!AUDIO.ready) return;
  var t = AUDIO.ctx.currentTime;
  AUDIO.master.gain.cancelScheduledValues(t);
  AUDIO.master.gain.setTargetAtTime(0, t, 0.08);
}

/* Nothing to listen to. Called on every frame there is no car - the
   menus, the results card, anywhere between races - because the mixer is
   only steered while a car exists, and without this the last gain it was
   handed simply stays there: leave a race with your foot down and the
   engine drones behind the menu until you start another one. */
function audioHush(){
  if(!AUDIO.ready) return;
  var t = AUDIO.ctx.currentTime;
  AUDIO.master.gain.setTargetAtTime(0, t, 0.1);
}

/* A hidden tab stops getting animation frames, so the mixer stops being
   steered and the last gain it was handed sits there - a car droning in a
   tab somebody switched away from twenty minutes ago. Most browsers
   suspend the audio context as well and most of the time that covers it;
   this is here because "most of the time" is not good enough for a noise
   nobody can see to turn off. */
function watchVisibility(){
  document.addEventListener('visibilitychange', function(){
    if(document.hidden) audioHush();
    else if(soundOn()) audioWake();
  });
}

function soundOn(){ return AUDIO.on !== false; }

function setSound(on){
  AUDIO.on = !!on;
  SAVE.sound = { on: AUDIO.on, vol: AUDIO.vol };
  saveNow();
  if(!AUDIO.on) audioQuiet();
  else audioWake();
}

function setVolume(v){
  AUDIO.vol = clamp(v, 0, 1);
  SAVE.sound = { on: AUDIO.on, vol: AUDIO.vol };
  saveNow();
}

function loadSoundPrefs(){
  var s = SAVE.sound;
  if(s){
    if(s.on !== undefined) AUDIO.on = !!s.on;
    if(s.vol !== undefined) AUDIO.vol = clamp(s.vol, 0, 1);
  }
}

/* ----------------------------------------------------------- the mixer -- */

/* Everything the noise needs to know about a car, worked out from the car
   itself. Pure, and separate from the audio so it can be tested without a
   browser: given a car in a state, these are the levels.

   Kept honest the same way the garage is - the boost figure here is the
   one carStats worked out, the slip is the one the tyre model produced,
   the revs come from the same revsOf the dial reads. A part you cannot
   hear is at least a part that is not lying to you. */
function engineVoice(car, input){
  var s = car.stats;
  var revs = revsOf(car.key, car.vf, car.vMax);
  var speed = Math.abs(car.vf);
  var throttle = input && input.throttle ? input.throttle : 0;
  var braking = input && input.brake ? input.brake : 0;

  /* Load: how hard the engine is working. On the throttle at low revs is
     the loudest an engine ever is; coasting at the same revs is nothing
     like it. */
  var load = clamp(throttle * (0.55 + 0.45 * (1 - revs.within)), 0, 1);
  if(throttle === 0) load = 0.06 + 0.1 * revs.within;

  /* Boost is a real number out of the garage: how much the turbo adds and
     how long it takes to get there. Below the threshold there is nothing
     to hear, which is the point of a laggy turbo. */
  var boost = 0;
  if(s.boost > 0 && s.lag > 0){
    var spool = clamp((speed - s.lag * 0.45) / Math.max(s.lag, 1), 0, 1);
    boost = spool * throttle * clamp(s.boost / 0.25, 0, 1.4);
  }
  /* Supercharged either way round: the four factory blown cars say so on
     the car, because their blower is baked into the power figure and
     carries no boost or lag at all, and a supercharger bought in the
     garage is the induction part with no lag. A car can be both, and if
     someone bolts a turbo onto a Hellcat it should make both noises,
     because it would. */
  var factory = !!(CARS[car.key] && CARS[car.key].blown);
  var blown = factory || (s.boost > 0 && (!s.lag || s.lag <= 0));

  /* Slip the tyres are actually doing, as a fraction of road speed. */
  var slip = speed > 2 ? clamp(Math.abs(car.vl) / speed, 0, 1) : 0;

  return {
    rpm: revs.rpm,
    within: revs.within,
    cyl: (CARS[car.key] && CARS[car.key].cyl) || 4,
    cycle: cycleHz(revs.rpm),
    load: load,
    boost: boost,
    blown: blown,
    slip: slip,
    hand: !!car.handOn,
    speed: speed,
    off: !!car.off,
    nos: !!car.nosOn,
    braking: braking
  };
}

/* The levels every voice should be at, given that state. Pure arithmetic,
   no audio nodes, so the test can check that a lifting turbo car chirps
   and a naturally aspirated one never does. */
function voiceLevels(v){
  var engine = 0.055 + v.load * 0.16 + v.within * 0.05;
  /* A twelve has more going on than a four and should sit a little under
     it, or it turns to mush at the top end. */
  if(v.cyl >= 12) engine *= 0.82;

  return {
    engine: engine,
    /* up an octave, quietly, for speakers with no bottom end */
    engineUp: engine * 0.33,
    tone: 420 + v.within * 2600 + v.load * 1500,
    roar: (0.02 + v.load * 0.1) * (0.3 + v.within * 0.9),
    roarAt: 180 + v.within * 520,
    turbo: v.boost * 0.055,
    turboAt: 1100 + v.boost * 2600 + v.within * 1800,
    blower: v.blown ? (0.012 + v.load * 0.05) : 0,
    /* Locked wheels scrub whether or not they are sliding sideways, so the
       handbrake has to put noise in on its own account - pull it going
       straight and the slip term alone would give you silence. */
    tyre: clamp((v.slip - 0.06) * 1.5, 0, 1) * 0.1 +
          (v.off && v.speed > 4 ? 0.05 : 0) +
          (v.hand && v.speed > 2 ? clamp(v.speed / 18, 0, 1) * 0.075 : 0),
    tyreAt: v.off ? 700 : (v.hand ? 950 : 1300) + v.slip * 900,
    wind: clamp(v.speed / 75, 0, 1) * clamp(v.speed / 75, 0, 1) * 0.14,
    windAt: 300 + v.speed * 9,
    nos: v.nos ? 0.07 : 0
  };
}

/* ------------------------------------------------------------- per frame -- */

/* Steer every node towards where it should be. setTargetAtTime rather than
   setValueAtTime throughout: a gain that jumps between frames clicks, and
   a hundred clicks a second is what makes browser audio sound like browser
   audio. The time constants are short enough to feel immediate and long
   enough to smooth a dropped frame. */
function audioFrame(car, input, dt){
  if(!AUDIO.ready || !AUDIO.on || !car) return;
  var ctx = AUDIO.ctx;
  if(ctx.state === 'suspended') return;
  var N = AUDIO.nodes, t = ctx.currentTime;

  var v = engineVoice(car, input);
  var L = voiceLevels(v);

  /* The wave only changes when the car does. */
  if(AUDIO.cyl !== v.cyl){
    var w = engineWave(ctx, v.cyl, engineSmooth(v.cyl));
    N.eng.setPeriodicWave(w);
    N.engUp.setPeriodicWave(w);
    AUDIO.cyl = v.cyl;
  }

  var ramp = 0.04;
  N.eng.frequency.setTargetAtTime(Math.max(4, v.cycle), t, 0.03);
  N.engUp.frequency.setTargetAtTime(Math.max(8, v.cycle * 2), t, 0.03);
  N.engGain.gain.setTargetAtTime(L.engine, t, ramp);
  N.engUpGain.gain.setTargetAtTime(L.engineUp, t, ramp);
  N.engTone.frequency.setTargetAtTime(L.tone, t, 0.05);

  N.roarGain.gain.setTargetAtTime(L.roar, t, ramp);
  N.roarBand.frequency.setTargetAtTime(L.roarAt, t, 0.05);

  N.turboGain.gain.setTargetAtTime(L.turbo, t, 0.06);
  N.turbo.frequency.setTargetAtTime(L.turboAt, t, 0.06);

  /* The blower is geared off the crank at about two and a half to one,
     which is why its whine climbs with the engine and not with the boost. */
  N.blowerGain.gain.setTargetAtTime(L.blower, t, ramp);
  N.blower.frequency.setTargetAtTime(Math.max(20, v.cycle * 2 * 2.6), t, 0.03);

  /* Blow-off: boost that was there a moment ago and a throttle that is
     not. Scheduled as a decay rather than held, because that is what the
     valve does - it is a release of something, not a note. */
  var lifted = AUDIO.lastBoost > 0.25 && v.load < 0.12;
  if(lifted && t - (AUDIO.lastBov || 0) > 0.4){
    AUDIO.lastBov = t;
    N.bovGain.gain.cancelScheduledValues(t);
    N.bovGain.gain.setValueAtTime(0.085 * AUDIO.lastBoost, t);
    N.bovGain.gain.exponentialRampToValueAtTime(0.0005, t + 0.26);
  }
  AUDIO.lastBoost = v.boost;

  N.tyreGain.gain.setTargetAtTime(L.tyre, t, 0.05);
  N.tyreBand.frequency.setTargetAtTime(L.tyreAt, t, 0.06);

  N.windGain.gain.setTargetAtTime(L.wind, t, 0.09);
  N.windTone.frequency.setTargetAtTime(L.windAt, t, 0.09);

  N.nosGain.gain.setTargetAtTime(L.nos, t, 0.05);

  AUDIO.master.gain.setTargetAtTime(AUDIO.vol, t, 0.12);
}
