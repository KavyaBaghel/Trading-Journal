(function(){
  const $ = id => document.getElementById(id);
  let mounted = false, busy = false;

  function countUp(el, to, opts){
    opts = opts || {};
    const dur = 900, t0 = performance.now();
    function tick(t){
      const p = Math.min(1, (t-t0)/dur);
      const e = 1 - Math.pow(1-p, 3); // ease-out cubic
      const val = to*e;
      el.textContent = (opts.prefix||'') + (opts.decimals ? Math.abs(val).toFixed(opts.decimals) : Math.round(val)) + (opts.suffix||'');
      if(p<1) requestAnimationFrame(tick);
      else if(el.closest('.aic-snap-card')){
        const card = el.closest('.aic-snap-card');
        card.classList.add('flash');
        setTimeout(()=>card.classList.remove('flash'), 700);
      }
    }
    requestAnimationFrame(tick);
  }

  function animateBars(){
    const b1=$('aicBar1');if(b1)requestAnimationFrame(()=>b1.style.width=(rvT.length&&A.gl?Math.min(100,Math.abs(rvNet)/A.gl*100):0)+'%');
    document.querySelectorAll('.aicSw').forEach(el=>requestAnimationFrame(()=>el.style.setProperty('--w',el.dataset.w+'%')));
  }

  // ---------- coach answers, grounded in your logged numbers ----------
  const A=window.__A,T=window.__trades||[],m$=v=>(v<0?'-$':'+$')+Math.abs(v).toFixed(2),ab$=v=>'$'+Math.abs(v).toFixed(2);
  const rvT=T.filter(t=>t.rev),rvNet=rvT.reduce((a,t)=>a+t.pnl,0),sesS=A.ses.slice().sort((a,b)=>a[1]-b[1]),worstS=sesS[0],bestS=sesS[sesS.length-1];
  const MN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],mo={};T.forEach(t=>{const k=t.d.slice(0,7);(mo[k]=mo[k]||[0,0]);mo[k][0]+=t.pnl;mo[k][1]++});
  const moL=Object.keys(mo).sort().map(k=>[MN[+k.slice(5)-1],+mo[k][0].toFixed(2),mo[k][1]]),bestM=moL.length?moL.reduce((a,b)=>b[1]>a[1]?b:a):null;
  const sub1=A.negHold[0],wdBest=A.wd.reduce((a,b)=>b[1]>a[1]?b:a),pfTxt=A.pf>0&&A.pf<1?' You lose '+ab$(1/A.pf)+' for every $1 you make.':'';
  const revTxt=rvT.length?rvT.length+' revenge-flagged trades, '+m$(rvNet)+' net':'No revenge trades flagged';
  const NONE='No trades in this dataset yet. Log trades and the coach answers from them.';
  const grade=!A.n?'-':A.pf>=1.5?'A':A.pf>=1.2?'B':A.pf>=1?'C':A.pf>=.7?'D':'F';
  const todayKey=(typeof window.getTradingDayIST==='function'?window.getTradingDayIST():new Date().toISOString().slice(0,10)),todayNet=T.filter(t=>t.d===todayKey).reduce((a,t)=>a+t.pnl,0);
  const escH=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const ruleNow=()=>{try{return window.jlTodayRule?window.jlTodayRule():null}catch(e){return null}};
  const ruleLine=()=>{const r=ruleNow();return r&&r.text?r.text:'No rule set yet. Add one in the Today\'s one rule card.'};
  const setupRows=()=>{let J=[];try{J=window.__getJournals?window.__getJournals():[]}catch(e){console.debug('[journall] ignored error in ai-coach-tab.js:', e);}const g={};
    J.forEach(j=>{if(!j||j.pnl==null||j.pnl===''||!isFinite(j.pnl))return;const k=String(j.setup||'').trim();if(!k)return;const o=g[k]=g[k]||{n:0,net:0};o.n++;o.net+=Number(j.pnl)});
    return Object.entries(g).sort((x,y)=>y[1].n-x[1].n||x[0].localeCompare(y[0])).slice(0,8)};
  const ANSWERS = {
    performance: !A.n?NONE:`${A.n} trades, <b>${A.wr.toFixed(1)}% win rate</b>, net <b>${m$(A.net)}</b>. Profit factor ${A.pf.toFixed(2)}.${pfTxt}
      <ul>${moL.map(x=>`<li>${x[0]}: ${m$(x[1])} (${x[2]} trades)</li>`).join('')}</ul>`,
    weakness: !A.n?NONE:`<b>Revenge trading:</b> ${revTxt}.
      <ul>${A.negMis.length?`<li>Top tagged mistake: ${A.negMis[0][0]} (-$${A.negMis[0][1].toFixed(2)})</li>`:'<li>No mistake tags logged yet. Tag trades in the Journal.</li>'}${worstS?`<li>Weakest session: ${worstS[0]} at ${m$(worstS[1])} over ${worstS[2]} trades</li>`:''}${sub1?`<li>Sub-1-minute holds: ${m$(-sub1[1])}</li>`:'<li>Hold time is not tracked in this dataset</li>'}</ul>`,
    get today(){const r=ruleNow(),leaks=[];
      if(rvT.length)leaks.push(`Revenge-flagged trades: ${m$(rvNet)}`);
      if(worstS&&worstS[1]<0)leaks.push(`Weakest session: ${worstS[0]} at ${m$(worstS[1])}`);
      if(sub1)leaks.push(`Sub-1-minute holds: ${m$(-sub1[1])}`);
      return (r&&r.text?`Your rule for today: <b>${escH(r.text)}</b>`:`You have not set a rule for today. Type one in the Today's one rule card, or fill in "What to fix tomorrow" in your Daily journal.`)
        +(leaks.length?`<ul>${leaks.map(x=>`<li>${x}</li>`).join('')}</ul>`:'<br>')+`Today so far: ${m$(todayNet)}.`},
    psychology: `Before the next entry, answer straight:
      <ul><li>Does this trade match a setup in your playbook?</li><li>Is this trade #1 today, or are you recovering a loss?</li><li>Would you take it if your last trade had been a winner?</li></ul>${todayNet<0?`You are ${m$(todayNet)} today.`:''}`,
    get setup(){if(!A.n)return NONE;const sr=setupRows();
      return (sr.length?`Setups from your journal, with the trade count behind each figure:<ul>${sr.map(x=>`<li>${escH(x[0])}: ${m$(x[1].net)} over ${x[1].n} ${x[1].n===1?'trade':'trades'}</li>`).join('')}</ul>`:'No setups are journaled yet. Pick a Setup when you journal a trade.<br>')
        +`<ul>${wdBest[1]>0?`<li>Best weekday: ${wdBest[0]} (${m$(wdBest[1])})</li>`:'<li>No weekday is in the green</li>'}${bestS&&bestS[1]>0?`<li>Best session: ${bestS[0]} (${m$(bestS[1])})</li>`:'<li>No session is in the green</li>'}</ul>`}
  };

  const KEYMAP = [
    [/revenge|weak|mistake|leak|wrong|losing|lose|worst/i,'weakness'],
    [/psycholog|emotion|feel|fomo|tilt|mindset/i,'psychology'],
    [/setup|edge|playbook|proven|best/i,'setup'],
    [/today|now|next|fix|rule/i,'today'],
    [/session|new york|london|asia|month|week|perform|pnl|profit|win/i,'performance']
  ];
  const FALLBACK = A.n?`Straight numbers: ${A.n} trades, ${A.wr.toFixed(0)}% win rate, net ${m$(A.net)}, profit factor ${A.pf.toFixed(2)}. Ask about <b>performance</b>, <b>weakness</b>, <b>today's fix</b>, <b>psychology</b>, or your <b>best setup</b>.`:NONE;

  function addMsg(thread, role, html){
    const row = document.createElement('div');
    row.className = 'aic-msg ' + role;
    row.innerHTML = (role==='ai' ? '<span class="aic-avatar sm"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></svg></span>' : '') + '<div class="aic-bubble">'+html+'</div>';
    thread.appendChild(row);
    thread.scrollTop = thread.scrollHeight;
    return row;
  }
  function respond(thread, key, prompt){
    const headAvatar = document.getElementById('aicHeadAvatar');
    if(headAvatar) headAvatar.classList.add('thinking');
    const typing = document.createElement('div');
    typing.className = 'aic-msg ai';
    typing.innerHTML = '<span class="aic-avatar sm thinking"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></svg></span><div class="aic-bubble aic-typing"><span></span><span></span><span></span></div>';
    thread.appendChild(typing);
    thread.scrollTop = thread.scrollHeight;
    const chips = document.querySelectorAll('.aic-chip'); chips.forEach(c=>c.disabled=true);
    busy = true; const inEl = $('aicInput'), sendEl = $('aicSend'); if(inEl) inEl.disabled = true; if(sendEl) sendEl.disabled = true;
    const done = ()=>{ busy = false; chips.forEach(c=>c.disabled=false); if(inEl) inEl.disabled = false; if(sendEl) sendEl.disabled = false; if(headAvatar) headAvatar.classList.remove('thinking'); };
    window.jlCoachAsk(prompt||'').then(
      t=>{ typing.remove(); addMsg(thread, 'ai', window.jlCoachHtml(t)); done(); },
      e=>{ typing.remove(); addMsg(thread, 'ai', (ANSWERS[key] || FALLBACK)+'<div style="margin-top:8px;opacity:.65;font-size:12px">Cloud AI unavailable ('+window.jlCoachHtml((e&&e.message)||'error')+'). Local answer from your logged trades.</div>'); done(); });
  }

  // ---------- AI widgets — one card per pattern, wired back into the coach + Trades/Journal ----------
  const WIDGETS = !A.n?[]:[
  {stat:m$(A.net)+' net', cls:A.net<0?'neg':'', sub:'Account pressure', tags:['All trades',A.n+' trades'], desc:'Total net across all logged trades.', askKey:'performance', route:'trades'},
  {stat:rvT.length?m$(rvNet)+' leak':'0 flagged', cls:rvT.length?'neg':'', sub:'Revenge trading', tags:['Revenge trade',rvT.length+' flagged'], desc:'Trades flagged by the revenge window in Account Settings.', askKey:'weakness', route:'journal'},
  worstS&&{stat:worstS[0]+' '+m$(worstS[1]), cls:worstS[1]<0?'neg':'', sub:'Weakest session', tags:[worstS[0],worstS[2]+' trades'], desc:'Lowest net of your sessions in this data.', askKey:'performance', route:'trades'},
  bestS&&bestS!==worstS&&{stat:bestS[0]+' '+m$(bestS[1]), cls:bestS[1]<0?'neg':'', sub:'Strongest session', tags:[bestS[0],bestS[2]+' trades'], desc:'Highest net of your sessions in this data.', askKey:'setup', route:'trades'},
  sub1?{stat:m$(-sub1[1])+' holds', cls:'neg', sub:'Sub-1-minute exits', tags:['0-1m holds','execution leak'], desc:'Net result of trades held under one minute.', askKey:'today', route:'trades'}:{stat:'Not tracked', cls:'', sub:'Hold time', tags:['not tracked yet'], desc:'Hold time is not in the trade data yet, so no hold-time leak can be shown.', askKey:'today', route:'trades'},
  {stat:A.pf.toFixed(2)+' PF', cls:A.pf<1?'neg':'', sub:'Profit factor', tags:[A.n+' trades','efficiency'], desc:A.pf<1?'You lose '+ab$(1/(A.pf||1))+' for every $1 you make right now.':'Winners outweigh losers across your logged trades.', askKey:'performance', route:'trades'},
  {stat:A.L+' / '+A.n+' losses', cls:'neg', sub:'Losing trade load', tags:[(A.L/A.n*100).toFixed(1)+'% loss rate'], desc:'Share of your trades that closed as losses.', askKey:'weakness', route:'journal'},
  {stat:m$(todayNet)+' today', cls:todayNet<0?'neg':'', sub:"Today's control", tags:['current trading day'], desc:'Net result so far on the current trading day.', askKey:'today', route:'journal'}
].filter(Boolean);
function reportHtml(){return '<div class="review-grade"><div class="aic-grade-ring" style="--off:96"><svg viewBox="0 0 52 52"><circle class="trk" cx="26" cy="26" r="22.4"/><circle class="val" cx="26" cy="26" r="22.4"/></svg><b>'+grade+'</b></div>'+
 '<div><div class="t">'+(A.pf>=1?'Profitable, protect it':'Losing account, fixable leaks')+'</div><div class="s">'+A.n+' trades \u00b7 '+A.wr.toFixed(1)+'% win rate \u00b7 profit factor '+A.pf.toFixed(2)+' \u00b7 net '+m$(A.net)+'</div></div></div>'+
 '<div class="review-sec"><h3>WHAT\'S WORKING</h3><ul>'+(bestM&&bestM[1]>0?'<li>'+bestM[0]+' was green: '+m$(bestM[1])+' over '+bestM[2]+' trades.</li>':'<li>No green month yet. Small samples prove nothing either way.</li>')+(wdBest[1]>0?'<li>'+wdBest[0]+' is your best weekday ('+m$(wdBest[1])+').</li>':'')+'</ul></div>'+
 '<div class="review-sec"><h3>WHAT\'S BROKEN</h3><ul><li>'+revTxt+'.</li>'+(sub1?'<li>Sub-1-minute holds: '+m$(-sub1[1])+'.</li>':'<li>Hold time is not tracked, so timing leaks are invisible.</li>')+(worstS&&worstS[1]<0?'<li>Weakest session: '+worstS[0]+' at '+m$(worstS[1])+'.</li>':'')+'</ul></div>'+
 '<div class="review-sec"><h3>Rule for tomorrow</h3><ul><li>'+escH(ruleLine())+'</li></ul></div>'}
function fillHero(){const s=(id,h)=>{const e=$(id);if(e)e.innerHTML=h};
 s('aicHello',A.n?jlN(A.n,'trade')+' logged. Net <b>'+m$(A.net)+'</b>, profit factor <b>'+A.pf.toFixed(2)+'</b>.':'No trades logged in this dataset yet.');
 s('aicFocAmt',rvT.length?ab$(rvNet):'None flagged');
 s('aicFocNote',rvT.length&&A.gl?Math.min(100,Math.abs(rvNet)/A.gl*100).toFixed(0)+'% of gross losses came from revenge-flagged trades.':'No revenge trades flagged in this dataset.');
 const mx=Math.max(1,...sesS.map(x=>Math.abs(x[1])));
 s('aicSessBox',sesS.length?sesS.map((x,k)=>'<div class="aic-sess-row"><span>'+x[0]+'</span><i class="aicSw" data-w="'+(Math.abs(x[1])/mx*100).toFixed(0)+'" style="--c:'+(x[1]<0?'var(--red)':'var(--green)')+'"></i><b>'+m$(x[1])+'</b></div>').join(''):'<div class="aic-focus-note">No sessions recorded yet.</div>')}


  function widgetHtml(w, i){
    return '<div class="aic-widget glass aic-reveal'+((window.jlAiState&&window.jlAiState.isPinned(w.sub))?' pinned':'')+'" style="animation-delay:'+(i*55)+'ms" data-idx="'+i+'">'+
      '<div class="aic-w-eyebrow"><span>AI widget</span><button class="aic-w-pin" title="Pin">+</button></div>'+
      '<div class="aic-w-stat '+w.cls+'">'+w.stat+'</div>'+
      '<div class="aic-w-sub">'+w.sub+'</div>'+
      '<div class="aic-w-desc">'+w.desc+'</div>'+
      '<div class="aic-w-tags">'+w.tags.map(t=>'<span class="aic-w-tag">'+t+'</span>').join('')+'</div>'+
      '<div class="aic-w-btns">'+
        '<button class="aic-w-btn primary" data-act="open">Open Trades</button>'+
        '<button class="aic-w-btn" data-act="journal">Journal Weakest</button>'+
        '<button class="aic-w-btn" data-act="ask">Ask AI</button>'+
        '<button class="aic-w-btn" data-act="copy">Copy</button>'+
      '</div></div>';
  }

  function mount(){
    if(mounted) return; mounted = true;

    const dEl = $('dateStrAI');
    if(dEl) dEl.textContent = new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});

    fillHero();
    countUp($('aicN1'), A.n);
    countUp($('aicN2'), Math.round(A.wr), {suffix:'%'});
    countUp($('aicN3'), Math.abs(A.net), {prefix:A.net<0?'-$':'+$', decimals:2});
    countUp($('aicN4'), Math.abs(rvNet), {prefix:rvNet<0?'-$':'$', decimals:2, suffix:' flagged'});
    (function(){ /* snapshot subtext + main leak from the real data (was static demo text) */
      const sub = id => { const e = $(id); return e && e.parentElement.querySelector('.s'); };
      const w = sub('aicN2'); if(w) w.textContent = A.W+'W · '+A.L+'L · '+A.BE+'BE';
      const p = sub('aicN3'); if(p){ const ex = A.n ? A.net/A.n : 0; p.textContent = 'PF '+(A.pf||0).toFixed(2)+' · exp '+(ex<0?'−$':'$')+Math.abs(ex).toFixed(2)+'/trade'; }
      const lk = $('aicN4'), lv = lk && lk.parentElement.querySelector('.v');
      if(lv){
        const ms=((A.leak&&A.leak.Mistakes)||[]).filter(x=>x&&typeof x[1]==='number'&&x[1]<0&&x[2]>0);
        const wm=ms.length?ms.reduce((a,b)=>b[1]<a[1]?b:a):null;
        const ls=lk.parentElement.querySelector('.s');
        if(wm){ lv.textContent=wm[0]; if(ls) ls.textContent=(wm[1]<0?'−$':'$')+Math.abs(wm[1]).toFixed(2)+' across '+wm[2]+(wm[2]===1?' trade':' trades'); }
        else lv.textContent = (window.__trades||[]).some(t=>t.rev) ? 'Revenge trade' : 'None flagged';
      }
    })();
    animateBars();

    const thread = $('aicThread'), input = $('aicInput'), send = $('aicSend');

    document.querySelectorAll('.aic-chip').forEach(chip=>{
      chip.addEventListener('click', ()=>{
        if(busy) return;
        addMsg(thread, 'user', chip.textContent);
        respond(thread, chip.dataset.q, chip.textContent);
      });
    });

    function ask(){
      const v = input.value.trim();
      if(!v || busy) return;
      addMsg(thread, 'user', v.replace(/</g,'&lt;'));
      input.value = '';
      let key = 'performance';
      for(const [re,k] of KEYMAP){ if(re.test(v)){ key = k; break; } }
      respond(thread, key, v);
    }
    send.addEventListener('click', ask);
    input.addEventListener('keydown', e=>{ if(e.key==='Enter') ask(); });

    /* focus button and the rule card are handled by script jl-ai-coach-fixes */

    $('aicGen').addEventListener('click', ()=>{
      const box = $('aicReportBox'), btn = $('aicGen');
      btn.disabled = true;
      box.innerHTML = '<div class="review-loading"><span class="review-spin"></span>Reading '+A.n+' trades and building your report…</div>';
      window.jlCoachReport().then(r=>{
        const h = reportHtml(), head = h.slice(0, h.indexOf('<div class="review-sec">')), li = a=>a.map(x=>'<li>'+window.jlCoachHtml(x)+'</li>').join('');
        box.innerHTML = head+'<div class="review-sec"><h3>WHAT\'S WORKING</h3><ul>'+(r.working.length?li(r.working):'<li>Nothing stands out yet.</li>')+'</ul></div><div class="review-sec"><h3>WHAT\'S BROKEN</h3><ul>'+(r.broken.length?li(r.broken):'<li>Nothing flagged.</li>')+'</ul></div><div class="review-sec"><h3>Rule for tomorrow</h3><ul><li>'+window.jlCoachHtml(r.rule)+'</li></ul></div>';
      }).catch(e=>{
        box.innerHTML = reportHtml()+'<div class="review-sec"><div class="s">Cloud AI unavailable ('+window.jlCoachHtml((e&&e.message)||'error')+'). Showing the local review.</div></div>';
      }).then(()=>{ btn.disabled = false; });
    });
    $('aicClear').addEventListener('click', ()=>{
      $('aicReportBox').innerHTML = '<div class="review-empty"><span class="review-dot"></span><div><div class="t">No report yet.</div><div class="s">Generate one to see today\'s grade, what\'s actually working, and the one rule to enforce next.</div></div></div>';
    });

    // ---------- AI widgets ----------
    const wBox = $('aicWidgetBox'), wGen = $('aicWGen');
    wGen.addEventListener('click', ()=>{
      wGen.disabled = true;
      wBox.innerHTML = '<div class="review-loading"><span class="review-spin"></span>Scanning '+A.n+' trades for repeatable patterns…</div>';
      setTimeout(()=>{
        wBox.innerHTML = !WIDGETS.length?'<div class="review-empty"><div class="t">No trades yet.</div></div>':'<div class="aic-wgrid">' + WIDGETS.map(widgetHtml).join('') + '</div>';
        wGen.disabled = false;
      }, 900);
    });
    $('aicWClear').addEventListener('click', ()=>{
      wBox.innerHTML = '<div class="review-empty"><span class="review-dot"></span><div><div class="t">No widgets yet.</div><div class="s">Generate them to turn each leak and session pattern into a card you can act on, ask about, or copy.</div></div></div>';
    });
    wBox.addEventListener('click', e=>{
      const pin = e.target.closest('.aic-w-pin');
      if(pin){ const card = pin.closest('.aic-widget'); card.classList.toggle('pinned'); if(window.jlAiState && WIDGETS[+card.dataset.idx]) window.jlAiState.setPin(WIDGETS[+card.dataset.idx].sub, card.classList.contains('pinned')); return; }
      const btn = e.target.closest('.aic-w-btn');
      if(!btn) return;
      const card = btn.closest('.aic-widget');
      const w = WIDGETS[+card.dataset.idx];
      if(btn.dataset.act === 'open'){ const nav = document.querySelector('.nav[data-view="trades"]'); if(nav) nav.click(); }
      else if(btn.dataset.act === 'journal'){ const nav = document.querySelector('.nav[data-view="journal"]'); if(nav) nav.click(); }
      else if(btn.dataset.act === 'ask'){
        addMsg(thread, 'user', 'Ask about: '+w.sub);
        respond(thread, w.askKey, 'Explain my "'+w.sub+'" ('+w.stat+') and what to change.');
        document.querySelector('.aic-chat').scrollIntoView({behavior:'smooth', block:'start'});
      } else if(btn.dataset.act === 'copy'){
        const text = w.stat+' — '+w.sub+'. '+w.desc.replace(/<[^>]+>/g,'');
        const done = ()=>{ btn.classList.add('copied'); const old = btn.textContent; btn.textContent='Copied'; setTimeout(()=>{btn.classList.remove('copied'); btn.textContent=old;},1300); };
        if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(done);
        else done();
      }
    });
    /* Pinned widgets show as soon as the tab opens; the rest appear after Generate widgets. */
    (function(){
      if(!WIDGETS.length || !window.jlAiState) return;
      let html = '';
      WIDGETS.forEach((w, i)=>{ if(window.jlAiState.isPinned(w.sub)) html += widgetHtml(w, i); });
      if(html) wBox.innerHTML = '<div class="aic-wgrid">' + html + '</div>';
    })();
  }

  window.__mountAiCoach = mount;
})();
