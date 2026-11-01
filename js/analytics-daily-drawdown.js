(function(){
/* Analytics > Daily drawdown card: limit from the saved setup, used = net loss of the current
   trading day on closed trades (same 06:00 IST rule as Today's Summary and Account Settings). */
function render(){
  const $=id=>document.getElementById(id); if(!$('ddBig')) return;
  const lim=Number(window.jlDailyLossLimit)||0;
  const key=typeof window.getTradingDayIST==='function'?window.getTradingDayIST():'';
  const today=(window.__trades||[]).filter(t=>t&&t.d===key);
  const used=Math.max(0,-today.reduce((a,t)=>a+(Number(t.pnl)||0),0));
  const left=Math.max(0,lim-used),pct=lim>0?Math.min(100,used/lim*100):0,hit=lim>0&&used>=lim,usd=n=>'$'+n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  const m=/^(\d+)-(\d+)-(\d+)$/.exec(key),d=m?new Date(+m[1],+m[2]-1,+m[3]):new Date();
  $('ddDate').textContent=d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
  $('ddCnt').textContent=today.length+(today.length===1?' trade':' trades');
  $('ddBig').textContent=usd(used);$('ddBig').style.color=used>0?'var(--red)':'var(--green)';
  const b=$('ddBadge');b.textContent=lim>0?(hit?'Limit reached':Math.round(pct)+'% used'):'No limit set';b.classList.toggle('ok',!hit);
  const bar=$('ddBar');bar.style.width=pct+'%';bar.style.background=hit?'linear-gradient(90deg,var(--red),#c94b40)':'';bar.style.boxShadow=hit?'0 0 10px rgba(240,104,92,.5)':'';
  $('ddNote').textContent=!(lim>0)?'No daily loss limit set in Account Settings':hit?'Limit reached \u00b7 '+usd(used)+' used of '+usd(lim):usd(left)+' of room left under your '+usd(lim)+' limit';
}
window.__renderAnDaily=render;setTimeout(render,0);
})();
