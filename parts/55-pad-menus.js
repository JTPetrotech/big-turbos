
/* ---- controller in the menus ----
   05-padnav.js drives the menus and the garage with a pad. In a race the
   pad is the car, so it stands aside; Start pauses and unpauses. */
PadNav.active = function(){ return G.mode !== 'race'; };
PadNav.onStart = function(){ togglePause(); };
