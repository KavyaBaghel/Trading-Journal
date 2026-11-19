(function(){
  const gate = document.getElementById('firebaseAuthGate');
  if (!gate) return;
  const bgLayer = gate.querySelector('.jl-bg');
  if (!bgLayer) return;
  const bgCanvas = bgLayer.querySelector('.jl-bg-canvas');
  const bgCtx = bgCanvas.getContext('2d');
  const bgReduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const MOVE = bgReduceMotion ? 0 : 1;

  const GRID_GAP = 26;
  const POINTER_RADIUS = 100;
  const WAVE_SPEED = 0.55;
  const WAVE_BAND = 46;
  const WAVE_MAX = 420;
  const BUCKETS = 8;

  let gridW = 0, gridH = 0;
  let dots = [];
  let restBuckets = [];
  let waves = [];
  let activeDots = [];
  let bgRaf = null;
  let lastFrameTime = 0;

  const pointer = { x: 0, y: 0, vx: 0, vy: 0, active: false };
  const glow = { x: 0, y: 0, o: 0 };

  function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }

  function edgeFade(t){
    if (t < 0.55) return 1 - (t / 0.55) * 0.65;
    if (t < 0.9) return 0.35 * (1 - (t - 0.55) / 0.35);
    return 0;
  }

  function buildJlGrid(){
    const r = gate.getBoundingClientRect();
    gridW = Math.max(1, Math.round(r.width));
    gridH = Math.max(1, Math.round(r.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    bgCanvas.width = Math.round(gridW * dpr);
    bgCanvas.height = Math.round(gridH * dpr);
    bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cols = Math.floor(gridW / GRID_GAP) + 1;
    const rows = Math.floor(gridH / GRID_GAP) + 1;
    const x0 = (gridW - (cols - 1) * GRID_GAP) / 2;
    const y0 = (gridH - (rows - 1) * GRID_GAP) / 2;
    const cx = gridW * 0.5, cy = gridH * 0.4;
    const rx = gridW * 0.5 * Math.SQRT2, ry = gridH * 0.55 * Math.SQRT2;

    dots = [];
    restBuckets = [];
    for (let b = 0; b < BUCKETS; b++) restBuckets.push([]);

    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const hx = x0 + i * GRID_GAP;
        const hy = y0 + j * GRID_GAP;
        const fade = edgeFade(Math.hypot((hx - cx) / rx, (hy - cy) / ry));
        const d = { hx: hx, hy: hy, ox: 0, oy: 0, vx: 0, vy: 0, z: 0, vz: 0, fade: fade, on: false };
        dots.push(d);
        const bucket = Math.round(fade * (BUCKETS - 1));
        if (bucket > 0) restBuckets[bucket].push(d);
      }
    }
    drawJlGrid();
  }

  function drawJlGrid(){
    bgCtx.clearRect(0, 0, gridW, gridH);
    for (let b = 1; b < BUCKETS; b++) {
      const list = restBuckets[b];
      if (!list || !list.length) continue;
      bgCtx.fillStyle = 'rgba(255,255,255,' + (0.09 * b / (BUCKETS - 1)).toFixed(3) + ')';
      for (let k = 0; k < list.length; k++) {
        const d = list[k];
        if (!d.on) bgCtx.fillRect(d.hx - 1, d.hy - 1, 2, 2);
      }
    }

    const cx0 = gridW * 0.5, cy0 = gridH * 0.4;
    for (let k = 0; k < activeDots.length; k++) {
      const d = activeDots[k];
      const z = clamp(d.z, 0, 1.4);
      const persp = 1 + z * 0.05;
      const x = cx0 + (d.hx + d.ox - cx0) * persp;
      const y = cy0 + (d.hy + d.oy - cy0) * persp;
      const m = Math.min(1, z);
      const rC = Math.round(255 - 90 * m);
      const gC = Math.round(255 - 75 * m);
      const bC = Math.round(255 - 3 * m);
      const a = Math.min(1, 0.09 * d.fade + z * 0.85);
      bgCtx.fillStyle = 'rgba(' + rC + ',' + gC + ',' + bC + ',' + a.toFixed(3) + ')';
      bgCtx.beginPath();
      bgCtx.arc(x, y, 1 + z * 2, 0, 6.2832);
      bgCtx.fill();
    }
  }

  function physicsFrame(now){
    bgRaf = null;
    const dt = clamp((now - lastFrameTime) / 16.667, 0.2, 2.5) || 1;
    lastFrameTime = now;

    for (let w = waves.length - 1; w >= 0; w--) {
      waves[w].r = (now - waves[w].t0) * WAVE_SPEED;
      if (waves[w].r > WAVE_MAX + WAVE_BAND) waves.splice(w, 1);
    }

    pointer.vx *= Math.pow(0.8, dt);
    pointer.vy *= Math.pow(0.8, dt);

    const R2 = POINTER_RADIUS * POINTER_RADIUS;
    const damp = Math.pow(0.86, dt);
    const dampZ = Math.pow(0.78, dt);
    let motion = 0;
    activeDots = [];

    for (let n = 0; n < dots.length; n++) {
      const d = dots[n];
      let zTarget = 0;

      if (pointer.active) {
        const dx = d.hx + d.ox - pointer.x;
        const dy = d.hy + d.oy - pointer.y;
        const dd = dx * dx + dy * dy;
        if (dd < R2) {
          const dist = Math.sqrt(dd) || 0.001;
          const q = 1 - dist / POINTER_RADIUS;
          const push = q * q * 1.8 * MOVE * dt;
          d.vx += (dx / dist) * push + pointer.vx * q * 0.05 * MOVE;
          d.vy += (dy / dist) * push + pointer.vy * q * 0.05 * MOVE;
          zTarget = Math.pow(q, 1.5);
        }
      }

      for (let w = 0; w < waves.length; w++) {
        const wx = d.hx - waves[w].x;
        const wy = d.hy - waves[w].y;
        const dist = Math.sqrt(wx * wx + wy * wy) || 0.001;
        const diff = Math.abs(dist - waves[w].r);
        if (diff < WAVE_BAND && waves[w].r < WAVE_MAX) {
          const q = 1 - diff / WAVE_BAND;
          const amp = q * (1 - waves[w].r / WAVE_MAX) * 1.6 * dt;
          d.vx += (wx / dist) * amp * MOVE;
          d.vy += (wy / dist) * amp * MOVE;
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

      const energy = Math.abs(d.ox) + Math.abs(d.oy) + Math.abs(d.vx) + Math.abs(d.vy) + Math.abs(d.z) + Math.abs(d.vz);
      if (energy < 0.02) {
        d.ox = d.oy = d.vx = d.vy = d.z = d.vz = 0;
        d.on = false;
      } else {
        d.on = true;
        activeDots.push(d);
        motion += Math.abs(d.vx) + Math.abs(d.vy) + Math.abs(d.vz);
      }
    }

    glow.x += (pointer.x - glow.x) * 0.2 * dt;
    glow.y += (pointer.y - glow.y) * 0.2 * dt;
    glow.o += ((pointer.active ? 1 : 0) - glow.o) * 0.16 * dt;
    const glowMoving = Math.abs(pointer.x - glow.x) + Math.abs(pointer.y - glow.y) > 0.3 || Math.abs((pointer.active ? 1 : 0) - glow.o) > 0.01;
    if (!glowMoving) { glow.x = pointer.x; glow.y = pointer.y; glow.o = pointer.active ? 1 : 0; }
    bgLayer.style.setProperty('--mx', glow.x + 'px');
    bgLayer.style.setProperty('--my', glow.y + 'px');
    bgLayer.style.setProperty('--spot', glow.o);

    drawJlGrid();

    const keepGoing = motion > 0.05 || waves.length > 0 || glowMoving ||
                      (!pointer.active && activeDots.length > 0);
    bgRaf = keepGoing ? requestAnimationFrame(physicsFrame) : null;
  }

  function bgKick(){
    if (!bgRaf) {
      lastFrameTime = performance.now();
      bgRaf = requestAnimationFrame(physicsFrame);
    }
  }

  function localPoint(e){
    const r = gate.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function bgEnter(e){
    const p = localPoint(e);
    pointer.x = p.x; pointer.y = p.y;
    pointer.vx = 0; pointer.vy = 0;
    glow.x = p.x; glow.y = p.y;
    pointer.active = true;
    bgKick();
  }

  function bgMove(e){
    const p = localPoint(e);
    pointer.vx = clamp(p.x - pointer.x, -40, 40);
    pointer.vy = clamp(p.y - pointer.y, -40, 40);
    pointer.x = p.x; pointer.y = p.y;
    pointer.active = true;
    bgKick();
  }

  function bgLeave(){
    pointer.active = false;
    bgKick();
  }

  function bgDown(e){
    bgEnter(e);
    waves.push({ x: pointer.x, y: pointer.y, t0: performance.now(), r: 0 });
    bgKick();
  }

  gate.addEventListener('pointerenter', bgEnter);
  gate.addEventListener('pointerdown', bgDown);
  gate.addEventListener('pointermove', bgMove);
  gate.addEventListener('pointerleave', bgLeave);
  gate.addEventListener('pointerup', function(e){ if (e.pointerType === 'touch') bgLeave(); });
  gate.addEventListener('pointercancel', bgLeave);

  function init(){
    buildJlGrid();
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(function(){
        const r = gate.getBoundingClientRect();
        if (Math.round(r.width) !== gridW || Math.round(r.height) !== gridH) buildJlGrid();
      });
      ro.observe(gate);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
