(function(){const $=id=>document.getElementById(id),V=$('view-tools'),H=$('tlHome');let tm=null;if(window.jlPip)window.jlPip.fill();
const out=(id,a)=>{$(id).innerHTML=a.map(x=>'<div><span>'+x[0]+'</span><b>'+x[1]+'</b></div>').join('')},n=id=>parseFloat($(id).value),m=v=>'$'+v.toFixed(2),
C=[['Sydney','Australia/Sydney',8,17],['Tokyo','Asia/Tokyo',9,18],['London','Europe/London',8,17],['New York','America/New_York',8,17]];
function hours(){const now=new Date(),R=C.map(([nm,z,o,c])=>{const p={};new Intl.DateTimeFormat('en-GB',{timeZone:z,hour:'2-digit',minute:'2-digit',weekday:'short',hourCycle:'h23'}).formatToParts(now).forEach(x=>p[x.type]=x.value);
 return{nm,t:p.hour+':'+p.minute,o,c,op:p.weekday!=='Sat'&&p.weekday!=='Sun'&&+p.hour>=o&&+p.hour<c}});
 $('mhList').innerHTML=R.map(r=>'<div class="mh-r"><b>'+r.nm+'</b><span>'+r.t+' local</span><span>'+r.o+':00-'+r.c+':00</span><em class="'+(r.op?'on':'off')+'">'+(r.op?'OPEN':'CLOSED')+'</em></div>').join('');
 const op=R.filter(r=>r.op).map(r=>r.nm);$('mhNow').textContent='Your time: '+now.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})+'. '+(op.length?'Open: '+op.join(' + ')+'.':'All four sessions are closed.')+(R[2].op&&R[3].op?' London and New York overlap now, usually the busiest window for gold.':'')}
function ex(){const w=n('exWr')/100,r=n('exRr'),v=$('exV');if(!(r>0)||!(w>=0&&w<=1)){v.className='tl-verdict wait';v.textContent='Enter a win rate (0-100) and R:R.';$('exOut').innerHTML='';return}
 const E=w*r-(1-w),be=100/(1+r);v.className='tl-verdict '+(E>0?'ok':'no');v.textContent=E>0?'Positive edge: '+E.toFixed(2)+'R per trade':'No edge: '+E.toFixed(2)+'R per trade';
 out('exOut',[['Breakeven win rate',be.toFixed(1)+'%'],['Your margin',(w*100-be).toFixed(1)+' pts'],['Per 100 trades',(E*100).toFixed(0)+'R']])}
function pp(){const l=n('ppLot'),p=n('ppPips'),a=n('ppEn'),b=n('ppEx'),PV=n('ppPv')>0?n('ppPv'):0,PS=n('ppPs')>0?n('ppPs'):0,o=[];
 if(l>0&&p>=0&&PV>0)o.push(['$ for '+p+' pips',m(l*p*PV)]);if(p>=0&&PS>0)o.push(['Price move',(p*PS).toFixed(2)]);
 if(!isNaN(a)&&!isNaN(b)&&PS>0){const q=Math.abs(b-a)/PS;o.push(['Entry to exit',q.toFixed(0)+' pips']);if(l>0&&PV>0)o.push(['$ for that move',m(l*q*PV)])}
 if(!(PV>0)||!(PS>0))o.push(['Needs',!(PV>0)&&!(PS>0)?'pip value and price per pip':!(PV>0)?'pip value':'price per pip']);out('ppOut',o)}
function lim(){const L=n('lmLim'),T=n('lmTgt'),k=n('lmRisk'),r=n('lmRr'),w=n('lmWr')/100;if(!(k>0)||!(r>0)||!(L>0)||!(T>0)){$('lmOut').innerHTML='';$('lmNote').textContent='Fill every field.';return}
 const wins=Math.ceil(T/(k*r)),tr=w>0?Math.ceil(wins/w):null;out('lmOut',[['Losses to hit limit',Math.floor(L/k)],['Wins for target',wins],['Trades for target',tr==null?'n/a':'~'+tr]]);
 $('lmNote').textContent=m(k)+' is '+Math.round(k/L*100)+'% of your daily limit. Trades needed assumes your win rate holds.'}
function st(){const w=n('stWr')/100,N=Math.floor(n('stN')),K=Math.floor(n('stK'));if(!(w>=0&&w<=1)||!(N>0&&N<=5000)||!(K>=1&&K<=50)){$('stOut').innerHTML='';$('stNote').textContent='Use win rate 0-100, trades 1-5000, streak 1-50.';return}
 let d=new Array(K).fill(0),h=0;d[0]=1;for(let i=0;i<N;i++){const e=new Array(K).fill(0);for(let j=0;j<K;j++){if(!d[j])continue;e[0]+=d[j]*w;if(j+1>=K)h+=d[j]*(1-w);else e[j+1]+=d[j]*(1-w)}d=e}
 out('stOut',[['Chance of the streak',(h*100).toFixed(1)+'%'],['Streak length',K],['Over trades',N]]);$('stNote').textContent=h>.5?'More likely than not. Size and plan for it.':'Less likely than not, but it can still happen.'}
const RUN={ex,pp,lim,st};let cur=null,opener=null,prevOv='';
V.querySelectorAll('.tl-pane').forEach(p=>{const w=document.createElement('div');w.className='tl-modal';while(p.firstChild)w.appendChild(p.firstChild);p.appendChild(w);p.setAttribute('role','dialog');p.setAttribute('aria-modal','true');p.setAttribute('aria-label',(w.querySelector('h3')||{}).textContent||'Tool');document.body.appendChild(p)});
function open(k,btn){const p=document.querySelector('.tl-pane[data-tool="'+k+'"]');if(!p)return;if(cur)shut(true);cur=p;opener=btn||null;clearInterval(tm);p.classList.remove('closing');p.hidden=false;prevOv=document.body.style.overflow;document.body.style.overflow='hidden';
 if(k==='hours'){hours();tm=setInterval(hours,20000)}else if(RUN[k])RUN[k]();const b=p.querySelector('.tl-back');if(b)b.focus()}
function shut(now){if(!cur)return;const p=cur;cur=null;clearInterval(tm);document.body.style.overflow=prevOv;const fin=()=>{p.hidden=true;p.classList.remove('closing')};if(now)fin();else{p.classList.add('closing');setTimeout(fin,220)}if(opener&&opener.focus)opener.focus()}
document.addEventListener('click',e=>{const o=e.target.closest('#view-tools [data-open]');if(o){open(o.dataset.open,o);return}if(cur&&(e.target===cur||e.target.closest('.tl-back')))shut()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&cur){shut();return}if(e.key==='Tab'&&cur){const f=[...cur.querySelectorAll('button,input,select,textarea,a[href]')].filter(x=>!x.disabled&&x.offsetParent!==null);if(!f.length)return;const a=document.activeElement,i=f.indexOf(a);if(i<0||(e.shiftKey&&i===0)){e.preventDefault();f[f.length-1].focus()}else if(!e.shiftKey&&i===f.length-1){e.preventDefault();f[0].focus()}}});
document.addEventListener('input',e=>{if(cur&&RUN[cur.dataset.tool]&&cur.contains(e.target))RUN[cur.dataset.tool]()});
})();
