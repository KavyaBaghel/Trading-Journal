/* Journall loading screen behavior.
   Self-managing: it watches whether #firebaseAuthLoading is really on screen, starts when it appears and
   stops (timers, animation frame, listeners) when it is hidden. It never touches auth code and creates no
   globals. It only READS the gate status text so it can show an honest message while logging out. */
(function () {
  'use strict';

  var root = document.getElementById('firebaseAuthLoading');
  if (!root) return;

  var gate = document.getElementById('firebaseAuthGate');
  var textEl = document.getElementById('firebaseAuthLoadingText');
  var markEl = document.getElementById('loadingMark');
  var tiltEl = document.getElementById('loadingTilt');
  var bgLayer = root.querySelector('.journall-loading-bg');
  var canvas = root.querySelector('.journall-bg-canvas');
  var wordmarkEl = root.querySelector('.journall-loading-wordmark');
  if (!textEl || !markEl || !tiltEl || !bgLayer || !canvas || !wordmarkEl || !canvas.getContext) return;

  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  // ---------------------------------------------------------------- messages
  var NORMAL_MESSAGES = ['Connecting...', 'Syncing your trades...', 'Loading your dashboard...'];
  var LONG_WAIT_QUOTES = [
    '"Patience is a trading position too."',
    '"The market rewards discipline, not speed."',
    '"Every great trader was once a beginner who refused to quit."',
    '"Slow connections don\u2019t break good plans."',
    '"Consistency compounds \u2014 in trading and in waiting."'
  ];
  var LOGGING_OUT_TEXT = 'Logging out securely...';
  var FALLBACK_TEXT = 'Loading Journall...';
  var LONG_WAIT_MS = 10000;
  var NORMAL_STEP_MS = 12000;
  var LONG_STEP_MS = 16000;
  var FADE_MS = 350;

  var running = false;
  var startedAt = 0;
  var normalIndex = 0;
  var quoteIndex = 0;
  var phase = 'normal';
  var stageTimer = null;
  var fadeTimer = null;
  var shownText = '';

  // Reads (never writes) the app's status text: logout reuses this same loading screen
  function isLoggingOut() {
    var ids = ['firebaseGateMessage', 'firebaseAuthStatus'];
    for (var i = 0; i < ids.length; i++) {
      var el = document.getElementById(ids[i]);
      if (el && /logging out/i.test(el.textContent || '')) return true;
    }
    return false;
  }

  function setTextNow(text) {
    if (fadeTimer) { clearTimeout(fadeTimer); fadeTimer = null; }
    textEl.classList.remove('fade-out');
    textEl.textContent = text;
    shownText = text;
  }

  function setStageText(text) {
    if (text === shownText) return;
    if (fadeTimer) clearTimeout(fadeTimer);
    shownText = text;
    textEl.classList.add('fade-out');
    fadeTimer = setTimeout(function () {
      fadeTimer = null;
      textEl.textContent = text;
      textEl.classList.remove('fade-out');
    }, FADE_MS);
  }

  function advance() {
    if (isLoggingOut()) {
      setStageText(LOGGING_OUT_TEXT);
      return;
    }
    var elapsed = Date.now() - startedAt;
    if (phase === 'normal' && elapsed >= LONG_WAIT_MS - 50) {
      phase = 'long';
      quoteIndex = 0;
      setStageText(LONG_WAIT_QUOTES[0]);
      return;
    }
    if (phase === 'normal') {
      // hold on the last message instead of looping back: the quotes take over at 10s
      normalIndex = Math.min(normalIndex + 1, NORMAL_MESSAGES.length - 1);
      setStageText(NORMAL_MESSAGES[normalIndex]);
      return;
    }
    quoteIndex = (quoteIndex + 1) % LONG_WAIT_QUOTES.length;
    setStageText(LONG_WAIT_QUOTES[quoteIndex]);
  }

  function nextDelay() {
    if (phase === 'long') return LONG_STEP_MS;
    var remaining = LONG_WAIT_MS - (Date.now() - startedAt);
    // land exactly on the 10s mark; if we are past it (logging out), just tick slowly
    return remaining > 0 ? Math.max(100, Math.min(NORMAL_STEP_MS, remaining)) : NORMAL_STEP_MS;
  }

  function scheduleNext() {
    stageTimer = setTimeout(function () {
      advance();
      if (running) scheduleNext();
    }, nextDelay());
  }

  // ---------------------------------------------------------------- physics background + 3D logo tilt
  // Each dot is a small spring: the cursor pushes it away, it pops toward the viewer (bigger, brighter),
  // then springs home. A click or tap sends a ripple through the grid. The logo tilts in 3D to face the
  // pointer on its own spring. The animation loop only runs while something is moving.
  var GRID_GAP = 42;
  var POINTER_RADIUS = 100;
  var WAVE_SPEED = 0.55;   // px per ms
  var WAVE_BAND = 46;
  var WAVE_MAX = 420;
  var BUCKETS = 8;

  var move = 1;            // 0 when the user prefers reduced motion: dots only light up, nothing moves or tilts
  var gridW = 0;
  var gridH = 0;
  var dots = [];
  var restBuckets = [];
  var waves = [];
  var activeDots = [];
  var raf = null;
  var lastFrameTime = 0;
  var pointer = { x: 0, y: 0, vx: 0, vy: 0, active: false };
  var tilt = { rx: 0, ry: 0, vrx: 0, vry: 0 };
  var glow = { x: 0, y: 0, o: 0 };

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function edgeFade(t) {
    if (t < 0.55) return 1 - (t / 0.55) * 0.65;
    if (t < 0.9) return 0.35 * (1 - (t - 0.55) / 0.35);
    return 0;
  }

  function buildGrid() {
    var r = root.getBoundingClientRect();
    gridW = Math.max(1, Math.round(r.width));
    gridH = Math.max(1, Math.round(r.height));
    var dpr = Math.min(window.devicePixelRatio || 1, 1);
    canvas.width = Math.round(gridW * dpr);
    canvas.height = Math.round(gridH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var cols = Math.floor(gridW / GRID_GAP) + 1;
    var rows = Math.floor(gridH / GRID_GAP) + 1;
    var x0 = (gridW - (cols - 1) * GRID_GAP) / 2;
    var y0 = (gridH - (rows - 1) * GRID_GAP) / 2;
    var cx = gridW * 0.5;
    var cy = gridH * 0.45;
    var rx = gridW * 0.5 * Math.SQRT2;
    var ry = gridH * 0.55 * Math.SQRT2;

    dots = [];
    restBuckets = [];
    activeDots = [];
    for (var b = 0; b < BUCKETS; b++) restBuckets.push([]);

    for (var j = 0; j < rows; j++) {
      for (var i = 0; i < cols; i++) {
        var hx = x0 + i * GRID_GAP;
        var hy = y0 + j * GRID_GAP;
        var fade = edgeFade(Math.hypot((hx - cx) / rx, (hy - cy) / ry));
        var d = { hx: hx, hy: hy, ox: 0, oy: 0, vx: 0, vy: 0, z: 0, vz: 0, fade: fade, on: false };
        dots.push(d);
        var bucket = Math.round(fade * (BUCKETS - 1));
        if (bucket > 0) restBuckets[bucket].push(d);
      }
    }
    drawGrid();
  }

  function drawGrid() {
    ctx.clearRect(0, 0, gridW, gridH);

    for (var b = 1; b < BUCKETS; b++) {
      var list = restBuckets[b];
      if (!list || !list.length) continue;
      ctx.fillStyle = 'rgba(255,255,255,' + (0.09 * b / (BUCKETS - 1)).toFixed(3) + ')';
      for (var k = 0; k < list.length; k++) {
        var rd = list[k];
        if (!rd.on) ctx.fillRect(rd.hx - 1, rd.hy - 1, 2, 2);
      }
    }

    var cx0 = gridW * 0.5;
    var cy0 = gridH * 0.45;
    for (var n = 0; n < activeDots.length; n++) {
      var d = activeDots[n];
      var z = clamp(d.z, 0, 1.4);
      var persp = 1 + z * 0.05;
      var x = cx0 + (d.hx + d.ox - cx0) * persp;
      var y = cy0 + (d.hy + d.oy - cy0) * persp;
      var m = Math.min(1, z);
      var rC = Math.round(255 - 90 * m);
      var gC = Math.round(255 - 75 * m);
      var bC = Math.round(255 - 3 * m);
      var a = Math.min(1, 0.09 * d.fade + z * 0.85);
      ctx.fillStyle = 'rgba(' + rC + ',' + gC + ',' + bC + ',' + a.toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(x, y, 1 + z * 2, 0, 6.2832);
      ctx.fill();
    }
  }

  function physicsFrame(now) {
    raf = null;   // cleared first, so an error can never leave the loop marked as running
    if (!running) return;

    var dt = clamp((now - lastFrameTime) / 16.667, 0.2, 2.5) || 1;
    lastFrameTime = now;

    for (var w = waves.length - 1; w >= 0; w--) {
      waves[w].r = (now - waves[w].t0) * WAVE_SPEED;
      if (waves[w].r > WAVE_MAX + WAVE_BAND) waves.splice(w, 1);
    }

    pointer.vx *= Math.pow(0.8, dt);
    pointer.vy *= Math.pow(0.8, dt);

    var R2 = POINTER_RADIUS * POINTER_RADIUS;
    var damp = Math.pow(0.86, dt);
    var dampZ = Math.pow(0.78, dt);
    var motion = 0;
    activeDots = [];

    for (var n = 0; n < dots.length; n++) {
      var d = dots[n];
      var zTarget = 0;

      if (pointer.active) {
        var dx = d.hx + d.ox - pointer.x;
        var dy = d.hy + d.oy - pointer.y;
        var dd = dx * dx + dy * dy;
        if (dd < R2) {
          var dist = Math.sqrt(dd) || 0.001;
          var q = 1 - dist / POINTER_RADIUS;
          var push = q * q * 1.8 * move * dt;
          d.vx += (dx / dist) * push + pointer.vx * q * 0.05 * move;
          d.vy += (dy / dist) * push + pointer.vy * q * 0.05 * move;
          zTarget = Math.pow(q, 1.5);
        }
      }

      for (var wv = 0; wv < waves.length; wv++) {
        var wx = d.hx - waves[wv].x;
        var wy = d.hy - waves[wv].y;
        var wdist = Math.sqrt(wx * wx + wy * wy) || 0.001;
        var diff = Math.abs(wdist - waves[wv].r);
        if (diff < WAVE_BAND && waves[wv].r < WAVE_MAX) {
          var wq = 1 - diff / WAVE_BAND;
          var amp = wq * (1 - waves[wv].r / WAVE_MAX) * 1.6 * dt;
          d.vx += (wx / wdist) * amp * move;
          d.vy += (wy / wdist) * amp * move;
          d.vz += amp * 0.12;
        }
      }

      d.vx += -d.ox * 0.055 * dt;
      d.vy += -d.oy * 0.055 * dt;
      d.vx *= damp;
      d.vy *= damp;
      d.ox += d.vx * dt;
      d.oy += d.vy * dt;

      d.vz += (zTarget - d.z) * 0.16 * dt;
      d.vz *= dampZ;
      d.z += d.vz * dt;

      var energy = Math.abs(d.ox) + Math.abs(d.oy) + Math.abs(d.vx) + Math.abs(d.vy) + Math.abs(d.z) + Math.abs(d.vz);
      if (energy < 0.02) {
        d.ox = 0; d.oy = 0; d.vx = 0; d.vy = 0; d.z = 0; d.vz = 0;
        d.on = false;
      } else {
        d.on = true;
        activeDots.push(d);
        motion += Math.abs(d.vx) + Math.abs(d.vy) + Math.abs(d.vz);
      }
    }

    // Logo tilt: a spring that chases the pointer, then rocks back to flat when the pointer leaves
    var trx = 0;
    var tryy = 0;
    if (pointer.active && move) {
      var nx = clamp((pointer.x - gridW / 2) / (gridW / 2), -1, 1);
      var ny = clamp((pointer.y - gridH / 2) / (gridH / 2), -1, 1);
      tryy = nx * 12;
      trx = -ny * 10;
    }
    tilt.vrx += (trx - tilt.rx) * 0.09 * dt;
    tilt.vry += (tryy - tilt.ry) * 0.09 * dt;
    tilt.vrx *= Math.pow(0.8, dt);
    tilt.vry *= Math.pow(0.8, dt);
    tilt.rx += tilt.vrx * dt;
    tilt.ry += tilt.vry * dt;

    var tiltMoving = Math.abs(tilt.rx - trx) + Math.abs(tilt.ry - tryy) + Math.abs(tilt.vrx) + Math.abs(tilt.vry) > 0.02;
    if (tiltMoving) {
      tiltEl.style.transform = 'perspective(800px) rotateX(' + tilt.rx.toFixed(2) + 'deg) rotateY(' + tilt.ry.toFixed(2) + 'deg)';
      markEl.style.translate = (tilt.ry * 0.6).toFixed(2) + 'px ' + (-tilt.rx * 0.6).toFixed(2) + 'px';
      wordmarkEl.style.translate = (tilt.ry * 0.25).toFixed(2) + 'px ' + (-tilt.rx * 0.25).toFixed(2) + 'px';
    } else {
      tilt.rx = trx; tilt.ry = tryy; tilt.vrx = 0; tilt.vry = 0;
      tiltEl.style.transform = (trx || tryy) ? 'perspective(800px) rotateX(' + trx.toFixed(2) + 'deg) rotateY(' + tryy.toFixed(2) + 'deg)' : '';
      markEl.style.translate = '';
      wordmarkEl.style.translate = '';
    }

    // Soft glow that trails the pointer
    glow.x += (pointer.x - glow.x) * 0.2 * dt;
    glow.y += (pointer.y - glow.y) * 0.2 * dt;
    glow.o += ((pointer.active ? 1 : 0) - glow.o) * 0.16 * dt;
    var glowMoving = Math.abs(pointer.x - glow.x) + Math.abs(pointer.y - glow.y) > 0.3 ||
                     Math.abs((pointer.active ? 1 : 0) - glow.o) > 0.01;
    if (!glowMoving) { glow.x = pointer.x; glow.y = pointer.y; glow.o = pointer.active ? 1 : 0; }
    bgLayer.style.setProperty('--mx', glow.x + 'px');
    bgLayer.style.setProperty('--my', glow.y + 'px');
    bgLayer.style.setProperty('--spot', glow.o);

    drawGrid();

    var keepGoing = motion > 0.05 || waves.length > 0 || tiltMoving || glowMoving ||
                    (!pointer.active && activeDots.length > 0);
    raf = keepGoing ? requestAnimationFrame(physicsFrame) : null;
  }

  function kick() {
    if (running && !raf) {
      lastFrameTime = performance.now();
      raf = requestAnimationFrame(physicsFrame);
    }
  }

  function localPoint(e) {
    var r = root.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function onEnter(e) {
    var p = localPoint(e);
    pointer.x = p.x; pointer.y = p.y;
    pointer.vx = 0; pointer.vy = 0;
    glow.x = p.x; glow.y = p.y;
    pointer.active = true;
    kick();
  }

  function onMove(e) {
    var p = localPoint(e);
    pointer.vx = clamp(p.x - pointer.x, -40, 40);
    pointer.vy = clamp(p.y - pointer.y, -40, 40);
    pointer.x = p.x; pointer.y = p.y;
    pointer.active = true;
    kick();
  }

  function onLeave() {
    pointer.active = false;
    kick();
  }

  function onDown(e) {
    onEnter(e);
    waves.push({ x: pointer.x, y: pointer.y, t0: performance.now(), r: 0 });
    if (move) {
      tilt.vry += clamp((pointer.x - gridW / 2) / (gridW / 2), -1, 1) * 3;
    }
    kick();
  }

  function onUp(e) {
    if (e.pointerType === 'touch') onLeave();
  }

  function onMarkClick() {
    markEl.classList.remove('tap-ripple');
    void markEl.offsetWidth;
    markEl.classList.add('tap-ripple');
    if (running && move) {
      tilt.vrx += 5;
      tilt.vry += (Math.random() < 0.5 ? -1 : 1) * 6;
      kick();
    }
  }

  function addListeners() {
    root.addEventListener('pointerenter', onEnter);
    root.addEventListener('pointerdown', onDown);
    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerleave', onLeave);
    root.addEventListener('pointerup', onUp);
    root.addEventListener('pointercancel', onLeave);
    markEl.addEventListener('click', onMarkClick);
  }

  function removeListeners() {
    root.removeEventListener('pointerenter', onEnter);
    root.removeEventListener('pointerdown', onDown);
    root.removeEventListener('pointermove', onMove);
    root.removeEventListener('pointerleave', onLeave);
    root.removeEventListener('pointerup', onUp);
    root.removeEventListener('pointercancel', onLeave);
    markEl.removeEventListener('click', onMarkClick);
  }

  function resetPhysics() {
    dots = []; restBuckets = []; waves = []; activeDots = [];
    pointer.x = 0; pointer.y = 0; pointer.vx = 0; pointer.vy = 0; pointer.active = false;
    tilt.rx = 0; tilt.ry = 0; tilt.vrx = 0; tilt.vry = 0;
    glow.x = 0; glow.y = 0; glow.o = 0;
    tiltEl.style.transform = '';
    markEl.style.translate = '';
    wordmarkEl.style.translate = '';
    markEl.classList.remove('tap-ripple');
    bgLayer.style.setProperty('--spot', '0');
  }

  // ---------------------------------------------------------------- lifecycle
  function start() {
    if (running) return;
    running = true;

    move = (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) ? 0 : 1;

    phase = 'normal';
    normalIndex = 0;
    quoteIndex = 0;
    startedAt = Date.now();
    setTextNow(isLoggingOut() ? LOGGING_OUT_TEXT : NORMAL_MESSAGES[0]);
    scheduleNext();

    resetPhysics();
    buildGrid();
    addListeners();
  }

  function stop() {
    if (!running) return;
    running = false;

    if (stageTimer) { clearTimeout(stageTimer); stageTimer = null; }
    if (fadeTimer) { clearTimeout(fadeTimer); fadeTimer = null; }
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    removeListeners();
    resetPhysics();

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    textEl.classList.remove('fade-out');
    textEl.textContent = FALLBACK_TEXT;
    shownText = FALLBACK_TEXT;
  }

  function isShown() {
    return root.getClientRects().length > 0;
  }

  function sync() {
    try {
      if (isShown()) start(); else stop();
    } catch (err) {
      // cosmetics must never break sign-in
      try { stop(); } catch (ignore) { /* nothing more to do */ console.debug('[journall] ignored error in loading-screen.js:', ignore);}
    }
  }

  var resizeObserver = null;
  var mutationObserver = null;

  if (window.ResizeObserver) {
    resizeObserver = new ResizeObserver(function () {
      sync();
      if (running) {
        var r = root.getBoundingClientRect();
        if (Math.round(r.width) !== gridW || Math.round(r.height) !== gridH) {
          try { buildGrid(); } catch (err) { /* ignore */ console.debug('[journall] ignored error in loading-screen.js:', err);}
        }
      }
    });
    resizeObserver.observe(root);
  }

  if (window.MutationObserver) {
    mutationObserver = new MutationObserver(sync);
    mutationObserver.observe(root, { attributes: true, attributeFilter: ['hidden', 'style', 'class'] });
    if (gate) mutationObserver.observe(gate, { attributes: true, attributeFilter: ['class', 'hidden', 'style'] });
  }

  window.addEventListener('beforeunload', function () {
    if (resizeObserver) resizeObserver.disconnect();
    if (mutationObserver) mutationObserver.disconnect();
    stop();
  }, { once: true });

  sync();
})();
