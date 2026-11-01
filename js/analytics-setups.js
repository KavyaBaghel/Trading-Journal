(function(){
/* Analytics > Setups: built from the saved journals (free notes have no P&L, so they are left out).
   Same result rule as every other tab (window.jlKind, break-even under $1). */
const esc=x=>String(x).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const money=v=>(Math.abs(v)<0.005?'$':v<0?'-$':'+$')+Math.abs(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const col=v=>v>0?'var(--green)':v<0?'var(--red)':'var(--text)';
function render(){
  const body=document.getElementById('aSetupBody'); if(!body) return;
  const J=(window.__getJournals?window.__getJournals():[]).filter(j=>j&&j.pnl!=null&&isFinite(j.pnl));
  if(!J.length){body.innerHTML='<tr><td colspan="8" style="color:var(--faint);padding:18px 12px">No setups yet. Save a journal on a trade in the Journal tab and its setup will show up here.</td></tr>';return}
  const g={};
  J.forEach(j=>{const k=String(j.setup||'').trim()||'No setup';(g[k]=g[k]||[]).push(Number(j.pnl))});
  body.innerHTML=Object.entries(g).sort((a,b)=>b[1].length-a[1].length||a[0].localeCompare(b[0])).map(([name,v])=>{
    const n=v.length,net=v.reduce((a,x)=>a+x,0),w=v.filter(x=>window.jlKind(x)==='win').length,l=v.filter(x=>window.jlKind(x)==='loss').length,be=n-w-l;
    const best=Math.max(...v),worst=Math.min(...v);
    return '<tr><td style="font-weight:600">'+esc(name)+'</td><td class="mono">'+n+'</td><td class="mono">'+Math.round(w/n*100)+'%</td><td class="mono" style="color:'+col(net)+'">'+money(net)+'</td><td class="mono" style="color:'+col(net/n)+'">'+money(net/n)+'</td><td class="mono" style="color:'+col(best)+'">'+money(best)+'</td><td class="mono" style="color:'+col(worst)+'">'+money(worst)+'</td><td class="mono">'+w+'W / '+l+'L / '+be+'BE</td></tr>';
  }).join('');
}
function renderEmo(){
  const body=document.getElementById('aEmoBody'); if(!body) return;
  const J=(window.__getJournals?window.__getJournals():[]).filter(j=>j&&j.pnl!=null&&isFinite(j.pnl));
  if(!J.length){body.innerHTML='<tr><td colspan="8" style="color:var(--faint);padding:18px 12px">No emotions yet. Pick a feeling on a trade in the Journal tab and it will show up here.</td></tr>';return}
  const g={};
  J.forEach(j=>{const k=String(j.emotion||'').trim()||'No emotion';(g[k]=g[k]||[]).push(Number(j.pnl))});
  body.innerHTML=Object.entries(g).sort((a,b)=>b[1].length-a[1].length||a[0].localeCompare(b[0])).map(([name,v])=>{
    const n=v.length,net=v.reduce((a,x)=>a+x,0),w=v.filter(x=>window.jlKind(x)==='win').length,l=v.filter(x=>window.jlKind(x)==='loss').length,be=n-w-l;
    const best=Math.max(...v),worst=Math.min(...v);
    return '<tr><td style="font-weight:600">'+esc(name)+'</td><td class="mono">'+n+'</td><td class="mono">'+Math.round(w/n*100)+'%</td><td class="mono" style="color:'+col(net)+'">'+money(net)+'</td><td class="mono" style="color:'+col(net/n)+'">'+money(net/n)+'</td><td class="mono" style="color:'+col(best)+'">'+money(best)+'</td><td class="mono" style="color:'+col(worst)+'">'+money(worst)+'</td><td class="mono">'+w+'W / '+l+'L / '+be+'BE</td></tr>';
  }).join('');
}
const renderBoth=()=>{render();renderEmo()};
window.__renderAnSetups=renderBoth;window.__renderAnEmotions=renderEmo;setTimeout(renderBoth,0);
})();
