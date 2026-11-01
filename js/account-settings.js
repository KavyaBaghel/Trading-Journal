(function(){
  document.getElementById('dateStrG').textContent = new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});

  // ---------- account settings persistence (balance / phase / account type) ----------
  // Single source of truth for the account: set here, reflected read-only everywhere else
  // (hero "started at", the phase badge, the User Profile phase chip).
  // Account type (funded/live) still can't be told apart by the sync, so the person sets
  // it themselves. Account phase (Phase 1 / Phase 2 / Master) IS available from the real
  // MT5 bridge sync per the user, but this static file has no Firebase/Worker connection
  // wired in yet (confirmed: that connection lives in another file) and the exact field
  // name/shape of the synced phase value hasn't been given yet either.
  // TODO(real-phase-wiring): once the Firebase field name is known, replace the read of
  // ggAccount.phase below with the real synced value (e.g. from onSnapshot / the account
  // doc), and stop reading/writing it from localStorage — it should only ever reflect the
  // bridge, never a manual choice. Only relevant when Account type = funded; for live
  // accounts, phase does not apply and the whole field is hidden (see ggApplyAcctType below).
  const ACC_KEY = 'jlAccountSettings';
  function ggLoadAccount(){
    let s = null;
    try{ s = JSON.parse(localStorage.getItem(ACC_KEY)); }catch(e){console.debug('[journall] ignored error in account-settings.js:', e);}
    const a = Object.assign({balance:0, phase:'', type:'', revWindowMin:0, profitTargetPct:0, maxDailyLossUSD:0, maxDailyLossUnit:'$', maxWeeklyLossUSD:0, maxWeeklyLossUnit:'$', maxTradesPerDay:0, dayProfitTarget:0, dayProfitTargetUnit:'%', weeklyProfitTarget:0, weeklyProfitTargetUnit:'%', riskPerTrade:0, minRr:0, lotSize:0, maxConsecLosses:0, maxRevengeTrades:0, sameDirLossPct:0, fridayCutoff:'', consistencyPct:0, minTradingDays:0, profitSplit:0, brokerUtcOffset:'', tradeDuringNews:'', maxDrawdown:0, maxDrawdownUnit:'%', deadline:''}, s||{});
    if(a.maxDailyLossValue == null) a.maxDailyLossValue = Number(a.maxDailyLossUSD) || 0;
    if(a.maxWeeklyLossValue == null) a.maxWeeklyLossValue = Number(a.maxWeeklyLossUSD) || 0;
    return a;
  }
  function ggApplyAccountDisplay(s){
    const heroPhase = document.getElementById('ggHeroPhase'); if(heroPhase) heroPhase.textContent = s.phase || 'Not set';
    const startedAt = document.getElementById('ggStartedAtVal');
    if(startedAt) startedAt.textContent = Number(s.balance)>0 ? '$'+Number(s.balance).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}) : 'Not set';
    const chip = document.getElementById('upPhaseChip'); if(chip) chip.textContent = s.phase || 'Not set';
    ggApplyDeadline(s.deadline);
    ggApplyLossTile();
  }
  // Phase deadline -> "Days remaining" tile. Whole calendar days in the viewer's local date.
  function ggApplyDeadline(dl){
    const v = document.getElementById('ggDaysV'), m = document.getElementById('ggDaysM'), ring = document.getElementById('ggGaugeDays');
    if(!v || !m) return;
    const setRing = frac => { if(ring) ring.style.setProperty('--off', (214 - 214*Math.max(0, Math.min(1, frac))).toFixed(1)); };
    const mt = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dl || '');
    if(!mt){ v.textContent = 'No deadline'; m.textContent = 'Phase deadline not set'; setRing(0); return; }
    const end = new Date(+mt[1], +mt[2]-1, +mt[3]), n = new Date(), today = new Date(n.getFullYear(), n.getMonth(), n.getDate());
    const days = Math.round((end - today) / 86400000);
    // Ring = share of the phase window still left. Phase start = date of the first trade in the data.
    const tr = window.__trades || [];
    let first = ''; for(let i = 0; i < tr.length; i++){ const d = tr[i] && tr[i].d; if(d && (!first || d < first)) first = d; }
    const fm = /^(\d{4})-(\d{2})-(\d{2})/.exec(first);
    const startD = fm ? new Date(+fm[1], +fm[2]-1, +fm[3]) : null;
    const total = startD ? Math.round((end - startD) / 86400000) : 0;
    setRing(total > 0 && days > 0 ? Math.min(days, total) / total : 0);
    const label = end.toLocaleDateString('en-US', {weekday:'short', month:'short', day:'numeric', year:'numeric'});
    if(days > 0){ v.textContent = days + (days === 1 ? ' day' : ' days'); m.textContent = 'Ends ' + label; }
    else if(days === 0){ v.textContent = 'Due today'; m.textContent = 'Ends ' + label; }
    else { v.textContent = 'Deadline passed'; m.textContent = Math.abs(days) + (Math.abs(days) === 1 ? ' day' : ' days') + ' ago \u00b7 ' + label; }
  }
  // Ring helper (Account Settings): fills with the share USED and colors by how much is used —
  // green under 60%, yellow 60-90%, red over 90%. (--amber in this theme is sky blue, so yellow is set here.)
  window.ggRingTone = function(ring, used){
    if(!ring) return;
    const r = Math.max(0, Math.min(1, isFinite(used) ? used : 0));
    ring.style.setProperty('--off', (214 - 214*r).toFixed(1));
    ring.style.stroke = r > .9 ? 'var(--red)' : r >= .6 ? 'var(--warn)' : 'var(--green)';
  };
  // Daily loss remaining tile: limit from saved setup, used = today's losing trades (same rule as Today's Summary).
  function ggApplyLossTile(){
    const v = document.getElementById('ggLossV'), m = document.getElementById('ggLossM'), ring = document.getElementById('ggGaugeLoss');
    if(!v || !m) return;
    const lim = Number(window.jlDailyLossLimit) || 0;
    if(!(lim>0)){ v.textContent='Not set'; m.textContent='No daily loss limit set'; window.ggRingTone(ring, 0); return; }
    const key = typeof window.getTradingDayIST === 'function' ? window.getTradingDayIST() : '';
    const used = Math.max(0, -((window.__trades || []).reduce((sum, t) => (t && t.d === key && isFinite(Number(t.pnl))) ? sum + Number(t.pnl) : sum, 0)));
    const left = Math.max(0, lim - used), usd = n => '$' + n.toFixed(2);
    v.textContent = usd(left);
    m.textContent = used >= lim ? 'Limit reached \u00b7 ' + usd(used) + ' used of ' + usd(lim) : usd(used) + ' used of ' + usd(lim);
    window.ggRingTone(ring, used / lim);
  }
  let ggAccount = ggLoadAccount();
  // Exposed globally so tabs in later, separate <script> blocks (Today's Summary, the
  // revenge-trade detector) read the same configured numbers instead of each keeping its
  // own hardcoded copy of the profit target / daily loss limit / trade cap.
  window.jlRevWindowMin = Number(ggAccount.revWindowMin) || 0;
  window.jlProfitTargetUSD = Number(ggAccount.balance) * (Number(ggAccount.profitTargetPct)||0) / 100;
  window.jlDailyLossLimit = Number(ggAccount.maxDailyLossUSD) || 0; window.jlWeeklyLossLimit = Number(ggAccount.maxWeeklyLossUSD) || 0;
  window.jlMaxTradesPerDay = Number(ggAccount.maxTradesPerDay) || 0; window.jlStartBalance = Number(ggAccount.balance) || 0; window.jlDayProfitTargetUSD = (ggAccount.dayProfitTargetUnit === '$') ? (Number(ggAccount.dayProfitTarget)||0) : Number(ggAccount.balance) * (Number(ggAccount.dayProfitTarget)||0) / 100; window.jlWeeklyProfitTargetUSD = (ggAccount.weeklyProfitTargetUnit === '$') ? (Number(ggAccount.weeklyProfitTarget)||0) : Number(ggAccount.balance) * (Number(ggAccount.weeklyProfitTarget)||0) / 100;

  const ggState = {sl:5, pv:.05, bal:ggAccount.balance, pt:ggAccount.profitTargetPct, mt:ggAccount.maxTradesPerDay, dpt:Number(ggAccount.dayProfitTarget)||0, wpt:Number(ggAccount.weeklyProfitTarget)||0, rpt:(Number(ggAccount.riskPerTrade)>0?Number(ggAccount.riskPerTrade):0), rr:(Number(ggAccount.minRr)>0?Number(ggAccount.minRr):0), mdl:Number(ggAccount.maxDailyLossValue)||0, mwl:Number(ggAccount.maxWeeklyLossValue)||0, mdd:Number(ggAccount.maxDrawdown)||0, revWin:ggAccount.revWindowMin, lot:Number(ggAccount.lotSize)||0, mcl:Number(ggAccount.maxConsecLosses)||0, mrv:Number(ggAccount.maxRevengeTrades)||0, sdl:Number(ggAccount.sameDirLossPct)||0, cns:Number(ggAccount.consistencyPct)||0, mtd:Number(ggAccount.minTradingDays)||0, spl:Number(ggAccount.profitSplit)||0};
  const ggIds = {bal:'ggBal',pt:'ggPt',mt:'ggMt',dpt:'ggDpt',wpt:'ggWpt',rpt:'ggRpt',rr:'ggRr',mdl:'ggMdl',mwl:'ggMwl',mdd:'ggMdd',revWin:'ggRevWin',lot:'ggLot',mcl:'ggMcl',mrv:'ggMrv',sdl:'ggSdl',cns:'ggCns',mtd:'ggMtd',spl:'ggSpl'};
  // Loss limits can be $ or % of the starting balance; percent steps are a tenth of the dollar step.
  window.ggStep = function(id, d){
    if(id === 'mdl' || id === 'mwl'){ const u = document.getElementById(id === 'mdl' ? 'ggMdlUnit' : 'ggMwlUnit'); if(u && u.value === '%') d = d/10; }
    ggState[id] = +(ggState[id] + d).toFixed(2);
    if(ggState[id] < 0) ggState[id] = 0;
    if((id === 'cns' || id === 'spl' || id === 'sdl') && ggState[id] > 100) ggState[id] = 100;
    document.getElementById(ggIds[id]).value = ((id==='rpt'||id==='rr'||id==='revWin')&&!(ggState[id]>0)) ? '' : ggState[id];
    if(id === 'mdd' && window.__renderDDRing) window.__renderDDRing();
  };

  // One-tap FundingPips 2 Step Flex (Phase 1) preset: fills the fields only, saving stays with Save setup.
  window.ggApplyFpFlex = function(ph){
    const ggFpPt = (ph === 2) ? 6 : 10;
    ggState.mdl = 4; ggState.mdd = 12; ggState.pt = ggFpPt; ggState.cns = 0; ggState.mtd = 0; ggState.spl = 0;
    const put = function(id, v){ const e = document.getElementById(id); if(e) e.value = v; };
    put('ggMdl', 4); put('ggMdlUnit', '%'); put('ggMdd', 12); put('ggMddUnit', '%'); put('ggPt', ggFpPt); put('ggCns', 0); put('ggMtd', 0); put('ggSpl', 0);
    if(window.__renderDDRing) window.__renderDDRing();
    if(typeof window.jlToast === 'function') window.jlToast({text:'FundingPips Phase ' + (ph === 2 ? '2' : '1') + ' values filled', sub:'Tap Save setup to keep them', duration:4000});
  };

  // Fills the Account Settings fields from a FundingPips plan (fields only, saving stays with Save setup).
  window.ggFpFill = function(v){
    const put = function(id, x){ const e = document.getElementById(id); if(e) e.value = x; };
    if(v.bal != null){ ggState.bal = v.bal; put('ggBal', v.bal); }
    if(v.mdl != null){ ggState.mdl = v.mdl; put('ggMdl', v.mdl); put('ggMdlUnit', '%'); }
    if(v.mdd != null){ ggState.mdd = v.mdd; put('ggMdd', v.mdd); put('ggMddUnit', '%'); }
    if(v.pt != null){ ggState.pt = v.pt; put('ggPt', v.pt); }
    if(v.cns != null){ ggState.cns = v.cns; put('ggCns', v.cns); }
    if(v.mtd != null){ ggState.mtd = v.mtd; put('ggMtd', v.mtd); }
    if(v.spl != null){ ggState.spl = v.spl; put('ggSpl', v.spl); }
    if(window.__renderDDRing) window.__renderDDRing();
    return true;
  };

  // hydrate the Account panel + read-only displays from whatever was last saved
  document.getElementById('ggBal').value = ggAccount.balance;
  const ggRevWinEl = document.getElementById('ggRevWin'); if(ggRevWinEl) ggRevWinEl.value = Number(ggAccount.revWindowMin)>0 ? ggAccount.revWindowMin : '';
  const ggPtEl = document.getElementById('ggPt'); if(ggPtEl) ggPtEl.value = ggAccount.profitTargetPct;
  const ggMdlEl = document.getElementById('ggMdl'); if(ggMdlEl) ggMdlEl.value = ggState.mdl;
  const ggMwlEl = document.getElementById('ggMwl'); if(ggMwlEl) ggMwlEl.value = ggState.mwl;
  const ggMdlUnitEl = document.getElementById('ggMdlUnit'); if(ggMdlUnitEl) ggMdlUnitEl.value = ggAccount.maxDailyLossUnit === '%' ? '%' : '$';
  const ggMwlUnitEl = document.getElementById('ggMwlUnit'); if(ggMwlUnitEl) ggMwlUnitEl.value = ggAccount.maxWeeklyLossUnit === '%' ? '%' : '$';
  const ggLossUSD = (val, unit, bal) => unit === '%' ? (Number(bal) > 0 ? Math.round(Number(bal) * Number(val) / 100 * 100) / 100 : 0) : (Number(val) || 0);
  const ggMtEl = document.getElementById('ggMt'); if(ggMtEl) ggMtEl.value = ggAccount.maxTradesPerDay;
  const ggDptEl = document.getElementById('ggDpt'); if(ggDptEl) ggDptEl.value = ggState.dpt;
  const ggDptUnitEl = document.getElementById('ggDptUnit'); if(ggDptUnitEl) ggDptUnitEl.value = ggAccount.dayProfitTargetUnit === '$' ? '$' : '%';
  const ggWptEl = document.getElementById('ggWpt'); if(ggWptEl) ggWptEl.value = ggState.wpt;
  const ggWptUnitEl = document.getElementById('ggWptUnit'); if(ggWptUnitEl) ggWptUnitEl.value = ggAccount.weeklyProfitTargetUnit === '$' ? '$' : '%';
  const ggRptEl = document.getElementById('ggRpt'); if(ggRptEl) ggRptEl.value = ggState.rpt>0 ? ggState.rpt : '';
  const ggRrEl = document.getElementById('ggRr'); if(ggRrEl) ggRrEl.value = ggState.rr>0 ? ggState.rr : '';
  const ggLotEl = document.getElementById('ggLot'); if(ggLotEl) ggLotEl.value = ggState.lot;
  const ggMclEl = document.getElementById('ggMcl'); if(ggMclEl) ggMclEl.value = ggState.mcl;
  const ggMrvEl = document.getElementById('ggMrv'); if(ggMrvEl) ggMrvEl.value = ggState.mrv;
  const ggSdlEl = document.getElementById('ggSdl'); if(ggSdlEl) ggSdlEl.value = ggState.sdl;
  const ggFriEl = document.getElementById('ggFri'); if(ggFriEl) ggFriEl.value = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(ggAccount.fridayCutoff || '')) ? ggAccount.fridayCutoff : '';
  [['ggCns','cns'],['ggMtd','mtd'],['ggSpl','spl']].forEach(function(a){ const el = document.getElementById(a[0]); if(el) el.value = ggState[a[1]]; });
  const ggNewsEl = document.getElementById('ggNews'); if(ggNewsEl) ggNewsEl.value = ggAccount.tradeDuringNews === 'no' ? 'no' : ggAccount.tradeDuringNews === 'yes' ? 'yes' : '';
  const ggBroEl = document.getElementById('ggBro'); if(ggBroEl) ggBroEl.value = (ggAccount.brokerUtcOffset === '' || ggAccount.brokerUtcOffset == null) ? '' : String(ggAccount.brokerUtcOffset);
  window.jlLotSize = Number(ggAccount.lotSize) || 0; window.jlMaxConsecLosses = Number(ggAccount.maxConsecLosses) || 0; window.jlMaxRevengeTrades = Number(ggAccount.maxRevengeTrades) || 0; window.jlSameDirLossLimit = (Number(ggAccount.balance) || 0) * (Number(ggAccount.sameDirLossPct) || 0) / 100; window.jlFridayCutoff = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(ggAccount.fridayCutoff || '')) ? ggAccount.fridayCutoff : ''; window.jlMinRr = Number(ggAccount.minRr) || 0; window.jlConsistencyPct = Number(ggAccount.consistencyPct) || 0; window.jlMinTradingDays = Number(ggAccount.minTradingDays) || 0; window.jlProfitSplit = Number(ggAccount.profitSplit) || 0; window.jlTradeDuringNews = ggAccount.tradeDuringNews === 'no' ? 'no' : ggAccount.tradeDuringNews === 'yes' ? 'yes' : ''; window.jlBrokerUtcOffset = (ggAccount.brokerUtcOffset === '' || ggAccount.brokerUtcOffset == null || !isFinite(Number(ggAccount.brokerUtcOffset))) ? null : Number(ggAccount.brokerUtcOffset); if(typeof window.jlRenderWeak === 'function') window.jlRenderWeak(); if(typeof window.__psyRerender === 'function') window.__psyRerender();
  if(window.jlApplyChLimits) window.jlApplyChLimits({noRefresh:true});
  const ggMddEl = document.getElementById('ggMdd'); if(ggMddEl) ggMddEl.value = ggState.mdd;
  const ggMddUnitEl = document.getElementById('ggMddUnit'); if(ggMddUnitEl) ggMddUnitEl.value = ggAccount.maxDrawdownUnit === '$' ? '$' : '%';
  if(ggMddUnitEl) ggMddUnitEl.addEventListener('change', ()=>{ if(window.__renderDDRing) window.__renderDDRing(); });
  const ggPhaseDisplay = document.getElementById('ggPhaseDisplay'); if(ggPhaseDisplay) ggPhaseDisplay.textContent = ggAccount.phase || 'Not set';
  const ggAcctTypeSel = document.getElementById('ggAcctType'); if(ggAcctTypeSel) ggAcctTypeSel.value = ggAccount.type;
  const ggDeadlineEl = document.getElementById('ggDeadline'); if(ggDeadlineEl) ggDeadlineEl.value = ggAccount.deadline || '';
  ggApplyAccountDisplay(ggAccount);

  // Account phase only applies to a funded (prop-firm) account — a live account has no
  // phase concept, so hide the whole field rather than show a meaningless value.
  function ggApplyAcctType(type){
    const field = document.getElementById('ggPhaseField');
    if(field) field.hidden = (type === 'live');
  }
  ggApplyAcctType(ggAccount.type);
  if(ggAcctTypeSel) ggAcctTypeSel.addEventListener('change', ()=> ggApplyAcctType(ggAcctTypeSel.value));

  window.ggToggleSetup = function(){
    const el = document.getElementById('ggSetup'), btn = document.querySelector('.gg-edit-btn');
    const open = el.classList.toggle('open');
    btn.classList.toggle('on', open);
    document.getElementById('ggEditLbl').textContent = open ? 'Close' : 'Edit setup';
  };
  // Repaints everything that reads the limits, used when the running challenge changes (new challenge, end date passed).
  window.jlRefreshLimitViews = function(){
    if(typeof window.jlRecomputeRevenge === 'function') window.jlRecomputeRevenge({rerender:true});
    if(typeof window.__renderToday === 'function') window.__renderToday();
    if(typeof window.jlPaintRules === 'function') window.jlPaintRules();
    if(typeof window.jlCircuitRefresh === 'function') window.jlCircuitRefresh();
    ggApplyAccountDisplay(ggAccount);
    ggRenderGoals();
    if(window.__renderDDRing) window.__renderDDRing();
  };

  window.ggSaveSetup = function(){
    ggAccount = {
      balance: ggState.bal,
      phase: ggAccount.phase, // not user-set — carries over until real bridge sync is wired (see TODO above)
      type: ggAcctTypeSel ? ggAcctTypeSel.value : ggAccount.type,
      revWindowMin: ggState.revWin,
      profitTargetPct: ggState.pt,
      maxDailyLossValue: ggState.mdl,
      maxDailyLossUnit: ggMdlUnitEl ? ggMdlUnitEl.value : '$',
      maxDailyLossUSD: ggLossUSD(ggState.mdl, ggMdlUnitEl ? ggMdlUnitEl.value : '$', ggState.bal),
      maxWeeklyLossValue: ggState.mwl,
      maxWeeklyLossUnit: ggMwlUnitEl ? ggMwlUnitEl.value : '$',
      maxWeeklyLossUSD: ggLossUSD(ggState.mwl, ggMwlUnitEl ? ggMwlUnitEl.value : '$', ggState.bal),
      maxTradesPerDay: ggState.mt,
      dayProfitTarget: ggState.dpt,
      dayProfitTargetUnit: ggDptUnitEl ? ggDptUnitEl.value : (ggAccount.dayProfitTargetUnit || '%'),
      weeklyProfitTarget: ggState.wpt,
      weeklyProfitTargetUnit: ggWptUnitEl ? ggWptUnitEl.value : (ggAccount.weeklyProfitTargetUnit || '%'),
      riskPerTrade: ggState.rpt,
      minRr: ggState.rr,
      lotSize: ggState.lot,
      maxConsecLosses: ggState.mcl,
      maxRevengeTrades: ggState.mrv,
      sameDirLossPct: ggState.sdl,
      fridayCutoff: (function(){ const e = document.getElementById('ggFri'); if(!e) return (ggAccount.fridayCutoff || ''); return /^([01]\d|2[0-3]):[0-5]\d$/.test(e.value) ? e.value : ''; })(),
      consistencyPct: ggState.cns,
      minTradingDays: ggState.mtd,
      profitSplit: ggState.spl,
      tradeDuringNews: (ggNewsEl && ggNewsEl.value === 'no') ? 'no' : (ggNewsEl && ggNewsEl.value === 'yes') ? 'yes' : '',
      brokerUtcOffset: (function(){ const e = document.getElementById('ggBro'); if(!e) return (ggAccount.brokerUtcOffset == null ? '' : ggAccount.brokerUtcOffset); return e.value === '' ? '' : Number(e.value); })(),
      maxDrawdown: ggState.mdd,
      maxDrawdownUnit: ggMddUnitEl ? ggMddUnitEl.value : (ggAccount.maxDrawdownUnit || '%'),
      deadline: ggDeadlineEl ? ggDeadlineEl.value : (ggAccount.deadline || '')
    };
    try{ localStorage.setItem(ACC_KEY, JSON.stringify(ggAccount)); }catch(e){console.debug('[journall] ignored error in account-settings.js:', e);}
    window.jlRevWindowMin = Number(ggAccount.revWindowMin) || 0;
    window.jlProfitTargetUSD = Number(ggAccount.balance) * (Number(ggAccount.profitTargetPct)||0) / 100;
    window.jlDailyLossLimit = Number(ggAccount.maxDailyLossUSD) || 0; window.jlWeeklyLossLimit = Number(ggAccount.maxWeeklyLossUSD) || 0;
    window.jlMaxTradesPerDay = Number(ggAccount.maxTradesPerDay) || 0; window.jlStartBalance = Number(ggAccount.balance) || 0; window.jlDayProfitTargetUSD = (ggAccount.dayProfitTargetUnit === '$') ? (Number(ggAccount.dayProfitTarget)||0) : Number(ggAccount.balance) * (Number(ggAccount.dayProfitTarget)||0) / 100; window.jlWeeklyProfitTargetUSD = (ggAccount.weeklyProfitTargetUnit === '$') ? (Number(ggAccount.weeklyProfitTarget)||0) : Number(ggAccount.balance) * (Number(ggAccount.weeklyProfitTarget)||0) / 100;
    window.jlLotSize = Number(ggAccount.lotSize) || 0; window.jlMaxConsecLosses = Number(ggAccount.maxConsecLosses) || 0; window.jlMaxRevengeTrades = Number(ggAccount.maxRevengeTrades) || 0; window.jlSameDirLossLimit = (Number(ggAccount.balance) || 0) * (Number(ggAccount.sameDirLossPct) || 0) / 100; window.jlFridayCutoff = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(ggAccount.fridayCutoff || '')) ? ggAccount.fridayCutoff : ''; window.jlMinRr = Number(ggAccount.minRr) || 0; window.jlConsistencyPct = Number(ggAccount.consistencyPct) || 0; window.jlMinTradingDays = Number(ggAccount.minTradingDays) || 0; window.jlProfitSplit = Number(ggAccount.profitSplit) || 0; window.jlTradeDuringNews = ggAccount.tradeDuringNews === 'no' ? 'no' : ggAccount.tradeDuringNews === 'yes' ? 'yes' : ''; window.jlBrokerUtcOffset = (ggAccount.brokerUtcOffset === '' || ggAccount.brokerUtcOffset == null || !isFinite(Number(ggAccount.brokerUtcOffset))) ? null : Number(ggAccount.brokerUtcOffset); if(typeof window.jlRenderWeak === 'function') window.jlRenderWeak(); if(typeof window.__psyRerender === 'function') window.__psyRerender();
    if(window.jlApplyChLimits) window.jlApplyChLimits({noRefresh:true});
    if(typeof window.jlRecomputeRevenge === 'function') window.jlRecomputeRevenge({rerender:true});
    if(typeof window.__renderToday === 'function') window.__renderToday();
    if(typeof window.jlPaintRules === 'function') window.jlPaintRules();
    if(typeof window.jlCircuitRefresh === 'function') window.jlCircuitRefresh();
    ggApplyAccountDisplay(ggAccount);
    ggApplyAcctType(ggAccount.type);
    ggRenderGoals(); // streak depends on the limits just saved
    if(window.__renderDDRing) window.__renderDDRing();
    if(window.__renderProp) window.__renderProp();
    ggToggleSetup();
    const t = document.getElementById('gToast') || document.getElementById('ggToast');
    if(t){ t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),1800); }
  };

  document.querySelectorAll('.gg-tab').forEach(tab=>{
    tab.addEventListener('click', ()=>{
      document.querySelectorAll('.gg-tab').forEach(x=>x.classList.remove('on'));
      tab.classList.add('on');
      const key = tab.dataset.t;
      document.querySelectorAll('.gg-tab-panel').forEach(p=>{ p.hidden = p.dataset.p !== key; });
    });
  });

  function ggBump(el){
    if(!el) return;
    el.classList.remove('bump');
    void el.offsetWidth; // restart animation
    el.classList.add('bump');
  }

  function ggCountUp(el, end, prefix, dur){
    const t0 = performance.now();
    function tick(t){
      const p = Math.min(1,(t-t0)/dur), eased = 1-Math.pow(1-p,3);
      el.textContent = prefix + (end*eased).toFixed(2);
      if(p<1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  let ggAnimated = false;
  let ggGoalsSynced = false;
  window.gPlayEntrance = function(){
    ggApplyDeadline(ggAccount.deadline);
    ggApplyLossTile();
    // goals were first drawn before the trade data existed, so redraw once the data is there
    if(!ggGoalsSynced && window.__A && window.__trades){ ggGoalsSynced = true; ggRenderGoals(); }
    if(ggAnimated) return; ggAnimated = true;
    const _A=window.__A,_bal=window.jlLiveBalance?window.jlLiveBalance(_A):_A.start+_A.net;
    window.__jlJourneyPlayed = true;
    if(_A.start>0) ggCountUp(document.getElementById('ggBalVal'), _bal, '$', 1100); else document.getElementById('ggBalVal').textContent='Not set';
    setTimeout(()=>{ if(window.__renderJourney) window.__renderJourney(); }, 250);
  };

  // ---------- multi-type goals ----------
  const GG_ICON = {
    target:'<path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"/><path d="M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
    dollar:'<path d="M12 2v20M17 6.5c0-1.9-2-3-5-3s-5 1.3-5 3.3 2 2.8 5 3.4 5 1.5 5 3.5-2 3.3-5 3.3-5-1.1-5-3"/>',
    flame:'<path d="M12 22c4 0 7-2.7 7-7 0-3.3-2-5-3-7-.3 2-1.5 3-2.5 2 .5-3-1-5.5-3.5-7 0 3-1 4.5-3 6.5C5 11.5 5 13.5 5 15c0 4.3 3 7 7 7Z"/>',
    layers:'<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/><path d="m3 17 9 5 9-5" opacity=".5"/>',
    shield:'<path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z"/><path d="m8.5 12 2.4 2.4L16 9.5"/>',
    star:'<path d="m12 2 3.1 6.4 7 1-5 5 1.2 7-6.3-3.4-6.3 3.4 1.2-7-5-5 7-1L12 2Z"/>'
  };
  const GG_TYPES = [
    {id:'balance', name:'Profit target', unit:'$', color:'var(--green)', icon:'dollar',
      desc:'Grow your account to a target balance or gain.',
      def:{title:'Reach account balance', target:6000, current:0}},
    {id:'winrate', name:'Win rate goal', unit:'%', color:'var(--amber)', icon:'target',
      desc:'Hold a minimum win rate across your trades.',
      def:{title:'Maintain win rate', target:40, current:0}},
    {id:'streak', name:'Discipline streak', unit:'days', color:'var(--accent-2)', icon:'flame',
      desc:'Consecutive days following every rule with no breaks.',
      def:{title:'No rule breaks streak', target:14, current:0}},
    {id:'volume', name:'Trade volume', unit:'trades', color:'var(--silver)', icon:'layers',
      desc:'Journal or take a target number of trades.',
      def:{title:'Journal trades', target:100, current:0}},
    {id:'risk', name:'Risk control', unit:'days', color:'var(--red)', icon:'shield',
      desc:'Stay under your max daily loss for a run of days.',
      def:{title:'Days under max loss', target:20, current:0}},
    {id:'custom', name:'Custom milestone', unit:'', color:'var(--accent)', icon:'star',
      desc:'Any freeform goal with your own target and deadline.',
      def:{title:'Custom milestone', target:100, current:0}}
  ];
  const GG_KEY = 'jlGoals2';
  let ggGoals = [];
  try{ ggGoals = JSON.parse(localStorage.getItem(GG_KEY)) || null; }catch(e){console.debug('[journall] ignored error in account-settings.js:', e);}
  if(!ggGoals){
    ggGoals = [
      {id:1, typeId:'winrate', title:'Maintain win rate', target:40, current:0, unit:'%', deadline:'', createdAt:Date.now()-12*86400000},
      {id:2, typeId:'streak', title:'No rule breaks streak', target:14, current:0, unit:'days', deadline:'', createdAt:Date.now()-4*86400000},
      {id:3, typeId:'volume', title:'Journal trades', target:100, current:0, unit:'trades', deadline:'', createdAt:Date.now()-20*86400000}
    ];
  }
  const ggSaveGoals = ()=>{ try{ localStorage.setItem(GG_KEY, JSON.stringify(ggGoals)); }catch(e){console.debug('[journall] ignored error in account-settings.js:', e);} };
  const ggType = id => GG_TYPES.find(t=>t.id===id) || GG_TYPES[GG_TYPES.length-1];

  function ggGoalStatus(g){
    const ratio = g.target ? Math.max(0, Math.min(1, g.current/g.target)) : 0;
    if(ratio >= 1) return {label:'Achieved', cls:'done', ratio:1};
    if(g.deadline){
      const total = new Date(g.deadline).getTime() - g.createdAt;
      const elapsed = Date.now() - g.createdAt;
      if(total > 0){
        const expected = Math.max(0, Math.min(1, elapsed/total));
        if(Date.now() > new Date(g.deadline).getTime() || ratio < expected - .18) return {label:'Behind', cls:'behind', ratio};
      }
    }
    return {label:'On track', cls:'on', ratio};
  }

  // Discipline streak = consecutive trading days (most recent backwards) with no rule break.
  // A broken day = that day's total losses reached the daily loss limit, or its trade count reached
  // the max-trades limit (same two rules Today's Summary flags). Days with no trades are skipped, not counted.
  function ggDisciplineStreak(){
    const lossLim = Number(window.jlDailyLossLimit) || 0, tradeLim = Number(window.jlMaxTradesPerDay) || 0;
    const byDay = {};
    (window.__trades || []).forEach(t=>{
      if(!t || !t.d) return;
      const b = byDay[t.d] || (byDay[t.d] = {net:0, loss:0, n:0});
      b.n++; b.net += Number(t.pnl) || 0; b.loss = Math.max(0, -b.net);
    });
    const days = Object.keys(byDay).sort().reverse();
    let streak = 0;
    for(const d of days){
      const b = byDay[d];
      if((lossLim>0 && b.loss >= lossLim) || (tradeLim>0 && b.n >= tradeLim)) break;
      streak++;
    }
    return streak;
  }
  function ggRenderGoals(){
    ggGoals.forEach(g=>{ if(g.typeId==='streak'&&!g.manual) g.current = ggDisciplineStreak(); });
    const A=window.__A;if(A)ggGoals.forEach(g=>{if(g.manual)return;if(g.typeId==='balance')g.current=A.start+A.net;else if(g.typeId==='winrate')g.current=Math.round(A.wr);else if(g.typeId==='volume'){const TR=window.__trades||[];g.current=(/journal/i.test(g.title||'')&&TR.some(t=>t&&t.j!==undefined))?TR.filter(t=>t&&t.j).length:A.n}});
    const grid = document.getElementById('ggGoalsGrid');
    document.getElementById('ggGoalsMeta').textContent = ggGoals.length
      ? ggGoals.length+' active goal'+(ggGoals.length===1?'':'s')+' alongside your phase target'
      : 'No goals yet — add a win-rate, streak or custom goal to track';
    grid.innerHTML = ggGoals.map((g,i)=>{
      const t = ggType(g.typeId), st = ggGoalStatus(g), pct = (st.ratio*100).toFixed(0);
      return '<div class="gg-goal-card" style="--gc:'+t.color+';animation-delay:'+(i*.05)+'s">'
        +'<div class="gg-goal-top"><div class="gg-goal-ic"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+GG_ICON[t.icon]+'</svg></div>'
        +'<button class="gg-goal-del" title="Remove goal" onclick="ggDeleteGoal('+g.id+')"><svg viewBox="0 0 24 24" width="14" height="14"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg></button></div>'
        +'<div class="gg-goal-title">'+g.title+'</div><div class="gg-goal-sub">'+t.name+(g.manual?' · manual':'')+'</div>'
        +'<div class="gg-goal-bar"><i style="width:'+pct+'%"></i></div>'
        +'<div class="gg-goal-nums"><b>'+g.current+(g.unit==='%'?'%':'')+'</b><span>of '+g.target+(g.unit&&g.unit!=='%'?' '+g.unit:g.unit==='%'?'%':'')+'</span></div>'
        +'<div class="gg-goal-foot"><span class="gg-goal-badge '+st.cls+'">'+st.label+'</span>'
        +'<span style="display:flex;gap:6px">'+(g.manual?'<button class="gg-goal-bump" title="Go back to automatic tracking" onclick="ggAutoGoal('+g.id+')">Auto</button>':'')+'<button class="gg-goal-bump" onclick="ggBumpGoal('+g.id+')">+ Log</button></span></div>'
        +'</div>';
    }).join('')
    + '<button class="gg-goal-add" style="animation-delay:'+(ggGoals.length*.05)+'s" onclick="ggOpenTypePicker()">'
      + '<span class="gg-goal-add-ic">+</span><span>Add a goal</span></button>';
  }
  window.ggBumpGoal = function(id){
    const g = ggGoals.find(x=>x.id===id); if(!g) return;
    const step = g.typeId==='balance' ? Math.round(g.target*.02) || 10 : 1;
    if(g.typeId!=='custom') g.manual = true;
    g.current = Math.min(g.target, +(g.current + step).toFixed(2));
    ggSaveGoals(); ggRenderGoals();
  };
  window.ggAutoGoal = function(id){
    const g = ggGoals.find(x=>x.id===id); if(!g) return;
    delete g.manual; ggSaveGoals(); ggRenderGoals();
  };
  window.ggDeleteGoal = function(id){
    ggGoals = ggGoals.filter(x=>x.id!==id);
    ggSaveGoals(); ggRenderGoals();
  };

  // ---------- add-goal modal ----------
  let ggPickedType = null;
  window.ggOpenTypePicker = function(){
    ggPickedType = null;
    document.getElementById('ggModalTitle').textContent = 'Choose a goal type';
    document.getElementById('ggTypeGrid').hidden = false;
    document.getElementById('ggGoalForm').hidden = true;
    document.getElementById('ggModalFoot').hidden = true;
    document.getElementById('ggTypeGrid').innerHTML = GG_TYPES.map(t=>
      '<button class="gg-type-card" style="--gc:'+t.color+'" onclick="ggSelectType(\''+t.id+'\')">'
      +'<div class="gg-goal-ic"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+GG_ICON[t.icon]+'</svg></div>'
      +'<div><b>'+t.name+'</b><p>'+t.desc+'</p></div></button>'
    ).join('');
    document.getElementById('ggModalScrim').classList.add('show');
  };
  window.ggCloseModal = function(){ document.getElementById('ggModalScrim').classList.remove('show'); };
  window.ggBackToTypes = function(){ ggOpenTypePicker(); };
  window.ggSelectType = function(id){
    ggPickedType = ggType(id);
    document.getElementById('ggModalTitle').textContent = ggPickedType.name;
    document.getElementById('ggTypeGrid').hidden = true;
    document.getElementById('ggModalFoot').hidden = false;
    const f = document.getElementById('ggGoalForm');
    f.hidden = false;
    const unitLbl = ggPickedType.unit ? ' ('+ggPickedType.unit+')' : '';
    f.innerHTML =
      '<div class="gg-field"><span class="l">Goal title</span><input class="gg-select" id="ggfTitle" value="'+ggPickedType.def.title+'"></div>'
      +'<div class="gg-mgrid">'
      +'<div class="gg-field"><span class="l">Current'+unitLbl+'</span><input class="gg-select" id="ggfCurrent" type="number" value="'+ggPickedType.def.current+'"></div>'
      +'<div class="gg-field"><span class="l">Target'+unitLbl+'</span><input class="gg-select" id="ggfTarget" type="number" value="'+ggPickedType.def.target+'"></div>'
      +'</div>'
      +'<div class="gg-field"><span class="l">Deadline (optional)</span><input class="gg-select" id="ggfDeadline" type="date"></div>';
  };
  window.ggCreateGoal = function(){
    if(!ggPickedType) return;
    const title = (document.getElementById('ggfTitle').value || ggPickedType.def.title).trim();
    const current = +document.getElementById('ggfCurrent').value || 0;
    const target = +document.getElementById('ggfTarget').value || 1;
    const deadline = document.getElementById('ggfDeadline').value || '';
    ggGoals.push({id:Date.now(), typeId:ggPickedType.id, title, target, current, unit:ggPickedType.unit, deadline, createdAt:Date.now()});
    ggSaveGoals(); ggRenderGoals(); ggCloseModal();
    const toast = document.getElementById('ggToast');
    toast.textContent = 'Goal added: ' + title;
    toast.classList.add('show'); setTimeout(()=>toast.classList.remove('show'), 2200);
  };

  ggRenderGoals();
})();
