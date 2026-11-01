/* Day recap: picking a day in the Calendar opens that day in the Today's Summary layout with the date at the top.
   Every number is computed from window.__trades for that IST trading day. Live-only parts of Today's Summary
   (checklist, tomorrow's rule box, session clock, review generator) are not shown for a past day. */
(function(){
  var view=document.getElementById('view-recap'); if(!view) return;
  var $=function(id){ return document.getElementById(id); };
  var WHY={SL:'Stop loss',TP:'Target hit',User:'Manual close'};
  function esc(v){ return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
  function money(v){ return (v<0?'-$':'+$')+Math.abs(v).toFixed(2); }
  function dollars(v){ return (v<0?'-$':'$')+Math.abs(v).toFixed(2); }
  function kind(p){ return typeof window.jlKind==='function' ? window.jlKind(Number(p)) : (p>0?'win':p<0?'loss':'be'); }
  function plural(n,w){ return n+' '+w+(n===1?'':'s'); }
  function fixed(v){ v=Number(v); return isFinite(v)?v.toFixed(2):'—'; }
  function parseKey(k){ var p=k.split('-'); return new Date(Date.UTC(+p[0],+p[1]-1,+p[2])); }
  var simP='day', curKey='';
  /*SIM-PURE-START*/
  /* "What if I had followed my rules?" Walks each trading day in time order. A trade is dropped when the circuit
     breaker would already have tripped from the trades kept so far (after a limit), or when it carries a rule-break
     flag (revenge, no stop loss, lot over the set lot size). Dropped trades do not count toward the limits.
     A limit that is not set (0) is not applied. */
  function simEval(rows,o,kindFn){
    var days={},dayOrder=[];
    (rows||[]).forEach(function(t){
      if(!t) return; var p=Number(t.pnl); if(!isFinite(p)) return;
      var d=String(t.d); if(!days[d]){ days[d]={g:{},order:[]}; dayOrder.push(d); }
      var D=days[d], k=t.d+'|'+t.t+'|'+t.sym+'|'+t.side;
      if(!D.g[k]){ D.g[k]={t:String(t.t),pnl:0,neg:0,rev:false,nosl:false,lot:false}; D.order.push(k); }
      var G=D.g[k]; G.pnl+=p; if(p<0) G.neg+=-p;
      if(t.rev) G.rev=true;
      if(t.sl==null) G.nosl=true;
      if(o.lotSize>0&&Number(t.lot)>o.lotSize+1e-9) G.lot=true;
    });
    var r={total:0,kept:0,actualNet:0,simNet:0,after:{n:0,net:0},rule:{n:0,net:0,rev:0,nosl:0,lot:0}};
    dayOrder.forEach(function(d){
      var D=days[d];
      var list=D.order.map(function(k,i){ var g=D.g[k]; g.i=i; return g; }).sort(function(a,b){ return a.t<b.t?-1:a.t>b.t?1:a.i-b.i; });
      var lossUsed=0,netRun=0,count=0,run=0;
      list.forEach(function(G){
        r.total++; r.actualNet+=G.pnl;
        var tripped=(o.lossLimit>0&&lossUsed>=o.lossLimit)||(o.tradeLimit>0&&count>=o.tradeLimit)||(o.maxConsec>0&&run>=o.maxConsec);
        if(tripped){ r.after.n++; r.after.net+=G.pnl; return; }
        if(G.rev||G.nosl||G.lot){ r.rule.n++; r.rule.net+=G.pnl; if(G.rev) r.rule.rev++; if(G.nosl) r.rule.nosl++; if(G.lot) r.rule.lot++; return; }
        r.kept++; r.simNet+=G.pnl; netRun+=G.pnl; lossUsed=Math.max(0,-netRun); count++;
        run=kindFn(G.pnl)==='loss'?run+1:0;
      });
    });
    var c=function(v){ return Math.round(v*100)/100; };
    r.actualNet=c(r.actualNet); r.simNet=c(r.simNet); r.after.net=c(r.after.net); r.rule.net=c(r.rule.net);
    return r;
  }
  /*SIM-PURE-END*/
  function simRange(key,p){
    if(p==='week'){ var dt=parseKey(key), dow=(dt.getUTCDay()+6)%7; return {lo:new Date(dt.getTime()-dow*864e5).toISOString().slice(0,10),hi:new Date(dt.getTime()+(6-dow)*864e5).toISOString().slice(0,10)}; }
    if(p==='month') return {lo:key.slice(0,7)+'-01',hi:key.slice(0,7)+'-31'};
    if(p==='all') return {lo:'0000-00-00',hi:'9999-99-99'};
    return {lo:key,hi:key};
  }
  function simHtml(key){
    var P=[['day','This day'],['week','This week'],['month','This month'],['all','All time']];
    var rg=simRange(key,simP);
    var rows=(window.__trades||[]).filter(function(t){ return t&&isFinite(Number(t.pnl))&&String(t.d)>=rg.lo&&String(t.d)<=rg.hi; });
    var o={lossLimit:Number(window.jlDailyLossLimit)||0,tradeLimit:Number(window.jlMaxTradesPerDay)||0,maxConsec:Number(window.jlMaxConsecLosses)||0,lotSize:Number(window.jlLotSize)||0};
    var r=simEval(rows,o,kind);
    var label=simP==='day'?key:simP==='week'?rg.lo+' to '+rg.hi:simP==='month'?key.slice(0,7):'Every logged trade';
    var chips='<div class="rc-sim-chips" role="group" aria-label="Period">'+P.map(function(x){ return '<button type="button" class="rc-sim-chip" data-simp="'+x[0]+'" aria-pressed="'+(x[0]===simP)+'">'+x[1]+'</button>'; }).join('')+'</div>';
    var head='<div class="panel-head"><div class="a-s-ttl"><span class="a-s-ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></svg></span><h2>What if I had followed my rules?</h2></div><span class="hint">'+esc(label)+'</span></div>';
    if(!r.total) return head+chips+'<div class="rc-empty">No trades in this period.</div>';
    var diff=Math.round((r.simNet-r.actualNet)*100)/100;
    var dcol=diff>0?'var(--green)':diff<0?'var(--red)':'';
    var tile=function(l,v,col){ return '<div class="rr-tile"><div class="l">'+l+'</div><div class="v"'+(col?' style="color:'+col+'"':'')+'>'+esc(v)+'</div></div>'; };
    var verdict=diff>0?'Following the rules would have added '+dollars(diff)+' over this period.':diff<0?'Following the rules would have cost '+dollars(Math.abs(diff))+' on this data. The trades you skip made money, but they broke a rule.':'Following the rules would have made no difference here.';
    var notes=[];
    if(r.after.n) notes.push(['var(--red)','Taken after a limit was hit',plural(r.after.n,'trade')+' · net '+money(r.after.net)+'. These would not have been taken.']);
    else notes.push(['var(--green)','No trades after a limit was hit','Every trade came before a limit was reached.']);
    if(r.rule.n){
      var fl=[]; if(r.rule.rev) fl.push('revenge '+r.rule.rev); if(r.rule.nosl) fl.push('no stop loss '+r.rule.nosl); if(r.rule.lot) fl.push('lot over limit '+r.rule.lot);
      notes.push(['var(--amber)','Rule-break trades',plural(r.rule.n,'trade')+' · net '+money(r.rule.net)+'. Flags: '+fl.join(', ')+'. A trade can carry more than one flag.']);
    } else notes.push(['var(--green)','No rule-break trades','No revenge, no stop loss or oversized lot trades.']);
    var off=[]; if(!o.lossLimit) off.push('daily loss limit'); if(!o.tradeLimit) off.push('daily trade limit'); if(!o.maxConsec) off.push('max losses in a row'); if(!o.lotSize) off.push('lot size');
    return head+chips+
      '<div class="rc-sim-grid">'+tile('ACTUAL NET',money(r.actualNet),r.actualNet<0?'var(--red)':r.actualNet>0?'var(--green)':'')+tile('IF YOU FOLLOWED RULES',money(r.simNet),r.simNet<0?'var(--red)':r.simNet>0?'var(--green)':'')+tile('DIFFERENCE',money(diff),dcol)+tile('TRADES KEPT',r.kept+' of '+r.total,'')+'</div>'+
      '<div class="rc-sim-verdict">'+esc(verdict)+'</div>'+
      notes.map(function(n){ return '<div class="note-item"><div class="note-dot" style="background:'+n[0]+'"></div><div><div class="t">'+n[1]+'</div><div class="s">'+esc(n[2])+'</div></div></div>'; }).join('')+
      (off.length?'<div class="rc-sim-off">Not applied because they are not set: '+off.join(', ')+'.</div>':'');
  }
  function ringCard(label,num,numColor,sub,detail,frac,color){
    var off=239-239*Math.max(0,Math.min(1,frac));
    return '<div class="ring-card glass"><svg width="76" height="76" viewBox="0 0 88 88"><circle class="ring-track" cx="44" cy="44" r="38"/><circle class="ring-val" cx="44" cy="44" r="38" stroke="'+color+'" style="--off:'+off+'"/></svg><div><div class="ring-label">'+label+'</div><div class="ring-num"'+(numColor?' style="color:'+numColor+'"':'')+'>'+esc(num)+'</div><div class="ring-sub">'+esc(sub)+'</div><div class="ring-detail">'+detail+'</div></div></div>';
  }
  function card(label,v,meta,color){
    return '<div class="card glass"><div class="card-head"><span class="l">'+label+'</span></div><div class="v"'+(color?' style="color:'+color+'"':'')+'>'+esc(v)+'</div><div class="meta">'+esc(meta)+'</div></div>';
  }
  function smoothPath(pts){
    var d='M'+pts[0].x+','+pts[0].y+' ';
    for(var i=0;i<pts.length-1;i++){
      var p0=pts[i-1]||pts[i], p1=pts[i], p2=pts[i+1], p3=pts[i+2]||p2;
      d+='C'+(p1.x+(p2.x-p0.x)/6)+','+(p1.y+(p2.y-p0.y)/6)+' '+(p2.x-(p3.x-p1.x)/6)+','+(p2.y-(p3.y-p1.y)/6)+' '+p2.x+','+p2.y+' ';
    }
    return d;
  }
  function curveHtml(rows){
    var W=420,H=180,pl=40,pr=10,pt=18,pb=25,bal=0;
    var ser=[{sym:null,pnl:0,bal:0,time:'Day start'}];
    rows.forEach(function(t){ var p=Number(t.pnl); bal+=p; ser.push({sym:t.sym,side:t.side,pnl:p,bal:bal,time:String(t.t).slice(0,5)}); });
    var vals=ser.map(function(s){ return s.bal; });
    var mn=Math.min.apply(null,[0].concat(vals))-8, mx=Math.max.apply(null,vals)+8;
    var pts=ser.map(function(s,i){ return {x:pl+i*(W-pl-pr)/(ser.length-1), y:pt+(mx-s.bal)/(mx-mn)*(H-pt-pb), s:s}; });
    var line=smoothPath(pts), area=line+' L'+pts[pts.length-1].x+','+(H-pb)+' L'+pts[0].x+','+(H-pb)+' Z';
    var grid='';
    [mx,mx-(mx-mn)/3,mx-(mx-mn)*2/3,mn].forEach(function(v,i){
      var y=pt+(i*(H-pt-pb)/3);
      grid+='<line x1="'+pl+'" y1="'+y+'" x2="'+(W-pr)+'" y2="'+y+'"/><text x="0" y="'+(y+3)+'" class="chart-yl">'+(v>=0?'+$':'-$')+Math.abs(v).toFixed(0)+'</text>';
    });
    var dots='';
    pts.forEach(function(p,i){
      var c=p.s.sym===null?'var(--accent-2)':(p.s.pnl>=0?'var(--green)':'var(--red)');
      if(i===pts.length-1) dots+='<circle class="chart-pt-halo" cx="'+p.x+'" cy="'+p.y+'" r="4" stroke="'+c+'"/>';
      var tip=p.s.sym===null?'Day start':esc(p.s.sym)+' '+esc(p.s.side)+' '+money(p.s.pnl)+' · balance '+dollars(p.s.bal)+' · '+p.s.time;
      dots+='<circle class="chart-pt" cx="'+p.x+'" cy="'+p.y+'" r="3.5" fill="'+c+'"/><circle class="chart-hit" pointer-events="all" cx="'+p.x+'" cy="'+p.y+'" r="13"><title>'+tip+'</title></circle>';
    });
    var lo=Math.min.apply(null,vals), hi=Math.max.apply(null,vals);
    return '<div class="chart-wrap"><svg width="100%" height="180" viewBox="0 0 420 180"><defs><linearGradient id="rcg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--green)" stop-opacity=".3"/><stop offset="100%" stop-color="var(--green)" stop-opacity="0"/></linearGradient></defs><g class="chart-grid">'+grid+'</g><path d="'+area+'" fill="url(#rcg)" stroke="none"/><path class="chart-line" d="'+line+'"/>'+dots+'</svg></div>'+
      '<div class="chart-stats"><span class="s">Day low <b style="color:'+(lo<0?'var(--red)':'var(--green)')+'">'+dollars(lo)+'</b></span><span class="s">Day high <b style="color:'+(hi<0?'var(--red)':'var(--green)')+'">'+dollars(hi)+'</b></span></div>';
  }
  function render(key){
    var dt=parseKey(key); curKey=key;
    var long=dt.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric',timeZone:'UTC'});
    $('rcTitle').textContent=long; $('rcEyebrow').textContent='IST trading day · '+key;
    document.title=dt.toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'})+' recap — Journall';
    var rows=(window.__trades||[]).filter(function(t){ return t&&t.d===key&&isFinite(Number(t.pnl)); }).slice().sort(function(a,b){ return String(a.t).localeCompare(String(b.t)); });
    if(!rows.length){ $('rcSub').textContent='Day recap'; $('rcBody').innerHTML='<div class="panel glass"><div class="rc-empty">No trades logged on this day.</div></div>'; return; }
    var lossLimit=Number(window.jlDailyLossLimit)||0, tradeLimit=Number(window.jlMaxTradesPerDay)||0, target=Number(window.jlDayProfitTargetUSD)||Number(window.jlProfitTargetUSD)||0;
    var hasL=lossLimit>0, hasT=tradeLimit>0, hasTg=target>0;
    var seen={}; rows.forEach(function(t){ seen[t.d+'|'+t.t+'|'+t.sym+'|'+t.side]=1; });
    var tradeCount=Object.keys(seen).length;
    var wins=rows.filter(function(t){ return kind(t.pnl)==='win'; }), losses=rows.filter(function(t){ return kind(t.pnl)==='loss'; });
    var net=rows.reduce(function(s,t){ return s+Number(t.pnl); },0);
    var grossLossAmt=Math.abs(rows.reduce(function(s,t){ return Number(t.pnl)<0?s+Number(t.pnl):s; },0));
    var lossUsed=Math.max(0,-net);
    var grossWin=rows.reduce(function(s,t){ return Number(t.pnl)>0?s+Number(t.pnl):s; },0);
    var avgWin=wins.length?wins.reduce(function(s,t){ return s+Number(t.pnl); },0)/wins.length:0;
    var avgLoss=losses.length?Math.abs(losses.reduce(function(s,t){ return s+Number(t.pnl); },0))/losses.length:0;
    var pf=grossLossAmt?(grossWin/grossLossAmt).toFixed(2):'—';
    var exp=net/rows.length;
    var pct=hasTg?Math.min(100,Math.max(0,Math.round(net/target*100))):0;
    var lr=hasL?lossUsed/lossLimit:0;
    $('rcSub').textContent='Day recap · '+plural(tradeCount,'trade')+' · net '+money(net);

    var broken=[];
    if(hasL&&lossUsed>=lossLimit) broken.push('loss limit reached');
    if(hasT&&tradeCount>tradeLimit) broken.push('over the trade limit');
    var best=rows.reduce(function(a,b){ return Number(b.pnl)>Number(a.pnl)?b:a; }), worst=rows.reduce(function(a,b){ return Number(b.pnl)<Number(a.pnl)?b:a; });
    var journals=window.__getJournals?window.__getJournals():[];
    var jkey=function(t){ return t.d+' '+t.t+' '+t.side+' '+t.en+' '+t.pnl; };
    var jRows=rows.map(function(t){ return journals.find(function(e){ return e.key===jkey(t); }); });
    var emotions=jRows.map(function(j){ return j&&j.emotion; }).filter(Boolean);
    var mood='Not tracked';
    if(emotions.length){ var c={}; emotions.forEach(function(e){ c[e]=(c[e]||0)+1; }); mood=Object.keys(c).sort(function(a,b){ return c[b]-c[a]; })[0]; }
    var run=0,last=null;
    for(var i=rows.length-1;i>=0;i--){ var k=kind(rows[i].pnl); if(last===null) last=k; if(k!==last) break; run++; }
    var streak=last==='be'||last===null?'—':run+' '+(last==='win'?(run!==1?'wins':'win'):(run!==1?'losses':'loss'));

    var notes=[];
    var revenge=rows.filter(function(t){ return t.rev; }), noSl=rows.filter(function(t){ return t.sl==null; });
    if(revenge.length) notes.push(['var(--red)','Revenge trade flagged','Re-entered inside the cooldown window after a loss: '+plural(revenge.length,'trade')+'.']);
    if(noSl.length) notes.push(['var(--amber)','No stop-loss on '+plural(noSl.length,'trade'),'Set a stop before entry next time.']);
    var bySes={}; rows.forEach(function(t){ bySes[t.ses]=(bySes[t.ses]||0)+Number(t.pnl); });
    var sesKeys=Object.keys(bySes);
    if(sesKeys.length>1){ var ws=sesKeys.reduce(function(a,b){ return bySes[b]<bySes[a]?b:a; }); if(bySes[ws]<0) notes.push(['var(--amber)',esc(ws)+' was the weakest session',money(bySes[ws])+' across that session.']); }
    notes.push(['var(--accent-2)','Pace check',tradeCount+' of '+(hasT?tradeLimit:'not set')+' trades taken'+(hasTg?', '+pct+'% of the daily target.':'.')]);
    if(broken.length) notes.push(['var(--red)','Daily rule broken',broken.join(' and ').replace(/^./,function(m){ return m.toUpperCase(); })+'.']);

    var jn=jRows.filter(Boolean).length;
    var qlLk={};try{(JSON.parse(localStorage.getItem('viztrade_trading_page_trades')||'[]')||[]).forEach(function(q){if(q&&/^ql-/.test(String(q.id)))qlLk[window.JLAdapter.liveKey(q)]=q.id})}catch(_){console.debug('[journall] ignored error in day-recap.js:', _);}
    var hasQl=rows.some(function(t){ return t._lk!=null&&!!qlLk[t._lk]; });
    var rowsHtml=rows.map(function(t){
      var p=Number(t.pnl), idx=(window.__trades||[]).indexOf(t), qid=t._lk!=null?qlLk[t._lk]:null;
      return '<tr'+(idx>=0?' data-i="'+idx+'" title="Open this trade in the Journal"':'')+'><td>'+(window.iconFor?window.iconFor(t.sym):'')+'</td><td class="mono">'+esc(String(t.t).slice(0,5))+'</td><td style="font-weight:600">'+esc(t.sym)+'</td>'+
        '<td><span class="side-tag '+(t.side==='BUY'?'long':'short')+'">'+(t.side==='BUY'?'Long':'Short')+'</span></td><td style="color:var(--faint)">'+esc(t.ses)+'</td>'+
        '<td class="mono">'+fixed(t.en)+'</td><td class="mono">'+fixed(t.ex)+'</td><td style="color:var(--faint)">Not tracked</td>'+
        '<td class="mono" style="color:'+(p>=0?'var(--green)':'var(--red)')+';font-weight:650">'+(p>=0?'+':'')+'$'+p.toFixed(2)+'</td><td style="color:var(--sub)">'+esc(WHY[t.why]||'—')+'</td>'+(hasQl?'<td>'+(qid?'<span class="rc-ql"><button type="button" class="btn-ghost" data-qled="'+esc(qid)+'">Edit trade</button><button type="button" class="btn-ghost rc-ql-del" data-qldel="'+esc(qid)+'">Delete trade</button></span>':'')+'</td>':'')+'</tr>';
    }).join('');

    $('rcBody').innerHTML=
      '<div class="rings">'+
        ringCard('Day P&amp;L',dollars(net),net<0?'var(--red)':'',hasTg?pct+'% of '+'$'+target.toFixed(0)+' daily target':'Profit target not set','<span class="tag win">'+wins.length+'W</span><span class="tag loss">'+losses.length+'L</span>',pct/100,net<0?'var(--red)':'var(--green)')+
        ringCard('Day loss used','$'+lossUsed.toFixed(2)+' / '+(hasL?'$'+lossLimit.toFixed(0):'not set'),'',hasL?'$'+Math.max(0,lossLimit-lossUsed).toFixed(2)+' room left':'No loss limit set',esc(plural(losses.length,'losing trade')),lr,lr>.9?'var(--red)':lr>=.6?'var(--warn)':'var(--green)')+
        ringCard('Day trades',tradeCount+' / '+(hasT?tradeLimit:'not set'),'',broken.length?broken.join(' and ').replace(/^./,function(m){ return m.toUpperCase(); }):'Within the daily rules',hasT?(tradeCount<=tradeLimit?Math.max(0,tradeLimit-tradeCount)+' slots were left':(tradeCount-tradeLimit)+' over the limit'):'No trade limit set',hasT?tradeCount/tradeLimit:0,'var(--accent-2)')+
      '</div>'+
      '<div class="row4">'+
        card('Rules',broken.length?'Rule broken':(hasL||hasT?'Rules kept':'No limits set'),broken.length?broken.join(' and '):(hasL||hasT?'Stayed inside the daily limits':'Set limits in Account Settings'),broken.length?'var(--red)':'')+
        card('Best trade',esc(best.sym)+' '+money(Number(best.pnl)),String(best.t).slice(0,5)+' · '+(best.side==='BUY'?'Long':'Short'),Number(best.pnl)>0?'var(--green)':'')+
        card('Worst trade',esc(worst.sym)+' '+money(Number(worst.pnl)),String(worst.t).slice(0,5)+' · '+(worst.side==='BUY'?'Long':'Short'),Number(worst.pnl)<0?'var(--red)':'')+
        card('Feeling',mood,jn+' of '+plural(rows.length,'trade')+' journaled')+
      '</div>'+
      '<div class="split"><div class="panel glass"><div class="panel-head"><div class="a-s-ttl"><span class="a-s-ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></svg></span><h2>Day notes</h2></div><span class="hint">'+plural(notes.length,'insight')+'</span></div>'+
        notes.map(function(n){ return '<div class="note-item"><div class="note-dot" style="background:'+n[0]+'"></div><div><div class="t">'+n[1]+'</div><div class="s">'+esc(n[2])+'</div></div></div>'; }).join('')+'</div>'+
      '<div class="panel glass"><div class="panel-head"><div class="a-s-ttl"><span class="a-s-ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3v18h18M7 14l4-4 3 3 5-6"/></svg></span><h2>Day equity curve</h2></div><span class="hint">Hover a point for detail</span></div>'+curveHtml(rows)+'</div></div>'+
      '<div class="panel glass" style="margin-bottom:14px"><div class="panel-head"><div class="a-s-ttl"><span class="a-s-ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v16M6 20h12M5 8h14M5 8l-2.5 6a3 3 0 0 0 5 0zM19 8l-2.5 6a3 3 0 0 0 5 0z"/></svg></span><h2>Risk / reward — this day</h2></div><span class="hint">Session view</span></div><div class="rr-grid">'+
        '<div class="rr-tile"><div class="l">Avg win / avg loss</div><div class="v">$'+avgWin.toFixed(2)+' / $'+avgLoss.toFixed(2)+'</div></div>'+
        '<div class="rr-tile"><div class="l">Of daily target</div><div class="v">'+(hasTg?pct+'%':'—')+'</div></div>'+
        '<div class="rr-tile"><div class="l">Profit factor</div><div class="v">'+pf+'</div></div>'+
        '<div class="rr-tile"><div class="l">Expectancy / trade</div><div class="v">'+(exp>=0?'+$':'-$')+Math.abs(exp).toFixed(2)+'</div></div>'+
        '<div class="rr-tile"><div class="l">Mood</div><div class="v">'+esc(mood)+'</div></div>'+
        '<div class="rr-tile"><div class="l">Ending streak</div><div class="v">'+streak+'</div></div>'+
      '</div></div>'+
      '<div class="panel glass rc-sim" id="rcSim">'+simHtml(key)+'</div>'+(function(){var h=typeof window.jlDjView==='function'?window.jlDjView(key):'';return h?'<div class="panel glass" id="rcDj">'+h+'</div>':''})()+
      '<div class="panel glass"><div class="tbl-head"><h2 style="margin:0">Trades this day</h2><span class="pill">'+plural(rows.length,'trade')+'</span></div><div style="overflow-x:auto"><table><thead><tr><th style="width:32px"></th><th>Time</th><th>Symbol</th><th>Side</th><th>Session</th><th>Entry</th><th>Exit</th><th>Duration</th><th>P&amp;L</th><th>Reason</th>'+(hasQl?'<th></th>':'')+'</tr></thead><tbody>'+rowsHtml+'</tbody></table></div></div>';
  }
  function show(){
    document.querySelectorAll('.view').forEach(function(s){ s.hidden=s.id!=='view-recap'; });
    document.querySelectorAll('.nav[data-view]').forEach(function(x){ var on=x.dataset.view==='calendar'; x.classList.toggle('active',on); if(on) x.setAttribute('aria-current','page'); else x.removeAttribute('aria-current'); });
    window.scrollTo(0,0);
  }
  function back(){ if(window.__route) window.__route('calendar'); }
  window.__openDayRecap=function(key){ if(!/^\d{4}-\d{2}-\d{2}$/.test(String(key))) return; render(key); show(); };
  $('rcBack').addEventListener('click',back);
  document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&!view.hidden) back(); });
  $('rcBody').addEventListener('click',function(e){
    var qb=e.target.closest('[data-qled],[data-qldel]');
    if(qb){ var qf=qb.hasAttribute('data-qled')?window.qlEditTrade:window.qlDeleteTrade; if(typeof qf==='function') qf(qb.getAttribute('data-qled')||qb.getAttribute('data-qldel'),qb); return; }
    var chip=e.target.closest('[data-simp]');
    if(chip){ simP=chip.getAttribute('data-simp'); var host=$('rcSim'); if(host&&curKey) host.innerHTML=simHtml(curKey); return; }
    var tr=e.target.closest('tr[data-i]'); if(!tr) return;
    var idx=+tr.dataset.i;
    if(window.__route) window.__route('journal');
    try{ history.replaceState(null,'','#journal'); }catch(_){console.debug('[journall] ignored error in day-recap.js:', _);}
    if(window.__jPick) window.__jPick(idx);
  });
})();
