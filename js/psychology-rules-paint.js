(function(){window.jlPaintRules=function(){const s=(id,t)=>{const e=document.getElementById(id);if(e)e.textContent=t},L=Number(window.jlDailyLossLimit)||0,N=Number(window.jlMaxTradesPerDay)||0,R=Number(window.jlRevWindowMin)||0;
  s('psyRlLoss',L>0?'$'+L.toFixed(2)+' \u2014 trading stops the moment you hit it.':'Not set. Add it in Account Settings.');
  s('psyRlTrades',N>0?N+' \u2014 quality over volume, every session.':'Not set. Add it in Account Settings.');
  s('psyRlCool',R>0?R+' minutes minimum, chart closed, no exceptions.':'Not set. Add it in Account Settings.')};
  window.jlPaintRules()})();
