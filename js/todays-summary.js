  // ---------- single source of truth for real trade data ----------
  // Used by Today's Summary (this file), Trades and Journal — defined once, here, near the
  // top of the page's scripts so every tab reads window.__trades instead of keeping its own
  // hardcoded copy that could silently drift out of sync with the others.
  window.__rawTradesData = []; // no built-in trades: data comes from an imported CSV now, synced data later
  window.__trades = window.__rawTradesData.map(r=>({d:r[0],t:r[1],side:r[2],ses:r[3],en:r[4],ex:r[5],why:r[6],pnl:r[7],lot:.01,sl:null,tag:'',j:false,sym:'XAUUSD'}));
/* ===== JOURNALL DATA MODE: single active dataset (real | demo) ===== */
(function(){
  let mode='real'; /* real data only: trades come from a saved CSV import (or sync); nothing is built in */
  /* One win/loss/break-even rule for every tab: a trade under $1 either way is break-even. */
  window.jlBreakEvenUSD=1;
  window.jlKind=p=>Math.abs(p)<window.jlBreakEvenUSD?'be':p>0?'win':'loss';
  window.jlMode=mode;window.__openTrades=[];
  if(mode==='real'){try{const im=JSON.parse(localStorage.getItem(JL_KEYS.keys.JL_IMPORT)||'null');if(im&&Array.isArray(im.closed)){/* fold commission + swap into P&L so every figure is net, like the MT5 report */const nt=t=>{if(t&&!t._n){t.gpnl=t.pnl;t.pnl=Math.round((t.pnl+(t.cost||0))*100)/100;t.cost=0;t._n=1}return t};im.closed.forEach(nt);(im.open||[]).forEach(nt);window.__trades=im.closed;window.__openTrades=im.open||[];window.__imported=im.file}}catch(e){console.debug('[journall] ignored error in todays-summary.js:', e);}}
  /* aggregates every Analytics widget reads (nothing per-widget is hardcoded) */
  const T=(window.__trades||[]).slice().sort((a,b)=>a.d+a.t<b.d+b.t?-1:1),demo=mode==='demo',n=T.length;
  let JJ=[];try{JJ=JSON.parse(localStorage.getItem(JL_KEYS.keys.JL_JOURNALS))||[]}catch(e){console.debug('[journall] ignored error in todays-summary.js:', e);}const jm={};JJ.forEach(e=>{if(e&&e.key&&e.tags&&e.tags.length)jm[e.key]=e.tags.map(x=>x==='Lot Over 0.02'?'Lot Over Limit':x)});
  (window.__trades||[]).forEach(t=>{t.tags=demo?(t.tag?[t.tag]:[]):(jm[t.d+' '+t.t+' '+t.side+' '+t.en+' '+t.pnl]||[])});
  let gp=0,gl=0,W=0,L=0,BE=0,c=0,pk=0,dd=0;const eq=[];
  let sw=0,sl=0; /* sw/sl = money in trades classed win/loss; gp/gl stay total money for net and profit factor */
  T.forEach(t=>{const p=t.pnl,k=window.jlKind(p);if(p>0)gp+=p;else if(p<0)gl-=p;if(k==='win'){W++;sw+=p}else if(k==='loss'){L++;sl-=p}else BE++;c+=p;eq.push(c);pk=Math.max(pk,c);dd=Math.max(dd,pk-c)});
  const by=f=>{const m={};T.forEach(t=>{const k=f(t);if(k==null||k==='')return;(m[k]=m[k]||[0,0]);m[k][0]+=t.pnl;m[k][1]++});return m};
  const arr=(m,ks)=>(ks||Object.keys(m)).filter(k=>m[k]).map(k=>[k,+m[k][0].toFixed(2),m[k][1]]);
  const neg=l=>l.filter(x=>x[1]<0).map(x=>[x[0],+(-x[1]).toFixed(2)]).sort((a,b)=>b[1]-a[1]);
  const WD=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],dow=t=>WD[new Date(t.d+'T00:00:00Z').getUTCDay()];
  const ses=arr(by(t=>t.ses)),dir=arr(by(t=>t.side),['BUY','SELL']),wm=by(dow),wd=['Mon','Tue','Wed','Thu','Fri'].map(k=>[k,wm[k]?+wm[k][0].toFixed(2):0]);
  const HB=['0-1m','1-5m','5-15m','15-60m','60m+'],hb=s=>s<60?HB[0]:s<300?HB[1]:s<900?HB[2]:s<3600?HB[3]:HB[4];
  const hold=(demo||T.some(t=>t.hold!=null))?arr(by(t=>t.hold==null?null:hb(t.hold)),HB):[],mis=(()=>{const mm={};T.forEach(t=>t.tags.forEach(g=>{(mm[g]=mm[g]||[0,0]);mm[g][0]+=t.pnl;mm[g][1]++}));return arr(mm)})();
  const lot=arr(by(t=>t.lot!=null?String(t.lot):null)),NT=[['Not tracked in real data',0]];
  const hm={Mon:[],Tue:[],Wed:[],Thu:[],Fri:[]},hh={};
  T.forEach(t=>{const k=dow(t)+(+t.t.slice(0,2));(hh[k]=hh[k]||[0,0]);hh[k][0]+=t.pnl;hh[k][1]++});
  Object.keys(hm).forEach(d=>{for(let h=0;h<24;h++){const x=hh[d+h];hm[d][h]=x?(x[0]<0?-x[1]:x[1]):0}});
  const reent=[];for(let i=1;i<n;i++)if(T[i].d===T[i-1].d&&T[i-1].pnl<0)reent.push(T[i].pnl);
  const ex=by(t=>t.why==='SL'?'Stop-loss':t.why==='User'?'Manual':t.why==='TP'?'Target':'Other'),exl=Object.keys(ex).map(k=>[k,ex[k][1]]).sort((a,b)=>b[1]-a[1]);
  const aw=W?sw/W:0,al=L?sl/L:0,pf=gl?gp/gl:0,cost=T.reduce((a,t)=>a+(t.cost||0),0),net=gp-gl+cost,worst=l=>l.reduce((a,b)=>b[1]<a[1]?b:a,l[0]),best=l=>l.reduce((a,b)=>b[1]>a[1]?b:a,l[0]);
  const $$=v=>(v<0?'-$':'+$')+Math.abs(v).toFixed(2);
  const wr=n?(W/n*100):0,beWR=aw+al?al/(aw+al)*100:0,decWR=W+L?W/(W+L)*100:0,ws=ses.length?worst(ses.map(x=>[x[0],x[1]/x[2]])):null,wdT=wd.filter(x=>wm[x[0]]),wdd=worst(wdT.length?wdT:wd),bdd=best(wdT.length?wdT:wd);
  const take=[];
  if(n){take.push([decWR<beWR?'var(--red)':'var(--green)',decWR<beWR?'Hit rate is below break-even.':'Hit rate clears break-even.','You win '+decWR.toFixed(0)+'% of decisive trades and need '+beWR.toFixed(0)+'% at a '+(al?(aw/al).toFixed(2):'n/a')+' payoff.']);
    if(ws)take.push([ws[1]<0?'var(--red)':'var(--green)','Weakest session per trade: '+ws[0]+'.','Averages '+$$(ws[1])+' a trade across '+jlN(ses.find(x=>x[0]===ws[0])[2],'trade')+'.']);
    take.push([bdd[1]>0?'var(--green)':'var(--amber)','Best weekday: '+bdd[0]+' ('+$$(bdd[1])+').',(wdT.length<2?'Only one weekday has trades so far.':(wdd[1]>=0?'Weakest weekday: ':'Worst weekday: ')+wdd[0]+' ('+$$(wdd[1])+').')]);
    take.push(mis.length?['var(--accent-2)','Top tagged leak: '+worst(mis)[0]+'.',$$(worst(mis)[1])+' attributed. Tags can overlap, so leak totals may exceed net loss.']:['var(--faint)','No mistake tags yet.','Tag trades in the Journal to see which mistakes cost you.'])}
  else take.push(['var(--faint)','No trades in this dataset.','Log trades to see takeaways.']);
  const ins=n?[['var(--green)','Performance:',jlN(n,'trade')+', '+wr.toFixed(0)+'% win rate, net '+$$(net)+'.','Review only trades that followed your rules first.'],
    ['var(--amber)','Main leak:',mis.length?worst(mis)[0]+' costs '+$$(worst(mis)[1])+'.':'No mistake tags logged yet.',mis.length?'Make it the first checklist item before entry.':'Tag mistakes in the Journal to unlock this.'],
    ws&&ws[1]>=0?['var(--green)','Weakest session:',ws[0]+' still averages '+$$(ws[1])+' a trade.','Every session is positive. Keep your size and rules the same.']:['var(--red)','Worst session:',ws?ws[0]+' averages '+$$(ws[1])+' a trade.':'No sessions recorded.',ws?'Reduce size or skip it until setup quality improves.':''],
    ['var(--accent-2)','Drawdown:','Max drawdown is '+$$(-dd)+'.','Stop for the day after one loss or your daily loss limit.']]:[['var(--faint)','No trades yet:','Nothing to analyse in this dataset.','']];
  const pal=['#43d787','#f0685c'];
  window.__A={cost,mt:T.filter(t=>t.tags.length).length,n,W,L,BE,gp,gl,net,dd,aw,al,pf,wr,eq,demo,start:Number(window.jlStartBalance)||0,
    leak:{Mistakes:mis.length?mis:NT,Session:ses.map(x=>[x[0],x[1]]),Direction:dir.map(x=>[x[0],x[1]]),Weekday:wd,'Hold time':hold.length?hold.map(x=>[x[0],x[1]]):NT,'Lot size':lot.map(x=>[x[0],x[1]])},
    mix:[['Trade outcome',wr.toFixed(1)+'% win rate',[['Wins',W,'#43d787'],['Losses',L,'#f0685c'],['Break-even',BE,'#8b90a3']]],
      ['P&amp;L composition','Profit factor '+pf.toFixed(2),[['Gross profit',gp||1e-4,'#43d787',$$(gp)],['Gross loss',gl||1e-4,'#f0685c',$$(-gl)]]],
      ['Session activity',ses.length?ses.reduce((a,b)=>b[2]>a[2]?b:a)[0]+' is busiest':'No sessions',ses.map((x,i)=>[x[0],x[2],['#b39ffb','#8b90a3','#c7cbd6'][i%3],'#'+x[2]])],
      ['Exit reason',exl.length?exl[0][0]+' is most common':'No exits',exl.map((x,i)=>[x[0],x[1],['#8b90a3','#f0f1f5','#7c6cf0'][i%3],Math.round(x[1]/n*100)+'%'])]],
    ses:ses.map(x=>[x[0],x[1],x[2]]),wd,hm,reent,exl,take,ins,
    sesCount:ses.map(x=>[x[0],x[2]]).sort((a,b)=>b[1]-a[1]),negMis:neg(mis),negHold:neg(hold),negDir:neg(dir),negDay:neg(wd.map(x=>[x[0],x[1]]))};
})();
/* ===== end DATA MODE ===== */



  document.getElementById('dateStr').textContent = new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});

  // ---------- streak-aware nudge (Today's Summary) ----------
  // Real date-based tracking via localStorage — no fake/hardcoded break state.
  // Trading-day boundary matches the prop-firm reset used elsewhere on this tab (06:00 IST) —
  // a trade at 05:50 IST still belongs to yesterday's trading day, not the new calendar date.
  function getTradingDayIST(){ return window.JLMath.tradingDayIST(Date.now()); }
  window.getTradingDayIST = getTradingDayIST; // shared with Account Settings (Daily loss remaining tile)

  (function(){
    try{
      const todayKey = (typeof getTradingDayIST==='function') ? getTradingDayIST() : new Date().toISOString().slice(0,10); // 06:00 IST trading day, same as the rest of the app
      const badge = document.getElementById('streakBadge');
      const nudge = document.getElementById('streakNudge');
      const raw = localStorage.getItem(JL_KEYS.keys.JL_STREAK);
      let data = raw ? JSON.parse(raw) : null;
      if(!data){
        // First time this device has tracked a real streak — keep the existing
        // baseline count already shown in the design rather than inventing a new number.
        const baseline = parseInt((badge.textContent.match(/\d+/)||[1])[0], 10) || 1;
        data = { count: baseline, lastDate: todayKey };
      } else {
        const last = new Date(data.lastDate+'T00:00:00');
        const today = new Date(todayKey+'T00:00:00');
        const daysGap = Math.round((today - last) / 86400000);
        if(daysGap === 0){
          // already tracked today, no change
        } else if(daysGap === 1){
          data.count += 1;
        } else if(daysGap > 1){
          nudge.textContent = 'Missed ' + (daysGap-1) + ' day' + (daysGap-1!==1?'s':'') + ' — streak reset. Fresh start today.';
          nudge.hidden = false;
          requestAnimationFrame(()=>nudge.classList.add('show'));
          data.count = 1;
        }
        data.lastDate = todayKey;
      }
      badge.textContent = data.count + '-day streak';
      localStorage.setItem(JL_KEYS.keys.JL_STREAK, JSON.stringify(data));
    }catch(e){ /* localStorage unavailable — leave the static baseline badge as-is */ console.debug('[journall] ignored error in todays-summary.js:', e);}
  })();

  // ---------- shared tooltip ----------
  const ttip = document.getElementById('ttip');
  function showTip(e, html){
    ttip.innerHTML = html; ttip.classList.add('show');
    const w = 220, h = ttip.offsetHeight || 70;
    let left = e.clientX + 14, top = e.clientY - h/2;
    if(left + w > window.innerWidth) left = e.clientX - w - 14;
    if(top < 8) top = 8;
    if(top + h > window.innerHeight - 8) top = window.innerHeight - h - 8;
    ttip.style.left = left+'px'; ttip.style.top = top+'px';
  }
  function hideTip(){ ttip.classList.remove('show'); }

  (function(){
// ---------- instrument icons ----------
  function iconFor(sym){
    if(/XAU/.test(sym)) return '<svg width="20" height="20" viewBox="0 0 20 20" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,.4))"><circle cx="10" cy="10" r="10" fill="#d4af37"/><circle cx="10" cy="10" r="10" fill="none" stroke="#8a6415" stroke-width="0.6"/><text x="10" y="13.5" font-size="8.5" font-weight="800" text-anchor="middle" fill="#3d2a06" font-family="Inter">Au</text></svg>';
    if(/XAG/.test(sym)) return '<svg width="20" height="20" viewBox="0 0 20 20" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,.4))"><circle cx="10" cy="10" r="10" fill="#c9ccd6"/><circle cx="10" cy="10" r="10" fill="none" stroke="#7a7e8c" stroke-width="0.6"/><text x="10" y="13.5" font-size="8.5" font-weight="800" text-anchor="middle" fill="#33363f" font-family="Inter">Ag</text></svg>';
    if(/^[A-Z]{6}$/.test(sym)) return '<svg width="20" height="20" viewBox="0 0 20 20" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,.4))"><circle cx="10" cy="10" r="10" fill="#5b4fd6"/><path d="M6 8.2h5.2M9.6 6.4L11.4 8.2 9.6 10" stroke="#fff" stroke-width="1.15" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 11.8H8.8M10.4 13.6L8.6 11.8 10.4 10" stroke="#fff" stroke-width="1.15" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    return '<svg width="20" height="20" viewBox="0 0 20 20" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,.4))"><circle cx="10" cy="10" r="10" fill="#2b2e3d"/><path d="M5.5 14V10.5M9.2 14V7M12.9 14V9M16 14V6" stroke="#43d787" stroke-width="1.5" stroke-linecap="round"/></svg>';
  }
  // Exposed on window so the Trades and Journal tabs (separate script blocks) can render the
  // same real per-instrument logo instead of a hardcoded gold dot — one source of truth for the icon.
  window.iconFor = iconFor;

  // ---------- psychology checklist (Today's Summary) ----------
  // Shows the same checklist you edit in the Psychology tab (Checklist step). The items are read from the
  // Psychology tab's saved list (localStorage 'jlPsy:checklist:items'), falling back to its default list.
  // Ticks are remembered per trading day (06:00 IST reset) so each new day starts clean.
  const PSY_SETUP_DEFAULTS = [{k:'req_1',t:'Both side confirmation'},{k:'req_2',t:'No blockage'},{k:'req_3',t:'No losses back to back; if lost 1, stop for this session'},{k:'req_4',t:'SL above candle and under 40 pips'},{k:'req_5',t:'No c2c before 70 pips'},{k:'req_6',t:"If 1 confirmed and another doesn't, and no blockage on both, you can still take the trade"}];
  const ovEsc = v => String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  function ovLoadList(lsKey, defaults, prefix){
    let list = defaults;
    try{ const raw = localStorage.getItem(lsKey); if(raw){ const p = JSON.parse(raw); if(Array.isArray(p) && p.length) list = p.filter(r=>r && r.k && r.t); } }catch(e){console.debug('[journall] ignored error in todays-summary.js:', e);}
    return list.map(r=>({k:prefix+r.k, t:r.t, d:r.d, g:'SETUP'}));
  }
  /* Setup Scan requirements, exactly as saved in the Psychology tab (Setup Scan step) */
  function ovChkItems(){
    return ovLoadList('jlPsy:setup:requirements', PSY_SETUP_DEFAULTS, 's:');
  }
  function ovChkKey(){ return JL_KEYS.dyn.jlOvChk(typeof getTradingDayIST==='function' ? getTradingDayIST() : ''); }
  function ovChkLoad(){ try{ const o = JSON.parse(localStorage.getItem(ovChkKey())||'{}'); return (o && typeof o==='object') ? o : {}; }catch(e){ return {}; } }
  function ovChkSave(o){ try{ localStorage.setItem(ovChkKey(), JSON.stringify(o)); }catch(e){console.debug('[journall] ignored error in todays-summary.js:', e);} }
  let ovChkDay = '';
  function renderOvChecklist(){
    const list = document.getElementById('checklist'); if(!list) return;
    const items = ovChkItems(), saved = ovChkLoad();
    ovChkDay = ovChkKey();
    let lastG = '';
    list.innerHTML = items.map(r=>{
      const on = !!saved[r.k];
      const head = r.g!==lastG ? ((lastG=r.g), '<div class="grp-label" style="cursor:default;margin:0 0 2px">SETUP SCAN</div>') : '';
      return head+'<li data-k="'+ovEsc(r.k)+'" class="'+(on?'done':'')+'"><input type="checkbox" '+(on?'checked':'')+' tabindex="-1"><span class="chk-t"><b style="font-weight:600">'+ovEsc(r.t)+'</b>'+(r.d?'<span class="chk-d">'+ovEsc(r.d)+'</span>':'')+'</span></li>';
    }).join('');
    updateProgress();
  }
  window.__renderOvChecklist = renderOvChecklist;
  const ovList = document.getElementById('checklist');
  if(ovList){
    ovList.addEventListener('click', e=>{
      const li = e.target.closest('li[data-k]'); if(!li) return;
      const cb = li.querySelector('input'); if(!cb) return;
      if(e.target !== cb) cb.checked = !cb.checked; // a click on the box itself already toggled it natively
      li.classList.toggle('done', cb.checked);
      const o = ovChkLoad(); if(cb.checked) o[li.dataset.k] = 1; else delete o[li.dataset.k];
      ovChkSave(o);
      updateProgress();
    });
  }
  const ovResetBtn = document.getElementById('chkReset');
  if(ovResetBtn) ovResetBtn.addEventListener('click', ()=>{ ovChkSave({}); renderOvChecklist(); });
  function updateProgress(){
    const all = document.querySelectorAll('#checklist input');
    const done = document.querySelectorAll('#checklist input:checked').length;
    const nowFull = all.length>0 && done===all.length;
    const wasFull = chkBarWrap.classList.contains('full');
    chkBar.style.width = (all.length ? done/all.length*100 : 0)+'%';
    chkHint.textContent = done+' / '+all.length+' complete';
    chkBarWrap.classList.toggle('full', nowFull);
    if(nowFull && !wasFull){ chkBarWrap.style.animation='none'; void chkBarWrap.offsetWidth; chkBarWrap.style.animation=''; }
  }
  renderOvChecklist();
  // pick up Psychology-tab edits and the 06:00 IST day rollover
  window.addEventListener('hashchange', renderOvChecklist);
  setInterval(()=>{ if(ovChkDay !== ovChkKey()) renderOvChecklist(); }, 60000);


  // ---------- market session rows + real overlaps ----------
  const SESS = [
    {name:'Sydney', color:'#7c6cf0', spans:[[22,24],[0,7]]},
    {name:'Tokyo', color:'#b39ffb', spans:[[0,9]]},
    {name:'London', color:'#c7cbd6', spans:[[8,17]]},
    {name:'New York', color:'#43d787', spans:[[13,22]]}
  ];
  const OVERLAPS = [
    {label:'Sydney × Tokyo', sub:'Asian session, lighter volume', start:0, end:7, color:'199,203,214'},
    {label:'Tokyo × London', sub:'Handover window, brief liquidity dip', start:8, end:9, color:'199,203,214'},
    {label:'London × New York', sub:'Highest volatility window of the day', start:13, end:17, color:'199,203,214'}
  ];
  function pct(h){ return (h/24*100)+'%'; }
  let sessHtml = '';
  SESS.forEach(s=>{
    sessHtml += '<div class="sess-row"><div class="sess-name"><span class="sess-dot" style="background:'+s.color+';box-shadow:0 0 6px '+s.color+'"></span>'+s.name.toUpperCase()+'</div><div class="sess-track">';
    s.spans.forEach(sp=>{
      sessHtml += '<div class="sess-bar" style="left:'+pct(sp[0])+';width:'+pct(sp[1]-sp[0])+';background:'+s.color+';color:'+s.color+'"></div>';
    });
    sessHtml += '</div></div>';
  });
  document.getElementById('sessBody').innerHTML =
    sessHtml +
    '<div class="overlay-layer" id="overlayLayer"></div>';
  const overlay = document.getElementById('overlayLayer');
  const rowsH = SESS.length*27 - 9;
  OVERLAPS.forEach(o=>{
    const band = document.createElement('div');
    band.className = 'overlap-band';
    band.style.left = pct(o.start); band.style.width = pct(o.end-o.start); band.style.height = rowsH+'px';
    band.style.pointerEvents = 'auto';
    band.addEventListener('mouseenter', e=>showTip(e,
      '<div class="th">'+o.label+'</div><div class="tsub">'+o.sub+'</div><div class="tr" style="margin-top:6px"><span>Window</span><b>'+String(o.start).padStart(2,'0')+':00–'+String(o.end).padStart(2,'0')+':00 UTC</b></div>'));
    band.addEventListener('mousemove', e=>showTip(e, ttip.innerHTML));
    band.addEventListener('mouseleave', hideTip);
    overlay.appendChild(band);
  });
  const nowLine = document.createElement('div');
  nowLine.className = 'now-line'; nowLine.style.height = rowsH+'px';
  overlay.appendChild(nowLine);

  // One live clock (UTC) drives the marker, the IST label and the pill.
  const SESS_OPEN_UTC = {'Sydney':22,'Tokyo':0,'London':8,'New York':13};
  function marketSessionState(d){
    const h = d.getUTCHours() + d.getUTCMinutes()/60;
    const dow = d.getUTCDay(); // 0 Sun ... 6 Sat
    const closed = dow===6 || (dow===5 && h>=22) || (dow===0 && h<22);
    let pill;
    if(closed){ pill = 'Forex closed (weekend)'; }
    else {
      let best = null;
      SESS.forEach(s=>{
        const open = SESS_OPEN_UTC[s.name];
        const active = s.spans.some(sp=>h>=sp[0] && h<sp[1]);
        if(!active) return;
        const el = (h - open + 24) % 24;
        if(best===null || el < best.el) best = {name:s.name, el:el};
      });
      if(best){
        const m = Math.floor(best.el*60);
        pill = Math.floor(m/60)+'h '+String(m%60).padStart(2,'0')+'m into '+best.name;
      } else { pill = 'Between sessions'; }
    }
    return {h:h, closed:closed, pill:pill};
  }
  function updateMarketSession(){
    const d = new Date();
    const st = marketSessionState(d);
    let ist;
    try { ist = new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit',hour12:false}).format(d); }
    catch(e){ ist = '--:--'; }
    nowLine.style.left = (st.h/24*100)+'%';
    nowLine.setAttribute('data-t','now · '+ist+' IST');
    const pillEl = document.getElementById('nowTxt');
    if(pillEl) pillEl.textContent = st.pill;
    // Weekend: hide Market Session + the 4 cards under it while forex is closed
    const sc = document.getElementById('sessionCard'), r4 = document.getElementById('summaryRow4');
    if(sc) sc.hidden = st.closed;
    if(r4) r4.hidden = st.closed;
  }
  updateMarketSession();
  setInterval(updateMarketSession, 60000);

  // ---------- real trade data + equity curve (Today's Summary) ----------
  const WHY_LABEL = {SL:'Stop loss',TP:'Target hit',User:'Manual close'};

  function smoothPath(pts){
    let d = 'M'+pts[0].x+','+pts[0].y+' ';
    for(let i=0;i<pts.length-1;i++){
      const p0 = pts[i-1]||pts[i], p1=pts[i], p2=pts[i+1], p3=pts[i+2]||p2;
      const c1x=p1.x+(p2.x-p0.x)/6, c1y=p1.y+(p2.y-p0.y)/6;
      const c2x=p2.x-(p3.x-p1.x)/6, c2y=p2.y-(p3.y-p1.y)/6;
      d += 'C'+c1x+','+c1y+' '+c2x+','+c2y+' '+p2.x+','+p2.y+' ';
    }
    return d;
  }

  function buildChart(trades, pnlLabel){
    const W=420,H=180,padL=40,padR=10,padT=18,padB=25;
    let bal = 0;
    const series = [{label:'Day start',time:'—',sym:null,pnl:0,bal:0}];
    trades.forEach(t=>{ bal += t.pnl; series.push({label:t.sym,time:t.time,sym:t.sym,side:t.side,pnl:t.pnl,bal:bal}); });
    const vals = series.map(s=>s.bal);
    const min = Math.min(0,...vals) - 8, max = Math.max(...vals) + 8;
    const pts = series.map((s,i)=>({
      x: padL + i*(W-padL-padR)/(series.length-1),
      y: padT + (max-s.bal)/(max-min)*(H-padT-padB),
      ...s
    }));
    const line = smoothPath(pts);
    const area = line + ' L'+pts[pts.length-1].x+','+(H-padB)+' L'+pts[0].x+','+(H-padB)+' Z';
    const gridVals = [max, max-(max-min)/3, max-(max-min)*2/3, min];
    let grid = '';
    gridVals.forEach((v,i)=>{
      const y = padT + (i*(H-padT-padB)/3);
      grid += '<line x1="'+padL+'" y1="'+y+'" x2="'+(W-padR)+'" y2="'+y+'"/>';
      grid += '<text x="0" y="'+(y+3)+'" class="chart-yl">'+(v>=0?'+$':'-$')+Math.abs(v).toFixed(0)+'</text>';
    });
    let dots = '';
    pts.forEach((p,i)=>{
      const isLast = i===pts.length-1;
      const c = p.sym===null ? 'var(--accent-2)' : (p.pnl>=0 ? 'var(--green)':'var(--red)');
      if(isLast) dots += '<circle class="chart-pt-halo" cx="'+p.x+'" cy="'+p.y+'" r="4" stroke="'+c+'"/>';
      dots += '<circle class="chart-pt" cx="'+p.x+'" cy="'+p.y+'" r="3.5" fill="'+c+'"/>';
      dots += '<circle class="chart-hit" pointer-events="all" data-i="'+i+'" cx="'+p.x+'" cy="'+p.y+'" r="13"/>';
    });
    const sessionLow = Math.min(...vals), sessionHigh = Math.max(...vals);
    curvePanel.innerHTML = '<div class="chart-wrap"><svg width="100%" height="180" viewBox="0 0 420 180">'+
      '<defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--green)" stop-opacity=".3"/><stop offset="100%" stop-color="var(--green)" stop-opacity="0"/></linearGradient></defs>'+
      '<g class="chart-grid">'+grid+'</g>'+
      '<path d="'+area+'" fill="url(#cg)" stroke="none"/>'+
      '<path class="chart-line" d="'+line+'"/>'+dots+
      '</svg></div>'+
      '<div class="chart-stats"><span class="s">Session low <b style="color:'+(sessionLow<0?'var(--red)':'var(--green)')+'">'+(sessionLow>=0?'$':'-$')+Math.abs(sessionLow).toFixed(2)+'</b></span><span class="s">Session high <b style="color:'+(sessionHigh<0?'var(--red)':'var(--green)')+'">'+(sessionHigh>=0?'$':'-$')+Math.abs(sessionHigh).toFixed(2)+'</b></span><span class="s">Now <b>'+pnlLabel+'</b></span></div>';

    document.querySelectorAll('.chart-hit').forEach(h=>{
      const p = pts[+h.dataset.i];
      const tipHtml = p.sym===null
        ? '<div class="th">Day start</div><div class="tr"><span>Balance</span><b>$0.00</b></div>'
        : '<div class="th">'+iconFor(p.sym)+' '+p.sym+' <span class="side-tag '+p.side.toLowerCase()+'" style="margin-left:2px">'+p.side+'</span></div>'+
          '<div class="tr"><span>Trade P&amp;L</span><b style="color:'+(p.pnl>=0?'var(--green)':'var(--red)')+'">'+(p.pnl>=0?'+':'')+'$'+p.pnl.toFixed(2)+'</b></div>'+
          '<div class="tr"><span>Balance after</span><b>'+(p.bal>=0?'$':'-$')+Math.abs(p.bal).toFixed(2)+'</b></div>'+
          '<div class="tr"><span>Time</span><b>'+p.time+'</b></div>';
      h.addEventListener('mouseenter', e=>showTip(e, tipHtml));
      h.addEventListener('mousemove', e=>showTip(e, tipHtml));
      h.addEventListener('mouseleave', hideTip);
    });
  }

  // ---------- rule-based post-session review — built from real flags, no fabricated narrative ----------
  function buildReview(rawToday, net){
    const money = v => (v<0?'-$':'+$')+Math.abs(v).toFixed(2);
    const wins = rawToday.filter(t=>window.jlKind(t.pnl)==='win'), losses = rawToday.filter(t=>window.jlKind(t.pnl)==='loss');
    const revenge = rawToday.filter(t=>t.rev), noSl = rawToday.filter(t=>t.sl==null);
    const bySession = {};
    rawToday.forEach(t=>{ bySession[t.ses] = (bySession[t.ses]||0) + t.pnl; });
    const sessions = Object.entries(bySession);
    const worst = sessions.length ? sessions.reduce((a,b)=> b[1]<a[1]?b:a) : null;

    const worked = [];
    if(wins.length) worked.push(wins.length+' of '+rawToday.length+' trade'+(rawToday.length!==1?'s':'')+' closed in profit, '+money(wins.reduce((s,t)=>s+t.pnl,0))+' gross.');
    if(revenge.length===0) worked.push('No trades were flagged as re-entries inside the revenge-trade cooldown window.');
    if(!worked.length) worked.push("Nothing to point to as a clear win from today's trades.");

    const toFix = [];
    if(revenge.length) toFix.push(revenge.length+' trade'+(revenge.length!==1?'s were':' was')+' flagged as a revenge trade — re-entered inside the cooldown window after a loss.');
    if(noSl.length) toFix.push(noSl.length+' of '+rawToday.length+' trade'+(rawToday.length!==1?'s':'')+' had no stop-loss recorded.');
    if(worst && worst[1]<0) toFix.push(worst[0]+' was the weakest session today at '+money(worst[1])+'.');
    if(!toFix.length) toFix.push('Nothing flagged — no revenge trades and every trade had a recorded stop.');

    let rule = "Keep following today's plan — nothing flagged to change.";
    if(revenge.length) rule = 'After a loss, wait out the full cooldown window before the next entry.';
    else if(noSl.length) rule = 'Set a stop-loss before every entry, no exceptions.';
    else if(worst && worst[1]<0) rule = 'Reduce size or skip '+worst[0]+' until setup quality there improves.';

    return {net, wins, losses, worked, toFix, rule};
  }

  // ---------- weekly cards (Mon-Sun, 06:00 IST trading day). Limits = daily limit x active days (Mon-Fri = 5). ----------
  function updateWeekCard(todayKey){
    if(!document.getElementById('pnlNum')) return;
    const p = todayKey.split('-').map(Number), dt = new Date(Date.UTC(p[0],p[1]-1,p[2])), dow = (dt.getUTCDay()+6)%7;
    /* Mon-Fri: the three cards show today's P&L, daily loss used and today's trades (written by setState). Weekly totals only appear on the weekend, alongside the weekly review. */
    const weekend = dow>=5, lbl = document.querySelectorAll('.rings .ring-label');
    if(lbl.length===3){ const T = weekend ? ['WEEK P&L','WEEK LOSS USED','WEEK TRADES'] : ['TODAY P&L','DAILY LOSS USED',"TODAY'S TRADES"]; for(let i=0;i<3;i++) lbl[i].textContent = T[i]; }
    if(!weekend) return;
    const iso = ms => new Date(ms).toISOString().slice(0,10);
    const ws = iso(dt.getTime()-dow*864e5), we = iso(dt.getTime()+(6-dow)*864e5);
    const rows = (window.__trades||[]).filter(t=>t && t.d && t.d>=ws && t.d<=we && isFinite(Number(t.pnl)));
    const kind = v => window.jlKind(Number(v));
    const money = v => (v<0?'-$':'$')+Math.abs(v).toFixed(2);
    const set = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
    const dayTgt = Number(window.jlDayProfitTargetUSD)||0, dayLoss = Number(window.jlDailyLossLimit)||0, dayTrades = Number(window.jlMaxTradesPerDay)||0;
    const wkTgt = Number(window.jlWeeklyProfitTargetUSD) || 0;
    const wkLoss = Number(window.jlWeeklyLossLimit) || 0;
    const byDay = {}, seen = {};
    rows.forEach(t=>{ const d = byDay[t.d]||(byDay[t.d]={net:0,loss:0,keys:{}}); const v=Number(t.pnl); d.net+=v; d.loss=Math.max(0,-d.net); d.keys[t.d+'|'+t.t+'|'+t.sym+'|'+t.side]=1; seen[t.d+'|'+t.t+'|'+t.sym+'|'+t.side]=1; });
    const activeDays = Object.keys(byDay).length;
    const net = rows.reduce((s,t)=>s+Number(t.pnl),0);
    const W = rows.filter(t=>kind(t.pnl)==='win').length, L = rows.filter(t=>kind(t.pnl)==='loss').length;
    const lossUsed = Math.max(0,-net);
    const tradeCount = Object.keys(seen).length;
    const broken = Object.keys(byDay).filter(d=>(dayLoss>0&&byDay[d].loss>=dayLoss)||(dayTrades>0&&Object.keys(byDay[d].keys).length>dayTrades)).length;
    const ring = (id,frac,color) => { const el=document.getElementById(id); if(!el) return; el.style.setProperty('--off',239-239*Math.max(0,Math.min(1,frac))); if(color) el.style.stroke=color; };

    /* 1 - weekly profit */
    const pct = wkTgt>0 ? Math.min(100,Math.max(0,Math.round(net/wkTgt*100))) : 0;
    const n1 = document.getElementById('pnlNum'); n1.textContent = money(net); n1.style.color = net<0?'var(--red)':'';
    set('pnlSub', wkTgt>0 ? pct+'% of $'+wkTgt.toFixed(0)+' weekly target' : 'No weekly target set');
    ring('ringPnl', pct/100, net<0?'var(--red)':'var(--green)');
    document.getElementById('pnlDetail').innerHTML = rows.length
      ? '<span class="tag win">'+W+'W</span><span class="tag loss">'+L+'L</span> <span style="color:var(--faint)">'+activeDays+(activeDays===1?' day':' days')+' active</span>'
      : '<span style="color:var(--faint)">No trades this week</span>';

    /* 2 - weekly loss used */
    set('lossNum', '$'+lossUsed.toFixed(2)+' / '+(wkLoss>0?'$'+wkLoss.toFixed(0):'not set'));
    const lr = wkLoss>0 ? lossUsed/wkLoss : 0;
    set('lossSub', wkLoss>0 ? '$'+Math.max(0,wkLoss-lossUsed).toFixed(2)+' room left' : 'No weekly loss limit set');
    ring('ringLoss', lr, lr>.9?'var(--red)':lr>=.6?'var(--warn)':'var(--green)');
    set('lossDetail', L+' losing trade'+(L===1?'':'s')+' this week');

    /* 3 - weekly trades */
    set('tradesNum', String(tradeCount));
    ring('ringTrades', 0);
    set('tradesSub', broken+' day'+(broken===1?'':'s')+' broke a daily rule');
    set('tradesDetail', activeDays ? 'avg '+(tradeCount/activeDays).toFixed(1)+'/day over '+activeDays+(activeDays===1?' active day':' active days') : 'No trades this week');
  }

  function setState(){
    const todayKey = getTradingDayIST();
    const rawToday = (window.__trades||[]).filter(t=>t.d===todayKey).slice().sort((a,b)=> a.t.localeCompare(b.t));
    const journals = window.__getJournals ? window.__getJournals() : [];
    const targetUSD = Number(window.jlDayProfitTargetUSD) || Number(window.jlProfitTargetUSD) || 0;
    const tradeLimit = Number(window.jlMaxTradesPerDay) || 0;
    const tradeCount = new Set(rawToday.map(t=>t.d+'|'+t.t+'|'+t.sym+'|'+t.side)).size; /* partial closes share one open time = one trade */
    try{ if(typeof window.__jlExtraRules === 'function') window.__jlExtraRules(rawToday); }catch(e){console.debug('[journall] ignored error in todays-summary.js:', e);}
    const lossLimit = Number(window.jlDailyLossLimit) || 0;
    const hasL = lossLimit>0, hasT = tradeLimit>0, hasTg = targetUSD>0, fL = hasL?'$'+lossLimit.toFixed(0):'not set', fT = hasT?String(tradeLimit):'not set', fTg = hasTg?'$'+targetUSD.toFixed(0):'not set';

    const trades = rawToday.map(t=>({
      time: t.t.slice(0,5), sym: t.sym, side: t.side==='BUY'?'Long':'Short', session: t.ses,
      entry: (Number.isFinite(t.en)?t.en.toFixed(2):'-'), exit: (Number.isFinite(t.ex)?t.ex.toFixed(2):'-'), dur: 'Not tracked', pnl: t.pnl,
      reason: WHY_LABEL[t.why] || '—'
    }));
    const wins = trades.filter(t=>window.jlKind(t.pnl)==='win'), losses = trades.filter(t=>window.jlKind(t.pnl)==='loss');
    const pnlTotal = trades.reduce((s,t)=>s+t.pnl,0);
    const grossLossAmt = Math.abs(trades.reduce((s,t)=>t.pnl<0?s+t.pnl:s,0));
    const lossUsed = Math.max(0,-pnlTotal); /* net loss of the day on closed trades */
    const avgWin = wins.length? wins.reduce((s,t)=>s+t.pnl,0)/wins.length : 0;
    const avgLoss = losses.length? Math.abs(losses.reduce((s,t)=>s+t.pnl,0))/losses.length : 0;
    const grossWin = trades.reduce((s,t)=>t.pnl>0?s+t.pnl:s,0), grossLoss = grossLossAmt;
    const pf = grossLoss? (grossWin/grossLoss).toFixed(2) : '—';
    const expVal = trades.length ? (pnlTotal/trades.length).toFixed(2) : 0;
    const pnlPct = targetUSD>0 ? Math.min(100, Math.max(0, Math.round(pnlTotal/targetUSD*100))) : 0;

    if(!trades.length){
      pnlNum.textContent='$0.00'; pnlSub.textContent=hasTg?'0% of '+fTg+' target':'Profit target not set'; ringPnl.style.setProperty('--off',239); pnlDetail.innerHTML='';
      lossNum.textContent='$0 / '+fL; lossSub.textContent=hasL?'Full room left':'No loss limit set'; ringLoss.style.setProperty('--off',239); ringLoss.style.stroke='var(--green)'; lossDetail.innerHTML='';
      tradesNum.textContent='0 / '+fT; ringTrades.style.setProperty('--off',239); tradesDetail.innerHTML='';
      bestAction.textContent='Wait for A+ setup'; bestActionMeta.textContent='No trades logged yet today';
      statusVal.textContent='Safe to trade'; statusDot.style.background='var(--green)'; statusDot.classList.remove('danger'); statusMeta.textContent='Since 06:00 IST reset';
      if(hasT&&hasTg){ riskVal.textContent='$'+(targetUSD/tradeLimit).toFixed(2); riskMeta.textContent='Based on the full '+fTg+' target over '+tradeLimit+' trades'; } else { riskVal.textContent='\u2014'; riskMeta.textContent='Set a profit target and trade limit in Account Settings'; }
      notesHint.textContent=''; curveHint.textContent='';
      notesPanel.innerHTML='<div class="notes-empty"><div class="t">No insights yet</div><div class="s">Upload today\'s trading export to generate live review notes.</div></div>';
      curvePanel.innerHTML='<div class="curve-empty"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" stroke-width="1.5"><path d="M3 17l6-6 4 4 8-8"/></svg>Upload today\'s trading export to generate the intraday curve.</div>';
      avgWL.textContent='—'; toTarget.textContent='—'; pfactor.textContent='—'; expectancy.textContent='—'; mood.textContent='—'; streak.textContent='—';
      tradesPill.textContent='0 trades'; syncTxt.textContent='Awaiting first sync'; lastAlertArgs=[0,0]; alertBroken=false; if(window.__refreshHeadsUp) window.__refreshHeadsUp();
      tradesBody.innerHTML='<tr><td colspan="10">No trades found for today. Upload today\'s export.</td></tr>';
      reviewStatus.textContent='No trades found for today.';
    } else {
      pnlNum.textContent=(pnlTotal>=0?'$':'-$')+Math.abs(pnlTotal).toFixed(2);
      pnlSub.textContent=hasTg?pnlPct+'% of '+fTg+' target':'Profit target not set'; ringPnl.style.setProperty('--off',239-239*(pnlPct/100));
      pnlDetail.innerHTML='<span class="tag win">'+wins.length+'W</span><span class="tag loss">'+losses.length+'L</span>';
      lossNum.textContent='$'+lossUsed.toFixed(2)+' / '+fL; lossSub.textContent=hasL?'$'+Math.max(0,lossLimit-lossUsed).toFixed(2)+' room left':'No loss limit set';
      {const lr=hasL?lossUsed/lossLimit:0; ringLoss.style.setProperty('--off',239-239*Math.min(1,lr)); ringLoss.style.stroke=lr>.9?'var(--red)':lr>=.6?'var(--warn)':'var(--green)';} lossDetail.textContent=losses.length+' losing trade(s) today';
      tradesNum.textContent=tradeCount+' / '+fT; ringTrades.style.setProperty('--off',239-239*(hasT?Math.min(1,tradeCount/tradeLimit):0)); tradesDetail.textContent=hasT?Math.max(0,tradeLimit-tradeCount)+' slots remaining':'No trade limit set';
      const breaksNow = (hasL&&lossUsed>=lossLimit?1:0) + (hasT&&tradeCount>=tradeLimit?1:0);
      if(breaksNow>0){ bestAction.textContent='Stop for today'; bestActionMeta.textContent='A daily rule has been reached'; }
      else if(hasTg&&pnlTotal>=targetUSD){ bestAction.textContent='Target reached'; bestActionMeta.textContent='Consider stopping for the day'; }
      else { bestAction.textContent='Continue your plan'; bestActionMeta.textContent=trades.length+' trade(s) so far · '+pnlPct+'% of target'; }
      statusVal.textContent='On pace'; statusDot.style.background='var(--amber)'; statusDot.classList.remove('danger'); statusMeta.textContent=hasTg?pnlPct+'% of daily target reached':'Profit target not set';
      updateRuleAlert(lossUsed, trades.length);
      const remainingTarget=Math.max(0,targetUSD-pnlTotal), remainingSlots=Math.max(0,tradeLimit-tradeCount);
      if(!hasT||!hasTg){ riskVal.textContent='\u2014'; riskMeta.textContent='Set a profit target and trade limit in Account Settings'; }
      else if(remainingSlots>0){ riskVal.textContent='$'+(remainingTarget/remainingSlots).toFixed(2); riskMeta.textContent='Based on $'+remainingTarget.toFixed(2)+' remaining target over '+remainingSlots+' trade(s) left'; }
      else { riskVal.textContent='$0.00'; riskMeta.textContent='No trade slots remaining today'; }
      const revenge=rawToday.filter(t=>t.rev), noSl=rawToday.filter(t=>t.sl==null), notes=[];
      if(revenge.length) notes.push(['var(--red)','Revenge trade flagged','Re-entered inside the cooldown window after a loss — '+revenge.length+' trade(s).']);
      if(noSl.length) notes.push(['var(--amber)','No stop-loss on '+noSl.length+' trade(s)','Set a stop before entry next time.']);
      notes.push(['var(--accent-2)','Pace check', trades.length+' of '+fT+' trades taken'+(hasTg?', '+pnlPct+'% of target so far.':'.')]);
      notesHint.textContent=notes.length+' insight'+(notes.length!==1?'s':''); curveHint.textContent='Hover the line for per-trade detail';
      notesPanel.innerHTML=notes.map(n=>'<div class="note-item"><div class="note-dot" style="background:'+n[0]+'"></div><div><div class="t">'+n[1]+'</div><div class="s">'+n[2]+'</div></div></div>').join('');
      buildChart(trades, pnlNum.textContent);
      avgWL.textContent='$'+avgWin.toFixed(2)+' / $'+avgLoss.toFixed(2); toTarget.textContent=pnlPct+'%';
      pfactor.textContent=pf; expectancy.textContent=(expVal>=0?'+$':'-$')+Math.abs(expVal);
      const jkey=t=>t.d+' '+t.t+' '+t.side+' '+t.en+' '+t.pnl;
      const emotions=rawToday.map(t=>{const je=journals.find(e=>e.key===jkey(t));return je&&je.emotion}).filter(Boolean);
      if(emotions.length){ const counts={}; emotions.forEach(e=>counts[e]=(counts[e]||0)+1); mood.textContent=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0]; }
      else mood.textContent='Not tracked';
      let run=0,lastKind=null;
      for(let i=trades.length-1;i>=0;i--){ const k=window.jlKind(trades[i].pnl); if(lastKind===null)lastKind=k; if(k!==lastKind)break; run++; }
      streak.textContent = lastKind==='be' ? '—' : run+' '+(lastKind==='win' ? (run!==1?'wins':'win') : (run!==1?'losses':'loss'));
      tradesPill.textContent=trades.length+' trade'+(trades.length!==1?'s':''); syncTxt.textContent='Synced from your trade log';
      tradesBody.innerHTML = trades.map(t=>`<tr>
        <td>${iconFor(t.sym)}</td>
        <td class="mono">${t.time}</td><td style="font-weight:600">${t.sym}</td>
        <td><span class="side-tag ${t.side.toLowerCase()}">${t.side}</span></td>
        <td style="color:var(--faint)">${t.session}</td>
        <td class="mono">${t.entry}</td><td class="mono">${t.exit}</td><td style="color:var(--faint)">${t.dur}</td>
        <td class="mono" style="color:${t.pnl>=0?'var(--green)':'var(--red)'};font-weight:650">${t.pnl>=0?'+':''}$${t.pnl.toFixed(2)}</td>
        <td style="color:var(--sub)">${t.reason}</td></tr>`).join('');
      reviewStatus.textContent=trades.length+' trade'+(trades.length!==1?'s':'')+' logged today.';
    }
    try{ updateWeekCard(todayKey); }catch(e){console.debug('[journall] ignored error in todays-summary.js:', e);} /* Mon-Fri keeps the daily values above; Sat/Sun swaps in the week totals */
    resetReview();
    updateRules(pnlTotal, lossUsed, trades.length, wins.length);
    return {rawToday, trades, pnlTotal};
  }

  let lastState = null;
  window.__jlWeekCards = function(){ try{ updateWeekCard(getTradingDayIST()); }catch(e){console.debug('[journall] ignored error in todays-summary.js:', e);} };
  function renderToday(){ lastState = setState(); }

  // ---------- post-session review ----------
  function resetReview(){
    reviewBox.innerHTML = '<div class="review-empty"><span class="review-dot"></span>'+
      '<div><div class="t">No post-session review yet.</div><div class="s">Upload today\'s trades, then generate the review.</div></div></div>';
  }
  document.getElementById('genReview').addEventListener('click', ()=>{
    if(!lastState || !lastState.trades.length){
      reviewBox.innerHTML = '<div class="review-empty"><span class="review-dot"></span>'+
        '<div><div class="t">Nothing to review yet.</div><div class="s">Log or sync today\'s trades first, then generate the review.</div></div></div>';
      return;
    }
    const genBtn = document.getElementById('genReview');
    genBtn.disabled = true;
    reviewBox.innerHTML = '<div class="review-loading"><span class="review-spin"></span>Reading today\'s trades and building your review…</div>';
    setTimeout(()=>{
      const r = buildReview(lastState.rawToday, lastState.pnlTotal);
      reviewBox.innerHTML =
        '<div class="review-sec"><h3>SUMMARY</h3><ul><li>'+r.wins.length+' win(s), '+r.losses.length+' loss(es) · net '+(r.net>=0?'+$':'-$')+Math.abs(r.net).toFixed(2)+'</li></ul></div>'+
        '<div class="review-sec"><h3>WHAT WORKED</h3><ul>'+r.worked.map(l=>'<li>'+l+'</li>').join('')+'</ul></div>'+
        '<div class="review-sec"><h3>WHAT TO FIX</h3><ul>'+r.toFix.map(l=>'<li>'+l+'</li>').join('')+'</ul></div>'+
        '<div class="review-sec"><h3>Suggested rule for tomorrow</h3><ul><li>'+r.rule+'</li></ul></div>';
      genBtn.disabled = false;
    }, 700);
  });
  document.getElementById('clearReview').addEventListener('click', resetReview);

  // Defer the initial render: window.__trades' revenge-trade flags (jlRecomputeRevenge) and
  // window.__getJournals are populated by later <script> blocks on this page that haven't
  // run yet at this point — a macrotask delay lets them finish first.
  setTimeout(renderToday, 0);
  window.__renderToday = renderToday;

})();
(function(){
const $ = id => document.getElementById(id);
  $('dateStrA').textContent = new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
  const G='#43d787',R='#f0685c',GR='#8b90a3';
  const money=(v,d=2)=>(v<0?'-$':'+$')+Math.abs(v).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
  function ticks(min,max,n){const raw=(max-min)/n,p=Math.pow(10,Math.floor(Math.log10(raw))),f=raw/p,st=(f<=1?1:f<=2?2:f<=5?5:10)*p,t=[];for(let v=Math.floor(min/st)*st;v<=Math.ceil(max/st)*st+1e-9;v+=st)t.push(v);return t}
  function tip(el,fn){el.addEventListener('mousemove',e=>showTip(e,fn(e)));el.addEventListener('mouseleave',hideTip)}
  function frame(vals,W,H,pl,pr,pt,pb,n){const t=ticks(Math.min(0,...vals),Math.max(0,...vals),n||4),lo=t[0],hi=t[t.length-1],y=v=>pt+(hi-v)/(hi-lo)*(H-pt-pb);let g='';
    t.forEach(v=>{g+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="rgba(255,255,255,'+(v===0?.16:.05)+')"/><text class="ax" x="'+(pl-6)+'" y="'+(y(v)+3)+'" text-anchor="end">'+(v<0?'-':v>0?'+':'')+'$'+Math.abs(v)+'</text>'});return{y,g}}
  function scrub(svg,W,pl,pr,N,fn){svg.addEventListener('mousemove',e=>{const b=svg.getBoundingClientRect();fn(Math.max(0,Math.min(N-1,Math.round(((e.clientX-b.left)/b.width*W-pl)/(W-pl-pr)*(N-1)))),e)});svg.addEventListener('mouseleave',()=>{fn(-1);hideTip()})}

  const LEAK=window.__A.leak;
  function leak(k){const d=LEAK[k],vs=d.map(x=>x[1]),lo=Math.min(0,...vs),hi=Math.max(0,...vs),sp=(hi-lo)||1,z=-lo/sp*100,col=v=>v<0?R:G;
    $('aLeak').innerHTML=d.map(([n,v],i)=>'<span class="hn">'+n+'</span><span class="ht" data-i="'+i+'"><u style="left:'+z+'%"></u><i style="left:'+(v<0?(v-lo)/sp*100:z)+'%;width:'+Math.abs(v)/sp*100+'%;background:'+col(v)+'"></i></span><span class="hv" style="color:'+col(v)+'">'+money(v)+'</span>').join('');
    $('aLeak').querySelectorAll('.ht').forEach(e=>tip(e,()=>{const x=d[+e.dataset.i];return '<div class="th">'+x[0]+'</div><div class="tr"><span>Net P&amp;L</span><b style="color:'+(x[1]<0?'var(--red)':'var(--green)')+'">'+money(x[1])+'</b></div>'}));
    const w=d.reduce((a,b)=>b[1]<a[1]?b:a),b=d.reduce((a,c)=>c[1]>a[1]?c:a);
    $('aLeakRead').innerHTML='<b>Worst:</b> '+w[0]+' ('+money(w[1])+') · <b>Best:</b> '+b[0]+' ('+money(b[1])+').'+(k==='Mistakes'?' Remove the biggest leak first.':'')}
  document.querySelectorAll('.a-tab[data-k]').forEach(b=>b.addEventListener('click',()=>{b.parentNode.querySelectorAll('.a-tab[data-k]').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b)});leak(b.dataset.k)}));
  leak('Mistakes');
  const MIX=window.__A.mix;
  $('aMix').innerHTML=MIX.map(([t,s,g],m)=>'<div><header><b>'+t+'</b><span>'+s+'</span></header><div class="a-st">'+g.map(([l,v,c],i)=>'<i data-m="'+m+'" data-i="'+i+'" style="flex:'+v+';background:'+c+'"></i>').join('')+'</div><div class="a-lg">'+g.map(([l,v,c,d])=>'<span><em style="background:'+c+'"></em>'+l+' <b>'+(d||v)+'</b></span>').join('')+'</div></div>').join('');
  $('aMix').querySelectorAll('.a-st i').forEach(e=>{const g=MIX[+e.dataset.m][2],x=g[+e.dataset.i],tot=g.reduce((a,y)=>a+y[1],0);tip(e,()=>'<div class="th">'+x[0]+'</div><div class="tr"><span>Value</span><b>'+(x[3]||x[1])+'</b></div><div class="tr"><span>Share</span><b>'+(x[1]/tot*100).toFixed(1)+'%</b></div>')});

  // equity curve (shape follows the imported curve)
  (function(){const ys=[0].concat(window.__A.eq),N=ys.length;window.__eq=ys;if(N<2){$('cEq').innerHTML='<div class="a-read">No trades in this dataset yet.</div>';return}
    const W=560,H=270,pl=52,pr=12,pt=12,pb=26,f=frame(ys,W,H,pl,pr,pt,pb,5),EC=window.__A.net<0?R:G,ECG=window.__A.net<0?'240,104,92':'67,215,135',X=i=>pl+i*(W-pl-pr)/(N-1),pts=ys.map((v,i)=>X(i).toFixed(1)+','+f.y(v).toFixed(1)).join(' ');
    let lb='';[0,1,2,3,4,5,6,7].map(k=>Math.round(k*(N-1)/7)).forEach(i=>lb+='<text class="ax" x="'+X(i)+'" y="'+(H-8)+'" text-anchor="middle">'+(i?i:'Start')+'</text>');
    $('cEq').innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="100%"><defs><linearGradient id="eqg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+EC+'" stop-opacity=".05"/><stop offset="1" stop-color="'+EC+'" stop-opacity=".4"/></linearGradient></defs>'+f.g+lb+
      '<polygon points="'+X(0)+','+f.y(0)+' '+pts+' '+X(N-1)+','+f.y(0)+'" fill="url(#eqg)"/><polyline points="'+pts+'" fill="none" stroke="'+EC+'" stroke-width="2" stroke-linejoin="round" style="filter:drop-shadow(0 0 5px rgba('+ECG+',.5))"/>'+
      '<line id="eqx" y1="'+pt+'" y2="'+(H-pb)+'" stroke="rgba(255,255,255,.25)" style="opacity:0"/><circle id="eqd" r="4" fill="'+EC+'" stroke="#fff" stroke-width="1.5" style="opacity:0"/></svg>';
    const svg=$('cEq').querySelector('svg'),ln=svg.querySelector('#eqx'),dt=svg.querySelector('#eqd');
    scrub(svg,W,pl,pr,N,(i,e)=>{if(i<0){ln.style.opacity=0;dt.style.opacity=0;return}ln.setAttribute('x1',X(i));ln.setAttribute('x2',X(i));dt.setAttribute('cx',X(i));dt.setAttribute('cy',f.y(ys[i]));ln.style.opacity=1;dt.style.opacity=1;
      showTip(e,'<div class="th">Trade #'+(i+1)+'</div><div class="tr"><span>Cumulative P&amp;L</span><b style="color:'+(ys[i]<0?'var(--red)':'var(--green)')+'">'+money(ys[i])+'</b></div>')});
  })();

  // back-to-back re-entry map
  (function(){const ST=window.__A.reent,N=ST.length;if(N<2){$('cRE').innerHTML='<div class="a-read">Not enough back-to-back re-entries in this dataset.</div>';return}
    const W=560,H=260,pl=52,pr=10,pt=10,pb=24,f=frame(ST,W,H,pl,pr,pt,pb),X=i=>pl+i*(W-pl-pr)/(N-1);let s='<svg viewBox="0 0 '+W+' '+H+'" width="100%">'+f.g;
    for(let i=0;i<N;i+=16)s+='<text class="ax" x="'+X(i)+'" y="'+(H-8)+'" text-anchor="middle">'+(i+1)+'</text>';
    ST.forEach((v,i)=>s+='<line x1="'+X(i)+'" x2="'+X(i)+'" y1="'+f.y(0)+'" y2="'+f.y(v)+'" stroke="'+(v<0?R:G)+'" stroke-width="1.4" stroke-opacity=".8"/>');
    $('cRE').innerHTML=s+'</svg>';
    scrub($('cRE').querySelector('svg'),W,pl,pr,N,(i,e)=>{if(i>=0)showTip(e,'<div class="th">Re-entry #'+(i+1)+'</div><div class="tr"><span>P&amp;L</span><b style="color:'+(ST[i]<0?'var(--red)':'var(--green)')+'">'+money(ST[i])+'</b></div>')});
  })();

  // revenge trades card: reads the existing t.rev flag (jlRecomputeRevenge), no new rule
  const revStats=window.JLMath.revStats; /* pure function: js/trade-math.js */
  (function(){
    const kp=$('aRev');if(!kp)return;
    const st=revStats(window.__trades||[]),win=Number(window.jlRevWindowMin)||0;
    const sub=$('aRevSub');if(sub)sub.textContent=win>0?'Trades opened within '+win+' minutes of a loss, compared with the rest.':'Set the revenge window in Account Settings to measure this.';
    const lotTxt=v=>v==null?'-':v.toFixed(2);
    kp.innerHTML=[
      ['Revenge trades',String(st.n),'var(--text)',st.total?(st.total?(st.n/st.total*100).toFixed(1):'0.0')+'% of '+jlN(st.total,'trade'):'No trades yet'],
      ['Revenge net P&L',st.n?money(st.net):'-',st.n?(st.net<0?'var(--red)':st.net>0?'var(--green)':'var(--text)'):'var(--text)','Total across revenge trades'],
      ['Avg lot, revenge',lotTxt(st.lotRev),'var(--text)','Revenge trades only'],
      ['Avg lot, other trades',lotTxt(st.lotRest),'var(--text)','All non-revenge trades']
    ].map(k=>'<div><span>'+k[0]+'</span><b style="color:'+k[2]+'">'+k[1]+'</b><small>'+k[3]+'</small></div>').join('');
    const r=$('aRevR');
    if(r){
      if(!st.n)r.textContent='No revenge trades flagged in this dataset.';
      else if(st.lotRev!=null&&st.lotRest!=null){
        const d=st.lotRev-st.lotRest;
        r.textContent=Math.abs(d)<.005?'Revenge trades used about the same lot size as your other trades.':d>0?'Revenge trades used a larger lot than your other trades on average.':'Revenge trades used a smaller lot than your other trades on average.';
      } else r.textContent='';
    }
  })();

  // overtrading card: days that reached the daily trade limit (same rule as the banner and discipline streak)
  const overStats=window.JLMath.overStats; /* pure function: js/trade-math.js */
  function renderOver(){
    const kp=$('aOv');if(!kp)return;
    const st=overStats(window.__trades||[],window.jlMaxTradesPerDay);
    const sub=$('aOvSub'),r=$('aOvR');
    const mv=v=>v==null?'-':money(v),col=v=>v==null||v===0?'var(--text)':v<0?'var(--red)':'var(--green)';
    if(!st.on){
      if(sub)sub.textContent='Days that reached your daily trade limit, compared with the rest.';
      kp.innerHTML=[['Overtrading days','-','var(--text)','Daily trade limit not set'],['Net P&L, overtrading days','-','var(--text)','Needs a daily trade limit'],['Avg per day, overtrading','-','var(--text)','Needs a daily trade limit'],['Avg per day, other days','-','var(--text)','Needs a daily trade limit']].map(k=>'<div><span>'+k[0]+'</span><b style="color:'+k[2]+'">'+k[1]+'</b><small>'+k[3]+'</small></div>').join('');
      if(r)r.textContent='Set a daily trade limit in Account Settings to track overtrading.';
      return;
    }
    if(sub)sub.textContent='Days with '+st.limit+' or more trades, your daily trade limit, compared with the rest.';
    kp.innerHTML=[
      ['Overtrading days',String(st.n),'var(--text)',st.days?(st.n/st.days*100).toFixed(1)+'% of '+jlN(st.days,'trading day'):'No trades yet'],
      ['Net P&L, overtrading days',st.n?money(st.netOver):'-',st.n?col(st.netOver):'var(--text)','Total across those days'],
      ['Avg per day, overtrading',mv(st.avgOver),col(st.avgOver),'Net P&L per flagged day'],
      ['Avg per day, other days',mv(st.avgOther),col(st.avgOther),'Net P&L per other day']
    ].map(k=>'<div><span>'+k[0]+'</span><b style="color:'+k[2]+'">'+k[1]+'</b><small>'+k[3]+'</small></div>').join('');
    if(r){
      if(!st.n)r.textContent='No day has reached your limit of '+st.limit+' trades.';
      else if(st.avgOver!=null&&st.avgOther!=null){
        const d=st.avgOver-st.avgOther;
        r.textContent=Math.abs(d)<.005?'Overtrading days averaged about the same per day as your other days.':d<0?'Overtrading days averaged less per day than your other days.':'Overtrading days averaged more per day than your other days.';
      } else r.textContent='';
    }
  }
  renderOver();setTimeout(renderOver,2000);setTimeout(renderOver,6000);

  // weak times card: weekdays and hours with a net loss and at least 3 trades (a trade = one position)
  const weakTimes=window.JLMath.weakTimes; /* pure function: js/trade-math.js */
  window.jlWeakTimes=weakTimes;
  function brokerOff(){try{var s=JSON.parse(localStorage.getItem(JL_KEYS.keys.JL_ACCOUNT_SETTINGS)||'null');if(s&&s.brokerUtcOffset!==''&&s.brokerUtcOffset!=null&&isFinite(Number(s.brokerUtcOffset)))return Number(s.brokerUtcOffset)}catch(e){console.debug('[journall] ignored error in todays-summary.js:', e);}return null}
  function renderWeak(){
    const body=$('aWt');if(!body)return;
    const st=weakTimes(window.__trades||[],3,brokerOff());
    const wk=x=>typeof st.avg!=='number'||x.net/x.n<st.avg;
    const rows=st.days.filter(wk).map(x=>[x.k,'Weekday',x]).concat(st.hours.filter(wk).map(x=>[String(x.k).padStart(2,'0')+':00','Hour (IST)',x]));
    const note=st.paused?'<tr><td colspan="5" style="color:var(--faint);padding:12px">Hour flags are paused. Set the Broker UTC offset in Account Settings (Risk tab) so MT5 times can be converted to IST. Weekdays use the stored date until then.</td></tr>':'';
    if(!rows.length){
      body.innerHTML=note+'<tr><td colspan="5" style="color:var(--faint);padding:18px 12px">'+(st.total?(st.paused?'No weekday is net-losing and worse than your average per trade (at least 3 trades).':'No weekday or hour is net-losing and worse than your average per trade (at least 3 trades).'):'No trades yet.')+'</td></tr>';
      return;
    }
    body.innerHTML=note+rows.map(r=>{const x=r[2];return '<tr><td style="font-weight:600">'+r[0]+'</td><td>'+r[1]+'</td><td class="mono">'+x.n+'</td><td class="mono" style="color:var(--red)">'+money(x.net)+'</td><td class="mono" style="color:var(--red)">'+money(x.net/x.n)+'</td></tr>'}).join('');
  }
  window.jlRenderWeak=renderWeak;
  renderWeak();setTimeout(renderWeak,2000);setTimeout(renderWeak,6000);


  // heatmap: + = net-profit hour, - = net-loss hour, value = trade count (hours 0-17)
  (function(){const HM=window.__A.hm;
    let h='<div class="hm"><span class="hh"></span>'+[...Array(24).keys()].map(i=>'<span class="hh">'+i+'</span>').join('');
    Object.entries(HM).forEach(([d,row])=>{h+='<span class="hh">'+d+'</span>';for(let i=0;i<24;i++){const v=row[i]||0;if(!v){h+='<span class="hc"></span>';continue}
      const c=v<0?'240,104,92':'67,215,135',a=(.16+Math.min(1,Math.abs(v)/23)*.5).toFixed(2);
      h+='<span class="hc" data-t="<div class=&quot;th&quot;>'+d+' '+String(i).padStart(2,'0')+':00</div><div class=&quot;tr&quot;><span>Trades</span><b>'+Math.abs(v)+'</b></div><div class=&quot;tr&quot;><span>Result</span><b>'+(v<0?'net loss':'net profit')+'</b></div>" style="background:rgba('+c+','+a+');box-shadow:inset 0 0 0 1px rgba('+c+',.4);color:#fff">'+Math.abs(v)+'</span>'}});
    const el=$('cHM');el.innerHTML=h+'</div>';
    el.addEventListener('mousemove',e=>{const c=e.target.closest('[data-t]');c?showTip(e,c.dataset.t):hideTip()});el.addEventListener('mouseleave',hideTip);
  })();

})();

