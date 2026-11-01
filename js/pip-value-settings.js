(function(){const $=id=>document.getElementById(id);
/* Pip value and price per pip are the person's own numbers, saved on this device (journall_ prefix, so they sync). Nothing is assumed. */
const PK='journall_tools_pip_v1';
function pipGet(){try{const o=JSON.parse(localStorage.getItem(PK));return{pv:Number(o&&o.pv)>0?Number(o.pv):0,ps:Number(o&&o.ps)>0?Number(o.ps):0}}catch(e){return{pv:0,ps:0}}}
function pipSet(pv,ps){try{localStorage.setItem(PK,JSON.stringify({pv:pv>0?pv:0,ps:ps>0?ps:0}))}catch(e){console.debug('[journall] ignored error in pip-value-settings.js:', e);}}
function pipFill(){const p=pipGet();[['tlPv','pv'],['tlPs','ps'],['ppPv','pv'],['ppPs','ps']].forEach(a=>{const e=$(a[0]);if(e&&document.activeElement!==e)e.value=p[a[1]]>0?p[a[1]]:''})}
window.jlPip={get:pipGet,set:pipSet,fill:pipFill};
document.addEventListener('input',e=>{const id=e.target&&e.target.id;if(id==='tlPv'||id==='tlPs'||id==='ppPv'||id==='ppPs'){const a=id.slice(0,2)==='tl'?'tl':'pp';pipSet(+($(a+'Pv')||{}).value||0,+($(a+'Ps')||{}).value||0);pipFill()}});
function calc(){const risk=+$('tlRisk').value||0,pips=+$('tlSl').value||0,rr=+$('tlRr').value||0,side=$('tlSide').value,en=parseFloat($('tlEntry').value),PV=Math.max(0,+$('tlPv').value||0),PS=Math.max(0,+$('tlPs').value||0),minRr=Number(window.jlMinRr)||0,
 lim=Number(window.jlDailyLossLimit)||0,last=(window.__trades||[])[0],lastLot=last&&last.lot,
 raw=pips>0&&PV>0?risk/(pips*PV):0,lot=Math.floor(raw*100+1e-9)/100,real=lot*pips*PV,rew=real*rr,tpP=pips*rr,f=[];
 const m=v=>'$'+v.toFixed(2),add=(s,t)=>f.push([s==='f'?'var(--red)':s==='w'?'var(--amber)':'var(--green)',s,t]);
 if(!(PV>0))add('f','Enter the pip value per 1.00 lot.');else if(pips<=0||risk<=0)add('f','Enter a risk and a stop loss.');
 else if(lot<0.01)add('f','Risk is too small for 0.01 lot at this stop. Minimum risk is '+m(pips*PV*.01)+'.');
  if(minRr>0&&rr<minRr)add('f','Reward:risk is '+rr+'. Your minimum is '+minRr+'.');else if(rr>0)add('p','Reward:risk is '+rr+'.');
 if(lot>=.01){if(!(lim>0))add('w','No daily loss limit is set in Account Settings.');else if(real>lim)add('f','Risk '+m(real)+' exceeds your daily loss limit of '+m(lim)+'.');else add('p','Risk '+m(real)+' is '+Math.round(real/lim*100)+'% of your daily loss limit. One loss ends the day.');
  if(lastLot!=null&&lot>lastLot)add('f','Lot '+lot.toFixed(2)+' is above your last lot ('+lastLot+'). Never increase size.');else if(lastLot!=null)add('p','Lot does not exceed your last lot ('+lastLot+').')}
 const bad=f.some(x=>x[1]==='f'),v=$('tlVerdict');v.className='tl-verdict '+(bad?'no':'ok');v.textContent=bad?'Reject this size':'Size passes';
 const sl=isNaN(en)||!(PS>0)?'-':(side==='SELL'?en+pips*PS:en-pips*PS).toFixed(2),tp=isNaN(en)||!(PS>0)?'-':(side==='SELL'?en-tpP*PS:en+tpP*PS).toFixed(2),ok=lot>=.01;
 $('tlOut').innerHTML=[['Lot size',ok?lot.toFixed(2):'-'],['Actual risk',ok?m(real):'-'],['Target reward',ok?m(rew):'-'],['Stop loss price',sl],['Take profit price',tp],['Target (pips)',ok?tpP:'-']].map(x=>'<div><span>'+x[0]+'</span><b>'+x[1]+'</b></div>').join('');
 $('tlChecks').innerHTML=f.map(x=>'<li style="--c:'+x[0]+'">'+x[2]+'</li>').join('')}
['tlRisk','tlSl','tlRr','tlSide','tlEntry','tlPv','tlPs'].forEach(i=>$(i).addEventListener('input',calc));pipFill();calc();window.__tlCalc=calc})();
