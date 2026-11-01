/* Step 3.9: AI Coach. Chat questions go to the Worker aiCoach route (same call shape as the old site: {prompt, context, mode}). */
(function(){
  function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
  window.jlCoachHtml=function(t){return esc(t).replace(/\*\*([^*\n]+)\*\*/g,'<b>$1</b>').replace(/\n/g,'<br>')};
  function m$(v){return (v<0?'-$':'+$')+Math.abs(v).toFixed(2)}
  function jstats(){var J=[],kind=window.jlKind||function(p){return Math.abs(p)<1?'be':p>0?'win':'loss'},bykey={};
    try{J=window.__getJournals?window.__getJournals():[]}catch(e){console.debug('[journall] ignored error in ai-coach-chat.js:', e);}if(!Array.isArray(J))J=[];
    function use(j){return !!j&&j.pnl!=null&&j.pnl!==''&&isFinite(j.pnl)}
    function add(g,k,p){var o=g[k]=g[k]||{n:0,w:0,l:0,net:0};o.n++;o.net+=p;var c=kind(p);if(c==='win')o.w++;else if(c==='loss')o.l++}
    function top(g){return Object.keys(g).map(function(k){return[k,g[k]]}).sort(function(a,b){return b[1].n-a[1].n||(a[0]<b[0]?-1:1)}).slice(0,8)}
    var su={},em={},tg={};
    J.forEach(function(j){if(!use(j))return;var p=+j.pnl,s=String(j.setup||'').trim().slice(0,40),e=String(j.emotion||'').trim().slice(0,40);
      if(s){add(su,s,p);if(j.key)bykey[j.key]=s}if(e)add(em,e,p);(Array.isArray(j.tags)?j.tags:[]).forEach(function(x){x=String(x||'').trim().slice(0,40);if(x==='Lot Over 0.02')x='Lot Over Limit';if(x)add(tg,x,p)})});
    var pb=[];try{var raw=JSON.parse(localStorage.getItem('journall_playbook_v1')||'[]');if(Array.isArray(raw))raw.slice(0,8).forEach(function(p){if(p&&p.name)pb.push({name:String(p.name).slice(0,40),take:String(p.take||'').replace(/\s+/g,' ').trim().slice(0,300),skip:String(p.skip||'').replace(/\s+/g,' ').trim().slice(0,300)})})}catch(e){console.debug('[journall] ignored error in ai-coach-chat.js:', e);}
    return{setups:top(su),emotions:top(em),tags:top(tg),playbook:pb,bykey:bykey}}
  function ctx(){
    var A=window.__A||{},T=window.__trades||[],L=['Journall trade-review context (real logged trades only)'];
    if(!T.length)return L.concat('No trades logged yet.').join('\n');
    L.push('Trades: '+A.n+', win rate '+Number(A.wr||0).toFixed(1)+'%, net '+m$(A.net||0)+', profit factor '+Number(A.pf||0).toFixed(2)+', wins '+A.W+', losses '+A.L+', breakeven '+A.BE+'.');
    (A.ses||[]).forEach(function(x){L.push('Session '+x[0]+': '+m$(x[1])+' over '+x[2]+' trades')});
    try{var c=JSON.parse(localStorage.getItem('journall_account_config_v1')||'null');
      if(c&&c.accountSize)L.push('Account: size $'+c.accountSize+', phase '+(c.phase||'n/a')+', max trades/day '+(c.maxTradesPerDay||'n/a')+'.')}catch(e){console.debug('[journall] ignored error in ai-coach-chat.js:', e);}
    var JS=jstats();
    JS.setups.forEach(function(x){L.push('Setup '+x[0]+': '+x[1].n+' trades, '+x[1].w+'W '+x[1].l+'L, net '+m$(x[1].net))});
    JS.emotions.forEach(function(x){L.push('Feeling '+x[0]+': '+x[1].n+' trades, net '+m$(x[1].net))});
    JS.tags.forEach(function(x){L.push('Mistake tag '+x[0]+': '+x[1].n+' trades, net '+m$(x[1].net))});
    JS.playbook.forEach(function(p){L.push('Playbook setup '+p.name+'. Take: '+(p.take||'not written')+'. Skip: '+(p.skip||'not written'))});
    try{var rl=window.jlTodayRule?window.jlTodayRule():null;if(rl&&rl.text)L.push("Trader's rule for today: "+rl.text)}catch(e){console.debug('[journall] ignored error in ai-coach-chat.js:', e);}
    L.push('Recent trades (newest last):');
    T.slice(-30).forEach(function(t){var su=JS.bykey[t.d+' '+t.t+' '+t.side+' '+t.en+' '+t.pnl];L.push('- '+t.d+' '+t.t+' '+t.sym+' '+t.side+' '+t.ses+' pnl '+m$(t.pnl)+' lot '+t.lot+' exit '+(t.why||'-')+(t.hold!=null?' hold '+Math.round(t.hold)+'s':'')+(t.rev?' [revenge-flagged]':'')+(t.tag?' tag '+t.tag:'')+(su?' setup '+su:''))});
    return L.join('\n');
  }
  window.jlCoachAsk=async function(prompt,mode){
    var ep=String(window.journallAiProxyUrl||'').trim();
    if(!ep||ep.indexOf('YOUR_WORKERS_SUBDOMAIN')>=0)throw new Error('AI backend is not configured yet.');
    var tok=window.journallGetFirebaseIdToken?await window.journallGetFirebaseIdToken():null;
    if(!tok)throw new Error('Sign in again before using AI Coach.');
    var ac=new AbortController(),to=setTimeout(function(){ac.abort()},15000),r;
    try{r=await fetch(ep.replace(/\/+$/,'')+'/aiCoach',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+tok},body:JSON.stringify({prompt:prompt,mode:mode||'chat',context:mode==='generation'?'':ctx()}),signal:ac.signal})}
    catch(e){throw new Error(e&&e.name==='AbortError'?'AI Coach timed out after 15 seconds. Try again.':'Could not reach the AI backend.')}
    finally{clearTimeout(to)}
    var j=await r.json().catch(function(){return {}});
    if(!r.ok)throw new Error((j&&j.error)||('AI backend returned '+r.status+'.'));
    var t=String((j&&j.text)||'').trim();
    if(!t)throw new Error('AI backend returned no text.');
    return t;
  };
  window.jlCoachReport=async function(){
    var A=window.__A||{},T=window.__trades||[],mo={};
    T.forEach(function(t){var k=t.d.slice(0,7);(mo[k]=mo[k]||[0,0]);mo[k][0]+=t.pnl;mo[k][1]++});
    var P={trades:A.n,winRatePct:+Number(A.wr||0).toFixed(1),netPnl:+Number(A.net||0).toFixed(2),profitFactor:+Number(A.pf||0).toFixed(2),wins:A.W,losses:A.L,breakeven:A.BE,
      sessions:(A.ses||[]).map(function(x){return {session:x[0],net:+x[1].toFixed(2),trades:x[2]}}),
      months:Object.keys(mo).sort().map(function(k){return {month:k,net:+mo[k][0].toFixed(2),trades:mo[k][1]}}),
      weekdays:(A.wd||[]).map(function(x){return {day:x[0],net:+x[1].toFixed(2)}}),
      revengeFlaggedTrades:T.filter(function(t){return t.rev}).length,
      setups:jstats().setups.map(function(x){return {setup:x[0],trades:x[1].n,net:+x[1].net.toFixed(2)}}),
      sub1MinuteHoldsNet:A.negHold&&A.negHold[0]?+A.negHold[0][1].toFixed(2):null,
      topMistakeTag:A.negMis&&A.negMis[0]?A.negMis[0][0]:null};
    var prompt=['You are a trading discipline coach. Write an end-of-day review from the stats below. Use trader language only. No profit promises or financial advice. Only use numbers that appear in the stats.',
      'Reply in exactly this plain-text format, nothing else, no markdown:\nWORKING: one short sentence (write 1 or 2 of these lines)\nBROKEN: one short sentence (write 2 or 3 of these lines)\nRULE: one concrete rule for tomorrow, one sentence',
      JSON.stringify(P)].join('\n\n');
    var txt=await window.jlCoachAsk(prompt,'generation'),W=[],B=[],R='';
    txt.split(/\r?\n/).forEach(function(l){var m=/^\W*(WORKING|BROKEN|RULE)\W*:\s*(.+)$/i.exec(l.trim());if(!m)return;var k=m[1].toUpperCase();if(k==='WORKING')W.push(m[2]);else if(k==='BROKEN')B.push(m[2]);else if(!R)R=m[2]});
    if(!R||(!W.length&&!B.length))throw new Error('AI Coach returned an unreadable report.');
    return {working:W.slice(0,3),broken:B.slice(0,4),rule:R};
  };
})();
