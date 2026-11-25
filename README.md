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
| Quad turbo | +74% once it is spinning | Nothing at all below 69 mph |
| Supercharger | +30% from a standstill | Less up top, and 38 kg of it |
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

## Speed Demon

The workshop, off the main menu: a rolling road, three dials and the
Workbench. None of it costs anything, because none of it is a part — a dial
is your own evening with a spanner.

**The rolling road** draws how hard the wheels can push against how fast the
car is going. Red is the engine doing the pushing, amber is where it has more
to give and the tyres will not take it, and blue is the air and the road
pushing back. The shaded gap between the two is the only thing that
accelerates the car, and where it closes is as fast as it will ever go.

It is thrust on the vertical axis rather than horsepower against rpm, for an
honest reason. There are no gear ratios in this model to put rpm on an axis
with, and the engine holds the same power at any road speed once it is
spinning, so a power line would be a flat line that told you nothing. Thrust
is that same power divided by speed, and the shape of it is the shape of the
car: a flat ceiling where the tyres cannot take any more, a long fall where
they can, and a cliff at the rev limiter.

**The dials** are finer than anything in the parts list, and each one gives
with one hand and takes with the other:

| | Buys | Costs |
|---|---|---|
| Final drive | Thrust everywhere | Top speed |
| Boost pressure | More of it | It arrives later |
| Rake | Downforce | Drag |

Turning one redraws the graph with the untouched car behind it as a dashed
line, so the trade is something you can see rather than something you are
told. They go through `carStats` like everything else, which means the dyno,
the garage, the class rating and the car that turns up on the grid are all
reading one build. A tune that made you quicker without moving your rating
would be a way of sneaking an S-class car into a club race, so it moves your
rating — and closing that hole turned up an older one, where fitting short
ratios made a car quicker everywhere and *lowered* its rating, because the
only gearing the rating could see was the top speed it gave away.

A test fits every step of every dial and insists each one is both better at
something and worse at something. The first draft of the rake dial failed it:
sitting the car level took drag away and cost nothing.

## The Workbench

Four body kits come off the shelf. The Workbench is where you make your own:
a front splitter, arches, side skirts, a wing and a scoop, each with its own
steps, named and saved to the garage for every car you own. Twelve slots,
and scrapping one puts any car wearing it back to standard rather than
quietly dressing it in the next kit along.

The car in front of you wears the draft while you build it, and it wears it
through exactly the same code path a saved kit uses — so what you are looking
at is the kit, not an impression of it.

None of it is worth a single newton. Splitters and wings here are shape, and
the aero that actually grips is a part in the garage with a top speed
penalty attached. A test puts the wildest kit the bench can produce onto a
car and checks `carStats` does not move, because a body kit that quietly
added grip would make the whole garage a liar.

## The cars

Sixteen of them, all real cars, and the figures are the real ones: kilowatts, kilograms,
and a drag area that a two-and-a-half tonne truck really does have. Nothing
is scaled to feel fair.

Every card in the showroom carries a picture of the car it is selling, and the
picture is a photograph rather than an icon: the same `buildCar` the race uses,
the same body, the same paint and wheels you fitted, shot three-quarters on
with a long lens from eight metres away. There is no second drawing of a car
anywhere that could drift out of step with the first — the same reason the
garage reads its figures out of `carStats` instead of a typed table. Every car
is shot from the same spot rather than zoomed to fill its card, so the pickup
takes up most of the width of its picture and the hatchback about three fifths
of it, which is how they compare in a car park. The results sheet after a race
shows the same pictures, each car in the paint it actually raced in.

They cost about three milliseconds each, which is cheap enough not to need
caching, and they are filled in one per frame so that opening the showroom
never stalls. Deliberately not `toDataURL`: encoding a PNG nothing will ever
save was forty-three of the original sixty milliseconds, and copying the
pixels into a canvas on the card takes one.

