/* =========================================================================
   4.6  THE GARAGE, ON SCREEN

   Everything here reads from carStats, including the preview. Hovering a
   part shows what it would do by building the stats it would produce and
   drawing the difference - not by looking up a number someone typed into a
   table twice. If the two ever disagreed, the preview would be a lie, and a
   shop that lies about what it sells is worse than no shop.
   ========================================================================= */

var garageSlot = 'engine';       // which tab is open
var garagePreview = null;        // {slot, tier} being hovered

/* The ranges each bar is drawn against. Not the min and max of what exists -
   a bit of headroom at each end so a stock car does not read as empty and a
   fully built one does not peg everything. */
var BARS = [
  { key: 'power', name: 'Power', lo: 60, hi: 440, fmt: function(s){ return Math.round(s.power) + ' kW'; } },
  { key: 'mass', name: 'Weight', lo: 1750, hi: 600, fmt: function(s){ return Math.round(s.mass) + ' kg'; } },
  { key: 'grip', name: 'Grip', lo: 0.85, hi: 2.0, fmt: function(s){ return gripAt(s, 30).toFixed(2) + 'g'; } },
  { key: 'brake', name: 'Brakes', lo: 8, hi: 17, fmt: function(s){ return s.brake.toFixed(1); } },
  { key: 'top', name: 'Top speed', lo: 85, hi: 215, fmt: function(s){ return Math.round(topSpeed(s) * MPS_TO_MPH) + ' mph'; } },
  { key: 'sixty', name: '0-60', lo: 11, hi: 2, fmt: function(s){ var z = zeroTo60(s); return z > 50 ? '--' : z.toFixed(1) + 's'; } }
];

function barValue(key, s){
  if(key === 'top') return topSpeed(s) * MPS_TO_MPH;
  if(key === 'sixty') return zeroTo60(s);
  if(key === 'grip') return gripAt(s, 30);
  return s[key];
}

/* lo may be greater than hi - that is how "less is better" is expressed. */
function barPct(bar, s){
  var v = barValue(bar.key, s);
  return clamp((v - bar.lo) / (bar.hi - bar.lo), 0, 1) * 100;
}

/* ---------------------------------------------------------- the stat bars -- */

function renderStats(host, carKey, parts, previewParts){
  var now = carStats(carKey, parts);
  var next = previewParts ? carStats(carKey, previewParts) : null;
  var html = '';

  for(var i = 0; i < BARS.length; i++){
    var bar = BARS[i];
    var a = barPct(bar, now);
    var b = next ? barPct(bar, next) : a;
    var better = b > a + 0.4, worse = b < a - 0.4;

    /* The ghost is the part of the bar that would be gained or lost. Drawn
       behind the number so the change reads at a glance without having to
       compare two screens. */
    var ghost = '';
    if(next && (better || worse)){
      var from = Math.min(a, b), to = Math.max(a, b);
      ghost = '<div class="ghost' + (worse ? ' down' : '') + '" style="left:' +
              from.toFixed(1) + '%;width:' + (to - from).toFixed(1) + '%"></div>';
    }

    var delta = '';
    if(next){
      var va = barValue(bar.key, now), vb = barValue(bar.key, next);
      var up = bar.hi > bar.lo ? vb > va : vb < va;
      if(Math.abs(vb - va) > 1e-6){
        delta = ' <em class="' + (up ? 'up' : 'dn') + '">' + (up ? '▲' : '▼') + '</em>';
      }
    }

    html += '<div class="stat"><div class="n">' + bar.name + '</div>' +
            '<div class="bar">' + ghost +
            '<div class="fill" style="width:' + Math.min(a, b).toFixed(1) + '%"></div></div>' +
            '<div class="v">' + bar.fmt(next || now) + delta + '</div></div>';
  }

  /* The headline number, because events are gated on it. */
  var r = rating(next || now);
  var rNow = rating(now);
  var cls = classOf(r);
  var shift = next && r !== rNow ? ' <em class="' + (r > rNow ? 'up' : 'dn') + '">' +
    (r > rNow ? '+' : '') + (r - rNow) + '</em>' : '';
  html += '<div class="stat"><div class="n">Rating</div>' +
          '<div class="bar"><div class="fill" style="width:' +
          clamp(r / 1100, 0, 1) * 100 + '%;background:var(--amber)"></div></div>' +
          '<div class="v">' + r + shift + '</div></div>' +
          '<p class="note2">Class <b>' + cls + '</b>' +
          (next && classOf(rNow) !== cls ? ' — this part moves you out of class ' + classOf(rNow) : '') +
          '</p>';

  host.innerHTML = html;
}

