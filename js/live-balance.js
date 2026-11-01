/* Current balance: use the last MT5 sync (within 24h) when there is one, else starting balance + imported net P&L. */
window.jlLiveBalance=function(Z){
  var start=(Z&&Z.start)||0,base=start+((Z&&Z.net)||0);
  try{
    var c=JSON.parse(localStorage.getItem('journall_account_config_v1')||'null');
    var v=c&&c.mt5BalanceSource==='mt5'?Number(c.mt5CurrentBalance):NaN;
    var age=c?Date.now()-Number(c.mt5BalanceTimestamp||0):Infinity;
    if(start>0&&isFinite(v)&&v>0&&age>=0&&age<86400000)return v;
  }catch(e){}
  return base;
};
