<#
rebuild-signin-visual.ps1
Session 11, Part 17 - Step 3 patch.

What this does (all four edits, verified against exact live content
pasted during this session before this script was written):

  1. Removes the old antigravity CSS block (#firebaseAuthGate .antigravity-login-bg,
     ~line 3304-3317) and replaces it with the reference file's dot-grid
     background CSS, renamed to .jl-bg / .jl-bg-glow / .jl-bg-canvas /
     .jl-bg-spot-glow (per the Part 16 naming decision - NOT journall-bg-*,
     to avoid colliding with the loading screen's existing journall-bg-* classes).

  2. Replaces <canvas class="antigravity-login-bg" ...></canvas> (~line 3333)
     with the .jl-bg wrapper markup (glow span + canvas + spot-glow span).

  3. Removes the ENTIRE antigravity JS block - the whole
     <script>(function(){ ... startLoginAntigravity ... initLoginAntigravity ...
     })();</script> block, confirmed self-contained from line 20142 to 20364,
     confirmed to not share window.Motion/loadMotion with anything else on
     the page - and replaces it with a new self-contained IIFE that ports
     the reference file's pointer-physics dot-grid script, scoped to
     #firebaseAuthGate / .jl-bg instead of #journallLogin / .journall-bg.

  4. Appends a new, clearly-labeled CSS block (id="jl-signin-card-rebuild")
     immediately after the existing .jl-message rule and before
     <style id="journall-pill-removal-final">, which overrides
     .journall-signin-card from the old broken 2-column/680px-min-height
     grid to the reference file's single-column glassmorphism card layout.
     The class name .journall-signin-card is kept as-is (not renamed) because
     initFirebaseAuth() selects on it via document.querySelector.

Nothing else is touched. The old .signin-copy / .signin-brand / .signin-kicker
CSS (now orphaned since no element uses those classes post-restructuring) is
left alone, as agreed - that's a separate, later cleanup commit, not this one.
The two other pre-existing .journall-signin-card blocks (border/shadow at
~15608, and the loading-visibility toggle at ~16369) are also left alone -
this patch's new block is appended AFTER them in source order, so ties on
!important resolve in this patch's favor without deleting anything.

Usage:
  1. Read the preflight output. If any check fails, STOP - do not proceed.
     It means the live file has changed since this script was written
     (e.g. from a session you forgot happened), and line-by-line assumptions
     baked into this script may no longer hold.
  2. If preflight passes, the script writes index.new.html next to index.html.
     It does NOT touch index.html itself.
  3. Review: git diff --no-index index.html index.new.html
  4. If the diff looks right and ONLY shows the intended changes:
       Copy-Item index.new.html index.html -Force
       git diff index.html   (sanity check against the real file)
  5. Commit, get your own go-ahead, then push. One step at a time.
#>

$ErrorActionPreference = 'Stop'

$repoPath = "C:\Users\cnjac\Trading-Journal"
$srcPath  = Join-Path $repoPath "index.html"
$outPath  = Join-Path $repoPath "index.new.html"

if (-not (Test-Path $srcPath)) {
    throw "Cannot find $srcPath - check the path before doing anything else."
}

Write-Host "Reading $srcPath ..." -ForegroundColor Cyan
$content = [System.IO.File]::ReadAllText($srcPath, (New-Object System.Text.UTF8Encoding $false))
$originalHadCRLF = $content -match "`r`n"
# Normalize to LF-only for matching/editing. Windows files are almost always
# CRLF; comparing multi-line here-strings against raw CRLF content otherwise
# fails even when the visible text is identical, because `n != `r`n.
$content = $content -replace "`r`n", "`n"

function Assert-ExactlyOne {
    param(
        [string]$Text,
        [string]$Pattern,
        [string]$Label,
        [switch]$IsRegex
    )
    if ($IsRegex) {
        $matches = [regex]::Matches($Text, $Pattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)
        $count = $matches.Count
    } else {
        $count = ([regex]::Matches($Text, [regex]::Escape($Pattern))).Count
    }
    if ($count -eq 0) {
        throw "PREFLIGHT FAILED: '$Label' - expected content not found. The live file has changed since this script was written. STOP and re-diagnose before patching."
    }
    if ($count -gt 1) {
        throw "PREFLIGHT FAILED: '$Label' - expected exactly 1 match, found $count. STOP - this anchor is no longer unique, the patch could hit the wrong spot."
    }
    Write-Host "  OK  ($count match) $Label" -ForegroundColor Green
}

Write-Host "`nRunning preflight checks..." -ForegroundColor Cyan

# --- Anchor 1: old antigravity CSS block ---
$oldBgCss = @'
#firebaseAuthGate .antigravity-login-bg {
  position: fixed;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
  opacity: .78;
  /* mix-blend-mode: screen; */
}
@media (prefers-reduced-motion: reduce) {
  #firebaseAuthGate .antigravity-login-bg { display: none; }
}
'@
Assert-ExactlyOne -Text $content -Pattern $oldBgCss -Label "old antigravity CSS block"