/* ------------------------------------------------------------ the garage -- */

function openGarage(){
  hideAll();
  show('ovGarage');
  garagePreview = null;
  drawGarage();
}

function drawGarage(){
  var carKey = SAVE.car;
  var car = CARS[carKey];
  var parts = partsFor(carKey);

  $('gName').textContent = car.name;
  $('gSub').innerHTML = car.desc + '<br><b style="color:var(--amber)">' +
    money(SAVE.credits) + '</b> credits in hand.';

  var preview = null;
  if(garagePreview){
    preview = Object.assign({}, parts);
    preview[garagePreview.slot] = garagePreview.tier;
  }
  renderStats($('gStats'), carKey, parts, preview);

  /* tabs */
  var tabs = '';
  for(var i = 0; i < SLOTS.length; i++){
    var s = SLOTS[i];
    var fitted = tierOf(carKey, s.key);
    tabs += '<button class="tab' + (s.key === garageSlot ? ' on' : '') +
            '" data-slot="' + s.key + '">' + s.name +
            (fitted > 0 ? ' <span style="color:var(--green)">●</span>' : '') + '</button>';
  }
  $('gTabs').innerHTML = tabs;
  Array.prototype.forEach.call($('gTabs').children, function(btn){
    btn.onclick = function(){
      garageSlot = btn.getAttribute('data-slot');
      garagePreview = null;
      drawGarage();
    };
  });

  /* parts in the open tab */
  var slot = slotByKey(garageSlot);
  var fittedTier = tierOf(carKey, garageSlot);
  var html = '<p class="note2">' + slot.blurb + '</p>';
  var selTier = garagePreview ? garagePreview.tier : fittedTier;

  for(var t = 0; t < slot.tiers.length; t++){
    var tier = slot.tiers[t];
    var owned = ownsPart(carKey, garageSlot, t);
    var isFitted = t === fittedTier;
    var afford = SAVE.credits >= tier.cost;

    var cost;
    if(isFitted) cost = '<span class="cost have">Fitted</span>';
    else if(owned) cost = '<span class="cost have">Fit</span>';
    else if(afford) cost = '<span class="cost">' + money(tier.cost) + '</span>';
    else cost = '<span class="cost cant">' + money(tier.cost) + '</span>';

    var marks = (isFitted ? '<span class="chip" style="color:var(--green)">On the car</span>' : '') +
                (!isFitted && owned ? '<span class="chip">Owned</span>' : '');

    html += '<div class="row' + (t === selTier ? ' on' : '') +
            (!owned && !afford ? ' locked' : '') + '" data-tier="' + t + '">' +
            '<div class="grow"><div class="t">' + tier.name + '</div>' +
            '<div class="d">' + tier.d + '</div>' +
            (marks ? '<div style="margin-top:5px">' + marks + '</div>' : '') +
            '</div>' + cost + '</div>';
  }

  /* One explicit button rather than buying on the row tap. Selecting a part
     shows what it would do to the car; a second, deliberate press is what
     spends the money. A list where a mis-tap costs 38,000 credits is not a
     shop, it is a trap - and on a phone there is no hover to preview with. */
  var selOwned = ownsPart(carKey, garageSlot, selTier);
  var selCost = slot.tiers[selTier].cost;
  var label, action = null;
  if(selTier === fittedTier) label = 'Already on the car';
  else if(selOwned){ label = 'Fit the ' + slot.tiers[selTier].name.toLowerCase(); action = 'fit'; }
  else if(SAVE.credits >= selCost){ label = 'Buy for ' + money(selCost); action = 'buy'; }
  else label = money(selCost - SAVE.credits) + ' credits short';

  html += '<div class="btns"><button class="go' + (action ? (action === 'buy' ? ' gr' : '') : ' alt') +
          '" id="btnFit"' + (action ? '' : ' disabled') + '>' + label + '</button></div>';

  $('gList').innerHTML = html;

  Array.prototype.forEach.call($('gList').querySelectorAll('.row'), function(row){
    var t = parseInt(row.getAttribute('data-tier'), 10);
    function select(){
      var want = (t === tierOf(SAVE.car, garageSlot)) ? null : { slot: garageSlot, tier: t };
      /* drawGarage rebuilds these rows under the cursor, which fires
         mouseenter again. Without this guard that is an endless loop. */
      var same = (want === null && garagePreview === null) ||
                 (want && garagePreview && garagePreview.tier === want.tier &&
                  garagePreview.slot === want.slot);
      if(same) return;
      garagePreview = want;
      drawGarage();
    }
    row.onclick = select;
    /* On a desktop, running the mouse down the list previews each one, which
       is the quickest way to compare. Touch gets the same thing from a tap. */
    row.onmouseenter = function(){ if(!('ontouchstart' in window)) select(); };
  });

  var fitBtn = $('btnFit');
  if(fitBtn && action){
    fitBtn.onclick = function(){
      var res = action === 'fit'
        ? { ok: fitPart(SAVE.car, garageSlot, selTier) }
        : buyPart(SAVE.car, garageSlot, selTier);
      if(!res.ok){ flash($('gSub'), 'Not enough credits for that one.'); return; }
      garagePreview = null;
      drawGarage();
      refreshCarPreview();
    };
  }
}

