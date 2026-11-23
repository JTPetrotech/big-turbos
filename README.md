# Big Turbos

Arcade racing with a garage that matters. One HTML file, no install, no
network, nothing to buy with real money.

Open `index.html` and drive.

The title screen and the pause menu both have a way back to The Arcade, the
hub the games live on at `https://jtpetrotech.github.io/`. It is a plain
`<a href>` rather than a scripted button, so the way out still works even if
the script never runs - which is the one failure this game has actually had.

(It was called Redline until it grew a drag strip. An old save is carried
over automatically the first time you open it.)

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
| Lift kit | Grip in a field, and the look | Grip, top speed and calm on tarmac |
| Nitrous | +62% while you hold it | 34 kg carried every lap, and it runs out |
| Spool diff | Drives off the apex | Will not turn into one |
| Race clutch | 0.15-0.3s off the line | Nothing at all after that |

So the garage is a set of decisions rather than a queue. A car built for
Ridgeback is the wrong car for Dockside.

A lift kit is only sold for the two trucks, and it is the clearest trade in
the game: a 6in lift on 37s gives away 16% of the truck's grip and a good
deal of its top speed, and in exchange it is the only thing here that can
cross a field in a hurry. There is nowhere to use that in a race. There is
free roam.

The preview in the garage is produced by the same `carStats()` call the
physics uses — not a second table someone typed the numbers into twice. If
it says a part adds 12 kW, the car gets 12 kW.

## The cars

Sixteen of them. The five originals, a pair of turbo coupes, the JDM turbo
stuff, a rear-engined handful, a supercar, and the big supercharged lot:

| | kW | kg | 0-60 | 1/4 mile |
|---|---|---|---|---|
| Apex A80 Twin-Turbo | 239 | 1,570 | 4.5s | 13.27s @ 102 mph |
| Apex A90 | 285 | 1,540 | 3.8s | 12.50s @ 109 mph |
| Hellion 6.2 Coupe | 527 | 1,975 | 3.5s | 11.92s @ 117 mph |
| Hellion 6.2 Sedan | 527 | 2,050 | 3.6s | 12.07s @ 116 mph |
| Hellion Wagon | 529 | 2,470 | 4.1s | 12.75s @ 109 mph |
| Warhawk TRX | 523 | 2,900 | 4.8s | 13.58s @ 100 mph |
| Kaido 13B | 188 | 1,280 | 4.7s | 13.43s @ 100 mph |
| Lancet RS | 206 | 1,410 | 4.5s | 13.28s @ 100 mph |
| Nakagawa R34 | 206 | 1,560 | 5.0s | 13.72s @ 97 mph |
| Pelican 930 | 283 | 1,470 | 3.7s | 12.18s @ 113 mph |
| Toro SV | 471 | 1,525 | 2.8s | 11.08s @ 124 mph |

Nobody typed those quarter-mile times in. They are what the driving model
produces when you point each car down the strip, and they land within a few
tenths of the real cars these are drawn from.

The turbo cars carry their induction from the factory, so an A80 is already
making boost from 22 mph before you fit anything. The supercharged ones have
no lag at all, and a great deal of power instead.

## The modes

**Career** and **quick race** are the laps. Two more are not:

**Drag strip** is a quarter mile, two lanes and a set of lights. Three ambers
then green; leaving early is a red light and the card says so. Elapsed time
runs from the car rolling off the line, not from the green, because that is
how it is actually measured - reaction time is its own number, and adding the
two is what decides who won.

**Championships** are seasons rather than one-offs: four rounds against the
same three rivals in the same cars every round, ten points for a win, and a
standings table that is about people you recognise by round three.

**Free roam** has no clock, no grid and no barrier. The road is a suggestion
and the 1.3 km field around it is the point. It is also the only place a lift
kit earns its money.

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

It checks that nitrous is a budget rather than a button: that holding it is
worth over a second down the strip, that fitting it and *not* using it makes
you slower than not fitting it at all (you carried the bottle for nothing),
that it empties, and that it does nothing off the throttle. It checks a spool
puts power down and gives away steering to do it, and that every body kit
leaves `carStats` untouched — a kit that quietly added grip would make the
whole garage a liar.

It also checks the two new modes: that a quarter mile flat out holds its lane
to within a millimetre, that the ETs stay in the range the real cars run,
that free roam really has no barrier but still has an edge of the world, and
that a lift kit grips in a field where the same truck stock slides.

And it reads this README back. Every figure in the car table above - power,
weight, 0-60 and the quarter mile - is measured again from the model and
checked against what is printed here, along with the numbers quoted in the
prose and in the parts table. The claim that nobody typed those times in is
only true while that passes, so it is now a test rather than a promise:
retune a car and the suite fails until this file is corrected.

`serve.js` is not part of the game — it serves the folder on
`http://localhost:8123` so the game can be played in a browser that will not
open a `file://` page. The game itself still opens straight from disk.

## Saving

`localStorage`, under `bigturbos_v1` - a `redline_v1` save is imported once
and left alone after that. Credits, cars, parts, paint, career progress, best
laps per track and your best quarter mile per car. Nothing leaves the
device.

## Money

There is no real money in this anywhere. Nothing can be bought with a card,
there are no ads, no premium currency, no timers to skip and nothing to top
up — in this game or in any of the others here. A GitHub Pages site could not
take a payment if it wanted to, and it does not want to.

What there *is* is in-game money, in dollars, won by driving and only by
driving. The one way it goes down is the side bet: before a career race you
can stake up to what you are holding, at odds set by how far the field
outclasses your car. Win and it pays; finish anywhere else and the stake is
gone. Prize money alone means the number only ever rises, which makes it
meaningless after an hour — being able to lose it is what gives the rest of
the garage its weight.
