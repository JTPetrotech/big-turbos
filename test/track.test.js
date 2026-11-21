/* The track's distance-along-the-lap number underpins lap counting, race
   position and the whole AI, so it gets checked before anything leans on it. */
'use strict';

const H = require('./harness');

const core = H.read('10-core.js');
const track = H.read('20-track.js');

const ctx = H.makeContext();
H.run(ctx, H.grab(core, ['clamp', 'lerp', 'sign', 'dist2', 'angDiff', 'hash01']));
H.run(ctx, 'var SPACING = 4;');
H.run(ctx, H.grabVar(track, ['TRACKS']));
H.run(ctx, H.grab(track, ['catmull', 'resample', 'stripPoints', 'buildTrack', 'nearest', 'finishNearest']));

console.log('\nTRACK');

/* ---------------------------------------------------------- even spacing -- */

const t = ctx.buildTrack('ring');
H.ok(t.n > 80, 'the ring resamples into a usable number of points', 'n=' + t.n);

let minSeg = Infinity, maxSeg = 0;
for(const p of t.pts){ if(p.seg < minSeg) minSeg = p.seg; if(p.seg > maxSeg) maxSeg = p.seg; }
/* Every gap should be SPACING apart. The one exception is the closing gap
   back to the start, which is whatever is left over. */
H.ok(maxSeg < 4.2, 'no sample is further than ~4 m from the next', 'max=' + maxSeg.toFixed(2));
H.ok(minSeg > 1.0, 'the closing seam is not a near-duplicate point', 'min=' + minSeg.toFixed(2));

/* ------------------------------------------------- all three tracks build -- */

for(const key of Object.keys(ctx.TRACKS)){
  const tr = ctx.buildTrack(key);
  const spread = tr.pts.reduce((m, p) => Math.max(m, p.seg), 0);
  H.ok(tr.total > 400 && spread < 4.3,
       key + ' builds a sane lap', Math.round(tr.total) + ' m');
}

/* ------------------------------------------------------- progress is sane -- */

/* Standing on a centreline point should report that point's own distance. */
let worst = 0;
for(let i = 0; i < t.n; i += 7){
  const p = t.pts[i];
  const got = ctx.nearest(t, p.x, p.z, null);
  worst = Math.max(worst, Math.abs(got.along - p.cum));
}
H.ok(worst < 0.5, 'standing on the line reports that point on the lap',
     'worst drift ' + worst.toFixed(3) + ' m');

/* Progress must increase monotonically all the way round and come back to
   zero - a lap counter built on a number that jumps would miscount. */
let backwards = 0, prev = ctx.nearest(t, t.pts[0].x, t.pts[0].z, null).along;
for(let i = 1; i < t.n; i++){
  const p = t.pts[i];
  const got = ctx.nearest(t, p.x, p.z, i - 1).along;
  if(got < prev - 0.001) backwards++;
  prev = got;
}
H.ok(backwards === 0, 'distance along the lap never goes backwards',
     backwards + ' reversals');

/* -------------------------------------------------------------- lateral -- */

/* Step off the centreline to the right by a known amount and the signed
   lateral offset should report it. This is what the off-track penalty and
   the grid spacing both read. */
const p10 = t.pts[10];
const rx = Math.cos(p10.dir), rz = -Math.sin(p10.dir);
const right = ctx.nearest(t, p10.x + rx * 5, p10.z + rz * 5, 10);
H.near(right.lateral, 5, 0.25, 'five metres right reads as +5');
const left = ctx.nearest(t, p10.x - rx * 4, p10.z - rz * 4, 10);
H.near(left.lateral, -4, 0.25, 'four metres left reads as -4');

/* ------------------------------------------------------ the hint shortcut -- */

/* The hinted search exists for speed, but it must agree with the honest
   full scan or cars would track the wrong part of the circuit. */
let mismatch = 0;
for(let i = 0; i < t.n; i++){
  const p = t.pts[i];
  const jitterX = p.x + (ctx.hash01(i) - 0.5) * 6;
  const jitterZ = p.z + (ctx.hash01(i + 99) - 0.5) * 6;
  const hinted = ctx.nearest(t, jitterX, jitterZ, i);
  const honest = ctx.nearest(t, jitterX, jitterZ, null);
  if(Math.abs(hinted.along - honest.along) > 0.01) mismatch++;
}
H.ok(mismatch === 0, 'the hinted search agrees with a full scan everywhere',
     mismatch + ' disagreements');

/* A stale hint on the far side of the circuit must still find the truth. */
const far = ctx.nearest(t, t.pts[5].x, t.pts[5].z, Math.floor(t.n / 2));
H.near(far.along, t.pts[5].cum, 0.5, 'a stale hint still lands on the right point');

/* -------------------------------------------------------------- curvature -- */

const curves = t.pts.map(p => p.curve);
H.ok(Math.max.apply(null, curves) > 0.012, 'corners register as curved');
H.ok(Math.min.apply(null, curves) < 0.006, 'straights register as straight');

H.done();