# --- Anchor 2: the canvas element line ---
$oldCanvasLine = '<canvas class="antigravity-login-bg" aria-hidden="true"></canvas>'
Assert-ExactlyOne -Text $content -Pattern $oldCanvasLine -Label "antigravity canvas element"

# --- Anchor 3: the entire antigravity <script> block, start-to-end ---
$scriptBlockPattern = '<script>\s*\(function\(\)\{\s*function startLoginAntigravity\(\).*?\}\)\(\);\s*</script>'
Assert-ExactlyOne -Text $content -Pattern $scriptBlockPattern -Label "antigravity <script> block (startLoginAntigravity...initLoginAntigravity)" -IsRegex

# --- Anchor 4: insertion point for the card-rebuild CSS ---
$cardInsertAnchor = @'
.jl-message { font-size: 13px !important; color: #8a95a6 !important; text-align: center !important; }
</style>
<style id="journall-pill-removal-final">
'@
Assert-ExactlyOne -Text $content -Pattern $cardInsertAnchor -Label "insertion point after .jl-message rule"

Write-Host "`nAll preflight checks passed. Applying edits..." -ForegroundColor Cyan

# ---- EDIT 1: replace old antigravity CSS with new .jl-bg CSS ----
$newBgCss = @'
#firebaseAuthGate .jl-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  --mx: 50%;
  --my: 45%;
  --spot: 0;
}
#firebaseAuthGate .jl-bg > span { position: absolute; inset: 0; }
#firebaseAuthGate .jl-bg-glow {
  background: radial-gradient(circle at 50% 30%, rgba(99, 102, 241, 0.16), transparent 38%);
}
#firebaseAuthGate .jl-bg-canvas {
  position: absolute; inset: 0; display: block; width: 100%; height: 100%;
}
#firebaseAuthGate .jl-bg-spot-glow {
  background: radial-gradient(circle 130px at var(--mx) var(--my), rgba(99, 102, 241, 0.18), transparent 100%);
  opacity: var(--spot);
}
#firebaseAuthGate .jl-bg::after {
  content: "";
  position: absolute; inset: 0;
  background: radial-gradient(ellipse at center, transparent 45%, rgba(0, 0, 0, 0.6) 100%);
}
@media (prefers-reduced-motion: reduce) {
  #firebaseAuthGate .jl-bg-canvas { display: none; }
}
'@
$content = $content.Replace($oldBgCss, $newBgCss)

# ---- EDIT 2: replace canvas element with .jl-bg wrapper markup ----
$newBgMarkup = '<div class="jl-bg" aria-hidden="true"><span class="jl-bg-glow"></span><canvas class="jl-bg-canvas"></canvas><span class="jl-bg-spot-glow"></span></div>'
$content = $content.Replace($oldCanvasLine, $newBgMarkup)