// ---------- analytics v2 ----------
(function(){
const $=id=>document.getElementById(id),G='#43d787',R='#f0685c',GR='#8b90a3',AC='#7c6cf0',LI='#b39ffb',GO='#c7cbd6',SI='#c7cbd6';
const money=(v,d=2)=>(v<0?'-$':'+$')+Math.abs(v).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
const tipOn=(el,fn)=>{el.addEventListener('mousemove',e=>showTip(e,fn()));el.addEventListener('mouseleave',hideTip)};
const cv=v=>v<0?'var(--red)':'var(--green)',row=(a,b)=>'<div class="tr"><span>'+a+'</span><b>'+b+'</b></div>',th=t=>'<div class="th">'+t+'</div>';
// core numbers (all from the header stats already on this page)
const A=window.__A,N=A.n,W=A.W,L=A.L,BE=A.BE,GP=A.gp,GL=A.gl,NET=A.net,DD=A.dd,AW=A.aw||1e-4,AL=A.al||1e-4;
(function(){const $=id=>document.getElementById(id),F=(a)=>document.querySelector(a);
  const bal=A.start+NET,col=NET<0?'var(--red)':'var(--green)';
  F('#dateStrA').closest('.top').querySelector('p').textContent=jlN(N,'trade')+' \u00b7 '+(A.demo?'Demo dataset':'Real journal data');
  F('.a-v1 .a-big').textContent='$'+bal.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});F('.a-v1 .a-big').style.color=col;
  F('.a-v1 .hint').innerHTML='<b style="color:'+col+'">'+money(NET)+'</b> from the $'+A.start.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})+' start';
  F('.a-v1 .a-badge').textContent=NET<0?'Loss zone':'In profit';F('.a-v1 .a-badge').classList.toggle('ok',NET>=0);
  const c=(l,v,co,s)=>'<div><span>'+l+'</span><b style="color:'+co+'">'+v+'</b><small>'+s+'</small></div>';
  F('.a-led').innerHTML=c('Net P&amp;L',money(NET),col,'After commission and swap')+c('Win rate',A.wr.toFixed(0)+'%','var(--text)',W+'W / '+L+'L / '+BE+'BE')+c('Profit factor',A.pf.toFixed(2),A.pf>=1?'var(--green)':'var(--amber)','Gross profit / gross loss')+c('Avg win',money(AW<1e-3?0:AW),'var(--green)','Mean winning trade')+c('Avg loss',money(AL<1e-3?0:-AL),'var(--red)','Mean losing trade')+c('Max drawdown',money(-DD),'var(--red)','Worst equity dip')+c('Mistakes',A.mt+' tagged','var(--text)','Trades with a mistake tag');
  const eqs=F('.a-eq .sub');if(eqs)eqs.textContent='Cumulative P&L across '+jlN(N,'trade');
  const rd=F('.a-eq .a-read');if(rd)rd.innerHTML='A rising line means the account is growing; a falling line means losses or a discipline leak. Current result: <b style="color:'+col+'">'+money(NET)+'</b>.';
  F('.a-ins').innerHTML=A.ins.map(x=>'<li style="--c:'+x[0]+'"><b>'+x[1]+'</b> '+x[2]+'<span>'+x[3]+'</span></li>').join('');
})();
const getDDB=function(){var cm=Number(window.jlChMddPct)||0;if(cm>0)return Number(window.jlStartBalance||0)*cm/100;var e=document.getElementById('ggMdd'),v=Number(e&&e.value)||0,u=e&&e.closest('.gg-combo')&&e.closest('.gg-combo').querySelector('select');return u&&u.value==='$'?v:Number(window.jlStartBalance||0)*v/100},TGT=Math.round(window.jlProfitTargetUSD||0),payoff=AW/AL,beWR=AL/(AW+AL)*100,decWR=W+L?W/(W+L)*100:0,expc=N?NET/N:0,rf=DD?NET/DD:0,pf=GL?GP/GL:0,costs=NET-(GP-GL);