| | kW | kg | 0-60 | 1/4 mile |
|---|---|---|---|---|
| Honda Civic Si | 92 | 1,046 | 8.8s | 16.65s @ 78 mph |
| Toyota GR86 | 174 | 1,270 | 5.6s | 14.32s @ 93 mph |
| Ram 1500 TRX | 523 | 2,900 | 4.8s | 13.58s @ 100 mph |
| Toyota Supra RZ | 239 | 1,570 | 4.5s | 13.27s @ 102 mph |
| Nissan Skyline GT-R R34 | 206 | 1,560 | 5.0s | 13.72s @ 97 mph |
| Mazda RX-7 | 188 | 1,280 | 4.7s | 13.43s @ 100 mph |
| Plymouth Barracuda 426 Hemi | 317 | 1,655 | 4.3s | 13.05s @ 104 mph |
| Audi Sport Quattro | 225 | 1,298 | 4.4s | 13.27s @ 100 mph |
| Mitsubishi Lancer Evo IX | 206 | 1,410 | 4.5s | 13.28s @ 100 mph |
| Dodge Durango Hellcat | 529 | 2,470 | 4.1s | 12.75s @ 109 mph |
| Toyota GR Supra | 285 | 1,540 | 3.8s | 12.50s @ 109 mph |
| Porsche 911 Turbo 3.6 | 265 | 1,470 | 3.9s | 12.43s @ 110 mph |
| Dodge Charger Hellcat | 527 | 2,050 | 3.6s | 12.07s @ 116 mph |
| Dodge Challenger Hellcat | 527 | 1,975 | 3.5s | 11.92s @ 117 mph |
| Lamborghini Aventador SV | 552 | 1,525 | 2.6s | 10.63s @ 130 mph |
| Ultima GTR | 395 | 930 | 2.4s | 10.27s @ 134 mph |

Nobody typed those quarter-mile times in. They are what the driving model
produces when you point each car down the strip, and they land within a few
tenths of the real cars these are drawn from.

The turbo cars carry their induction from the factory, so a Supra RZ is
already making boost from 22 mph before you fit anything. The supercharged
ones have no lag at all, and a great deal of power instead.

The five cheapest used to be invented cars with invented numbers, kept out
of this table because there was nothing to check them against. They are real
cars now, and so are their weights and their power, which is why they are in
the table with everything else.

They are drawn at runtime out of eight-cornered panels rather than boxes,
because no panel on a car is a box: a body tucks under at the sills and
pinches in towards the nose, and a greenhouse leans in at the roof and
rakes back hard at the windscreen. The heights are the real ones too. They
were not - a hatchback stood 1.08 m when the car it is drawn from stands
1.45, and the whole showroom was squashed by a quarter. The two trucks were
the only things built to the right height, which is exactly why they were
the only things that looked like vehicles.

## How it looks

Low-poly, deliberately, and none of the work below is about adding polygons.

**The cars.** A headlight is a dark housing sunk into the nose, a lens
sitting proud in it and a lit strip under that, because a headlight on a
real car is a hole in the bodywork with something shiny at the bottom of
it — as one flat bright rectangle the whole car read as a toy. Grilles are
drawn rather than built, the flanks carry door shuts and a handle on each
door, and the rocker panel is body-coloured, which it is on nearly every
real car and which stopped every car looking like it was sitting in its own
shadow.

**The wheels** went the other way, from five meshes each to two. A wheel is
the one part of a car that is nearly flat and seen nearly face-on, so it is
the one part where a picture does the job properly: five spokes with the
light falling off down each, lug nuts, a brake disc turning behind them and
a caliper over it, all drawn once into a canvas per rim colour. Twenty
meshes a car became eight, and it looks far better than the geometry did.

**The paint reflects something.** Six 32-pixel canvases make a cube of sky,
horizon and ground, and that is the difference between a red shape and a red
car. It is not really about shininess: a specular highlight is one bright
spot where the sun is, but a car in daylight wears a dark band of road along
its lower half and a pale band of sky along its upper, with the line between
them running down the shoulder — and that band moves as the car turns.
Nothing about a single light can produce it. There is a fill light opposite
the sun as well, the way a photographer puts a reflector opposite the key,
so the shaded flank of a car is still the colour you are being sold.

**The body leans.** It rolls away from a corner, dips its nose under
braking and sits back on the power. Cosmetic — every force was already
resolved before the body moves — but not invented: the lean is driven by the
actual cornering force the tyres are making, so a corner that is genuinely
harder leans the car further and a better set of tyres leans it further
still. About four degrees at a g, taken up over a fifth of a second, because
the delay is the part you feel. The braking dip is nearly twice the
acceleration squat, which is also true of cars.

