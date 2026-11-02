// ===================== Psychology Command Room (mounted into #psyHost, shares the app's design system) =====================
(function(){
  const STEPS = ["Mind check","Setup scan","Checklist","Live trade","Debrief","Cooldown"];
  const CRUMB = ["mind","setup","checklist","live trade","journal"];
  const progressAnim = {}; // remembers each progress bar's last rendered % so re-renders animate smoothly instead of snapping

  // Default room content. Edits made with the pencil buttons are saved on this device and override these.
  const SETUP_DEFAULTS = [{"k": "req_1", "t": "Both side confirmation"}, {"k": "req_2", "t": "No blockage"}, {"k": "req_3", "t": "No losses back to back; if lost 1, stop for this session"}, {"k": "req_4", "t": "SL above candle and under 40 pips"}, {"k": "req_5", "t": "No c2c before 70 pips"}, {"k": "req_6", "t": "If 1 confirmed and another doesn't, and no blockage on both, you can still take the trade"}];
  const CHECKLIST_DEFAULTS = [{"k": "news", "t": "News Checked", "d": "No high-impact USD news within 30 minutes"}, {"k": "emotion2", "t": "Emotion Calm", "d": "Still calm right before pulling the trigger."}, {"k": "rulesmet", "t": "Plan Rules Met", "d": "Entering only because my plan and risk rules are fully met — not because I want action."}, {"k": "risklimit", "t": "Risk Under Limit", "d": "Lot is 0.02 and risk is about $10 or less"}, {"k": "entry", "t": "Entry Confirmed", "d": "Price action confirms the entry on the setup's confirmed candle or timeframe close."}, {"k": "signal", "t": "Confirmation Signal", "d": "Daily stop not hit: under 4 trades, under 2 losses, week above -$80"}, {"k": "exit", "t": "Exit Plan Set", "d": "SL behind structure, TP at least 2R, and the 1.5R partial planned, all written before entry"}];
  const LIVE_DEFAULTS = [{"k": "live1", "t": "No SL or TP changes.", "d": "Once the trade is live, the stop and target stay where the plan set them. The only change allowed is the move at 1.5R below. Never widen the SL, never remove it."}, {"k": "live2", "t": "At +$7.50 (1.5R), close 0.01 and move SL to entry +$1.", "d": "Wait for a 5M candle close beyond +$7.50. Close half, move the SL on the rest to entry plus $1, then leave the runner to $12-15 or the next structure level."}, {"k": "live3", "t": "Follow the written exit plan.", "d": "Scale or exit only according to the plan written before entry. Never on impulse, and never because price \"feels\" like it will reverse."}];
  const DEBRIEF_DEFAULTS = [{"k": "d1", "t": "Screenshot the trade.", "d": "Save the chart before emotion edits the memory."}, {"k": "d2", "t": "Stop trading for 1 minute.", "d": "Do nothing. Breathe. Do not instantly re-enter."}, {"k": "d3", "t": "If loss happens, take 5 minutes.", "d": "Feel it, then journal why the loss happened."}, {"k": "d4", "t": "Write violated rule for tomorrow.", "d": "Tomorrow dashboard will remind you what not to repeat."}];
  const COOLDOWN_DEFAULT_MIN = [5, 10, 15];

  let MIND_ITEMS = [
    {k:"sleep", t:"Sleep clear", d:"I am not tired, foggy, or forcing trades."},
    {k:"emotion", t:"Emotion calm", d:"No anger, fear, revenge, FOMO, or excitement spike."},
    {k:"patience", t:"Patience ready", d:"I can wait for activation without chasing."},
    {k:"loss", t:"Loss accepted", d:"If SL hits, I will pause, feel it, journal it, and not revenge trade."},
    {k:"noneed", t:"No need to trade", d:"I am okay with no valid setup today."},
    {k:"journal", t:"Journal commitment", d:"After the trade I will screenshot, pause, and journal honestly."},
  ];

  /* checklist text follows Account Settings: lot size, daily trade limit, risk per trade, losses and weekly loss limit (display only; stored text is untouched) */
  function liveDesc(d){
    d=String(d==null?'':d);
    const fm=v=>String(Math.round(v*100)/100);
    let acc={};try{acc=JSON.parse(localStorage.getItem('jlAccountSettings')||'null')||{}}catch(e){console.debug('[journall] ignored error in psychology-room.js:', e);}
    const lot=Number(window.jlLotSize)||0,tr=Number(window.jlMaxTradesPerDay)||0,mcl=Number(window.jlMaxConsecLosses)||0,wl=Number(window.jlWeeklyLossLimit)||0;
    const bal=Number(window.jlStartBalance)||Number(acc.balance)||0,rp=Number(acc.riskPerTrade)||0,risk=bal>0&&rp>0?bal*rp/100:0;
    if(lot>0) d=d.replace(/Lot is \d*\.?\d+/,'Lot is '+fm(lot));
    if(tr>0) d=d.replace(/under \d+ trades/,'under '+tr+' trades');
    if(mcl>0) d=d.replace(/under \d+ losses/,'under '+mcl+' losses');
    if(wl>0) d=d.replace(/week above -\$\d*\.?\d+/,'week above -$'+fm(wl));
    if(risk>0) d=d.replace(/risk is about \$\d*\.?\d+/,'risk is about $'+fm(risk));
    return d;
  }
  window.__psyRerender=function(){ try{ render(); }catch(e){console.debug('[journall] ignored error in psychology-room.js:', e);} };
  let SETUP_REQS = SETUP_DEFAULTS.map(r=>({...r}));

  let CHECKLIST_ITEMS = CHECKLIST_DEFAULTS.map(r=>({...r}));
  let DEBRIEF_ITEMS = DEBRIEF_DEFAULTS.map(r=>({...r}));

  const COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2 hours between trades
  let COOLDOWN_OPTIONS_MIN = COOLDOWN_DEFAULT_MIN.slice(); // selectable post-trade pause lengths (Cooldown step), editable

  // Storage: window.storage only exists inside Claude's artifact preview. On the live site the room lists
  // (everything you can edit with the pencil buttons) are kept in localStorage so edits survive a reload;
  // session progress stays in memory only, as before.
  const PERSIST_KEYS = ['mind:items','setup:requirements','checklist:items','live:rules','debrief:items','cooldown:options'];
  const LS_PREFIX = 'jlPsy:';
  const memoryStore = {};
  const STORAGE = (typeof window !== 'undefined' && window.storage) ? window.storage : {
    async get(key){
      if(PERSIST_KEYS.indexOf(key) > -1){ try{ const v = localStorage.getItem(LS_PREFIX + key); if(v !== null) return {key, value: v}; }catch(e){console.debug('[journall] ignored error in psychology-room.js:', e);} }
      return (key in memoryStore) ? {key, value: memoryStore[key]} : null;
    },
    async set(key, value){
      if(PERSIST_KEYS.indexOf(key) > -1){ try{ localStorage.setItem(LS_PREFIX + key, value); }catch(e){console.debug('[journall] ignored error in psychology-room.js:', e);} }
      memoryStore[key] = value; return {key, value};
    },
    async delete(key){
      if(PERSIST_KEYS.indexOf(key) > -1){ try{ localStorage.removeItem(LS_PREFIX + key); }catch(e){console.debug('[journall] ignored error in psychology-room.js:', e);} }
      delete memoryStore[key]; return {key, deleted:true};
    },
    async list(){ return {keys: Object.keys(memoryStore)}; }
  };

  let LIVE_RULES = LIVE_DEFAULTS.map(r=>({...r}));

  let state = {
    step: 1,
    mind: Object.fromEntries(MIND_ITEMS.map(i=>[i.k,false])),
    mindEditing: false,
    setup: Object.fromEntries(SETUP_REQS.map(i=>[i.k,false])),
    setupEditing: false,
    setupType: "Buy Setup",
    checklist: Object.fromEntries(CHECKLIST_ITEMS.map(i=>[i.k,false])),
    checklistEditing: false,
    liveEditing: false,
    debriefEditing: false,
    cooldownEditing: false,
    debriefNote: "",
    reminder: null,
    lastTradeCompletedAt: null,
    cooldown15StartedAt: null,
    cooldownDurationMs: null
  };

  function syncSetupState(){
    const next = {};
    SETUP_REQS.forEach(r=>{ next[r.k] = (state.setup && state.setup[r.k]) ? true : false; });
    state.setup = next;
  }
  function syncMindState(){
    const next = {};
    MIND_ITEMS.forEach(r=>{ next[r.k] = (state.mind && state.mind[r.k]) ? true : false; });
    state.mind = next;
  }
  function syncChecklistState(){
    const next = {};
    CHECKLIST_ITEMS.forEach(r=>{ next[r.k] = (state.checklist && state.checklist[r.k]) ? true : false; });
    state.checklist = next;
  }

  let cooldownTimer = null;
  let stageEl = null; // mount element (#psyHost, in the light DOM)

  async function loadState(){
    try{
      const req = await STORAGE.get('setup:requirements', false);
      if(req && req.value){
        const parsed = JSON.parse(req.value);
        if(Array.isArray(parsed) && parsed.length) SETUP_REQS = parsed;
      }
    }catch(e){console.debug('[journall] ignored error in psychology-room.js:', e);}
    try{
      const m = await STORAGE.get('mind:items', false);
      if(m && m.value){
        const parsed = JSON.parse(m.value);
        if(Array.isArray(parsed) && parsed.length) MIND_ITEMS = parsed;
      }
    }catch(e){console.debug('[journall] ignored error in psychology-room.js:', e);}
    try{
      const c = await STORAGE.get('checklist:items', false);
      if(c && c.value){
        const parsed = JSON.parse(c.value);
        if(Array.isArray(parsed) && parsed.length) CHECKLIST_ITEMS = parsed;
      }
    }catch(e){console.debug('[journall] ignored error in psychology-room.js:', e);}
    try{
      const l = await STORAGE.get('live:rules', false);
      if(l && l.value){
        const parsed = JSON.parse(l.value);
        if(Array.isArray(parsed) && parsed.length) LIVE_RULES = parsed;
      }
    }catch(e){console.debug('[journall] ignored error in psychology-room.js:', e);}
    try{
      const d = await STORAGE.get('debrief:items', false);
      if(d && d.value){
        const parsed = JSON.parse(d.value);
        if(Array.isArray(parsed) && parsed.length) DEBRIEF_ITEMS = parsed;
      }
    }catch(e){console.debug('[journall] ignored error in psychology-room.js:', e);}
    try{
      const c = await STORAGE.get('cooldown:options', false);
      if(c && c.value){
        const parsed = JSON.parse(c.value);
        if(Array.isArray(parsed) && parsed.length) COOLDOWN_OPTIONS_MIN = parsed.map(Number).filter(n=>n>0);
        if(!COOLDOWN_OPTIONS_MIN.length) COOLDOWN_OPTIONS_MIN = COOLDOWN_DEFAULT_MIN.slice();
      }
    }catch(e){console.debug('[journall] ignored error in psychology-room.js:', e);}
    try{
      const s = await STORAGE.get('session:current', false);
      if(s && s.value) Object.assign(state, JSON.parse(s.value));
    }catch(e){console.debug('[journall] ignored error in psychology-room.js:', e);}
    syncSetupState();
    syncMindState();
    syncChecklistState();
    try{
      const r = await STORAGE.get('reminder:last', false);
      if(r && r.value) state.reminder = JSON.parse(r.value);
    }catch(e){console.debug('[journall] ignored error in psychology-room.js:', e);}
    try{
      const t = await STORAGE.get('trade:lastCompletedAt', false);
      if(t && t.value) state.lastTradeCompletedAt = Number(t.value);
    }catch(e){console.debug('[journall] ignored error in psychology-room.js:', e);}
    render();
    if(!cooldownTimer){
      cooldownTimer = setInterval(()=>{
        if(state.step===1 && cooldownActive()) render();
        else if(state.step===6 && cooldown15Active()) render();
      }, 30000);
    }
  }

  async function saveState(){
    try{ await STORAGE.set('session:current', JSON.stringify(state), false); }catch(e){console.debug('[journall] ignored error in psychology-room.js:', e);}
  }

  function icon(){
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
  }
  function editIcon(){
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>';
  }
  function plusIcon(){
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>';
  }
  function xIcon(){
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  }
  function arrowIcon(){
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  }
  const ROW_ICONS = {
    sleep:'<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    emotion:'<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9.5h.01M15 9.5h.01"/>',
    patience:'<path d="M6 2h12M6 22h12M6 2c0 5 4 6 4 10s-4 5-4 10M18 2c0 5-4 6-4 10s4 5 4 10"/>',
    loss:'<path d="M12 2 3 6v6c0 5 3.8 8.4 9 10 5.2-1.6 9-5 9-10V6l-9-4z"/>',
    noneed:'<circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/>',
    journal:'<path d="M12 6v14M12 6C10 4.5 7 4 3 4v14c4 0 7 .5 9 2 2-1.5 5-2 9-2V4c-4 0-7 .5-9 2z"/>',
    news:'<path d="M3 11v3a2 2 0 0 0 2 2h1l3 4V7L6 11H5a2 2 0 0 0-2 2z"/><path d="M15 8a4 4 0 0 1 0 8M18 5a8 8 0 0 1 0 14"/>',
    emotion2:'<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9.5h.01M15 9.5h.01"/>',
    rulesmet:'<path d="M12 2 3 6v6c0 5 3.8 8.4 9 10 5.2-1.6 9-5 9-10V6l-9-4z"/><path d="m9 12 2 2 4-4"/>',
    risklimit:'<path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M4.6 15a9 9 0 1 1 14.8 0M12 12l4-5"/>',
    entry:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    signal:'<path d="M3 12h3l2-7 4 14 2-9 2 2h5"/>',
    exit:'<path d="M5 3v18"/><path d="M5 4h11l-2 4 2 4H5"/>',
    live1:'<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    live2:'<path d="M12 2 3 6v6c0 5 3.8 8.4 9 10 5.2-1.6 9-5 9-10V6l-9-4z"/>',
    live3:'<path d="M9 3v4M15 3v4"/><rect x="3" y="6" width="18" height="15" rx="2"/><path d="m8 14 3 3 6-6"/>',
    d1:'<rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M8 6l1.5-2h5L16 6"/>',
    d2:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    d3:'<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9.5h.01M15 9.5h.01"/>',
    d4:'<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/>'
  };
  function rowIcon(key){
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+(ROW_ICONS[key]||ROW_ICONS.entry)+'</svg>';
  }

  function mindDone(){ return MIND_ITEMS.every(i=>state.mind[i.k]); }
  function setupCount(){ return SETUP_REQS.filter(i=>state.setup[i.k]).length; }
  function setupDone(){ return SETUP_REQS.length > 0 && setupCount() === SETUP_REQS.length; }
  function checklistCount(){ return CHECKLIST_ITEMS.filter(i=>state.checklist[i.k]).length; }
  function checklistDone(){ return checklistCount() === CHECKLIST_ITEMS.length; }

  function cooldownRemainingMs(){
    if(!state.lastTradeCompletedAt) return 0;
    const remaining = COOLDOWN_MS - (Date.now() - state.lastTradeCompletedAt);
    return remaining > 0 ? remaining : 0;
  }
  function cooldownActive(){ return cooldownRemainingMs() > 0; }
  function cooldown15RemainingMs(){
    if(!state.cooldown15StartedAt || !state.cooldownDurationMs) return 0;
    const remaining = state.cooldownDurationMs - (Date.now() - state.cooldown15StartedAt);
    return remaining > 0 ? remaining : 0;
  }
  function cooldown15Active(){ return cooldown15RemainingMs() > 0; }
  function cooldown15Done(){ return !!state.cooldown15StartedAt && !cooldown15Active(); }
  function formatRemaining(ms){
    const totalMin = Math.ceil(ms / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if(h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  function tabsHtml(){
    return `<div class="psy-rail" role="tablist">
      ${STEPS.map((s,idx)=>{
        const n = idx+1;
        let cls = "";
        if(n === state.step) cls += " on";
        else if(n < state.step) cls += " done";
        let locked = false;
        if(n === 2 && (!mindDone() || cooldownActive())) locked = true;
        if(n === 3 && !setupDone()) locked = true;
        if(n === 4 && !checklistDone()) locked = true;
        if(n === 5 && !checklistDone()) locked = true;
        if(n === 6 && !checklistDone()) locked = true;
        const disabled = locked && n > state.step;
        return `<button class="${cls.trim()}" data-act="goto" data-n="${n}" ${disabled ? "disabled" : ""}>
          <span class="n">${n < state.step ? "✓" : n}</span><span>${s}</span>
        </button>`;
      }).join("")}
    </div>`;
  }

  function goStep(n){
    if(n===2 && (!mindDone() || cooldownActive())) return;
    if(n===3 && !setupDone()) return;
    if((n===4||n===5||n===6) && !checklistDone()) return;
    state.step = n;
    saveState();
    render();
  }

  function toggleMind(k){ state.mind[k] = !state.mind[k]; saveState(); render(); }
  function resetMind(){ MIND_ITEMS.forEach(i=>state.mind[i.k]=false); saveState(); render(); }
  function toggleSetup(k){ state.setup[k] = !state.setup[k]; saveState(); render(); }
  function resetSetup(){ SETUP_REQS.forEach(i=>state.setup[i.k]=false); saveState(); render(); }
  function toggleChecklist(k){ state.checklist[k] = !state.checklist[k]; saveState(); render(); }
  function resetChecklist(){ CHECKLIST_ITEMS.forEach(i=>state.checklist[i.k]=false); saveState(); render(); }
  function setSetupType(v){ state.setupType = v; saveState(); render(); }

  function toggleSetupEdit(){ state.setupEditing = !state.setupEditing; render(); }

  function addRequirement(){
    SETUP_REQS.push({k: 'req_' + Date.now(), t: ''});
    render();
  }
  function removeRequirement(k){
    SETUP_REQS = SETUP_REQS.filter(r=>r.k!==k);
    delete state.setup[k];
    render();
  }
  function editRequirementText(k, val){
    const r = SETUP_REQS.find(r=>r.k===k);
    if(r) r.t = val;
  }
  async function saveRequirements(){
    SETUP_REQS = SETUP_REQS.filter(r=>r.t && r.t.trim().length>0);
    if(SETUP_REQS.length===0) SETUP_REQS = SETUP_DEFAULTS.map(r=>({...r}));
    try{ await STORAGE.set('setup:requirements', JSON.stringify(SETUP_REQS), false); }catch(e){console.debug('[journall] ignored error in psychology-room.js:', e);}
    syncSetupState();
    state.setupEditing = false;
    saveState();
    render();
    try{ if(typeof window.__renderOvChecklist === 'function') window.__renderOvChecklist(); }catch(e){console.debug('[journall] ignored error in psychology-room.js:', e);} // keep Today's Summary setup scan in sync
  }
  async function cancelEditRequirements(){
    try{
      const req = await STORAGE.get('setup:requirements', false);
      if(req && req.value){
        const parsed = JSON.parse(req.value);
        if(Array.isArray(parsed) && parsed.length) SETUP_REQS = parsed;
      } else {
        SETUP_REQS = SETUP_DEFAULTS.map(r=>({...r}));
      }
    }catch(e){console.debug('[journall] ignored error in psychology-room.js:', e);}
    syncSetupState();
    state.setupEditing = false;
    render();
  }

  // ---- Mind Check: editable rules ----
  const MIND_DEFAULTS = [
    {k:"sleep", t:"Sleep clear", d:"I am not tired, foggy, or forcing trades."},
    {k:"emotion", t:"Emotion calm", d:"No anger, fear, revenge, FOMO, or excitement spike."},
    {k:"patience", t:"Patience ready", d:"I can wait for activation without chasing."},
    {k:"loss", t:"Loss accepted", d:"If SL hits, I will pause, feel it, journal it, and not revenge trade."},
    {k:"noneed", t:"No need to trade", d:"I am okay with no valid setup today."},
    {k:"journal", t:"Journal commitment", d:"After the trade I will screenshot, pause, and journal honestly."},
  ];
  function toggleMindEdit(){ state.mindEditing = !state.mindEditing; render(); }
  function addMindItem(){ MIND_ITEMS.push({k:'mind_'+Date.now(), t:'', d:''}); render(); }
  function removeMindItem(k){ MIND_ITEMS = MIND_ITEMS.filter(r=>r.k!==k); delete state.mind[k]; render(); }
  function editMindText(k, val){ const r = MIND_ITEMS.find(r=>r.k===k); if(r) r.t = val; }
  function editMindDesc(k, val){ const r = MIND_ITEMS.find(r=>r.k===k); if(r) r.d = val; }
  async function saveMindItems(){
    MIND_ITEMS = MIND_ITEMS.filter(r=>r.t && r.t.trim().length>0);
    if(MIND_ITEMS.length===0) MIND_ITEMS = MIND_DEFAULTS.map(r=>({...r}));
    try{ await STORAGE.set('mind:items', JSON.stringify(MIND_ITEMS), false); }catch(e){console.debug('[journall] ignored error in psychology-room.js:', e);}
    syncMindState();
    state.mindEditing = false;
    saveState();
    render();    try{ if(typeof window.__renderOvChecklist === 'function') window.__renderOvChecklist(); }catch(e){console.debug('[journall] ignored error in psychology-room.js:', e);}
  }
  async function cancelEditMindItems(){
    try{
      const m = await STORAGE.get('mind:items', false);
      if(m && m.value){
        const parsed = JSON.parse(m.value);
        MIND_ITEMS = (Array.isArray(parsed) && parsed.length) ? parsed : MIND_DEFAULTS.map(r=>({...r}));
      } else {
        MIND_ITEMS = MIND_DEFAULTS.map(r=>({...r}));
      }
    }catch(e){console.debug('[journall] ignored error in psychology-room.js:', e);}
    syncMindState();
    state.mindEditing = false;
    render();
  }

  // ---- Pre-Trade Checklist: editable rules ----
  function toggleChecklistEdit(){ state.checklistEditing = !state.checklistEditing; render(); }
  function addChecklistItem(){ CHECKLIST_ITEMS.push({k:'chk_'+Date.now(), t:'', d:''}); render(); }
  function removeChecklistItem(k){ CHECKLIST_ITEMS = CHECKLIST_ITEMS.filter(r=>r.k!==k); delete state.checklist[k]; render(); }
  function editChecklistText(k, val){ const r = CHECKLIST_ITEMS.find(r=>r.k===k); if(r) r.t = val; }
  function editChecklistDesc(k, val){ const r = CHECKLIST_ITEMS.find(r=>r.k===k); if(r) r.d = val; }
  async function saveChecklistItems(){
    CHECKLIST_ITEMS = CHECKLIST_ITEMS.filter(r=>r.t && r.t.trim().length>0);
    if(CHECKLIST_ITEMS.length===0) CHECKLIST_ITEMS = CHECKLIST_DEFAULTS.map(r=>({...r}));
    try{ await STORAGE.set('checklist:items', JSON.stringify(CHECKLIST_ITEMS), false); }catch(e){console.debug('[journall] ignored error in psychology-room.js:', e);}
    syncChecklistState();
    state.checklistEditing = false;
    saveState();
    render();
    try{ if(typeof window.__renderOvChecklist === 'function') window.__renderOvChecklist(); }catch(e){console.debug('[journall] ignored error in psychology-room.js:', e);} // keep Today's Summary checklist in sync
  }
  async function cancelEditChecklistItems(){
    try{
      const c = await STORAGE.get('checklist:items', false);
      if(c && c.value){
        const parsed = JSON.parse(c.value);
        CHECKLIST_ITEMS = (Array.isArray(parsed) && parsed.length) ? parsed : CHECKLIST_DEFAULTS.map(r=>({...r}));
      } else {
        CHECKLIST_ITEMS = CHECKLIST_DEFAULTS.map(r=>({...r}));
      }
    }catch(e){console.debug('[journall] ignored error in psychology-room.js:', e);}
    syncChecklistState();
    state.checklistEditing = false;
    render();
  }

  // ---- Live Trade Rules: editable rules ----
  function toggleLiveEdit(){ state.liveEditing = !state.liveEditing; render(); }
  function addLiveRule(){ LIVE_RULES.push({k:'live_'+Date.now(), t:'', d:''}); render(); }
  function removeLiveRule(k){ LIVE_RULES = LIVE_RULES.filter(r=>r.k!==k); render(); }
  function editLiveText(k, val){ const r = LIVE_RULES.find(r=>r.k===k); if(r) r.t = val; }
  function editLiveDesc(k, val){ const r = LIVE_RULES.find(r=>r.k===k); if(r) r.d = val; }
  async function saveLiveRules(){
    LIVE_RULES = LIVE_RULES.filter(r=>r.t && r.t.trim().length>0);
    if(LIVE_RULES.length===0) LIVE_RULES = LIVE_DEFAULTS.map(r=>({...r}));
    try{ await STORAGE.set('live:rules', JSON.stringify(LIVE_RULES), false); }catch(e){console.debug('[journall] ignored error in psychology-room.js:', e);}
    state.liveEditing = false;
    saveState();
    render();
  }
  async function cancelEditLiveRules(){
    try{
      const l = await STORAGE.get('live:rules', false);
      if(l && l.value){
        const parsed = JSON.parse(l.value);
        LIVE_RULES = (Array.isArray(parsed) && parsed.length) ? parsed : LIVE_DEFAULTS.map(r=>({...r}));
      } else {
        LIVE_RULES = LIVE_DEFAULTS.map(r=>({...r}));
      }
    }catch(e){console.debug('[journall] ignored error in psychology-room.js:', e);}
    state.liveEditing = false;
    render();
  }

  // ---- After Trade (Debrief): editable items ----
  function toggleDebriefEdit(){ state.debriefEditing = !state.debriefEditing; render(); }
  function addDebriefItem(){ DEBRIEF_ITEMS.push({k:'deb_'+Date.now(), t:'', d:''}); render(); }
  function removeDebriefItem(k){ DEBRIEF_ITEMS = DEBRIEF_ITEMS.filter(r=>r.k!==k); render(); }
  function editDebriefText(k, val){ const r = DEBRIEF_ITEMS.find(r=>r.k===k); if(r) r.t = val; }
  function editDebriefDesc(k, val){ const r = DEBRIEF_ITEMS.find(r=>r.k===k); if(r) r.d = val; }
  async function saveDebriefItems(){
    DEBRIEF_ITEMS = DEBRIEF_ITEMS.filter(r=>r.t && r.t.trim().length>0);
    if(DEBRIEF_ITEMS.length===0) DEBRIEF_ITEMS = DEBRIEF_DEFAULTS.map(r=>({...r}));
    try{ await STORAGE.set('debrief:items', JSON.stringify(DEBRIEF_ITEMS), false); }catch(e){console.debug('[journall] ignored error in psychology-room.js:', e);}
    state.debriefEditing = false;
    saveState();
    render();
  }
  async function cancelEditDebriefItems(){
    try{
      const d = await STORAGE.get('debrief:items', false);
      if(d && d.value){
        const parsed = JSON.parse(d.value);
        DEBRIEF_ITEMS = (Array.isArray(parsed) && parsed.length) ? parsed : DEBRIEF_DEFAULTS.map(r=>({...r}));
      } else {
        DEBRIEF_ITEMS = DEBRIEF_DEFAULTS.map(r=>({...r}));
      }
    }catch(e){console.debug('[journall] ignored error in psychology-room.js:', e);}
    state.debriefEditing = false;
    render();
  }

  // ---- Cooldown: editable pause lengths (minutes) ----
  let COOLDOWN_DRAFT = [];
  function toggleCooldownEdit(){
    state.cooldownEditing = !state.cooldownEditing;
    COOLDOWN_DRAFT = COOLDOWN_OPTIONS_MIN.map(String);
    render();
  }
  function addCooldownOption(){ COOLDOWN_DRAFT.push(''); render(); }
  function removeCooldownOption(i){ COOLDOWN_DRAFT.splice(i,1); render(); }
  function editCooldownOption(i, val){ COOLDOWN_DRAFT[i] = val; }
  async function saveCooldownOptions(){
    const vals = COOLDOWN_DRAFT.map(v=>Math.round(Number(v))).filter(n=>isFinite(n) && n>=1 && n<=240);
    const uniq = Array.from(new Set(vals)).sort((a,b)=>a-b);
    COOLDOWN_OPTIONS_MIN = uniq.length ? uniq : COOLDOWN_DEFAULT_MIN.slice();
    try{ await STORAGE.set('cooldown:options', JSON.stringify(COOLDOWN_OPTIONS_MIN), false); }catch(e){console.debug('[journall] ignored error in psychology-room.js:', e);}
    state.cooldownEditing = false;
    render();
  }
  function cancelEditCooldown(){ state.cooldownEditing = false; render(); }

  // ---- shared interactive progress bar ----
  function slugPid(s){ return 'p-'+String(s||'bar').toLowerCase().replace(/[^a-z0-9]+/g,'-'); }
  function progressBar(count, total, label, pid){
    const pct = total ? Math.round((count/total)*100) : 0;
    const full = total>0 && count===total;
    return `<div class="progress-wrap${full?' full':''}">
      <div class="progress-top"><span class="lbl">${label||'Progress'}</span><span class="pct mono">${count}/${total} · ${pct}%</span></div>
      <div class="progress-lg"><div class="fill" data-pid="${pid||slugPid(label)}" style="width:${pct}%"></div></div>
    </div>`;
  }

  // Re-renders replace the DOM wholesale, so a freshly-created .fill element has no "old width"
  // to transition from. This restores that old width for one frame, then animates to the new
  // width on the next frame so the CSS transition actually plays instead of snapping instantly.
  function animateProgressFills(){
    if(!stageEl) return;
    stageEl.querySelectorAll('.progress-lg .fill[data-pid]').forEach(el=>{
      const pid = el.dataset.pid;
      const target = parseFloat(el.style.width) || 0;
      const prev = (pid in progressAnim) ? progressAnim[pid] : target;
      if(prev !== target){
        el.style.transition = 'none';
        el.style.width = prev + '%';
        void el.offsetWidth; // force reflow so the browser registers the starting width
        el.style.transition = '';
        requestAnimationFrame(()=>{ requestAnimationFrame(()=>{ el.style.width = target + '%'; }); });
      }
      progressAnim[pid] = target;
    });
  }

  async function completeDebrief(){
    const el = stageEl ? stageEl.querySelector('#debrief-input') : null;
    const note = (el ? el.value : (state.debriefNote||"")).trim();
    if(note){
      const reminder = {text: note, date: new Date().toISOString()};
      try{ await STORAGE.set('reminder:last', JSON.stringify(reminder), false); }catch(e){console.debug('[journall] ignored error in psychology-room.js:', e);}
    }
    const completedAt = Date.now();
    try{ await STORAGE.set('trade:lastCompletedAt', String(completedAt), false); }catch(e){console.debug('[journall] ignored error in psychology-room.js:', e);}
    if(note){
      try{
        const r = await STORAGE.get('reminder:last', false);
        if(r && r.value) state.reminder = JSON.parse(r.value);
      }catch(e){console.debug('[journall] ignored error in psychology-room.js:', e);}
    }
    // trade is logged — move to the mandatory cooldown step before resetting for the next trade
    state.lastTradeCompletedAt = completedAt;
    state.cooldown15StartedAt = null;
    state.cooldownDurationMs = null;
    state.step = 6;
    saveState();
    render();
  }

  function startNextTrade(){
    if(cooldown15Active()) return;
    state = {
      step: 1,
      mind: Object.fromEntries(MIND_ITEMS.map(i=>[i.k,false])),
      mindEditing: false,
      setup: Object.fromEntries(SETUP_REQS.map(i=>[i.k,false])),
      setupEditing: false,
      setupType: "Buy Setup",
      checklist: Object.fromEntries(CHECKLIST_ITEMS.map(i=>[i.k,false])),
      checklistEditing: false,
      liveEditing: false,
      debriefEditing: false,
      cooldownEditing: false,
      debriefNote: "",
      reminder: state.reminder,
      lastTradeCompletedAt: state.lastTradeCompletedAt,
      cooldown15StartedAt: null,
      cooldownDurationMs: null
    };
    saveState();
    render();
  }

  function pickCooldownDuration(minutes){
    state.cooldownDurationMs = minutes * 60 * 1000;
    state.cooldown15StartedAt = Date.now();
    saveState();
    render();
  }

  function renderStatusNote(){
    if(state.step===1) return `<div class="psy-note${cooldownActive()?' warn':''}">${cooldownActive() ? "In cooldown — no need to trade right now." : "Complete every mind check to unlock the setup scan."}</div>`;
    if(state.step===2) return `<div class="psy-note">Setup scan unlocked. Confirm the setup is real before checklist.</div>`;
    if(state.step===3) return `<div class="psy-note">Setup scan complete. Pre-trade checklist unlocked.</div>`;
    if(state.step===4 || state.step===5) return `<div class="psy-note">Checklist complete. Live trade rules unlocked.</div>`;
    return "";
  }

  function renderMindStep(){
    const cooling = cooldownActive();
    if(state.mindEditing){
      return `
        <div class="a-s-head">
          <div class="a-s-ttl"><span class="a-s-ic">${rowIcon('sleep')}</span><h3>Mind stability check</h3></div>
          <span class="pill">editing</span>
        </div>
        <div class="sub" style="margin:4px 0 16px">Add, edit, or remove your own mind-check rules.</div>
        ${MIND_ITEMS.map(r=>`
          <div class="psy-edit-row" style="align-items:flex-start">
            <div style="flex:1;display:flex;flex-direction:column;gap:6px">
              <input class="j-in" type="text" value="${(r.t||"").replace(/"/g,'&quot;')}" placeholder="Rule title" data-act="edit-mind-text" data-k="${r.k}">
              <input class="j-in" type="text" value="${(r.d||"").replace(/"/g,'&quot;')}" placeholder="Description (optional)" data-act="edit-mind-desc" data-k="${r.k}">
            </div>
            <div class="psy-rm" data-act="remove-mind" data-k="${r.k}">${xIcon()}</div>
          </div>`).join("")}
        <div class="psy-add" data-act="add-mind">${plusIcon()} Add rule</div>
        <div class="psy-actions">
          <button class="btn-ghost" data-act="cancel-edit-mind">Cancel</button>
          <button class="btn-primary" data-act="save-mind">Save rules</button>
        </div>`;
    }
    const count = MIND_ITEMS.filter(i=>state.mind[i.k]).length;
    return `
      <div class="a-s-head">
        <div class="a-s-ttl"><span class="a-s-ic">${rowIcon('sleep')}</span><h3>Mind stability check</h3></div>
        <div style="display:flex;gap:7px;align-items:center">
          <span class="pill">all ${MIND_ITEMS.length} required</span>
          <div class="psy-icon-btn" data-act="mind-edit-toggle">${editIcon()}</div>
        </div>
      </div>
      <div class="sub" style="margin:4px 0 14px">Check your mental state before planning any trade.</div>
      ${progressBar(count, MIND_ITEMS.length, 'Mind stability', 'mind')}
      ${cooling ? `<div class="psy-note alert">Cooldown active — no back-to-back trades. ${formatRemaining(cooldownRemainingMs())} left before you can start the next one.</div>` : ""}
      ${MIND_ITEMS.map(i=>`
        <div class="psy-row ${state.mind[i.k]?'checked':''}" data-act="toggle-mind" data-k="${i.k}">
          <span class="ic">${rowIcon(i.k)}</span>
          <span class="cp"><b>${i.t}</b><span>${i.d}</span></span>
          <span class="ck">${icon()}</span>
        </div>`).join("")}
      <div class="psy-actions">
        <button class="btn-ghost" data-act="reset-mind">Reset checks</button>
        <button class="btn-primary" data-act="goto" data-n="2" ${(mindDone() && !cooling)?"":"disabled"}>Go to setup scan${arrowIcon()}</button>
      </div>`;
  }

  function renderSetupStep(){
    if(state.setupEditing){
      return `
        <div class="a-s-head">
          <div class="a-s-ttl"><span class="a-s-ic">${rowIcon('entry')}</span><h3>Setup scan</h3></div>
          <span class="pill">editing</span>
        </div>
        <div class="sub" style="margin:4px 0 16px">Add, edit, or remove the exact steps you check to confirm your setup has formed.</div>
        ${SETUP_REQS.map(r=>`
          <div class="psy-edit-row">
            <input class="j-in" type="text" value="${(r.t||"").replace(/"/g,'&quot;')}" placeholder="e.g. Price breaks above OB high" data-act="edit-req-text" data-k="${r.k}">
            <div class="psy-rm" data-act="remove-req" data-k="${r.k}">${xIcon()}</div>
          </div>`).join("")}
        <div class="psy-add" data-act="add-req">${plusIcon()} Add requirement</div>
        <div class="psy-actions">
          <button class="btn-ghost" data-act="cancel-edit-req">Cancel</button>
          <button class="btn-primary" data-act="save-req">Save requirements</button>
        </div>`;
    }
    const count = setupCount();
    const done = setupDone();
    return `
      <div class="a-s-head">
        <div class="a-s-ttl"><span class="a-s-ic">${rowIcon('entry')}</span><h3>Setup scan</h3></div>
        <div style="display:flex;gap:7px;align-items:center">
          <span class="pill">all ${SETUP_REQS.length} required</span>
          <div class="psy-icon-btn" data-act="setup-edit-toggle">${editIcon()}</div>
        </div>
      </div>
      <div class="sub" style="margin:4px 0 14px">Confirm every step of your own setup criteria before you plan an entry.</div>
      ${progressBar(count, SETUP_REQS.length, 'Setup scan', 'setup')}
      ${SETUP_REQS.map(i=>`
        <div class="psy-row ${state.setup[i.k]?'checked':''}" data-act="toggle-setup" data-k="${i.k}">
          <span class="ic">${rowIcon('entry')}</span>
          <span class="cp"><b>${i.t}</b></span>
          <span class="ck">${icon()}</span>
        </div>`).join("")}
      <div class="psy-actions">
        <button class="btn-ghost" data-act="reset-setup">Reset</button>
        <button class="btn-ghost" data-act="goto" data-n="1">Back</button>
        <button class="btn-primary" data-act="goto" data-n="3" ${done?"":"disabled"}>Continue${arrowIcon()}</button>
      </div>`;
  }

  function renderChecklistStep(){
    if(state.checklistEditing){
      return `
        <div class="a-s-head">
          <div class="a-s-ttl"><span class="a-s-ic">${rowIcon('rulesmet')}</span><h3>Pre-trade checklist</h3></div>
          <span class="pill">editing</span>
        </div>
        <div class="sub" style="margin:4px 0 16px">Add, edit, or remove the exact checks that gate your entry. Make it your own.</div>
        ${CHECKLIST_ITEMS.map(r=>`
          <div class="psy-edit-row" style="align-items:flex-start">
            <div style="flex:1;display:flex;flex-direction:column;gap:6px">
              <input class="j-in" type="text" value="${(r.t||"").replace(/"/g,'&quot;')}" placeholder="Rule title" data-act="edit-checklist-text" data-k="${r.k}">
              <input class="j-in" type="text" value="${(r.d||"").replace(/"/g,'&quot;')}" placeholder="Description (optional)" data-act="edit-checklist-desc" data-k="${r.k}">
            </div>
            <div class="psy-rm" data-act="remove-checklist" data-k="${r.k}">${xIcon()}</div>
          </div>`).join("")}
        <div class="psy-add" data-act="add-checklist">${plusIcon()} Add checklist rule</div>
        <div class="psy-actions">
          <button class="btn-ghost" data-act="cancel-edit-checklist">Cancel</button>
          <button class="btn-primary" data-act="save-checklist">Save checklist</button>
        </div>`;
    }
    const count = checklistCount();
    const done = checklistDone();
    return `
      <div class="a-s-head">
        <div class="a-s-ttl"><span class="a-s-ic">${rowIcon('rulesmet')}</span><h3>Pre-trade checklist</h3></div>
        <div style="display:flex;gap:7px;align-items:center">
          <span class="pill">final gate</span>
          <div class="psy-icon-btn" data-act="checklist-edit-toggle">${editIcon()}</div>
        </div>
      </div>
      <div class="sub" style="margin:4px 0 14px">The final gate before you're allowed to pull the trigger.</div>
      ${progressBar(count, CHECKLIST_ITEMS.length, 'Full check', 'checklist')}
      <div class="psy-seg">
        <button class="${state.setupType==='Buy Setup'?'on':''}" data-act="set-setup-type" data-v="Buy Setup">Buy Setup</button>
        <button class="${state.setupType==='Sell Setup'?'on':''}" data-act="set-setup-type" data-v="Sell Setup">Sell Setup</button>
      </div>
      ${CHECKLIST_ITEMS.map(i=>`
        <div class="psy-row ${state.checklist[i.k]?'checked':''}" data-act="toggle-checklist" data-k="${i.k}">
          <span class="ic">${rowIcon(i.k)}</span>
          <span class="cp"><b>${i.t}</b><span>${liveDesc(i.d)}</span></span>
          <span class="ck">${icon()}</span>
        </div>`).join("")}
      ${done ? `<div class="psy-note ok">Cleared for planned execution — every line confirmed, entry meets your saved risk limit and minimum 2:1 reward-to-risk plan.</div>` : ""}
      <div class="psy-actions">
        <button class="btn-ghost" data-act="reset-checklist">Reset</button>
        <button class="btn-ghost" data-act="goto" data-n="2">Back</button>
        <button class="btn-primary" data-act="goto" data-n="4" ${done?"":"disabled"}>Proceed to live trade${arrowIcon()}</button>
      </div>`;
  }

  function renderLiveTradeStep(){
    if(state.liveEditing){
      return `
        <div class="a-s-head">
          <div class="a-s-ttl"><span class="a-s-ic">${rowIcon('live1')}</span><h3>Live trade rules</h3></div>
          <span class="pill">editing</span>
        </div>
        <div class="sub" style="margin:4px 0 16px">Write the exact rules you follow while a trade is live.</div>
        ${LIVE_RULES.map(r=>`
          <div class="psy-edit-row" style="align-items:flex-start">
            <div style="flex:1;display:flex;flex-direction:column;gap:6px">
              <input class="j-in" type="text" value="${(r.t||"").replace(/"/g,'&quot;')}" placeholder="Rule title" data-act="edit-live-text" data-k="${r.k}">
              <input class="j-in" type="text" value="${(r.d||"").replace(/"/g,'&quot;')}" placeholder="Description (optional)" data-act="edit-live-desc" data-k="${r.k}">
            </div>
            <div class="psy-rm" data-act="remove-live" data-k="${r.k}">${xIcon()}</div>
          </div>`).join("")}
        <div class="psy-add" data-act="add-live">${plusIcon()} Add rule</div>
        <div class="psy-actions">
          <button class="btn-ghost" data-act="cancel-edit-live">Cancel</button>
          <button class="btn-primary" data-act="save-live">Save rules</button>
        </div>`;
    }
    return `
      <div class="a-s-head">
        <div class="a-s-ttl"><span class="a-s-ic">${rowIcon('live1')}</span><h3>Live trade rules</h3></div>
        <div style="display:flex;gap:7px;align-items:center">
          <span class="pill">during execution</span>
          <div class="psy-icon-btn" data-act="live-edit-toggle">${editIcon()}</div>
        </div>
      </div>
      <div class="sub" style="margin:4px 0 6px">Log your entry, stop loss, and target as the trade is active.</div>
      ${LIVE_RULES.map(r=>`<div class="psy-info"><span class="ic">${rowIcon(r.k)}</span><div><b>${r.t}</b><span>${r.d}</span></div></div>`).join("")}
      <div class="psy-actions">
        <button class="btn-ghost" data-act="goto" data-n="3">Back</button>
        <button class="btn-primary" data-act="goto" data-n="5">Continue to after trade${arrowIcon()}</button>
      </div>`;
  }

  function renderDebriefStep(){
    if(state.debriefEditing){
      return `
        <div class="a-s-head">
          <div class="a-s-ttl"><span class="a-s-ic">${rowIcon('d1')}</span><h3>After trade</h3></div>
          <span class="pill">editing</span>
        </div>
        <div class="sub" style="margin:4px 0 16px">Write the exact steps you follow right after a trade closes.</div>
        ${DEBRIEF_ITEMS.map(r=>`
          <div class="psy-edit-row" style="align-items:flex-start">
            <div style="flex:1;display:flex;flex-direction:column;gap:6px">
              <input class="j-in" type="text" value="${(r.t||"").replace(/&/g,'&amp;').replace(/"/g,'&quot;')}" placeholder="Step title" data-act="edit-debrief-text" data-k="${r.k}">
              <input class="j-in" type="text" value="${(r.d||"").replace(/&/g,'&amp;').replace(/"/g,'&quot;')}" placeholder="Description (optional)" data-act="edit-debrief-desc" data-k="${r.k}">
            </div>
            <div class="psy-rm" data-act="remove-debrief" data-k="${r.k}">${xIcon()}</div>
          </div>`).join("")}
        <div class="psy-add" data-act="add-debrief">${plusIcon()} Add step</div>
        <div class="psy-actions">
          <button class="btn-ghost" data-act="cancel-edit-debrief">Cancel</button>
          <button class="btn-primary" data-act="save-debrief">Save steps</button>
        </div>`;
    }
    const esc = s => String(s==null?"":s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    return `
      <div class="a-s-head">
        <div class="a-s-ttl"><span class="a-s-ic">${rowIcon('d1')}</span><h3>After trade</h3></div>
        <div style="display:flex;gap:7px;align-items:center">
          <span class="pill">mandatory pause</span>
          <div class="psy-icon-btn" data-act="debrief-edit-toggle">${editIcon()}</div>
        </div>
      </div>
      <div class="sub" style="margin:4px 0 6px">A mandatory pause before the next decision.</div>
      ${DEBRIEF_ITEMS.map(r=>`<div class="psy-info"><span class="ic">${rowIcon(r.k)}</span><div><b>${esc(r.t)}</b><span>${esc(r.d)}</span></div></div>`).join("")}
      <button class="btn-primary psy-full" style="margin-top:14px" data-act="complete-debrief">Complete live trade</button>
      <div class="psy-actions">
        <button class="btn-ghost" data-act="goto" data-n="4">Back</button>
        <a href="${(window.JL_CONFIG&&window.JL_CONFIG.siteUrl)||'https://kavyabaghel.github.io/Trading-Journal'}" target="_blank" style="flex:1;min-width:120px;text-decoration:none;display:block"><button class="btn-ghost" type="button" style="width:100%">Open Journal</button></a>
      </div>`;
  }

  function renderCooldownStep(){
    if(!state.cooldownDurationMs){
      if(state.cooldownEditing){
        return `
        <div class="a-s-head">
          <div class="a-s-ttl"><span class="a-s-ic">${rowIcon('d2')}</span><h3>Cooldown</h3></div>
          <span class="pill">editing</span>
        </div>
        <div class="sub" style="margin:4px 0 16px">Set the pause lengths you can pick after a trade, in minutes (1 to 240).</div>
        ${COOLDOWN_DRAFT.map((v,i)=>`
          <div class="psy-edit-row">
            <input class="j-in" type="number" inputmode="numeric" min="1" max="240" step="1" value="${String(v).replace(/"/g,'&quot;')}" placeholder="Minutes" data-act="edit-cd" data-i="${i}">
            <div class="psy-rm" data-act="remove-cd" data-i="${i}">${xIcon()}</div>
          </div>`).join("")}
        <div class="psy-add" data-act="add-cd">${plusIcon()} Add pause length</div>
        <div class="psy-actions">
          <button class="btn-ghost" data-act="cancel-edit-cd">Cancel</button>
          <button class="btn-primary" data-act="save-cd">Save lengths</button>
        </div>`;
      }
      return `
        <div class="a-s-head">
          <div class="a-s-ttl"><span class="a-s-ic">${rowIcon('d2')}</span><h3>Cooldown</h3></div>
          <div style="display:flex;gap:7px;align-items:center">
            <span class="pill">mandatory pause</span>
            <div class="psy-icon-btn" data-act="cooldown-edit-toggle">${editIcon()}</div>
          </div>
        </div>
        <div class="sub" style="margin:4px 0 14px">Trade logged. How much time do you need before you're clear to plan the next one?</div>
        <div class="psy-cd-picks" style="display:flex;gap:9px;flex-wrap:wrap;margin-bottom:16px">
          ${COOLDOWN_OPTIONS_MIN.map(m=>`<button class="btn-ghost" data-act="pick-cooldown" data-min="${m}">${m} min</button>`).join("")}
        </div>
        <div class="psy-info"><span class="ic">${rowIcon('d2')}</span><div><b>Step away from the screen.</b><span>Close the chart. Don't watch price during the pause.</span></div></div>
        <div class="psy-info"><span class="ic">${rowIcon('d3')}</span><div><b>No re-entry on impulse.</b><span>The next trade only starts after a fresh mind check.</span></div></div>
        <div class="psy-actions">
          <button class="btn-ghost" data-act="goto" data-n="5">Back</button>
        </div>`;
    }
    const remaining = cooldown15RemainingMs();
    const active = remaining > 0;
    const done = cooldown15Done();
    const mins = Math.round(state.cooldownDurationMs / 60000);
    return `
      <div class="a-s-head">
        <div class="a-s-ttl"><span class="a-s-ic">${rowIcon('d2')}</span><h3>Cooldown</h3></div>
        <span class="pill">mandatory pause</span>
      </div>
      <div class="sub" style="margin:4px 0 6px">Trade logged. Step away for ${mins} minute${mins===1?"":"s"} before you're clear to plan the next one.</div>
      ${active
        ? `<div class="psy-note alert">Cooldown active — ${formatRemaining(remaining)} left. No back-to-back trades.</div>`
        : `<div class="psy-note ok">Cooldown complete. You're clear to start the next trade whenever you're ready.</div>`}
      <div class="psy-info"><span class="ic">${rowIcon('d2')}</span><div><b>Step away from the screen.</b><span>Close the chart. Don't watch price during the pause.</span></div></div>
      <div class="psy-info"><span class="ic">${rowIcon('d3')}</span><div><b>No re-entry on impulse.</b><span>The next trade only starts after a fresh mind check.</span></div></div>
      <div class="psy-actions">
        <button class="btn-ghost" data-act="goto" data-n="5">Back</button>
        <button class="btn-primary psy-full" data-act="start-next-trade" ${done?"":"disabled"}>${done ? "Start next trade" : `Pause ${mins}m cooldown`}${arrowIcon()}</button>
      </div>`;
  }

  function overallProgressBar(){
    const idx = state.step - 1;
    const pct = Math.round((idx/(STEPS.length-1))*100);
    const full = state.step === STEPS.length;
    return `<div class="progress-wrap top-progress${full?' full':''}" style="margin:10px 0 14px">
      <div class="progress-lg"><div class="fill" data-pid="overall" style="width:${pct}%"></div></div>
    </div>`;
  }

  function render(){
    if(!stageEl) return;
    let body = "";
    if(state.step===1) body = renderMindStep();
    else if(state.step===2) body = renderSetupStep();
    else if(state.step===3) body = renderChecklistStep();
    else if(state.step===4) body = renderLiveTradeStep();
    else if(state.step===5) body = renderDebriefStep();
    else body = renderCooldownStep();

    const reminderHtml = (state.step===1 && state.reminder) ?
      `<div class="psy-note warn">Yesterday's reminder — don't repeat: ${state.reminder.text}</div>` : "";

    stageEl.innerHTML = `
      <div class="top">
        <div>
          <div class="eyebrow">
            <span class="streak">${STEPS[state.step-1]}</span>
          </div>
          <h1>Psychology command room</h1>
          <p>Runs fully on this device · trade review</p>
        </div>
      </div>
      ${tabsHtml()}
      ${overallProgressBar()}
      ${renderStatusNote()}
      ${reminderHtml}
      <section class="a-s">${body}</section>
      <div class="psy-foot">6-stage pre-trade ritual · local only</div>
    `;
    animateProgressFills();
  }

  function handleClick(e){
    const t = e.target.closest('[data-act]');
    if(!t || t.disabled) return;
    const act = t.dataset.act;
    if(act==='goto') goStep(+t.dataset.n);
    else if(act==='toggle-mind') toggleMind(t.dataset.k);
    else if(act==='reset-mind') resetMind();
    else if(act==='mind-edit-toggle') toggleMindEdit();
    else if(act==='remove-mind') removeMindItem(t.dataset.k);
    else if(act==='add-mind') addMindItem();
    else if(act==='cancel-edit-mind') cancelEditMindItems();
    else if(act==='save-mind') saveMindItems();
    else if(act==='toggle-setup') toggleSetup(t.dataset.k);
    else if(act==='reset-setup') resetSetup();
    else if(act==='setup-edit-toggle') toggleSetupEdit();
    else if(act==='remove-req') removeRequirement(t.dataset.k);
    else if(act==='add-req') addRequirement();
    else if(act==='cancel-edit-req') cancelEditRequirements();
    else if(act==='save-req') saveRequirements();
    else if(act==='set-setup-type') setSetupType(t.dataset.v);
    else if(act==='toggle-checklist') toggleChecklist(t.dataset.k);
    else if(act==='reset-checklist') resetChecklist();
    else if(act==='checklist-edit-toggle') toggleChecklistEdit();
    else if(act==='remove-checklist') removeChecklistItem(t.dataset.k);
    else if(act==='add-checklist') addChecklistItem();
    else if(act==='cancel-edit-checklist') cancelEditChecklistItems();
    else if(act==='save-checklist') saveChecklistItems();
    else if(act==='live-edit-toggle') toggleLiveEdit();
    else if(act==='remove-live') removeLiveRule(t.dataset.k);
    else if(act==='add-live') addLiveRule();
    else if(act==='cancel-edit-live') cancelEditLiveRules();
    else if(act==='save-live') saveLiveRules();
    else if(act==='complete-debrief') completeDebrief();
    else if(act==='start-next-trade') startNextTrade();
    else if(act==='pick-cooldown') pickCooldownDuration(+t.dataset.min);
    else if(act==='debrief-edit-toggle') toggleDebriefEdit();
    else if(act==='remove-debrief') removeDebriefItem(t.dataset.k);
    else if(act==='add-debrief') addDebriefItem();
    else if(act==='cancel-edit-debrief') cancelEditDebriefItems();
    else if(act==='save-debrief') saveDebriefItems();
    else if(act==='cooldown-edit-toggle') toggleCooldownEdit();
    else if(act==='remove-cd') removeCooldownOption(+t.dataset.i);
    else if(act==='add-cd') addCooldownOption();
    else if(act==='cancel-edit-cd') cancelEditCooldown();
    else if(act==='save-cd') saveCooldownOptions();
  }
  function handleInput(e){
    const t = e.target.closest('[data-act]');
    if(!t) return;
    const act = t.dataset.act;
    if(act==='edit-req-text') editRequirementText(t.dataset.k, t.value);
    else if(act==='edit-mind-text') editMindText(t.dataset.k, t.value);
    else if(act==='edit-mind-desc') editMindDesc(t.dataset.k, t.value);
    else if(act==='edit-checklist-text') editChecklistText(t.dataset.k, t.value);
    else if(act==='edit-checklist-desc') editChecklistDesc(t.dataset.k, t.value);
    else if(act==='edit-live-text') editLiveText(t.dataset.k, t.value);
    else if(act==='edit-live-desc') editLiveDesc(t.dataset.k, t.value);
    else if(act==='edit-debrief-text') editDebriefText(t.dataset.k, t.value);
    else if(act==='edit-debrief-desc') editDebriefDesc(t.dataset.k, t.value);
    else if(act==='edit-cd') editCooldownOption(+t.dataset.i, t.value);
    else if(act==='debrief-input') state.debriefNote = t.value;
  }

  function mount(){
    const host = document.getElementById('psyHost');
    if(!host) return;
    if(host.dataset.mounted) return; // idempotent — only mount once
    host.dataset.mounted = '1';
    stageEl = host;
    host.addEventListener('click', handleClick);
    host.addEventListener('input', handleInput);
    loadState();
  }

  window.__mountPsychologyTab = mount;
})();