$('aKP').innerHTML=[['Expectancy / trade',money(expc),expc>0?'var(--green)':expc<0?'var(--red)':'var(--text)','Net P&L \u00b7 '+jlN(N,'trade')],['Payoff ratio',payoff.toFixed(2),payoff>=1?'var(--green)':'var(--red)','Avg win ÷ avg loss'],['Break-even win rate',beWR.toFixed(1)+'%','var(--amber)','Needed at this payoff'],['Decisive win rate',decWR.toFixed(1)+'%',decWR>=beWR?'var(--green)':'var(--red)','Wins ÷ (wins + losses)'],['Recovery factor',rf.toFixed(2),rf>0?'var(--green)':rf<0?'var(--red)':'var(--text)','Net ÷ max drawdown'],['Scratched trades',(BE/N*100).toFixed(1)+'%','var(--text)',BE+' of '+N+' break-even'],['Commission + swap',Math.abs(costs)<.005?'$0.00':money(costs),'var(--text)','Gap between gross and net']].map(k=>'<div><span>'+k[0]+'</span><b style="color:'+k[2]+'">'+k[1]+'</b><small>'+k[3]+'</small></div>').join('');

// ----- donut -----
function donut(id,data,cTop,cSub){
  const el=$(id),tot=data.reduce((a,d)=>a+d[1],0),r=54,C=2*Math.PI*r;let off=0,s='';
  data.forEach((d,i)=>{const len=d[1]/tot*C;s+='<circle class="sg" data-i="'+i+'" cx="70" cy="70" r="'+r+'" stroke="'+d[2]+'" stroke-dasharray="'+Math.max(len-2,.5).toFixed(2)+' '+C.toFixed(2)+'" stroke-dashoffset="'+(-off).toFixed(2)+'" transform="rotate(-90 70 70)"/>';off+=len});
  el.innerHTML='<div class="dn"><svg viewBox="0 0 140 140"><circle cx="70" cy="70" r="54" fill="none" stroke="rgba(255,255,255,.05)" stroke-width="16"/>'+s+'<text class="dn-c1" x="70" y="72" text-anchor="middle">'+cTop+'</text><text class="dn-c2" x="70" y="86" text-anchor="middle">'+cSub+'</text></svg><div class="dn-l">'+data.map(d=>'<div><em style="background:'+d[2]+'"></em>'+d[0]+'<b>'+(d[3]||d[1])+'</b><i>'+(d[1]/tot*100).toFixed(1)+'%</i></div>').join('')+'</div></div>';
  const t1=el.querySelector('.dn-c1'),t2=el.querySelector('.dn-c2'),all=el.querySelectorAll('.sg');
  all.forEach(c=>{const d=data[+c.dataset.i],p=(d[1]/tot*100).toFixed(1)+'%';
    c.addEventListener('mouseenter',()=>{c.style.strokeWidth=21;all.forEach(o=>{if(o!==c)o.style.opacity=.3});t1.textContent=p;t2.textContent=d[0]});
    c.addEventListener('mousemove',e=>showTip(e,th(d[0])+row('Value',d[3]||d[1])+row('Share',p)));
    c.addEventListener('mouseleave',()=>{c.style.strokeWidth='';all.forEach(o=>o.style.opacity='');t1.textContent=cTop;t2.textContent=cSub;hideTip()})});
}
donut('dOut',[['Wins',W,G],['Losses',L,R],['Break-even',BE,GR]],(N?(W/N*100).toFixed(0):0)+'%','win rate');
const pal=[GR,GO,LI,AC,'#f0f1f5'],dn=(l,f)=>l.length?l.map((x,i)=>[x[0],x[1],pal[i%5],f(x)]):[['Not tracked',1,GR,'-']],ct=l=>l.length?[(l[0][1]/l.reduce((a,b)=>a+b[1],0)*100).toFixed(0)+'%',l[0][0]]:['-','not tracked'],neg$=x=>'-$'+x[1].toFixed(2),red=l=>l.map((x,i)=>i===0?[x[0],x[1],R,neg$(x)]:[x[0],x[1],pal[i%5],neg$(x)]),dd=(l)=>l.length?red(l):[['Not tracked',1,GR,'-']];
{const a=dn(A.sesCount,x=>x[1]);donut('dSes',a,...ct(a));const e=dn(A.exl,x=>x[1]);donut('dExit',e,...ct(e));
for(const [id,l] of [['dMis',A.negMis],['dHold',A.negHold],['dDir',A.negDir],['dDay',A.negDay]]){const d=dd(l);donut(id,d,...(l.length?[(l[0][1]/l.reduce((a,b)=>a+b[1],0)*100).toFixed(0)+'%',l[0][0]]:['-','not tracked']))}}

