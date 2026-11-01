/* Journall day lock: after the daily loss limit (default: 1 loss) the app covers the screen until the 06:00 IST reset.
   Reuses the circuit-breaker rules (window.jlCircuitEval) and adds a loss counter. It only warns and blocks this app:
   it cannot close MT5 positions. Override needs typed confirmation and is logged. Set localStorage jlDayLockLosses=0 to turn off. */
(function () {
  'use strict';
  var LOSS_KEY = 'jlDayLockLosses', UNLOCK_KEY = 'jlDayLockUnlocked', LOG_KEY = 'jlDayLockOverrides', PEEK_KEY = 'jlDayLockPeekUntil';
  var PHRASE = 'BREAK RULE';
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {console.debug('[journall] ignored error in day-lock.js:', e);} }
  function maxLosses() { var raw = get(LOSS_KEY), n = Number(raw); return raw !== null && isFinite(n) ? n : 1; }
  function dayKey() { return typeof window.getTradingDayIST === 'function' ? window.getTradingDayIST() : new Date().toISOString().slice(0, 10); }
  function kind(p) { return typeof window.jlKind === 'function' ? window.jlKind(p) : (p < 0 ? 'loss' : p > 0 ? 'win' : 'be'); }
  function msToReset() {
    var n = new Date(), t = Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate(), 0, 30, 0);
    if (t <= n.getTime()) t += 86400000;
    return t - n.getTime();
  }
  function fmt(ms) { var m = Math.max(0, Math.floor(ms / 60000)); return Math.floor(m / 60) + 'h ' + (m % 60) + 'm'; }
  function reasons() {
    var key = dayKey(), rows = (window.__trades || []).filter(function (t) { return t && t.d === key; }), why = [], losses = 0, lim = maxLosses();
    rows.forEach(function (t) { if (kind(Number(t.pnl)) === 'loss') losses++; });
    if (lim > 0 && losses >= lim) why.push(losses + (losses === 1 ? ' loss' : ' losses') + ' today (limit ' + lim + ')');
    if (typeof window.jlCircuitEval === 'function') {
      try {
        var r = window.jlCircuitEval(rows, {
          lossLimit: Number(window.jlDailyLossLimit) || 0, tradeLimit: Number(window.jlMaxTradesPerDay) || 0,
          maxConsec: Number(window.jlMaxConsecLosses) || 0, revLimit: Number(window.jlMaxRevengeTrades) || 0,
          sameDirLimit: Number(window.jlSameDirLossLimit) || 0
        }, kind);
        if (r && r.tripped) (r.why || []).forEach(function (w) { why.push(w); });
      } catch (e) {console.debug('[journall] ignored error in day-lock.js:', e);}
    }
    return why;
  }
  var box, whyEl, waitEl, msgEl, inp, okBtn;
  function build() {
    var st = document.createElement('style');
    st.textContent = '#jlDayLock{position:fixed;inset:0;z-index:2147483000;display:none;align-items:center;justify-content:center;padding:24px;background:rgba(4,4,8,.97);color:#f3f3f7;font-family:Inter,system-ui,sans-serif}' +
      '#jlDayLock.on{display:flex}#jlDayLock .c{max-width:440px;width:100%;text-align:center}#jlDayLock h2{margin:0 0 8px;font-size:26px}' +
      '#jlDayLock p{margin:6px 0;color:#b9b9c6;line-height:1.5}#jlDayLock b{color:#f0685c}#jlDayLock .w{font-size:20px;color:#f3f3f7;margin:14px 0}' +
      '#jlDayLock button,#jlDayLock input{font:inherit;border-radius:10px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:inherit;padding:10px 14px;margin:6px 4px}' +
      '#jlDayLock button:disabled{opacity:.4}#jlDayLock .u{margin-top:22px;padding-top:16px;border-top:1px solid rgba(255,255,255,.1);font-size:13px}';
    document.head.appendChild(st);
    box = document.createElement('div'); box.id = 'jlDayLock'; box.setAttribute('role', 'alertdialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Trading locked for today');
    box.innerHTML = '<div class="c"><h2>Done for today.</h2><p><b id="jlDlWhy"></b></p>' +
      '<p class="w">Locked for <span id="jlDlWait"></span></p>' +
      '<p>Close any open position in MT5 now. This app cannot close it for you. One loss is the end of the session. No re-entry, no revenge.</p>' +
      '<button type="button" id="jlDlPeek">Review my journal (10 min)</button>' +
      '<div class="u"><p>Override logs this as a rule break. Type <b>' + PHRASE + '</b> to unlock.</p>' +
      '<input id="jlDlIn" autocomplete="off" aria-label="Type the phrase to override"/><button type="button" id="jlDlOk" disabled>Unlock</button></div></div>';
    document.body.appendChild(box);
    whyEl = box.querySelector('#jlDlWhy'); waitEl = box.querySelector('#jlDlWait'); inp = box.querySelector('#jlDlIn'); okBtn = box.querySelector('#jlDlOk');
    inp.addEventListener('input', function () { okBtn.disabled = inp.value.trim().toUpperCase() !== PHRASE; });
    box.querySelector('#jlDlPeek').addEventListener('click', function () { set(PEEK_KEY, String(Date.now() + 600000)); paint(); });
    okBtn.addEventListener('click', function () {
      var log = []; try { log = JSON.parse(get(LOG_KEY) || '[]'); } catch (e) {console.debug('[journall] ignored error in day-lock.js:', e);}
      log.push({ day: dayKey(), at: new Date().toISOString(), why: reasons() }); set(LOG_KEY, JSON.stringify(log.slice(-200)));
      set(UNLOCK_KEY, dayKey()); inp.value = ''; okBtn.disabled = true; paint();
    });
  }
  function paint() {
    if (!document.body) return;
    var why = reasons(), peek = Number(get(PEEK_KEY)) > Date.now(), unlocked = get(UNLOCK_KEY) === dayKey();
    if (!box) build();
    if (!why.length || unlocked || peek) { box.classList.remove('on'); return; }
    whyEl.textContent = why.join('. ') + '.'; waitEl.textContent = 'until 06:00 IST (' + fmt(msToReset()) + ')';
    box.classList.add('on');
  }
  window.jlDayLockRefresh = paint;
  setInterval(paint, 5000); setTimeout(paint, 1500); setTimeout(paint, 4000);
})();
