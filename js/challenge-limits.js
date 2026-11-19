(function(){
/* Per-challenge limits: the challenge whose dates include today can carry its own daily loss, max loss and target (percent of the
   Account Settings initial balance). A box left empty keeps the Account Settings value. Nothing here is assumed or defaulted. */
/*CL-PURE-START*/
function dateOk(s){return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)}
function pctOrNull(v){var x=Number(v);return(v!==''&&v!=null&&isFinite(x)&&x>0&&x<=100)?Math.round(x*100)/100:null}
function activeCh(list,today){if(!Array.isArray(list)||!dateOk(today))return null;var best=null;
  list.forEach(function(c){if(!c||typeof c!=='object'||typeof c.name!=='string'||!c.name.trim()||!dateOk(c.start)||(c.end&&(!dateOk(c.end)||c.end<c.start)))return;
    if(c.start>today||(c.end&&c.end<today))return;if(!best||c.start>best.start)best=c});return best}
function chLims(c){if(!c)return null;var o={dl:pctOrNull(c.dl),md:pctOrNull(c.md),pt:pctOrNull(c.pt)};return(o.dl||o.md||o.pt)?o:null}
function usd(bal,pct){return Math.round(bal*pct)/100}
function effective(acc,bal,lims){var bd=Number(acc&&acc.maxDailyLossUSD)||0,bp=bal*(Number(acc&&acc.profitTargetPct)||0)/100;
  return{dlUSD:(lims&&lims.dl)?usd(bal,lims.dl):bd,ptUSD:(lims&&lims.pt)?usd(bal,lims.pt):bp,mddPct:(lims&&lims.md)||0}}
/*CL-PURE-END*/
function tday(){var d=new Date(Date.now()+5.5*3600000);if(d.getUTCHours()<6)d.setUTCDate(d.getUTCDate()-1);var q=function(n){return String(n).padStart(2,'0')};return d.getUTCFullYear()+'-'+q(d.getUTCMonth()+1)+'-'+q(d.getUTCDate())}
function rd(k){try{return JSON.parse(localStorage.getItem(k))}catch(_){return null}}
var lastSig='',had=false;
window.jlApplyChLimits=function(o){
  var today=(typeof window.getTradingDayIST==='function')?window.getTradingDayIST():tday(),acc=rd(JL_KEYS.keys.JL_ACCOUNT_SETTINGS);if(!acc||typeof acc!=='object')acc={};
  var bal=Number(acc.balance)||Number(window.jlStartBalance)||0,ch=bal>0?activeCh(rd(JL_KEYS.keys.JOURNALL_CHALLENGES_V1),today):null,lims=chLims(ch),e=effective(acc,bal,lims);
  if(lims||had){window.jlDailyLossLimit=e.dlUSD;window.jlProfitTargetUSD=e.ptUSD}
  had=!!lims;window.jlChMddPct=e.mddPct;window.jlChInfo=lims?{name:ch.name.trim(),dl:lims.dl,md:lims.md,pt:lims.pt}:null;
  var sig=JSON.stringify([e.dlUSD,e.ptUSD,e.mddPct,lims?1:0]),changed=sig!==lastSig;lastSig=sig;
  if(changed&&!(o&&o.noRefresh)&&typeof window.jlRefreshLimitViews==='function')window.jlRefreshLimitViews();
  return window.jlChInfo};
})();