// ----- gauge: win rate vs break-even -----
(function(){const cx=120,cy=112,r=84,MAX=60,P=(v)=>{const a=Math.PI*(1-v/MAX);return[cx+r*Math.cos(a),cy-r*Math.sin(a)]},
  arc=(a,b)=>{const p=P(a),q=P(b);return 'M'+p[0].toFixed(1)+' '+p[1].toFixed(1)+' A'+r+' '+r+' 0 0 1 '+q[0].toFixed(1)+' '+q[1].toFixed(1)},
  m1=(()=>{const a=Math.PI*(1-beWR/MAX);return[cx+(r-15)*Math.cos(a),cy-(r-15)*Math.sin(a),cx+(r+9)*Math.cos(a),cy-(r+9)*Math.sin(a),cx+(r+22)*Math.cos(a),cy-(r+22)*Math.sin(a)]})();
  const GC=decWR>=beWR?G:R;
  $('cGauge').innerHTML='<svg class="a-cs" viewBox="0 0 240 150"><path d="'+arc(0,MAX)+'" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="14" stroke-linecap="round"/><path d="'+arc(beWR,MAX)+'" fill="none" stroke="rgba(67,215,135,.28)" stroke-width="14"/><path id="gf" d="'+arc(0,decWR)+'" fill="none" stroke="'+GC+'" stroke-width="14" stroke-linecap="round" style="filter:drop-shadow(0 0 6px '+(decWR>=beWR?'rgba(67,215,135,.5)':'rgba(240,104,92,.5)')+')"/><line x1="'+m1[0]+'" y1="'+m1[1]+'" x2="'+m1[2]+'" y2="'+m1[3]+'" stroke="#fff" stroke-width="2"/><text x="'+m1[4]+'" y="'+(m1[5]+2)+'" class="ax" text-anchor="middle" style="fill:#fff">'+beWR.toFixed(1)+'%</text><text x="'+cx+'" y="'+(cy-14)+'" text-anchor="middle" style="font-size:26px;font-weight:800;fill:'+GC+'">'+decWR.toFixed(1)+'%</text><text x="'+cx+'" y="'+(cy+2)+'" text-anchor="middle" class="ax">decisive win rate</text><text x="'+(cx-r)+'" y="'+(cy+16)+'" text-anchor="middle" class="ax">0%</text><text x="'+(cx+r)+'" y="'+(cy+16)+'" text-anchor="middle" class="ax">60%</text></svg>';
  $('cGaugeR').innerHTML='At a <b>'+payoff.toFixed(2)+'</b> payoff you need <b>'+beWR.toFixed(1)+'%</b> wins to break even. You are <b style="color:var(--'+(decWR<beWR?'red':'green')+')">'+Math.abs(beWR-decWR).toFixed(1)+' pts</b> '+(decWR<beWR?'short':'above it')+' ('+(W/N*100).toFixed(1)+'% if scratches count as trades).';
  tipOn($('cGauge').querySelector('#gf'),()=>th('Decisive win rate')+row('Actual',decWR.toFixed(1)+'%')+row('Needed',beWR.toFixed(1)+'%'))})();

