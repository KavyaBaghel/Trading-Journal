(function(){
  var KEY=JL_KEYS.keys.KRISHNA_TOMORROW_RULE, KEEP=30;
  var inp=document.getElementById('ruleInput'), btn=document.getElementById('ruleSave'),
      val=document.getElementById('focusVal'), meta=document.getElementById('focusMeta');
  if(!inp||!btn||!val||!meta) return;
  function dayKey(){ return typeof window.getTradingDayIST==='function' ? window.getTradingDayIST() : ''; }
  function read(){
    try{ var m=JSON.parse(localStorage.getItem(KEY)||'null'); return (m&&typeof m==='object'&&!Array.isArray(m))?m:{}; }
    catch(e){ return {}; }
  }
  function pad(n){ return String(n).padStart(2,'0'); }
  function parse(d){ var p=d.split('-'); return new Date(Date.UTC(+p[0],+p[1]-1,+p[2])); }
  function iso(dt){ return dt.getUTCFullYear()+'-'+pad(dt.getUTCMonth()+1)+'-'+pad(dt.getUTCDate()); }
  /* a rule saved on trading day d becomes active on the next weekday: Mon-Thu -> next day, Fri/Sat/Sun -> Monday */
  function activeDay(d){
    var dt=parse(d);
    do{ dt.setUTCDate(dt.getUTCDate()+1); }while(dt.getUTCDay()===0||dt.getUTCDay()===6);
    return iso(dt);
  }
  function fmt(d){ return parse(d).toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'}); }
  function paint(){
    var t=dayKey(); if(!t) return;
    var m=read(), shown='', pend='';
    Object.keys(m).forEach(function(d){
      if(typeof m[d]!=='string'||!m[d]) return;
      if(activeDay(d)<=t){ if(d>shown) shown=d; } else if(d>pend) pend=d;
    });
    if(shown){
      val.textContent=m[shown]; val.style.color=''; val.style.fontWeight='';
      meta.textContent='Saved '+fmt(shown);
    }else{
      val.textContent='No saved rule'; val.style.color='var(--faint)'; val.style.fontWeight='500';
      meta.textContent='Set one below after review';
    }
    if(pend){
      inp.value=m[pend]; inp.disabled=true; inp.style.opacity='.55'; inp.style.cursor='not-allowed';
      btn.style.display='none';
    }else{
      if(inp.disabled) inp.value='';
      inp.disabled=false; inp.style.opacity=''; inp.style.cursor='';
      btn.style.display='';
    }
  }
  function save(){
    var t=dayKey(), text=inp.value.trim();
    if(!t||!text||inp.disabled) return;
    var m=read(); m[t]=text;
    Object.keys(m).sort().slice(0,-KEEP).forEach(function(d){ delete m[d]; });
    try{ localStorage.setItem(KEY, JSON.stringify(m)); }catch(e){ return; }
    paint();
  }
  btn.addEventListener('click',save);
  inp.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); save(); } });
  document.addEventListener('visibilitychange',function(){ if(!document.hidden) paint(); });
  window.addEventListener('storage',function(e){ if(e.key===KEY) paint(); });
  paint(); setInterval(paint,30000);
})();
