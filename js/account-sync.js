/* Step 3.4: account settings. Live journall_account_config_v1 <-> design jlAccountSettings (derived, unsynced cache). */
(function(){
  var CK=JL_KEYS.keys.JOURNALL_ACCOUNT_CONFIG_V1,DK=JL_KEYS.keys.JL_ACCOUNT_SETTINGS;
  function rdo(){try{var v=JSON.parse(localStorage.getItem(CK)||'null');return v&&typeof v==='object'&&!Array.isArray(v)?v:null}catch(e){return null}}
  var r4=function(x){return Math.round(x*10000)/10000},n=function(x){x=Number(x);return isFinite(x)?x:null};
  function toDesign(c){c=c||{};var size=n(c.accountSize);size=size>0?size:null;
    var pt=n(c.profitTarget),pl=n(c.maxDailyLoss),wk=n(c.maxWeeklyLoss),dd=n(c.maxDrawdown);
    return {balance:size,phase:c.phase||'',type:c.type==='live'?'live':c.type==='funded'?'funded':'',revWindowMin:n(c.revWindowMin),
      profitTargetPct:pt==null?null:(c.profitTargetType==='amount'?(size?r4(pt/size*100):null):pt),
      maxDailyLossUSD:pl==null?null:(c.maxDailyLossType==='percent'?(size?r4(pl*size/100):null):pl),maxDailyLossValue:pl,maxDailyLossUnit:c.maxDailyLossType==='percent'?'%':'$',
      maxWeeklyLossValue:wk,maxWeeklyLossUnit:c.maxWeeklyLossType==='percent'?'%':'$',maxWeeklyLossUSD:wk==null?null:(c.maxWeeklyLossType==='percent'?(size?r4(wk*size/100):null):wk),
      maxTradesPerDay:n(c.maxTradesPerDay),dayProfitTarget:n(c.dayProfitTarget)||0,dayProfitTargetUnit:c.dayProfitTargetUnit==='$'?'$':'%',weeklyProfitTarget:n(c.weeklyProfitTarget)||0,weeklyProfitTargetUnit:c.weeklyProfitTargetUnit==='$'?'$':'%',riskPerTrade:n(c.riskPerTrade),minRr:n(c.minRr),lotSize:n(c.lotSize)||0,tradeDuringNews:c.tradeDuringNews==='no'?'no':c.tradeDuringNews==='yes'?'yes':'',maxDrawdown:dd,maxDrawdownUnit:c.maxDrawdownType==='amount'?'$':'%',deadline:c.phaseDeadline||''}}
  try{var c0=rdo();localStorage.setItem(DK,JSON.stringify(toDesign(c0)));window.__jlNeedsAccountSetup=!(c0&&n(c0.accountSize)>0)}
  catch(e){window.__jlNeedsAccountSetup=true;console.error('[Journall] account bootstrap failed',e)}
  function same(a,b,ks){return ks.every(function(k){return a[k]===b[k]||(typeof a[k]==='number'&&typeof b[k]==='number'&&Math.abs(a[k]-b[k])<1e-4)})}
  function writeBack(v){
    try{
      var d=JSON.parse(v);if(!d||typeof d!=='object')return;
      var o=rdo(),c=o?JSON.parse(JSON.stringify(o)):{},old=toDesign(o),size=n(d.balance);size=size>0?size:null;
      if(!same(d,old,['balance'])){if(size)c.accountSize=size}
      if(!same(d,old,['profitTargetPct'])){var pt=n(d.profitTargetPct);if(pt!=null){if(c.profitTargetType==='amount'&&size){c.profitTarget=r4(pt*size/100)}else{c.profitTarget=pt;c.profitTargetType='percent'}}}
      if(d.maxDailyLossValue!==undefined&&!same(d,old,['maxDailyLossValue','maxDailyLossUnit'])){var pv=n(d.maxDailyLossValue);if(pv!=null){c.maxDailyLoss=pv;c.maxDailyLossType=d.maxDailyLossUnit==='%'?'percent':'amount'}}
      else if(!same(d,old,['maxDailyLossUSD'])){var pl=n(d.maxDailyLossUSD);if(pl!=null){if(c.maxDailyLossType==='percent'&&size){c.maxDailyLoss=r4(pl/size*100)}else{c.maxDailyLoss=pl;c.maxDailyLossType='amount'}}}
      if(d.maxWeeklyLossValue!==undefined&&!same(d,old,['maxWeeklyLossValue','maxWeeklyLossUnit'])){var wv=n(d.maxWeeklyLossValue);if(wv!=null){c.maxWeeklyLoss=wv;c.maxWeeklyLossType=d.maxWeeklyLossUnit==='%'?'percent':'amount'}}
      if(!same(d,old,['maxDrawdown'])||d.maxDrawdownUnit!==old.maxDrawdownUnit){var dd=n(d.maxDrawdown);if(dd!=null){c.maxDrawdown=dd;c.maxDrawdownType=d.maxDrawdownUnit==='$'?'amount':'percent'}}
      if(!same(d,old,['maxTradesPerDay'])){var mt=n(d.maxTradesPerDay);if(mt!=null)c.maxTradesPerDay=mt}
      if(!same(d,old,['dayProfitTarget'])){var dp=n(d.dayProfitTarget);if(dp!=null)c.dayProfitTarget=dp}
      if(d.dayProfitTargetUnit!==old.dayProfitTargetUnit)c.dayProfitTargetUnit=d.dayProfitTargetUnit==='$'?'$':'%';
      if(!same(d,old,['weeklyProfitTarget'])){var wp=n(d.weeklyProfitTarget);if(wp!=null)c.weeklyProfitTarget=wp}
      if(d.weeklyProfitTargetUnit!==old.weeklyProfitTargetUnit)c.weeklyProfitTargetUnit=d.weeklyProfitTargetUnit==='$'?'$':'%';
      if(!same(d,old,['riskPerTrade'])){var rp=n(d.riskPerTrade);if(rp!=null)c.riskPerTrade=rp}
      if(!same(d,old,['minRr'])){var mr=n(d.minRr);if(mr!=null)c.minRr=mr}
      if(!same(d,old,['lotSize'])){var ls=n(d.lotSize);if(ls!=null)c.lotSize=ls}
      if(d.tradeDuringNews!==old.tradeDuringNews)c.tradeDuringNews=d.tradeDuringNews==='no'?'no':d.tradeDuringNews==='yes'?'yes':'';
      if(!same(d,old,['deadline'])){c.phaseDeadline=d.deadline||''}
      if(d.type!==old.type)c.type=d.type;
      if((d.phase||'')!==(old.phase||''))c.phase=d.phase||'';
      if(!same(d,old,['revWindowMin'])){var rw=n(d.revWindowMin);if(rw!=null)c.revWindowMin=rw}
      if(!o&&Object.keys(c).length&&d.phase)c.phase=d.phase;   // new config: carry phase only if the user actually set something
      var next=JSON.stringify(c);if(Object.keys(c).length&&next!==JSON.stringify(o||null)){localStorage.setItem(CK,next);window.__jlNeedsAccountSetup=!(n(c.accountSize)>0)}
    }catch(e){console.error('[Journall] account write-back failed',e)}
  }
  var prev=Storage.prototype.setItem;
  Storage.prototype.setItem=function(k,v){prev.call(this,k,v);if(this===localStorage&&k===DK)writeBack(v)};
})();