// ----- radar -----
window.__renderAnRadar=function(){const DDB=getDDB();const ax=[['Win rate',decWR/50*100,decWR.toFixed(1)+'% of 50%'],['Profit factor',pf/1.5*100,pf.toFixed(2)+' of 1.5'],['Payoff ratio',payoff/2*100,payoff.toFixed(2)+' of 2.0'],['Drawdown room',Math.max(0,(1-DD/DDB)*100),'$'+Math.max(0,DDB-DD).toFixed(0)+' of $'+DDB+' left'],['Target progress',Math.max(0,NET/TGT*100),money(NET)+' of +$400']].map(a=>[a[0],Math.min(100,a[1]),a[2]]),cx=175,cy=118,R0=84,n=ax.length,
  pt=(i,v)=>{const a=-Math.PI/2+i*2*Math.PI/n;return[cx+R0*v/100*Math.cos(a),cy+R0*v/100*Math.sin(a)]},poly=v=>ax.map((a,i)=>pt(i,typeof v==='number'?v:a[1]).map(x=>x.toFixed(1)).join(',')).join(' ');
  let s='<svg class="a-cs" viewBox="0 0 350 236">';[25,50,75,100].forEach(v=>s+='<polygon points="'+poly(v)+'" fill="none" stroke="rgba(255,255,255,'+(v===100?.2:.07)+')" '+(v===100?'stroke-dasharray="3 3"':'')+'/>');
  ax.forEach((a,i)=>{const e=pt(i,100),l=pt(i,124);s+='<line x1="'+cx+'" y1="'+cy+'" x2="'+e[0].toFixed(1)+'" y2="'+e[1].toFixed(1)+'" stroke="rgba(255,255,255,.07)"/><text x="'+l[0].toFixed(1)+'" y="'+(l[1]+3).toFixed(1)+'" class="ax" text-anchor="'+(Math.abs(l[0]-cx)<6?'middle':l[0]>cx?'start':'end')+'" style="fill:var(--sub)">'+a[0]+'</text>'});
  s+='<polygon points="'+poly()+'" fill="rgba(124,108,240,.3)" stroke="'+LI+'" stroke-width="2" style="filter:drop-shadow(0 0 8px rgba(124,108,240,.5))"/>';
  ax.forEach((a,i)=>{const p=pt(i,a[1]);s+='<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="4" fill="'+LI+'" stroke="#111119" stroke-width="1.5"/><circle class="rh" data-i="'+i+'" cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="13" fill="transparent"/>'});
  $('cRadar').innerHTML=s+'</svg><div class="a-read">Dashed ring = target: 50% win rate, 1.5 profit factor, 2.0 payoff, '+'$'+DDB+' drawdown budget, +$'+TGT+' profit.'+'</div>';
  $('cRadar').querySelectorAll('.rh').forEach(h=>{const a=ax[+h.dataset.i];tipOn(h,()=>th(a[0])+row('Score',a[1].toFixed(0)+'%')+row('Actual',a[2]))})};window.__renderAnRadar();