**The sky** had its bright end buried. The dome's texture runs from the
zenith at the top to the point under your feet at the bottom, which puts the
horizon exactly halfway down it — and every bright stop in the old gradient
sat between 0.78 and 1.0, below the horizon and therefore hidden behind the
ground. The visible sky came entirely from the top half: `#04060b` to
`#0a1020`, a midnight sky over grass lit at noon. It is now blue overhead
and hazy at the horizon, in the same colour the fog is set to, so distance
fades into sky instead of into a band of something else. The sun's glow is
painted in from the same vector the light uses, so the bright patch up there
and the highlight on a bonnet agree with each other, and there is cloud.

All of it together is about 60 draw calls and 15,000 triangles for a car on
a track, which is less than the game drew before the wheels were rewritten.

## The noise

Every sound in the game is made up on the spot out of oscillators and
filtered noise. There is not one audio file, which is how the whole thing
is still a single page with nothing to fetch — but synthesis is also the
only way to get it right here, which is the better reason. A sample is one
engine at one speed: it has to be pitched up and down and looped, the loop
is audible, and it cannot know that this particular car is a flat six at
6,700 rpm with a turbo on it. An engine built from its own firing frequency
can.

So every car carries a **cylinder count and a redline**, both real, and the
note is built from them. A four-stroke fires each cylinder once per two
turns of the crank, so the oscillator runs at the full cycle — rpm/120 —
and harmonic *n* lands on the *n*/2-th order of the engine. That factor of
two is the whole trick: it is what gives a cross-plane V8 somewhere to put
the half-orders that make it burble, which an oscillator at crank speed
simply cannot express. Harmonic *cyl* is the firing frequency, its
multiples are the overtones, and how much sits in between is how lumpy the
engine is. An inline six and a flat six are balanced, a V12 is two of those
end to end, a big V8 is the opposite and is loved for it, and an inline five
cannot balance at all — which is the entire reason an Audi five-pot
warbles.

Measured rather than hoped for: the Civic's peak sits on 260 Hz at its
7,800 redline, which is exactly rpm/120 × 4, with the overtones at 520, 780
and 1040.

On top of that, each driven from a number the physics already had:

| | where it comes from |
|---|---|
| Induction roar | filtered noise, opening with throttle and revs |
| Turbo whistle | the boost `carStats` works out, silent below the threshold |
| Blow-off | boost that was there a moment ago and a throttle that is not |
| Supercharger | a whine geared to the crank, not to the boost — which is how you tell one from a turbo with your eyes shut |
| Tyres | the slip the tyre model produced, and a different note on grass |
| Wind | rises with the square of road speed |
| Nitrous | a hiss while you hold it |

A part you cannot hear is at least a part that is not lying to you: fit a
big turbo and there is genuinely nothing below 58 mph, then a whistle, then
a chirp every time you lift.

**The gearbox got fixed on the way.** The rev counter spread six gears
evenly across the car's top speed and read the revs off each gear's own
slice, which put you at a tenth of the redline in sixth at 85 per cent of
top speed — pulling away like a tractor. Top gear is geared so the redline
*is* the top speed, so in gear *g* of six the engine redlines at (g+1)/6 of
the car's top speed and sits at the same fraction below that. Which gives
the right-sized drop at every change too: first to second lands at 56 per
cent of the redline, fifth to sixth at 85. Big drops low down, small ones
high up. The needle and the noise read the same `revsOf`, so they cannot
disagree.

Sound is on by default with a volume slider under **Sound** in the menu, it
starts only once you have touched something because every browser insists,
and it goes quiet when you leave a race or switch tabs.

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

Each track is a road ribbon with a run-off either side of it, a barrier
standing exactly where the physics puts its wall, and something beyond
that worth passing: pines at the Ring and the Ridge, stacked shipping
containers at the docks, floodlight pylons down the strip. All of it is
instanced, so a hundred and fifty trees cost two draw calls, and all of it
is placed off the same hash the AI uses, so a lap looks the same every
time you drive it.

**Free roam** has no clock, no grid and no barrier. The road is a suggestion
and the 1.3 km field around it is the point. It is also the only place a lift
kit earns its money.

**Speed Demon** is not a race at all. It is the workshop - the rolling
road, the dials and the Workbench - and it has its own section above.

## Driving

