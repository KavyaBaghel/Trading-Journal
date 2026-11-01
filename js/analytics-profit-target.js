(function(){const A=window.__A,$=id=>document.getElementById(id),tg=Math.round(window.jlProfitTargetUSD||0),bal=A.start+A.net,m=v=>'$'+v.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}),getMdd=function(){var cm=Number(window.jlChMddPct)||0;if(cm>0)return Number(window.jlStartBalance||0)*cm/100;var e=document.getElementById('ggMdd'),v=Number(e&&e.value)||0,u=e&&e.closest('.gg-combo')&&e.closest('.gg-combo').querySelector('select');return u&&u.value==='$'?v:Number(window.jlStartBalance||0)*v/100},mdd0=getMdd();
/* Balance scale: range = start - drawdown budget .. start + profit target; every marker, label and the red/green split come from those three numbers */
window.__renderAnScale=function(b){const sc=document.querySelector('.a-scale');if(!sc)return;b=b==null?(window.jlLiveBalance?window.jlLiveBalance(A):bal):b;
  const lo=A.start-getMdd(),hi=A.start+tg,span=(hi-lo)||1,pc=v=>Math.max(0,Math.min(100,(v-lo)/span*100)),n0=v=>'$'+Math.round(v).toLocaleString('en-US'),mks=sc.querySelectorAll('.a-mk'),now=sc.querySelector('.a-now');
  const put=(i,v,t)=>{if(!mks[i])return;mks[i].style.left=pc(v)+'%';mks[i].querySelector('span').innerHTML=n0(v)+'<br>'+t};
  put(0,lo,'max drawdown');put(1,A.start,'start');put(2,hi,'target');
  sc.style.setProperty('--zp',pc(A.start)+'%');
  if(now){now.style.left=pc(b)+'%';now.querySelector('em').textContent=m(b);const tone=b>=A.start?'var(--green)':'var(--red)';now.style.borderColor=tone;now.style.setProperty('--nc',b>=A.start?'67,215,135':'240,104,92');now.querySelector('em').style.color=tone}};
window.__renderAnScale();
const set=(id,t)=>{const e=$(id);if(e)e.textContent=t};if(A.start>0){set('ggJEnd',tg>0?m(A.start+tg):'No target');set('ggJTogo',tg>0?(A.net>=tg?'target reached':m(tg-A.net)+' to go'):'No profit target set');}else{set('ggJEnd','\u2014');set('ggJTogo','Set your balance and profit target');}
/* Hero balance bar: centred on the starting balance. Left half = loss side (start down to the max-drawdown floor), right half = profit side (start up to the profit target). Each side is scaled on its own, so the dot never pins to one end unless a limit is actually reached. */
window.__renderJourney=function(){const Z=window.__A||A,start=Z.start,tgt=Math.round(window.jlProfitTargetUSD||0),dd=getMdd(),b=window.jlLiveBalance?window.jlLiveBalance(Z):start+(Z.net||0),net=b-start;
  const dot=$('ggJourneyDot'),lf=$('ggJLossFill'),gf=$('ggJGainFill'),now=$('ggJNow');if(!dot)return;
  set('ggJFloor',start>0&&dd>0?m(start-dd):'\u2014');
  if(!(start>0)){dot.style.left='50%';if(now)now.style.left='50%';if(lf)lf.style.width='0%';if(gf)gf.style.width='0%';dot.classList.remove('neg','pos');return}
  let lp=0,gp=0;
  if(net>=0){gp=tgt>0?Math.min(1,net/tgt):0}else{lp=dd>0?Math.min(1,-net/dd):0}
  const pos=50+(gp-lp)*50;
  if(lf)lf.style.width=(lp*100)+'%';if(gf)gf.style.width=(gp*100)+'%';
  dot.style.left=pos+'%';if(now)now.style.left=Math.max(10,Math.min(90,pos))+'%';
  dot.classList.toggle('neg',net<0);dot.classList.toggle('pos',net>0);
  if(window.__jlJourneyPlayed){const bv=$('ggBalVal');if(bv)bv.textContent=m(b)}};
window.__renderDDRing=function(){if(window.__renderJourney)window.__renderJourney();if(window.__renderAnScale)window.__renderAnScale();if(window.__renderAnRadar)window.__renderAnRadar();const md=getMdd(),Z=window.__A||A,st=Z.start||0,gg=document.getElementById('ggGaugeDD');
  /* Static drawdown: floor = starting balance minus the limit. Buffer = how far the balance is above that floor right now. */
  if(!(md>0)){set('ggDDv','Not set');set('ggDDm','No max drawdown set');window.ggRingTone(gg,0)}
  else if(!(st>0)){set('ggDDv','Not set');set('ggDDm','Set your starting balance');window.ggRingTone(gg,0)}
  else{const bl=window.jlLiveBalance?window.jlLiveBalance(Z):st+(Z.net||0),fl=st-md,used=Math.max(0,Math.min(md,st-bl));set('ggDDv',m(Math.max(0,bl-fl)));set('ggDDm',m(used)+' of '+m(md)+' used, floor '+m(fl));window.ggRingTone(gg,used/md)}};window.__renderDDRing();
const h=A.negHold&&A.negHold[0];set('aicRuleNote',h?'Sub-1-minute holds cost $'+h[1].toFixed(2)+' in this data.':'Hold time is not tracked yet, so timing leaks are not measured.');})();