// ----- key takeaways -----
$('aTake').innerHTML=A.take.map(t=>'<li style="--c:'+t[0]+'"><b>'+t[1]+'</b><span>'+t[2]+'</span></li>').join('');

// ----- waterfall -----
(function(){const B=[['Gross profit',0,GP,G],['Gross loss',GP,GP-GL,R],['Commission + swap',GP-GL,NET,GR],['Net result',0,NET,NET<0?R:G]],Wd=520,H=240,pl=8,pt=22,pb=34,hi=Math.max(GP,1)*1.15,lo=Math.min(NET,-GL*.2,-1)*1.3,y=v=>pt+(hi-v)/(hi-lo)*(H-pt-pb),bw=72,gap=(Wd-pl*2-bw*4)/3;
  let s='<svg class="a-cs" viewBox="0 0 '+Wd+' '+H+'"><line x1="0" x2="'+Wd+'" y1="'+y(0)+'" y2="'+y(0)+'" stroke="rgba(255,255,255,.18)"/>';
  B.forEach((b,i)=>{const x=pl+i*(bw+gap),y1=y(Math.max(b[1],b[2])),h=Math.max(2,Math.abs(y(b[1])-y(b[2]))),d=b[2]-b[1],val=i===0||i===3?b[2]:d;
    if(i<3)s+='<line x1="'+(x+bw)+'" x2="'+(x+bw+gap)+'" y1="'+y(b[2])+'" y2="'+y(b[2])+'" stroke="rgba(255,255,255,.2)" stroke-dasharray="3 3"/>';
    s+='<rect class="wf" data-i="'+i+'" x="'+x+'" y="'+y1+'" width="'+bw+'" height="'+h+'" rx="6" fill="'+b[3]+'" fill-opacity=".85"/><text x="'+(x+bw/2)+'" y="'+(val>=0?y1-7:y1+h+14)+'" text-anchor="middle" style="font-size:12px;font-weight:700;fill:'+(Math.abs(val)<.005?'#8b90a3':val>=0?G:R)+'">'+(Math.abs(val)<.005?'$0.00':money(val))+'</text><text x="'+(x+bw/2)+'" y="'+(H-10)+'" text-anchor="middle" class="ax">'+b[0]+'</text>'});
  $('cWF').innerHTML=s+'</svg>';
  $('cWFR').innerHTML='Profits of <b style="color:var(--green)">'+money(GP)+'</b> were outweighed by <b style="color:var(--red)">'+money(-GL)+'</b> of losses. Costs are small ('+(Math.abs(costs)<.005?'$0.00':money(costs))+'), so the gap is trade quality, not fees.';
  $('cWF').querySelectorAll('.wf').forEach(r=>{const b=B[+r.dataset.i];tipOn(r,()=>th(b[0])+row('Amount',Math.abs(b[2]-b[1])<.005?'$0.00':money(b[2]-b[1]))+row('Running total',money(b[2])))})})();