function fromSlot(slotKey, tier){ var o = {}; o[slotKey] = tier; return o; }

function flash(el, msg){
  var old = el.innerHTML;
  el.innerHTML = '<span style="color:var(--red)">' + msg + '</span>';
  setTimeout(function(){ if(el.innerHTML.indexOf(msg) !== -1) el.innerHTML = old; }, 1600);
}

/* ---------------------------------------------------------- the showroom -- */

function openShowroom(){
  hideAll();
  show('ovShow');
  drawShowroom();
}

function drawShowroom(){
  var html = '<p class="note2"><b style="color:var(--amber)">' + money(SAVE.credits) +
             '</b> credits in hand.</p>';

  for(var i = 0; i < CAR_ORDER.length; i++){
    var key = CAR_ORDER[i];
    var car = CARS[key];
    var owned = SAVE.owned.indexOf(key) !== -1;
    var driving = SAVE.car === key;
    var s = carStats(key, owned ? partsFor(key) : {});
    var r = rating(s);
    var afford = SAVE.credits >= car.price;

    var right;
    if(driving) right = '<span class="cost have">Driving</span>';
    else if(owned) right = '<span class="cost have">Drive</span>';
    else right = '<span class="cost' + (afford ? '' : ' cant') + '">' + money(car.price) + '</span>';

    html += '<div class="row' + (driving ? ' on' : '') +
            (!owned && !afford ? ' locked' : '') + '" data-car="' + key + '">' +
            '<div class="grow"><div class="t">' + car.name + '</div>' +
            '<div class="d">' + car.desc + '</div>' +
            '<div style="margin-top:6px">' +
            '<span class="chip cls">Class ' + classOf(r) + '</span>' +
            '<span class="chip">' + Math.round(topSpeed(s) * MPS_TO_MPH) + ' mph</span>' +
            '<span class="chip">0-60 ' + zeroTo60(s).toFixed(1) + 's</span>' +
            '<span class="chip">' + Math.round(s.mass) + ' kg</span>' +
            '</div></div>' + right + '</div>';
  }
  $('showList').innerHTML = html;

  Array.prototype.forEach.call($('showList').querySelectorAll('.row'), function(row){
    var key = row.getAttribute('data-car');
    row.onclick = function(){
      if(SAVE.owned.indexOf(key) !== -1){
        SAVE.car = key;
        saveNow();
      } else {
        var res = buyCar(key);
        if(!res.ok){ flash($('showList'), 'Not enough credits.'); return; }
      }
      drawShowroom();
      refreshCarPreview();
    };
  });
}

/* -------------------------------------------------------------- the looks -- */

function openPaint(){
  hideAll();
  show('ovPaint');
  drawPaint();
}

