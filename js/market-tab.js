(function(){
  const $=id=>document.getElementById(id);
  let cal=[], news=[], loaded=false, loading=false, calMsg='', calSrc='', newsMsg='';
  let lastRows=[];
  const cd=t=>{const ms=t-Date.now(); if(ms<=0) return 'now'; const m=Math.round(ms/60000); if(m<60) return 'in '+m+'m'; const h=Math.floor(m/60); if(h<48) return 'in '+h+'h '+(m%60)+'m'; return 'in '+Math.round(h/24)+'d';};
  const dayTag=t=>{const n=new Date(), k=t.toDateString(); if(k===n.toDateString()) return 'Today'; n.setDate(n.getDate()+1); return k===n.toDateString()?'Tomorrow':'';};
  const hm=t=>t.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});
  const CCY_MAP={US:'USD',EU:'EUR',GB:'GBP',UK:'GBP',JP:'JPY',CA:'CAD',AU:'AUD',CN:'CNY',CH:'CHF',NZ:'NZD',DE:'EUR',FR:'EUR',IT:'EUR',ES:'EUR'};
  const impLvl=s=>{s=(s||'').toLowerCase();return s.indexOf('high')>-1?3:s.indexOf('med')>-1?2:s.indexOf('low')>-1?1:0};
  const impColor=l=>l===3?'var(--red)':l===2?'var(--accent-2)':l===1?'var(--green)':'rgba(255,255,255,.12)';
  const esc=v=>String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const safeUrl=u=>/^https?:\/\//i.test(u||'')?u:'#';
  /* parse an event time whatever shape the feed uses ("2026-10-27 12:30:00" = UTC, or ISO with Z / offset); bad rows give an invalid Date and are skipped */
  const tm=e=>{let s=String((e&&e.time)||'').trim(); if(!s) return new Date(NaN); s=s.replace(' ','T'); if(!/(Z|[+-]\d{2}:?\d{2})$/.test(s)) s+='Z'; return new Date(s)};

  function state(){
    const g=id=>{const el=$(id);const on=el&&el.querySelector('.mk-chip.on');return on?on.dataset.val:'all'};
    return {range:g('mkRangeChips')||'week', impact:g('mkImpactChips')||'all', ccy:g('mkCcyChips')||'all'};
  }
  let lastStat=['Not connected',false];
  function setStatus(text,ok){
    lastStat=[text,ok];
    const el=$('mkStatus'); if(!el) return;
    el.innerHTML='<i style="background:'+(ok?'var(--green)':'var(--red)')+'"></i>'+text;
  }
  function pad(n){return n<10?'0'+n:''+n}
  function rangeBounds(r){
    const now=new Date(), start=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    if(r==='today'){ const e=new Date(start); e.setDate(e.getDate()+1); return [start,e]; }
    if(r==='next'){ const s=new Date(start); s.setDate(s.getDate()+7); const e=new Date(s); e.setDate(e.getDate()+7); return [s,e]; }
    const e=new Date(start); e.setDate(e.getDate()+7); return [start,e];
  }
  function renderCalendar(){
    const {range,impact,ccy}=state();
    const [from,to]=rangeBounds(range);
    let rows=cal.filter(e=>{
      const t=tm(e);
      if(!isFinite(t)||t<from||t>=to) return false;
      if(impact!=='all' && impLvl(e.impact)!==({high:3,medium:2,low:1}[impact])) return false;
      const c=CCY_MAP[e.country]||e.country;
      if(ccy!=='all' && c!==ccy) return false;
      return true;
    }).sort((a,b)=>tm(a)-tm(b));
    const body=$('mkCalBody'), note=$('mkCalNote');
    if(!body) return;
    lastRows=rows;
    if(!rows.length){
      body.innerHTML='<tr><td colspan="7"><div class="mk-empty"><div class="mk-empty-ic">&#9684;</div><b>'+(calMsg?'Calendar unavailable':'No events match these filters')+'</b><p>'+esc(calMsg||'Try a wider range or a lower impact level.')+'</p>'+(calMsg?'':'<button type="button" class="mk-chip mk-widen">Show all impact levels</button>')+'</div></td></tr>';
      const wb=body.querySelector('.mk-widen');
      if(wb) wb.onclick=function(){const c=$('mkImpactChips'), x=c&&c.querySelector('[data-val="all"]'); if(x) x.click();};
    } else {
      const counts={}; rows.forEach(e=>{const k=tm(e).toDateString(); counts[k]=(counts[k]||0)+1;});
      const nowMs=Date.now(); let lastDay='', html='', marked=false;
      const val=(x,c)=>{const s=(x==null||x==='')?'\u2014':x; return '<td class="mk-v '+c+(s==='\u2014'?' nil':'')+'">'+esc(s)+'</td>';};
      rows.forEach(e=>{
        const t=tm(e), dayKey=t.toDateString(), lvl=impLvl(e.impact), past=t.getTime()<nowMs;
        if(dayKey!==lastDay){ lastDay=dayKey; const tg=dayTag(t); html+='<tr class="mk-day"><td colspan="7">'+t.toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'})+(tg?'<em>'+tg+'</em>':'')+'<small>'+counts[dayKey]+' event'+(counts[dayKey]===1?'':'s')+'</small></td></tr>'; }
        let cls='mk-r lv'+lvl+(past?' past':''); if(!past&&!marked&&lvl>=2){ cls+=' next'; marked=true; }
        html+='<tr class="'+cls+'"><td class="mk-t">'+hm(t)+'</td><td><span class="mk-ccy">'+esc(CCY_MAP[e.country]||e.country||'\u2014')+'</span></td>'
          +'<td><span class="mk-imp" title="'+['','Low','Medium','High'][lvl]+' impact">'+[1,2,3].map(n=>'<i style="background:'+(n<=lvl?impColor(lvl):'rgba(255,255,255,.1)')+'"></i>').join('')+'</span></td>'
          +'<td class="ev">'+esc(e.event||'\u2014')+'</td>'+val(e.actual,'act')+val(e.estimate,'')+val(e.prev,'')+'</tr>';
      });
      body.innerHTML=html;
    }
    if(note) note.textContent=loaded?('Showing '+rows.length+' event'+(rows.length===1?'':'s')+(calSrc==='forexfactory'?' via Forex Factory (forecast/previous only, no actuals; updates hourly).':' via Finnhub. Free-tier data may lag or omit some releases.')):'Loading calendar…';
    renderKeyEvents();
  }
  function renderKeyEvents(){
    const host=$('mkKeyEvents'); if(!host) return;
    const now=new Date(), ccy=state().ccy;
    const upcoming=cal.filter(e=>tm(e)>=now && impLvl(e.impact)>=2 && (ccy==='all' || (CCY_MAP[e.country]||e.country)===ccy))
      .sort((a,b)=>tm(a)-tm(b)).slice(0,4);
    const st=$('mkStats');
    if(st){
      const hi=lastRows.filter(e=>impLvl(e.impact)===3).length, nx=upcoming[0];
      st.innerHTML='<div class="mk-st"><small>Events shown</small><b>'+lastRows.length+'</b><span>'+(ccy==='all'?'All currencies':esc(ccy))+'</span></div>'
        +'<div class="mk-st'+(hi?' hot':'')+'"><small>High impact</small><b>'+hi+'</b><span>'+(hi?'Watch your risk around these':'Nothing major in range')+'</span></div>'
        +'<div class="mk-st"><small>Next big event</small><b>'+(nx?cd(tm(nx)):'\u2014')+'</b><span>'+(nx?esc(nx.event||'Event'):'None scheduled')+'</span></div>';
    }
    if(!upcoming.length){ host.innerHTML='<div class="mk-k"><span>No high/medium-impact '+(ccy==='all'?'':esc(ccy)+' ')+'events found in range.</span></div>'; return; }
    host.innerHTML=upcoming.map(e=>{
      const t=tm(e), lvl=impLvl(e.impact);
      return '<div class="mk-k lv'+lvl+'"><span class="mk-ccy">'+esc(CCY_MAP[e.country]||e.country||'\u2014')+'</span><div class="mk-kb"><b>'+esc(e.event||'Event')+'</b><span>'+t.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})+' \u00b7 '+hm(t)+'</span></div><em class="mk-cd">'+cd(t)+'</em></div>';
    }).join('');
  }
  function ago(sec){
    const m=Math.round((Date.now()/1000-sec)/60);
    if(m<1) return 'just now'; if(m<60) return m+'m ago'; const h=Math.round(m/60); if(h<24) return h+'h ago';
    return new Date(sec*1000).toLocaleDateString(undefined,{month:'short',day:'numeric'});
  }
  function renderNews(){
    const host=$('mkNewsList'); if(!host) return;
    /* clean the feed: drop blank headlines, de-duplicate repeats, newest first */
    const seen={}, list=(news||[]).filter(n=>{
      const h=String((n&&n.headline)||'').trim(); if(!h) return false;
      const k=h.toLowerCase().replace(/\s+/g,' '); if(seen[k]) return false; seen[k]=1; return true;
    }).sort((a,b)=>(b.datetime||0)-(a.datetime||0)).slice(0,12);
    if(!list.length){
      const msg=loaded?(newsMsg||'No news returned right now.'):'Loading news…';
      host.innerHTML='<div class="mk-n"><span style="color:var(--faint)">'+esc(msg)+'</span>'+(loaded?'<button type="button" class="mk-chip mk-retry" id="mkNewsRetry">Retry</button>':'')+'</div>';
      return;
    }
    host.innerHTML=list.map(n=>{
      const t=n.datetime?ago(n.datetime):'';
      const url=safeUrl(n.url), head=esc(String(n.headline).trim());
      const meta='<span class="mk-nm"><i class="mk-av">'+esc(String(n.source||'N').trim().charAt(0).toUpperCase()||'N')+'</i>'+esc(n.source||'News')+(t?' · '+esc(t):'')+'</span>';
      return '<div class="mk-n">'+meta+(url==='#'?'<span class="mk-nh">'+head+'</span>':'<a class="mk-nh" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+head+'</a>')+'</div>';
    }).join('');
  }
  let lastTry=0, failTries=0;
  async function fetchAll(){
    if(loading) return; loading=true; lastTry=Date.now();
    setStatus('Loading\u2026',true);
    try{
      const now=new Date(), to=new Date(now); to.setDate(to.getDate()+14);
      const from=new Date(now); from.setDate(from.getDate()-1);
      const fmt=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
      const R=await window.jlMarketFetch({from:fmt(from),to:fmt(to)});
      const cs=R.calendar.status, ns=R.news.status;
      cal=cs===200?R.calendar.events:[]; news=ns===200?R.news.items:[]; calSrc=(R.calendar&&R.calendar.source)||'';
      const why=(what,c)=>c===200?'':c===403?what+' is not included in the current Finnhub plan.':c===429?'Finnhub rate limit reached, try again in a minute.':c===0?'Finnhub could not be reached.':what+' failed (code '+c+').';
      calMsg=why('The economic calendar',cs); newsMsg=why('Market news',ns);
      const cc=cs===200?0:(cs||-1), nc=ns===200?0:(ns||-1);
      if(cc===401||nc===401) setStatus('Market key rejected',false);
      else if(cc&&nc) setStatus(cc===429||nc===429?'Rate limited, try again in a minute':'Connection failed',false);
      else if(cc===403) setStatus('News connected \u00b7 calendar not in plan',false);
      else if(cc) setStatus('News connected \u00b7 calendar failed',false);
      else if(nc) setStatus('Calendar connected \u00b7 news failed',false);
      else setStatus('Connected',true);
    }catch(err){
      cal=[]; news=[];
      calMsg=newsMsg=(err&&err.message)||'Connection failed';
      setStatus(calMsg,false);
    }
    loaded=true; loading=false;
    renderCalendar(); renderNews();
    /* On a direct page load this can run before sign-in has finished, so the first try fails and used to stay failed.
       Retry a few times in the background until news arrives. */
    if(news.length){ failTries=0; }
    else if(failTries<3){ failTries++; setTimeout(function(){ if(!news.length&&!loading) fetchAll(); }, 6000*failTries); }
  }
  window.jlNewsWarning=function(){
    if(window.jlTradeDuringNews!=='no'||!loaded||!cal.length)return null;
    const now=Date.now(), ccy=state().ccy; let best=null;
    cal.forEach(e=>{
      if(impLvl(e.impact)<2)return;
      if(ccy!=='all'&&(CCY_MAP[e.country]||e.country)!==ccy)return;
      const t=tm(e).getTime();
      if(!isFinite(t)||t<now||t-now>30*60000)return;
      if(!best||t<best.t)best={t:t,e:e};
    });
    return best?{event:best.e.event||'News event',ccy:(CCY_MAP[best.e.country]||best.e.country||''),mins:Math.max(1,Math.ceil((best.t-now)/60000))}:null;
  };
  setInterval(function(){ try{ renderKeyEvents(); }catch(_){console.debug('[journall] ignored error in market-tab.js:', _);} },60000);
  function wireChips(){
    ['mkRangeChips','mkImpactChips','mkCcyChips'].forEach(id=>{
      const host=$(id); if(!host||host.dataset.wired) return; host.dataset.wired='1';
      host.addEventListener('click', e=>{
        const btn=e.target.closest('.mk-chip'); if(!btn) return;
        host.querySelectorAll('.mk-chip').forEach(b=>b.classList.toggle('on', b===btn));
        renderCalendar();
      });
    });
    const status=$('mkStatus');
    if(status && !status.dataset.wired){
      status.dataset.wired='1';
      status.addEventListener('click', ()=>{ failTries=0; fetchAll(); });

    }
    const nl=$('mkNewsList');
    if(nl && !nl.dataset.wired){
      nl.dataset.wired='1';
      nl.addEventListener('click', e=>{ if(e.target.closest('#mkNewsRetry')){ failTries=0; nl.innerHTML='<div class="mk-n"><span class="mk-sk" style="width:35%"></span><span class="mk-sk" style="width:95%"></span></div>'; fetchAll(); } });
    }
  }
  function mount(){
    wireChips();
    if(!loaded) fetchAll();
    else {
      renderCalendar(); renderNews(); setStatus(lastStat[0], lastStat[1]);
      /* opened the tab with nothing to show (earlier try failed): refresh, at most once every 30 s */
      if((!news.length||!cal.length) && !loading && Date.now()-lastTry>30000){ failTries=0; fetchAll(); }
    }
  }
  window.__mountMarketTab = mount;
  /* News rule: when "Trade during news?" is No, load the calendar in the background (no need to open the Market tab). */
  let ensT = 0;
  window.__jlEnsureNews = function(){
    if(window.jlTradeDuringNews !== 'no' || loading) return;
    const now = Date.now();
    if(!loaded || now - ensT > (cal.length ? 30 : 5) * 60000){ ensT = now; fetchAll().catch(function(){}); }
  };
  setInterval(window.__jlEnsureNews, 60000); setTimeout(window.__jlEnsureNews, 4000);
  /* Direct load / refresh: route() ran at the top of the page, before these tabs' scripts defined their mount
     functions, so mount the tab that is open now (each mount is idempotent). */
  (function(){ const k = {psychology:'__mountPsychologyTab', ai:'__mountAiCoach', profile:'__mountUserProfile', market:'__mountMarketTab'}[(location.hash||'').slice(1)];
    if(k && window[k]) window[k](); })();
})();
