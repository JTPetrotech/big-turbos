# Redline

Arcade racing with a garage that matters. One HTML file, no install, no
network, nothing to buy with real money.

Open `index.html` and drive.

## The idea

Most racing games with a parts shop let you buy numbers. The numbers go up,
the car gets faster, and the shop is really just a progress bar with prices
on it.

Here every part changes a value the driving model actually reads, and the
expensive ones buy a **trade** rather than a straight win:

| Part | What it gives you | What it costs you |
|---|---|---|
| Aero | Grip that grows with speed | Real top speed |
| Short gears | Leaps out of corners | Runs out of road |
| Long gears | Enormous down a straight | Lazy away from a stop |
| Stripped shell | Quicker everywhere | The back end gets nervous |
| Big turbo | +42% once it is spinning | Nothing at all below 58 mph |

So the garage is a set of decisions rather than a queue. A car built for
Ridgeback is the wrong car for Dockside.

The preview in the garage is produced by the same `carStats()` call the
physics uses — not a second table someone typed the numbers into twice. If
it says a part adds 12 kW, the car gets 12 kW.

## Driving

Velocity is split into forward and sideways components in the car's own
frame. The engine and brakes work on the first, tyre friction on the second,
and **steering rotates the body, not the momentum**. That one choice is why
grip, mass and corner speed all interact the way a driver expects: turn in
and the shell points somewhere the velocity does not, the tyres fight the
difference, and when they cannot fight it any more you are sliding. There is
no separate "drift mode" — it falls out of the same two lines.

Units are real: metres, seconds, kilograms, newtons. The stock hatch does
0–60 in 9.3s and tops out at 102 mph, because 85 kW pushing 1,010 kg is what
that does.

## Controls

| | |
|---|---|
| Throttle | `W` / `Up`, or the right trigger |
| Brake, then reverse | `S` / `Down`, or the left trigger |
| Steer | `A` `D` / `Left` `Right`, or the left stick |
| Handbrake | `Space`, or `B` |
| Pause / restart | `P` or `Esc` / `R` |

Phones get on-screen pads. Gamepads work, but a browser hides a pad until a
button is pressed on it, so press one.

## Building

```
node build.js
```

Concatenates `parts/*` into `index.html` with three.js and both fonts
inlined. The result has **no external references** — it runs off a memory
stick, off a Raspberry Pi with the network unplugged, or from a phone's home
screen in a tunnel.

```
parts/00-head.html    shell, styles, every overlay
parts/10-core.js      state, input, save
parts/20-track.js     spline tracks, scene, the progress lookup
parts/30-cars.js      five silhouettes, built from boxes at runtime
parts/40-drive.js     the driving model and the AI
parts/45-garage.js    cars, parts, stats, economy, career
parts/46-garage-ui.js the garage on screen
parts/50-loop.js      race loop, camera, HUD, wiring
```

## Tests

```
node test/track.test.js
node test/garage.test.js
node test/drive.test.js
```

No framework — the game ships as one file with no build step beyond
concatenation, and a test runner would be the only dependency in the project.
The harness lifts functions out of the parts and runs them in a bare context,
so the driving model is tested without a browser or a GPU.

`drive.test.js` runs **whole races headlessly** and checks the results are
the ones a driver would expect: every car finishes every track, a quicker car
beats a slower one, a built coupe beats an identical stock one, and one set
of better tyres is enough to win a race. That last check is the one that
matters — it is the difference between a shop that sells numbers and a shop
that sells lap time.

It also checks you can always get going again: that the brake reverses you
out from a standstill, that a car stopped on the grass can drive back to the
road (while the grass is still much slower than the road), and that a car
wedged nose-first into the barrier is not stuck there for good.

`serve.js` is not part of the game — it serves the folder on
`http://localhost:8123` so the game can be played in a browser that will not
open a `file://` page. The game itself still opens straight from disk.

## Saving

`localStorage`, under `redline_v1`. Credits, cars, parts, paint, career
progress and best laps per track. Nothing leaves the device.

## Money

There is none. Credits are earned by driving and only by driving. There is no
shop, no currency, no ads, and nothing that can be bought with a card — in
this game or in any of the others here.
