/* =========================================================================
   1  CORE

   Units are real ones: metres, seconds, kilograms, newtons. It costs nothing
   and it means the numbers in the garage can be honest - 1,400 kg and 180 kW
   behave the way you would expect them to, and a part that adds 40 kg is felt
   rather than just printed.

   Speed is held in m/s throughout and only turned into mph at the moment it
   is drawn.
   ========================================================================= */

var T = window.THREE;

var MPS_TO_MPH = 2.23694;
var DT_MAX = 1 / 25;          // a long frame is clamped, never integrated whole

/* The world is flat, so everything solves in 2D on x/z and the renderer puts
   it in 3D. Same approach as the hockey game; it keeps the driving model
   small enough to reason about and to test headlessly. */

var G = {
  mode: 'menu',               // menu | race | paused | done
  t: 0,                       // seconds since the lights went out
  started: false,             // past the countdown
  countdown: 0,
  cars: [],                   // every car on track, [0] is the player
  you: null,
  track: null,
  laps: 3,
  event: null,                // the career event being run, or null
  finished: [],
  lastTime: 0
};

/* ------------------------------------------------------------------ maths -- */
function clamp(v, lo, hi){ return v < lo ? lo : (v > hi ? hi : v); }
function lerp(a, b, t){ return a + (b - a) * t; }
function sign(v){ return v < 0 ? -1 : (v > 0 ? 1 : 0); }
function dist2(ax, az, bx, bz){ var dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; }

/* Shortest signed angle from a to b, so steering never takes the long way. */
function angDiff(a, b){
  var d = (b - a) % (Math.PI * 2);
  if(d > Math.PI) d -= Math.PI * 2;
  if(d < -Math.PI) d += Math.PI * 2;
  return d;
}

/* Deterministic noise, so an AI driver's character is stable across restarts
   and a test can reproduce a race exactly. */