function drawPaint(){
  var carKey = SAVE.car;
  var l = looksFor(carKey);
  var html = '';

  html += '<h2 style="font-size:22px;margin-top:14px">Paint</h2><div class="swatches">';
  for(var i = 0; i < PAINTS.length; i++){
    html += '<div class="sw' + (l.paint === i ? ' on' : '') + '" data-k="paint" data-i="' + i +
            '" title="' + PAINTS[i].n + '" style="background:#' +
            PAINTS[i].c.toString(16).padStart(6, '0') + '"></div>';
  }
  html += '</div>';

  html += '<h2 style="font-size:22px;margin-top:16px">Wheels</h2><div class="swatches">';
  for(var w = 0; w < WHEELS.length; w++){
    html += '<div class="sw' + (l.wheel === w ? ' on' : '') + '" data-k="wheel" data-i="' + w +
            '" title="' + WHEELS[w].n + '" style="background:#' +
            WHEELS[w].c.toString(16).padStart(6, '0') + '"></div>';
  }
  html += '</div>';

  html += '<h2 style="font-size:22px;margin-top:16px">Stripe</h2><div class="swatches">';
  for(var st = 0; st < STRIPES.length; st++){
    var c = STRIPES[st].c;
    html += '<div class="sw' + (l.stripe === st ? ' on' : '') + '" data-k="stripe" data-i="' + st +
            '" title="' + STRIPES[st].n + '" style="background:' +
            (c === null ? 'repeating-linear-gradient(45deg,#222,#222 5px,#444 5px,#444 10px)'
                        : '#' + c.toString(16).padStart(6, '0')) + '"></div>';
  }
  html += '</div>';

  html += '<div class="row' + (l.spoiler ? ' on' : '') + '" data-k="spoiler" style="margin-top:16px">' +
          '<div class="grow"><div class="t">Spoiler</div>' +
          '<div class="d">Bolted to the bootlid. Does nothing at all for grip — ' +
          'that is what the aero in the garage is for.</div></div>' +
          '<span class="cost have">' + (l.spoiler ? 'On' : 'Off') + '</span></div>';

  $('paintBody').innerHTML = html;

  Array.prototype.forEach.call($('paintBody').querySelectorAll('[data-k]'), function(el){
    el.onclick = function(){
      var k = el.getAttribute('data-k');
      if(k === 'spoiler') l.spoiler = !l.spoiler;
      else l[k] = parseInt(el.getAttribute('data-i'), 10);
      saveNow();
      drawPaint();
      refreshCarPreview();
    };
  });
}

/* ------------------------------------------------------------ the career -- */

function openEvents(){
  hideAll();
  show('ovEvents');
  drawEvents();
}

function drawEvents(){
  var carKey = SAVE.car;
  var r = rating(statsOf(carKey));
  $('evSub').innerHTML = 'Driving the <b>' + CARS[carKey].name + '</b> — rating ' + r +
    ', class ' + classOf(r) + '. <b style="color:var(--amber)">' + money(SAVE.credits) +
    '</b> credits.';

  var html = '';
  for(var i = 0; i < EVENTS.length; i++){
    var ev = EVENTS[i];
    var open = eventOpen(i);
    var best = SAVE.done[ev.id];
    var eligible = r <= ev.max;
    var tr = TRACKS[ev.track];

    var right;
    if(!open) right = '<span class="cost cant">Locked</span>';
    else if(!eligible) right = '<span class="cost cant">Over class</span>';
    else right = '<span class="cost">' + money(ev.prize[0]) + '</span>';

    var badge = best !== undefined
      ? '<span class="chip" style="color:var(--green)">Best: P' + best + '</span>' : '';

    html += '<div class="row' + (!open || !eligible ? ' locked' : '') +
            '" data-ev="' + i + '">' +
            '<div class="grow"><div class="t">' + ev.name + '</div>' +
            '<div class="d">' + ev.d + '</div>' +
            '<div style="margin-top:6px">' + badge +
            '<span class="chip">' + tr.name + '</span>' +
            '<span class="chip">' + ev.laps + ' laps</span>' +
            '<span class="chip cls">' + (ev.max > 2000 ? 'Open' : 'Max ' + ev.max) + '</span>' +
            '</div></div>' + right + '</div>';
  }
  $('evList').innerHTML = html;

  Array.prototype.forEach.call($('evList').querySelectorAll('.row'), function(row){
    var i = parseInt(row.getAttribute('data-ev'), 10);
    row.onclick = function(){
      var ev = EVENTS[i];
      if(!eventOpen(i)){ flash($('evSub'), 'Finish the one before it first.'); return; }
      if(rating(statsOf(SAVE.car)) > ev.max){
        flash($('evSub'), 'Your car is over the class limit for this one.');
        return;
      }
      openGrid(ev);
    };
  });
}

/* ---------------------------------------------------------- the pre-race -- */

var pendingEvent = null;

function openGrid(ev){
  pendingEvent = ev;
  hideAll();
  show('ovGrid');

  var tr = TRACKS[ev.track];
  $('gridName').textContent = ev.name;
  $('gridSub').innerHTML = '<b>' + tr.name + '</b> — ' + tr.desc +
    '<br>' + ev.laps + ' laps, ' + (ev.field + 1) + ' cars. Win pays <b style="color:var(--amber)">' +
    money(ev.prize[0]) + '</b>, second ' + money(ev.prize[1]) + ', third ' + money(ev.prize[2]) + '.';

  renderStats($('gridStats'), SAVE.car, partsFor(SAVE.car), null);

  var best = SAVE.best[ev.track];
  $('gridNote').textContent = best
    ? 'Your best lap here: ' + fmtTime(best)
    : 'You have not set a lap here yet.';
}
