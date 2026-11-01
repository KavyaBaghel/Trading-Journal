(function(){
/*CB-PURE-START*/
function circuitEval(rows,o,kindFn){
  var g={},order=[],netSum=0,lossUsed=0,dirNet={BUY:0,SELL:0};
  (rows||[]).forEach(function(t){
    if(!t)return;var p=Number(t.pnl);if(!isFinite(p))return;
    netSum+=p;
    var sd=String(t.side||'').toUpperCase();if(sd==='BUY'||sd==='SELL')dirNet[sd]+=p;
    var k=t.d+'|'+t.t+'|'+t.sym+'|'+t.side;
    if(!g[k]){g[k]={t:String(t.t),pnl:0,rev:false};order.push(k)}
    g[k].pnl+=p;if(t.rev)g[k].rev=true;
  });
  lossUsed=Math.max(0,-netSum);
  var list=order.map(function(k){return g[k]}).sort(function(a,b){return a.t<b.t?-1:a.t>b.t?1:0});
  var count=list.length,run=0,revN=list.filter(function(x){return x.rev}).length;
  for(var i=list.length-1;i>=0;i--){if(kindFn(list[i].pnl)==='loss')run++;else break}
  var why=[],sdSide=dirNet.BUY<=dirNet.SELL?'BUY':'SELL',sdLoss=Math.max(0,-dirNet[sdSide]);
  if(o.lossLimit>0&&lossUsed>=o.lossLimit)why.push('Daily loss limit reached ($'+lossUsed.toFixed(2)+' of $'+o.lossLimit.toFixed(2)+')');
  if(o.tradeLimit>0&&count>=o.tradeLimit)why.push('Daily trade limit reached ('+count+' of '+o.tradeLimit+')');
  if(o.maxConsec>0&&run>=o.maxConsec)why.push(run+' losing trades in a row (limit '+o.maxConsec+')');
  if(o.revLimit>0&&revN>=o.revLimit)why.push('Revenge trading: '+revN+' trades opened soon after a loss (limit '+o.revLimit+')');
  if(o.sameDirLimit>0&&sdLoss>=o.sameDirLimit)why.push('Same-direction loss cap reached ('+sdSide+' trades down $'+sdLoss.toFixed(2)+' of $'+o.sameDirLimit.toFixed(2)+')');
  return{tripped:why.length>0,why:why,count:count,lossUsed:lossUsed,run:run,revN:revN,sdSide:sdSide,sdLoss:sdLoss};
}
function msUntilReset(nowMs){
  var IST=5.5*3600000,s=new Date(nowMs+IST);
  var r=Date.UTC(s.getUTCFullYear(),s.getUTCMonth(),s.getUTCDate(),6,0,0)-IST;
  if(r<=nowMs)r+=86400000;return r-nowMs;
}
function fmtWait(ms){var m=Math.max(1,Math.ceil(ms/60000)),h=Math.floor(m/60);return h?h+'h '+(m%60)+'m':m+'m'}
function fridayEval(nowMs,cutoff,leadMin){
  var m=/^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(cutoff||''));if(!m)return{show:false};
  var s=new Date(nowMs+19800000);if(s.getUTCDay()!==5)return{show:false};
  var cm=+m[1]*60+ +m[2],now=s.getUTCHours()*60+s.getUTCMinutes();
  if(now>=cm-leadMin&&now<cm)return{show:true,left:cm-now,cutoff:cutoff};
  return{show:false};
}
function weakNowEval(st,nowMs){
  var DN=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],s=new Date(nowMs+19800000),h=s.getUTCHours(),dw=DN[s.getUTCDay()],parts=[];
  var m=function(x){return (x.net<0?'-':'')+'$'+Math.abs(x.net).toFixed(2)};
  var av=function(v){return (v<0?'-':'')+'$'+Math.abs(v).toFixed(2)};
  ((st&&st.days)||[]).forEach(function(x){if(x.k!==dw)return;var hasAvg=st&&typeof st.avg==='number';if(hasAvg&&!(x.net/x.n<st.avg))return;parts.push(dw+' is a weak weekday for you: net '+m(x)+' over '+x.n+' trades'+(hasAvg?' (avg '+av(x.net/x.n)+' per trade vs '+av(st.avg)+' for all days)':''))});
  ((st&&st.hours)||[]).forEach(function(x){if(x.k!==h)return;var hasAvg=st&&typeof st.avg==='number';if(hasAvg&&!(x.net/x.n<st.avg))return;parts.push('The '+String(h).padStart(2,'0')+':00 IST hour is weak for you: net '+m(x)+' over '+x.n+' trades'+(hasAvg?' (avg '+av(x.net/x.n)+' per trade vs '+av(st.avg)+' for all hours)':''))});
  return{warn:parts.length>0,parts:parts,hour:h,dow:dw};
}
/*CB-PURE-END*/
function weakNow(){
  try{
    if(typeof window.jlWeakTimes!=='function')return{warn:false,parts:[]};
    var off=null;
    try{var s=JSON.parse(localStorage.getItem('jlAccountSettings')||'null');if(s&&s.brokerUtcOffset!==''&&s.brokerUtcOffset!=null&&isFinite(Number(s.brokerUtcOffset)))off=Number(s.brokerUtcOffset)}catch(e){}
    return weakNowEval(window.jlWeakTimes(window.__trades||[],3,off),Date.now());
  }catch(e){return{warn:false,parts:[]}}
}
var SNZ_KEY='jlWeakSnoozeUntil',SNZ_MS=6*3600000,CB_KEY='jlCircuitDismissed',cbCur={day:'',sig:''};
function weakSnoozed(){try{return Number(localStorage.getItem(SNZ_KEY)||0)>Date.now()}catch(e){return false}}
function cbDismissed(day,sig){try{var o=JSON.parse(localStorage.getItem(CB_KEY)||'null');return !!o&&o.day===day&&o.sig===sig}catch(e){return false}}
function cbSig(why){return (why||[]).map(function(w){return String(w).split(' (')[0].replace(/\d+/g,'#')}).join('|')}
function paint(){
  var el=document.getElementById('jlCircuit');if(!el)return;
  var key=typeof window.getTradingDayIST==='function'?window.getTradingDayIST():'';
  var rows=(window.__trades||[]).filter(function(t){return t&&t.d===key});
  var kindFn=typeof window.jlKind==='function'?window.jlKind:function(p){return p<0?'loss':p>0?'win':'be'};
  var r=circuitEval(rows,{lossLimit:Number(window.jlDailyLossLimit)||0,tradeLimit:Number(window.jlMaxTradesPerDay)||0,maxConsec:Number(window.jlMaxConsecLosses)||0,revLimit:Number(window.jlMaxRevengeTrades)||0,sameDirLimit:Number(window.jlSameDirLossLimit)||0},kindFn);
  var ttl=document.getElementById('jlCircuitTitle');
  var xb=document.getElementById('jlCircuitX');if(xb)xb.hidden=true;
  if(!r.tripped){
    var fr=fridayEval(Date.now(),window.jlFridayCutoff,30);
    if(fr.show){
      if(ttl)ttl.textContent='Friday close soon';
      document.getElementById('jlCircuitWhy').textContent='Friday cutoff is '+fr.cutoff+' IST, in '+fr.left+' min. Close or manage open positions now.';
      document.getElementById('jlCircuitWait').textContent='Nothing is closed automatically. The journal only warns.';
      el.hidden=false;return;
    }
    var wk=weakNow();
    if(wk.warn&&weakSnoozed()){el.hidden=true;return;}
    if(wk.warn){
      if(ttl)ttl.textContent='Weak time to trade';
      document.getElementById('jlCircuitWhy').textContent=wk.parts.join('. ')+'.';
      document.getElementById('jlCircuitWait').textContent='Based on your past trades. Nothing is blocked.';
      if(xb){xb.dataset.mode='weak';xb.setAttribute('aria-label','Snooze this warning for 6 hours');xb.title='Snooze for 6 hours';xb.hidden=false}
      el.hidden=false;return;
    }
    el.hidden=true;return;
  }
  var sig=cbSig(r.why),dayKey=key||new Date().toISOString().slice(0,10);
  cbCur={day:dayKey,sig:sig};
  if(cbDismissed(dayKey,sig)){el.hidden=true;return;}
  if(ttl)ttl.textContent='Circuit breaker tripped';
  document.getElementById('jlCircuitWhy').textContent=r.why.join('. ')+'.';
  document.getElementById('jlCircuitWait').textContent='Stay out of the market until the 06:00 IST reset, in '+fmtWait(msUntilReset(Date.now()))+'.';
  if(xb){xb.dataset.mode='cb';xb.setAttribute('aria-label','Hide this warning until the 06:00 IST reset');xb.title='Hide until the 06:00 IST reset';xb.hidden=false}
  el.hidden=false;
}
(function(){var xb=document.getElementById('jlCircuitX');if(!xb)return;xb.addEventListener('click',function(){
  if(xb.dataset.mode==='cb'){
    if(!window.confirm('Hide this "Circuit breaker tripped" banner until the 06:00 IST reset? It comes back if another rule trips. Nothing is blocked either way.'))return;
    try{localStorage.setItem(CB_KEY,JSON.stringify({day:cbCur.day,sig:cbCur.sig}))}catch(e){}
  }else{
    if(!window.confirm('Snooze this "Weak time to trade" warning for 6 hours?'))return;
    try{localStorage.setItem(SNZ_KEY,String(Date.now()+SNZ_MS))}catch(e){}
  }
  paint();
})})();
window.jlCircuitRefresh=paint;window.jlCircuitEval=circuitEval;window.jlFridayEval=fridayEval;
setInterval(paint,15000);setTimeout(paint,1500);setTimeout(paint,5000);
})();