Velocity is split into forward and sideways components in the car's own
frame. The engine and brakes work on the first, tyre friction on the second,
and **steering rotates the body, not the momentum**. That one choice is why
grip, mass and corner speed all interact the way a driver expects: turn in
and the shell points somewhere the velocity does not, the tyres fight the
difference, and when they cannot fight it any more you are sliding. There is
no separate "drift mode" — it falls out of the same two lines.

Units are real: metres, seconds, kilograms, newtons. The stock hatch does
0–60 in 8.8s and tops out at 98 mph, because 92 kW pushing 1,046 kg is what
that does.

**The handbrake** locks the back wheels, and all three things that follow
from that have to happen or it is not a handbrake. It was in the game from
the start as `grip *= 0.42` applied to the whole car, which is less grip at
both ends - and a car with less grip at both ends ploughs rather than
pivots. You got understeer and a longer stopping distance, which is the
opposite of what the lever is for.

Now: the lateral grip goes, two locked wheels drag the car down at about a
third of what the brake pedal manages with four, and the rotation term is
scaled so the back is loose however planted the car normally is. That last
one is the one that was missing. The term that rotates a sliding car is
scaled by `1 - stability`, which for a sorted car is nearly nothing, so
pulling the lever in a Skyline took the grip away and the car slid wide
without ever coming round. The same corner that gave 88 degrees of rotation
now gives 150, and the Skyline 92 becomes 161.

Scaled, incidentally, and not capped: `Math.min(stability, 0.4)` was written
here first and flattened every car in the game to identical looseness the
moment the lever came up, which the weight-tier test noticed immediately.
The back two wheels stop turning while the front two carry on, and the
tyres scrub whether or not you are sliding sideways, because locked wheels
do.

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
parts/30-cars.js      sixteen silhouettes, drawn from tapered panels
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

It checks which way is right. The steering was inverted for a long time and
no test here noticed, because the car, the track and the AI all agreed with
one another - what they disagreed with was the camera, and nothing had ever
asked the camera anything. So the test works out the camera own idea of
"right" the way three.js does, from the chase camera eye and target, and
insists the car goes that way when the right key is held.

And it checks that the top speed the garage prints is the one the car
reaches. Every car and every gearbox is walked out to terminal velocity
with the forces the race loop uses, and the printed figure has to be within
a mile an hour of where it settles. It used to be about eight mph out on
every car in the game: the number on the card was the ceiling the gearing
sets, and the rev limiter fades the last few m/s out from under the car
before it ever gets there.

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

A save keeps a paint as a number, so the list it counts along has to be the
same list every time the game starts. It was not: a car's own colour used to
be appended to the paint shop the first time that car was asked about, which
depended on which cars you had looked at, so a number written down in one
session pointed at a different colour — or off the end of the list, and so at
Signal red — in the next. The shop is now the sixteen colours it is written
down as and nothing else, and a car's own colour is slot sixteen of its own
picker, built fresh each time it is drawn. There is a test that the shop never
grows and that no car ever saves a number past the end of it.

## Money

There is no real money in this anywhere. Nothing can be bought with a card,
there are no ads, no premium currency, no timers to skip and nothing to top
up — in this game or in any of the others here. A GitHub Pages site could not
take a payment if it wanted to, and it does not want to.

In-game money is **unlimited, out of the box**. Every part and every car is
simply there. The garage is the game and the point of it is trying
combinations, not saving up for them, so by default nothing stands between
you and a quad-turbo wide-body truck.

Next to the money, in the garage and in the showroom, is a switch that turns
the earning game back on: prices, prize money, and a side bet before a career
race where you can stake what you are holding at odds set by how far the
field outclasses your car. Win and it pays, finish anywhere else and the
stake is gone. That bet is the only way the number ever goes down, which is
the whole reason it exists — prize money alone means the figure only rises,
and a figure that only rises stops meaning anything after an hour.

Nothing fitted while money is off is recorded as bought, so switching the
earning game back on hands you the garage you actually paid for rather than
everything you tried for free. The two modes do not contaminate each other.

Worth saying plainly, because it is a real trade and not a free win: with
money unlimited the career stops being a ladder. Nothing is withheld, so
nothing is earned, and the side bet disappears because a stake you cannot
lose is not a stake. What is left is the driving and the garage, which is
most of the game and the best part of it. The switch is there because which
of those two you want depends on who is holding the controller.