// ----- edge per trade by session -----
(function(){const d=A.ses.map(x=>[x[0],x[1]/x[2],x[1],x[2]]),lo=Math.min(...d.map(x=>x[1])),sp=-lo,c=v=>v<0?R:G;
  $('aSE').innerHTML=d.map((x,i)=>'<span class="hn">'+x[0]+'</span><span class="ht" data-i="'+i+'"><u style="left:100%"></u><i style="left:'+(100-Math.abs(x[1])/sp*100)+'%;width:'+Math.abs(x[1])/sp*100+'%;background:'+c(x[1])+'"></i></span><span class="hv" style="color:'+c(x[1])+'">'+money(x[1])+'</span>').join('');
  $('aSE').querySelectorAll('.ht').forEach(e=>{const x=d[+e.dataset.i];tipOn(e,()=>th(x[0])+row('Per trade',money(x[1]))+row('Net P&amp;L',money(x[2]))+row('Trades','≈'+x[3]))});
  $('aSER').innerHTML='<b>Worst per trade:</b> '+(d.length?(w=>w[0]+' ('+money(w[1])+')')(d.reduce((a,b)=>b[1]<a[1]?b:a)):'none')+'.'})();

// ----- vertical columns (up = green, down = red) -----
function cols(id,items,fmt,showVal){
  const Wd=520,H=230,pl=44,pr=8,pt=14,pb=24,hi=Math.max(1,...items.map(i=>i.up)),lo=Math.min(-1,...items.map(i=>i.down)),y=v=>pt+(hi-v)/(hi-lo)*(H-pt-pb),n=items.length,slot=(Wd-pl-pr)/n,bw=Math.min(40,slot*.62);
  let s='<svg class="a-cs" viewBox="0 0 '+Wd+' '+H+'">';[hi,0,lo].forEach(v=>s+='<line x1="'+pl+'" x2="'+(Wd-pr)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="rgba(255,255,255,'+(v===0?.18:.05)+')"/><text class="ax" x="'+(pl-6)+'" y="'+(y(v)+3)+'" text-anchor="end">'+fmt(v)+'</text>');
  items.forEach((it,i)=>{const x=pl+i*slot+(slot-bw)/2;
    if(it.up>0)s+='<rect x="'+x+'" y="'+y(it.up)+'" width="'+bw+'" height="'+(y(0)-y(it.up))+'" rx="3" fill="'+G+'" fill-opacity=".85"/>';
    if(it.down<0)s+='<rect x="'+x+'" y="'+y(0)+'" width="'+bw+'" height="'+(y(it.down)-y(0))+'" rx="3" fill="'+R+'" fill-opacity=".85"/>';
    if(showVal){const v=it.up+it.down;s+='<text x="'+(x+bw/2)+'" y="'+(v>=0?y(it.up)-6:y(it.down)+13)+'" text-anchor="middle" style="font-size:11px;font-weight:700;fill:'+(v>=0?G:R)+'">'+fmt(v)+'</text>'}
    s+='<text class="ax" x="'+(x+bw/2)+'" y="'+(H-8)+'" text-anchor="middle">'+it.l+'</text><rect class="ch" data-i="'+i+'" x="'+(pl+i*slot)+'" y="'+pt+'" width="'+slot+'" height="'+(H-pt-pb)+'" fill="transparent"/>'});
  $(id).innerHTML=s+'</svg>';
  $(id).querySelectorAll('.ch').forEach(r=>tipOn(r,()=>items[+r.dataset.i].tip));
}
const WD=A.wd;
cols('cWD',WD.map(([l,v])=>({l,up:Math.max(v,0),down:Math.min(v,0),tip:th(l)+row('Net P&amp;L',money(v))})),v=>(v<0?'-':v>0?'+':'')+'$'+Math.abs(Math.round(v)),true);
$('cWDR').innerHTML=N?'<b>Best:</b> '+WD.reduce((a,b)=>b[1]>a[1]?b:a)[0]+' ('+money(WD.reduce((a,b)=>b[1]>a[1]?b:a)[1])+') \u00b7 <b>Worst:</b> '+WD.reduce((a,b)=>b[1]<a[1]?b:a)[0]+' ('+money(WD.reduce((a,b)=>b[1]<a[1]?b:a)[1])+').':'No trades yet.';
const HM=window.__A.hm;
const HR=[...Array(24).keys()].map(h=>{let u=0,d=0;Object.values(HM).forEach(r=>{const v=r[h]||0;v>0?u+=v:d+=v});return{l:h,up:u,down:d,tip:th(String(h).padStart(2,'0')+':00')+row('Trades in profit hours',u)+row('Trades in loss hours',-d)}});
cols('cHR',HR,v=>String(Math.abs(Math.round(v))),false);
const worstH=HR.reduce((a,b)=>b.down<a.down?b:a);
$('cHRR').innerHTML='<b>Loss-heaviest hour:</b> '+String(worstH.l).padStart(2,'0')+':00 with '+jlN(-worstH.down,'trade')+' in net-loss hours. Cut or size down there first.';

// ----- area / line with scrub -----
function area(id,arr,color,fmt,label,fillZero){
  const Wd=520,H=210,pl=48,pr=8,pt=10,pb=22,hi=Math.max(0,...arr),lo=Math.min(0,...arr),y=v=>pt+(hi-v)/(hi-lo||1)*(H-pt-pb),n=arr.length,X=i=>pl+i*(Wd-pl-pr)/Math.max(1,n-1),
    pts=arr.map((v,i)=>X(i).toFixed(1)+','+y(v).toFixed(1)).join(' ');
  let s='<svg class="a-cs" viewBox="0 0 '+Wd+' '+H+'"><defs><linearGradient id="g'+id+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+color+'" stop-opacity=".05"/><stop offset="1" stop-color="'+color+'" stop-opacity=".42"/></linearGradient></defs>';
  [hi,(hi+lo)/2,lo].forEach(v=>s+='<line x1="'+pl+'" x2="'+(Wd-pr)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="rgba(255,255,255,.06)"/><text class="ax" x="'+(pl-6)+'" y="'+(y(v)+3)+'" text-anchor="end">'+fmt(v)+'</text>');
  s+='<line x1="'+pl+'" x2="'+(Wd-pr)+'" y1="'+y(0)+'" y2="'+y(0)+'" stroke="rgba(255,255,255,.2)"/><polygon points="'+X(0)+','+y(0)+' '+pts+' '+X(n-1)+','+y(0)+'" fill="url(#g'+id+')"/><polyline points="'+pts+'" fill="none" stroke="'+color+'" stroke-width="1.8" stroke-linejoin="round"/>';
  for(let i=0;i<n;i+=Math.max(1,Math.round(n/7)))s+='<text class="ax" x="'+X(i)+'" y="'+(H-6)+'" text-anchor="middle">#'+(i+1)+'</text>';
  s+='<line id="'+id+'x" y1="'+pt+'" y2="'+(H-pb)+'" stroke="rgba(255,255,255,.25)" style="opacity:0"/><circle id="'+id+'d" r="4" fill="'+color+'" stroke="#fff" stroke-width="1.5" style="opacity:0"/></svg>';
  const el=$(id);el.innerHTML=s;const svg=el.querySelector('svg'),ln=svg.querySelector('#'+id+'x'),dt=svg.querySelector('#'+id+'d');
  svg.addEventListener('mousemove',e=>{const b=svg.getBoundingClientRect(),i=Math.max(0,Math.min(n-1,Math.round(((e.clientX-b.left)/b.width*Wd-pl)/(Wd-pl-pr)*(n-1))));
    ln.setAttribute('x1',X(i));ln.setAttribute('x2',X(i));dt.setAttribute('cx',X(i));dt.setAttribute('cy',y(arr[i]));ln.style.opacity=dt.style.opacity=1;showTip(e,th('Trade #'+(i+1))+row(label,fmt(arr[i],1)))});
  svg.addEventListener('mouseleave',()=>{ln.style.opacity=dt.style.opacity=0;hideTip()});
}
const eq=window.__eq||[];
if(eq.length){
  let pk=-1e9;const raw=eq.map(v=>{pk=Math.max(pk,v);return v-pk}),mn=Math.min(...raw),dd=raw.map(v=>mn?v*DD/Math.abs(mn):0); // scaled so the trough equals the reported max drawdown
  const f=(v,t)=>(t?money(v):(v<0?'-':v>0?'+':'')+'$'+Math.abs(Math.round(v)));
  area('cUW',dd,R,f,'Below peak');
  const deep=dd.filter(v=>v<-200).length;
  $('cUWR').innerHTML='<b>'+(deep/N*100).toFixed(0)+'%</b> of trades were taken more than $200 below the equity peak, and the account has not set a new high in the recent stretch. Deepest point: <b style="color:var(--red)">'+money(-DD)+'</b>.';
  const K=Math.max(1,Math.min(50,eq.length>>1)),ro=[];for(let i=K;i<eq.length;i++)ro.push(eq[i]-eq[i-K]);
  if(ro.length>1)area('cRO',ro,LI,f,'Last '+K+' trades');
  const last=ro[ro.length-1],best=Math.max(...ro),worst=Math.min(...ro);
  $('cROR').innerHTML='Latest window: <b style="color:'+cv(last)+'">'+money(last)+'</b> · best <b style="color:var(--green)">'+money(best)+'</b> · worst <b style="color:var(--red)">'+money(worst)+'</b>. Above zero means the last 50 trades made money.';
}
})();
let lastRules=[0,0,0,0];
  // ---------- sidebar ----------
  const ICONS = {
    sum:'<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    bar:'<path d="M5 20V11M12 20V4M19 20v-6"/>',
    swap:'<path d="M7 4 3 8l4 4M3 8h14M17 12l4 4-4 4M21 16H7"/>',
    book:'<path d="M12 6v14M12 6C10 4.5 7 4 3 4v14c4 0 7 .5 9 2 2-1.5 5-2 9-2V4c-4 0-7 .5-9 2z"/>',
    cal:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    mind:'<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9.5h.01M15 9.5h.01"/>',
    goal:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    set:'<path d="M4 6h8M18 6h2M4 12h2M12 12h8M4 18h10M20 18h0"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
    ai:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
    grid:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
    user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6"/>',
    up:'<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
    market:'<path d="M4 4h16v13H8l-4 4V4z"/><path d="M8 9h8M8 12h5"/>',
    calc:'<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>',
    replay:'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M3 3v5h5"/>',
    plan:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>'
  };
  const NAV = [
    ['Overview',[["Today's Summary",'sum'],['Analytics','bar'],['Trades','swap']]],
    ['Review',[['Journal','book'],['Calendar','cal'],['Psychology','mind']]],
    ['Tools',[['AI Coach','ai'],['Trade Tools','calc'],['Market','market']]],
    ['Account',[['Account Settings','set'],['User Profile','user'],['Upload Data','up']]]
  ];
  const ROUTES = {"Today's Summary":'summary', 'Analytics':'analytics', 'Trades':'trades', 'Journal':'journal', 'Calendar':'calendar', 'Psychology':'psychology', 'AI Coach':'ai', 'Account Settings':'settings', 'User Profile':'profile', 'Upload Data':'upload', 'Trade Tools':'tools', 'Market':'market'};
  const TITLES = {summary:"Today's Summary — Journall", analytics:'Analytics — Journall', trades:'Trades — Journall', journal:'Journal — Journall', calendar:'Calendar — Journall', psychology:'Psychology — Journall', ai:'AI Coach — Journall', settings:'Account Settings — Journall', profile:'User Profile — Journall', upload:'Upload Data — Journall', tools:'Trade Tools · Journall', market:'Market · Journall'};
  document.getElementById('sbNav').innerHTML = NAV.map(([g,items])=>
    '<div class="grp">'+g+'</div>'+items.map(([l,k])=>{
      const r = ROUTES[l];
      return '<a href="#'+(r||'')+'" class="nav"'+(r?' data-view="'+r+'"':'')+' title="'+l+'"><svg viewBox="0 0 24 24">'+ICONS[k]+'</svg><span class="lbl">'+l+'</span>'+
        (l==='Upload Data'?'<span class="sync" id="navSync"><em></em><span id="navSyncTxt">Awaiting sync</span></span>':'')+'</a>';
    }).join('')).join('');
  const appEl = document.getElementById('app');
  // Today's Summary, Analytics, Trades, Journal, Calendar, Psychology and Goals are wired; other links stay inert for now
  document.querySelectorAll('.nav').forEach(a=>a.addEventListener('click',e=>{
    e.preventDefault();
    if(a.dataset.view){ appEl.classList.remove('open'); route(a.dataset.view); try{ history.replaceState(null,'','#'+a.dataset.view); }catch(_){console.debug('[journall] ignored error in todays-summary.js:', _);} }
  }));
  function route(v){
    if(window.__jlDirty&&['analytics','ai','psychology','profile','calendar','settings','trades'].includes(v)){window.__jlDirty=false;location.hash='#'+v;location.reload();return}
    v = v || ({'#analytics':'analytics','#trades':'trades','#journal':'journal','#calendar':'calendar','#psychology':'psychology','#settings':'settings','#ai':'ai','#profile':'profile','#upload':'upload','#tools':'tools','#market':'market'}[location.hash] || 'summary');
    document.querySelectorAll('.view').forEach(s=>{ s.hidden = s.id!=='view-'+v; });
    document.querySelectorAll('.nav[data-view]').forEach(x=>{
      const on = x.dataset.view===v;
      x.classList.toggle('active',on);
      if(on) x.setAttribute('aria-current','page'); else x.removeAttribute('aria-current');
    });
    document.title = TITLES[v]; hideTip(); window.scrollTo(0,0);
    if(v==='analytics'){ if(window.jlPaintSync) window.jlPaintSync(); if(window.__renderAnDaily) window.__renderAnDaily(); if(window.__renderAnSetups) window.__renderAnSetups(); }
    else if(v==='psychology'){ if(window.__mountPsychologyTab) window.__mountPsychologyTab(); }
    else { updateRules(...lastRules); if(window.__refreshHeadsUp) window.__refreshHeadsUp(); }
    if(v==='settings' && window.gPlayEntrance) window.gPlayEntrance();
    if(v==='ai' && window.__mountAiCoach) window.__mountAiCoach();
    if(v==='profile' && window.__mountUserProfile) window.__mountUserProfile();
    if(v==='upload' && window.__mountUploadData) window.__mountUploadData();
    if(v==='trades' && window.__mountOpenPos) window.__mountOpenPos();
    if(v==='market' && window.__mountMarketTab) window.__mountMarketTab();
  }
  window.__route = route;
  document.getElementById('menuBtn').addEventListener('click',()=>appEl.classList.add('open'));
  document.getElementById('scrim').addEventListener('click',()=>appEl.classList.remove('open'));
  document.addEventListener('keydown',e=>{ if(e.key==='Escape') appEl.classList.remove('open'); });

  // ---------- daily rules meters (driven by the same numbers as the rest of the page) ----------
  function setMeter(id, txt, ratio, col){
    const m = document.getElementById(id);
    m.querySelector('b').textContent = txt;
    const i = m.querySelector('i');
    i.style.width = (Math.max(0,Math.min(1,ratio))*100)+'%'; i.style.background = col;
  }
  function zone(r){ return r>=1 ? 'var(--red)' : r>=.6 ? 'var(--warn)' : 'var(--green)'; }

  // ---------- instant rule-break flag (Today's Summary) ----------
  // Real computation from the same numbers driving the rings/meters. Limits are read from
  // Account Settings ▸ Targets/Risk limits (window.jl*) at call time, with sane fallbacks —
  // one source of truth instead of a separate hardcoded copy per tab.
  function ruleLimits(){
    return { loss: Number(window.jlDailyLossLimit)||0, trades: Number(window.jlMaxTradesPerDay)||0, target: Number(window.jlProfitTargetUSD)||0, dayTarget: Number(window.jlDayProfitTargetUSD)||0 };
  }
  // In-app heads-up (Profile switches): "Risk warnings" -> amber banner at 80% of the daily loss limit or
  // 1 trade before the max; "Daily rule reminders" -> before the first trade of the day, a note if the last
  // trading day broke a rule. Preferences live in localStorage 'jlPrefs' (both default on).
  const WARN_RATIO = 0.8;
  window.jlPref = function(k, d){ try{ const o = JSON.parse(localStorage.getItem(JL_KEYS.keys.JL_PREFS)||'{}'); return k in o ? !!o[k] : d; }catch(e){ return d; } };
  window.jlSetPref = function(k, v){ try{ const o = JSON.parse(localStorage.getItem(JL_KEYS.keys.JL_PREFS)||'{}'); o[k] = !!v; localStorage.setItem(JL_KEYS.keys.JL_PREFS, JSON.stringify(o)); }catch(e){console.debug('[journall] ignored error in todays-summary.js:', e);} if(window.__refreshHeadsUp) window.__refreshHeadsUp(); };
  let lastAlertArgs = [0, 0], alertBroken = false;
  function lastDayBroke(){
    const key = getTradingDayIST(), lim = ruleLimits(), by = {};
    (window.__trades || []).forEach(t=>{
      if(!t || !t.d || t.d >= key) return;
      const b = by[t.d] || (by[t.d] = {net:0, loss:0, n:0});
      b.n++; b.net += Number(t.pnl) || 0; b.loss = Math.max(0, -b.net);
    });
    const days = Object.keys(by).sort(); if(!days.length) return null;
    const d = days[days.length-1], b = by[d], lossHit = lim.loss>0 && b.loss >= lim.loss, tradeHit = lim.trades>0 && b.n >= lim.trades;
    if(!lossHit && !tradeHit) return null;
    const label = new Date(d+'T00:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'});
    return {label, what: lossHit && tradeHit ? 'the daily loss limit and the trade limit' : lossHit ? 'the daily loss limit' : 'the trade limit'};
  }
  function setBanner(kind, title, msg){
    const el = document.getElementById('ruleAlert'); if(!el) return;
    if(!kind){ el.classList.remove('show','warn'); return; }
    document.getElementById('ruleAlertTitle').textContent = title;
    document.getElementById('ruleAlertMsg').textContent = msg;
    el.classList.toggle('warn', kind === 'warn'); el.classList.add('show');
  }
  function showHeadsUp(lossUsed, n){
    if(alertBroken) return;
    const lim = ruleLimits(); let shown = false;
    if(window.jlPref('risk', true)){
      const nearLoss = lim.loss>0 && lossUsed >= WARN_RATIO*lim.loss, nearTrades = lim.trades >= 2 && n === lim.trades-1;
      if(nearLoss || nearTrades){
        const parts = [];
        if(nearLoss) parts.push('$'+lossUsed.toFixed(2)+' of your $'+lim.loss.toFixed(0)+' daily loss limit is used ('+Math.round(lossUsed/lim.loss*100)+'%)');
        if(nearTrades) parts.push('you are 1 trade away from your max of '+lim.trades);
        const txt = parts.join(', and ');
        setBanner('warn', 'Getting close to a limit', txt.charAt(0).toUpperCase()+txt.slice(1)+'. Slow down.');
        shown = true;
      }
    }
    if(!shown && n === 0 && window.jlPref('reminders', true)){
      const y = lastDayBroke();
      if(y){ setBanner('warn', 'Your last trading day broke a rule', y.label+' hit '+y.what+'. Keep today inside your limits.'); shown = true; }
    }
    if(!shown) setBanner(null);
  }
  window.__refreshHeadsUp = function(){ showHeadsUp(lastAlertArgs[0], lastAlertArgs[1]); };
  function updateRuleAlert(lossUsed, n){
    const lim = ruleLimits();
    const lossBroken = lim.loss>0 && lossUsed >= lim.loss, tradeBroken = lim.trades>0 && n >= lim.trades;
    const breaks = (lossBroken?1:0) + (tradeBroken?1:0);
    if(typeof window.__jlWeekCards==='function') window.__jlWeekCards(); /* weekly cards own the rings; daily breaks still drive the banner below */
    const alertEl = document.getElementById('ruleAlert');
    lastAlertArgs = [lossUsed, n]; alertBroken = breaks > 0;
    if(breaks > 0){
      const msg = lossBroken && tradeBroken
        ? 'Daily loss limit and trade limit both reached — stop trading for today.'
        : lossBroken
          ? 'Daily loss limit reached ($'+lossUsed.toFixed(2)+' / $'+lim.loss.toFixed(0)+') — stop trading for today.'
          : 'Trade limit reached ('+n+' / '+lim.trades+') — no more entries today.';
      document.getElementById('ruleAlertTitle').textContent = 'Rule broken';
      document.getElementById('ruleAlertMsg').textContent = msg;
      alertEl.classList.remove('warn'); alertEl.classList.add('show');
      statusVal.textContent = 'Rule broken'; statusDot.style.background = 'var(--red)';
      statusDot.classList.add('danger'); statusMeta.textContent = msg;
    } else {
      statusDot.classList.remove('danger');
      showHeadsUp(lossUsed, n);
    }
  }

  function weekLoss(){ return window.JLMath.weekLoss(window.__trades||[], getTradingDayIST()); }
  function updateRules(pnl, lossUsed, n, w){
    lastRules=[pnl,lossUsed,n,w];
    const lim = ruleLimits();
    {const r=lim.loss>0?lossUsed/lim.loss:0; setMeter('mLoss','$'+lossUsed.toFixed(2)+' / '+(lim.loss>0?'$'+lim.loss.toFixed(0):'not set'), r, zone(r));}
    {const wm=document.getElementById('mWeek'), WL=Number(window.jlWeeklyLossLimit)||0;
      if(wm){ if(WL>0){ const wl=weekLoss(), r=wl/WL; wm.style.display=''; setMeter('mWeek','$'+wl.toFixed(2)+' / $'+WL.toFixed(0), r, zone(r)); } else wm.style.display='none'; }}
    {const r=lim.trades>0?n/lim.trades:0; setMeter('mTrades', n+' / '+(lim.trades>0?lim.trades:'not set'), r, zone(r));}
    setMeter('mPnl',(pnl>=0?'+$':'-$')+Math.abs(pnl).toFixed(2), (lim.target>0?Math.abs(pnl)/lim.target:0), pnl<0?'var(--red)':'var(--green)');
    const wr = n ? Math.round(w/n*100) : 0;
    setMeter('mWin', wr+'% ('+w+'/'+n+')', wr/100, wr>=50?'var(--green)':'var(--amber)');
    if(window.jlPaintSync) window.jlPaintSync();
  }
  updateRules(0,0,0,0);

  // ---------- sidebar hover spotlight + cursor-reactive dot grid ----------
  document.getElementById('sbNav').addEventListener('pointermove',e=>{
    const a = e.target.closest('.nav'); if(!a) return;
    const r = a.getBoundingClientRect();
    a.style.setProperty('--x',(e.clientX-r.left)+'px'); a.style.setProperty('--y',(e.clientY-r.top)+'px');
  });
  const dg = document.getElementById('dotgrid');
  window.addEventListener('pointermove',e=>{ dg.style.setProperty('--mx',e.clientX+'px'); dg.style.setProperty('--my',e.clientY+'px'); });
  document.addEventListener('pointerleave',()=>{ dg.style.setProperty('--mx','-400px'); dg.style.setProperty('--my','-400px'); });

  window.addEventListener('hashchange',()=>route()); route();

  // ---------- prop firm daily rule countdown (India — resets 06:00 IST, same for every user) ----------
  // Matches the existing "Since 06:00 IST reset" status text. Real date math, timezone-independent:
  // Date.now() is an epoch ms value, not tied to the viewer's local clock, so this reads correctly
  // for any user regardless of their device's timezone — the reset hour itself is a shared prop-firm
  // rule, not a per-user setting, so it's a real constant rather than hardcoded per-trader state.
  function msUntilRuleReset(){ return window.JLMath.msUntilRuleReset(Date.now()); }
  function updateRuleCountdown(){
    const wrap = document.getElementById('rulesReset'), el = document.getElementById('rulesResetTime');
    if(!wrap || !el) return;
    const msLeft = Math.max(0, msUntilRuleReset());
    const totalSec = Math.floor(msLeft/1000);
    const h = String(Math.floor(totalSec/3600)).padStart(2,'0');
    const m = String(Math.floor((totalSec%3600)/60)).padStart(2,'0');
    const s = String(totalSec%60).padStart(2,'0');
    el.textContent = h+':'+m+':'+s;
    wrap.classList.toggle('soon', msLeft <= 60*60*1000);
  }
  updateRuleCountdown();
  setInterval(updateRuleCountdown, 1000);