# ---- EDIT 3: remove antigravity script block, insert new dot-grid physics script ----
$newBgScript = @'
<script>
(function(){
  const gate = document.getElementById('firebaseAuthGate');
  if (!gate) return;
  const bgLayer = gate.querySelector('.jl-bg');
  if (!bgLayer) return;
  const bgCanvas = bgLayer.querySelector('.jl-bg-canvas');
  const bgCtx = bgCanvas.getContext('2d');
  const bgReduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (bgReduceMotion) return;
  const MOVE = 1;

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
</script>
'@
Write-Host "  Swapping antigravity script block via safe substring replace (avoids regex replacement-string escaping issues with $ and \ in the new JS)..." -ForegroundColor DarkGray

$m = [regex]::Match($content, $scriptBlockPattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)
if (-not $m.Success) { throw "Antigravity script block vanished between preflight and edit - aborting, re-run diagnostics." }
$content = $content.Substring(0, $m.Index) + $newBgScript + $content.Substring($m.Index + $m.Length)

# ---- EDIT 4: append card-rebuild CSS after .jl-message rule ----
$newCardCss = @'
.jl-message { font-size: 13px !important; color: #8a95a6 !important; text-align: center !important; }
</style>
<style id="jl-signin-card-rebuild">
.journall-signin-card {
  width: 100% !important;
  max-width: 340px !important;
  min-height: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  grid-template-columns: none !important;
  gap: 13px !important;
  padding: 22px !important;
  border-radius: 26px !important;
  border: 1px solid rgba(255, 255, 255, 0.16) !important;
  background:
    radial-gradient(120% 100% at 18% -10%, rgba(129, 140, 248, 0.20), transparent 55%),
    radial-gradient(100% 80% at 100% 120%, rgba(99, 102, 241, 0.12), transparent 60%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.02)) !important;
  backdrop-filter: blur(28px) saturate(180%) !important;
  -webkit-backdrop-filter: blur(28px) saturate(180%) !important;
  box-shadow:
    0 30px 70px -24px rgba(0, 0, 0, 0.7),
    inset 0 0 0 1px rgba(255, 255, 255, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.22),
    inset 0 -40px 60px -48px rgba(99, 102, 241, 0.55) !important;
  overflow: visible !important;
  position: relative !important;
  color: #f7f8f8 !important;
}
.journall-signin-card::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(130% 65% at 12% 0%, rgba(255, 255, 255, 0.16), transparent 60%);
  pointer-events: none;
}
.journall-signin-card::after {
  content: "";
  position: absolute;
  left: 12%;
  right: 12%;
  bottom: -22px;
  height: 44px;
  background: radial-gradient(closest-side, rgba(99, 102, 241, 0.38), transparent 72%);
  filter: blur(18px);
  z-index: -1;
  pointer-events: none;
}
.journall-signin-card > * { position: relative; z-index: 1; }
@media (max-width: 900px) {
  .journall-signin-card { border-radius: 22px !important; }
}
</style>
<style id="journall-pill-removal-final">
'@
$content = $content.Replace($cardInsertAnchor, $newCardCss)

if ($originalHadCRLF) { $content = $content -replace "`n", "`r`n" }
[System.IO.File]::WriteAllText($outPath, $content, (New-Object System.Text.UTF8Encoding $false))

Write-Host "`nDone. Wrote: $outPath" -ForegroundColor Green
Write-Host "Original file NOT modified. Next steps:" -ForegroundColor Yellow
Write-Host "  git diff --no-index `"$srcPath`" `"$outPath`""
Write-Host "  # review it carefully, then if it's clean:"
Write-Host "  Copy-Item `"$outPath`" `"$srcPath`" -Force"
Write-Host "  git diff index.html   # sanity check"
Write-Host "  Remove-Item `"$outPath`""