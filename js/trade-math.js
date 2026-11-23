/* Pure trade and trading-day math moved out of js/todays-summary.js. No DOM, no storage, no globals read.
   Function bodies are verbatim copies (revStats, overStats, weakTimes) or the old bodies with the clock and
   the trades passed in as arguments (tradingDayIST, msUntilRuleReset, weekLoss), so they can be tested alone. */
(function(){
  /*RV-PURE-START*/
  function revStats(T){
    const rev=[],rest=[];
    (T||[]).forEach(t=>{(t&&t.rev?rev:rest).push(t)});
    const sum=a=>a.reduce((x,t)=>x+(Number(t.pnl)||0),0);
    const lots=a=>a.map(t=>Number(t.lot)).filter(v=>isFinite(v)&&v>0);
    const avg=a=>{const l=lots(a);return l.length?l.reduce((x,v)=>x+v,0)/l.length:null};
    return {n:rev.length,total:rev.length+rest.length,net:sum(rev),lotRev:avg(rev),lotRest:avg(rest)};
  }
  /*RV-PURE-END*/
  /*OV-PURE-START*/
  function overStats(T,limit){
    limit=Number(limit)||0;
    if(!(limit>0))return {on:false,limit:0};
    var days={},order=[];
    (T||[]).forEach(function(t){
      if(!t||!t.d)return;
      var d=days[t.d];if(!d){d=days[t.d]={keys:{},net:0};order.push(t.d)}
      d.keys[t.d+'|'+t.t+'|'+t.sym+'|'+t.side]=1;
      d.net+=Number(t.pnl)||0;
    });
    var over=0,other=0,netOver=0,netOther=0;
    order.forEach(function(k){
      var d=days[k];
      if(Object.keys(d.keys).length>=limit){over++;netOver+=d.net}else{other++;netOther+=d.net}
    });
    return {on:true,limit:limit,days:order.length,n:over,otherDays:other,netOver:netOver,netOther:netOther,
      avgOver:over?netOver/over:null,avgOther:other?netOther/other:null};
  }
  /*OV-PURE-END*/
  /*WT-PURE-START*/
  function weakTimes(T,minTrades,off){
    minTrades=Number(minTrades)||3;
    var hasOff=off!=null&&off!==''&&isFinite(Number(off));off=hasOff?Number(off):null;
    var DN=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],pos={},order=[],raw=0;
    (T||[]).forEach(function(t){
      if(!t||!t.d||t.t==null)return;
      var d=String(t.d),tm=String(t.t),h=parseInt(tm.slice(0,2),10),dt=new Date(d+'T00:00:00Z');
      if(!isFinite(h)||isNaN(dt.getTime()))return;
      var dow=DN[dt.getUTCDay()];
      if(t._bt){
        if(hasOff){
          var ms=Date.parse(d+'T'+(tm.length===5?tm+':00':tm.slice(0,8))+'Z');
          if(!isFinite(ms))return;
          var s=new Date(ms-off*3600000+19800000);
          h=s.getUTCHours();dow=DN[s.getUTCDay()];
        } else raw++;
      }
      var k=t.d+'|'+t.t+'|'+t.sym+'|'+t.side,p=pos[k];
      if(!p){p=pos[k]={h:h,dow:dow,net:0};order.push(k)}
      p.net+=Number(t.pnl)||0;
    });
    var byD={},byH={};
    order.forEach(function(k){
      var p=pos[k],a=byD[p.dow]||(byD[p.dow]={k:p.dow,n:0,net:0}),b=byH[p.h]||(byH[p.h]={k:p.h,n:0,net:0});
      a.n++;a.net+=p.net;b.n++;b.net+=p.net;
    });
    var flag=function(o){return Object.keys(o).map(function(x){return o[x]}).filter(function(x){return x.n>=minTrades&&x.net<-0.005}).sort(function(a,b){return a.net-b.net})};
    var paused=raw>0,totNet=0;order.forEach(function(k){totNet+=pos[k].net});
    return {total:order.length,avg:order.length?totNet/order.length:0,days:flag(byD),hours:paused?[]:flag(byH),paused:paused};
  }
  /*WT-PURE-END*/

  var IST_OFFSET_MS = 5.5 * 60 * 60 * 1000, RESET_HOUR_IST = 6;
  /* trading day = calendar day in IST, rolling over at 06:00 IST (same as the prop-firm reset) */
  function tradingDayIST(nowMs){
    const shifted = new Date(nowMs + IST_OFFSET_MS);
    if(shifted.getUTCHours() < RESET_HOUR_IST) shifted.setUTCDate(shifted.getUTCDate()-1);
    const pad = n => String(n).padStart(2,'0');
    return shifted.getUTCFullYear()+'-'+pad(shifted.getUTCMonth()+1)+'-'+pad(shifted.getUTCDate());
  }
  function msUntilRuleReset(nowMs){
    const istShifted = new Date(nowMs + IST_OFFSET_MS);
    let resetAsUtc = Date.UTC(
      istShifted.getUTCFullYear(), istShifted.getUTCMonth(), istShifted.getUTCDate(), RESET_HOUR_IST, 0, 0
    ) - IST_OFFSET_MS;
    if(resetAsUtc <= nowMs) resetAsUtc += 24*60*60*1000;
    return resetAsUtc - nowMs;
  }
  /* Net P&L for the week (Monday-Sunday IST) containing todayKey (YYYY-MM-DD); only a net loss counts. */
  function weekLoss(trades, todayKey){
    const b = (function(){ const today = todayKey, p = today.split('-').map(Number), dt = new Date(Date.UTC(p[0],p[1]-1,p[2])), dow = (dt.getUTCDay()+6)%7;
      return {ws:new Date(dt.getTime()-dow*864e5).toISOString().slice(0,10), we:new Date(dt.getTime()+(6-dow)*864e5).toISOString().slice(0,10)}; })();
    const net = (trades||[]).reduce((s,t)=>(t && t.d && t.d>=b.ws && t.d<=b.we) ? s + (Number(t.pnl)||0) : s, 0);
    return Math.max(0, -net);
  }
  window.JLMath = Object.freeze({revStats:revStats, overStats:overStats, weakTimes:weakTimes, tradingDayIST:tradingDayIST, msUntilRuleReset:msUntilRuleReset, weekLoss:weekLoss});
})();