function hash01(n){
  var x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function fmtTime(s){
  if(s === null || s === undefined || !isFinite(s)) return '--:--.-';
  var neg = s < 0; s = Math.abs(s);
  var m = Math.floor(s / 60);
  var r = s - m * 60;
  return (neg ? '-' : '') + m + ':' + (r < 10 ? '0' : '') + r.toFixed(1);
}
function fmtGap(s){
  if(s === null || s === undefined || !isFinite(s)) return '';
  return (s >= 0 ? '+' : '') + s.toFixed(1);
}
function money(n){ return '$' + Math.round(Math.abs(n)).toLocaleString('en-US'); }
/* Signed, for a wager that can go the other way. */
function moneyDelta(n){ return (n < 0 ? '-' : '+') + money(n); }

/* ------------------------------------------------------------------ input -- */

var KEY = {};
var INPUT = { throttle: 0, brake: 0, steer: 0, hand: false, nos: false };

var BINDS = {
  throttle: ['ArrowUp', 'KeyW'],
  brake:    ['ArrowDown', 'KeyS'],
  left:     ['ArrowLeft', 'KeyA'],
  right:    ['ArrowRight', 'KeyD'],
  hand:     ['Space'],
  nos:      ['ShiftLeft', 'ShiftRight', 'KeyN']
};

function anyDown(list){
  for(var i = 0; i < list.length; i++) if(KEY[list[i]]) return true;
  return false;
}

window.addEventListener('keydown', function(e){
  if(e.code === 'Escape' || e.code === 'KeyP'){ togglePause(); return; }
  if(e.code === 'KeyR' && G.mode === 'race'){ restartRace(); return; }
  /* Arrows and space scroll the page; in a driving game that is never wanted. */
  if(e.code.indexOf('Arrow') === 0 || e.code === 'Space') e.preventDefault();
  KEY[e.code] = true;
});
window.addEventListener('keyup', function(e){ KEY[e.code] = false; });
window.addEventListener('blur', function(){ KEY = {}; TOUCH = {}; });

/* ------------------------------------------------------------------ touch -- */

var TOUCH = {};
function bindPad(id, name){
  var el = document.getElementById(id);
  if(!el) return;
  function on(e){ e.preventDefault(); TOUCH[name] = true; el.classList.add('hit'); }
  function off(e){ e.preventDefault(); TOUCH[name] = false; el.classList.remove('hit'); }
  el.addEventListener('touchstart', on, {passive: false});
  el.addEventListener('touchend', off, {passive: false});
  el.addEventListener('touchcancel', off, {passive: false});
  el.addEventListener('mousedown', on);
  el.addEventListener('mouseup', off);
  el.addEventListener('mouseleave', off);
}

/* --------------------------------------------------------------- gamepad -- */
/* The Gamepad API only hands over a pad once a button has been pressed on it,
   and it cannot be subscribed to - it has to be read every frame. */
function readPad(){
  if(!navigator.getGamepads) return null;
  var pads = navigator.getGamepads();
  for(var i = 0; i < pads.length; i++) if(pads[i] && pads[i].connected) return pads[i];
  return null;
}

function axis(pad, i){
  var v = pad.axes[i];
  if(v === undefined) return 0;
  return Math.abs(v) < 0.14 ? 0 : v;      // deadzone: sticks rest off-centre
}
function trigger(pad, i){
  var b = pad.buttons[i];
  if(!b) return 0;
  /* Triggers report a value on most pads and only pressed on some. */
  return b.value !== undefined && b.value > 0 ? b.value : (b.pressed ? 1 : 0);
}

function gatherInput(){
  var th = 0, br = 0, st = 0, hand = false, nos = false;

  if(anyDown(BINDS.throttle) || TOUCH.go) th = 1;
  if(anyDown(BINDS.brake) || TOUCH.brake) br = 1;
  if(anyDown(BINDS.left) || TOUCH.left) st -= 1;
  if(anyDown(BINDS.right) || TOUCH.right) st += 1;
  if(anyDown(BINDS.hand) || TOUCH.hand) hand = true;
  if(anyDown(BINDS.nos) || TOUCH.nos) nos = true;

  var pad = readPad();
  if(pad){
    var pth = trigger(pad, 7), pbr = trigger(pad, 6);
    if(pth > th) th = pth;
    if(pbr > br) br = pbr;
    if(pad.buttons[0] && pad.buttons[0].pressed) th = Math.max(th, 1);
    if(pad.buttons[1] && pad.buttons[1].pressed) hand = true;
    if(pad.buttons[2] && pad.buttons[2].pressed) nos = true;
    var ax = axis(pad, 0);
    if(Math.abs(ax) > Math.abs(st)) st = ax;
    /* d-pad, for pads that report it as buttons 14/15 */
    if(pad.buttons[14] && pad.buttons[14].pressed) st = -1;
    if(pad.buttons[15] && pad.buttons[15].pressed) st = 1;
  }

  INPUT.throttle = clamp(th, 0, 1);
  INPUT.brake = clamp(br, 0, 1);
  INPUT.steer = clamp(st, -1, 1);
  INPUT.hand = hand;
  INPUT.nos = nos;
  return INPUT;
}

/* ------------------------------------------------------------------- save -- */

var SAVE_KEY = 'bigturbos_v1';
var OLD_SAVE_KEYS = ['redline_v1'];   // the game was called Redline until it wasn't
var SAVE = null;

function freshSave(){
  return {
    credits: 12000,
    owned: ['hatch'],          // car keys owned
    car: 'hatch',              // the one being driven
    parts: {},                 // carKey -> {slot: tier}
    looks: {},                 // carKey -> {paint, wheel, spoiler, stripe}
    done: {},                  // eventId -> best position
    best: {},                  // trackKey -> best lap seconds
    champ: {},                 // championship id -> { round, pts, done }
    bestEt: {},                // car key -> best quarter mile
    plate: '',                 // what it says on the numberplate
    kits: [],                  // body kits built in the Workbench
    tune: {},                  // carKey -> Speed Demon dial positions
    dyno: {},                  // carKey -> the best pull it has put down
    freeBuild: true,           // unlimited money: parts and cars cost nothing
    seen: false
  };
}

function loadSave(){
  try {
    var raw = localStorage.getItem(SAVE_KEY);
    /* Carry a save over from a previous name of the game rather than
       quietly handing a returning player an empty garage. */
    if(!raw){
      for(var o = 0; o < OLD_SAVE_KEYS.length; o++){
        var was = localStorage.getItem(OLD_SAVE_KEYS[o]);
        if(was){ raw = was; localStorage.setItem(SAVE_KEY, was); break; }
      }
    }
    SAVE = raw ? JSON.parse(raw) : freshSave();
  } catch(e){ SAVE = freshSave(); }

  /* Anything the save predates gets filled in, so an old save never throws. */
  var f = freshSave();
  for(var k in f) if(!(k in SAVE)) SAVE[k] = f[k];
  if(!Array.isArray(SAVE.owned) || !SAVE.owned.length) SAVE.owned = ['hatch'];
  /* ownsCar, not the owned list: with money switched off every car counts as
     yours, and a save must not snap you back to the hatch on reload. */
  if(!ownsCar(SAVE.car)) SAVE.car = SAVE.owned[0];
  if(typeof SAVE.credits !== 'number' || !isFinite(SAVE.credits)) SAVE.credits = 0;
  return SAVE;
}

function saveNow(){
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch(e){}
}

/* ------------------------------------------------------------------- misc -- */

function $(id){ return document.getElementById(id); }

function show(id){
  var el = $(id);
  if(el) el.classList.add('on');
}
function hide(id){
  var el = $(id);
  if(el) el.classList.remove('on');
}
/* Every overlay in the document, found rather than listed. This was a
   hardcoded array of ids, and adding one screen without remembering to add
   it here left that screen sitting on top of the menu after it closed - the
   kind of list that is only ever wrong once you have stopped looking at it. */
function hideAll(){
  var ovs = document.querySelectorAll('.ov');
  for(var i = 0; i < ovs.length; i++) ovs[i].classList.remove('on');
}

/* A phone or a tablet gets the touch pads; everything else does not, because
   on a desktop they only cover up the road. */
function isTouch(){
  return ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
}
