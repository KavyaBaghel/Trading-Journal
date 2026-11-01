(function(){
const $=id=>document.getElementById(id);
$('dateStrT').textContent=new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
// Real trade data lives in one place — window.__trades, set near the top of the page's
// scripts — so Today's Summary, Trades and Journal all read the exact same rows instead of
// each tab keeping its own copy that could drift out of sync.
const SC={'London':'#c7cbd6','New York':'#43d787','Asia':'#b39ffb'};
const T=window.__trades||[];
const f={ses:'All',res:'All',rec:'All',merge:false,n:25};
const money=v=>(v<0?'-$':'+$')+Math.abs(v).toFixed(2);
const kind=p=>window.jlKind(p);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Same key shape as the Journal tab's key() — kept local since it's a trivial pure
// function of trade fields, not stateful data worth sharing via window.
const trKey=t=>t.d+' '+t.t+' '+t.side+' '+t.en+' '+t.pnl;
/* Quick Log trades (ids starting ql-) get Edit in the expanded row; map their live key to the stored id */
const qlMap=()=>{const m={};try{(JSON.parse(localStorage.getItem(JL_KEYS.keys.VIZTRADE_TRADING_PAGE_TRADES)||'[]')||[]).forEach(t=>{if(t&&/^ql-/.test(String(t.id)))m[window.JLAdapter.liveKey(t)]=t.id})}catch(_){console.debug('[journall] ignored error in trades-tab.js:', _);}return m};
const col=k=>k==='win'?'var(--green)':k==='loss'?'var(--red)':'var(--faint)';
const sec=t=>{const p=t.split(':');return +p[0]*3600+ +p[1]*60+ +p[2]};

// ---------- revenge-trade detector ----------
// Flags a trade opened within the cooldown window (user-set in Account Settings ▸ Risk limits,
// default 15 min) after a same-day loss closed.
// Per your call: size doesn't factor into detection, only the quick re-entry inside the
// cooldown does. It's computed here only to show alongside each flagged trade for context.
// T is ordered newest-first, so T[i+1] is the chronologically-previous trade for T[i].
// Exposed on window + reusable so Account Settings ▸ Save can re-run it live when the
// window setting changes, instead of only taking effect on the next page reload.
window.jlRecomputeRevenge=function(opts){
  const REV_WINDOW=(Number(window.jlRevWindowMin)||0)*60;
  for(let i=0;i<T.length;i++){
    const c=T[i],p=T[i+1];
    if(!p||p.d!==c.d){c.rev=false;c.revSize=null;continue}
    const sameFill=p.side===c.side&&Math.abs(p.en-c.en)<.5&&Math.abs(sec(p.t)-sec(c.t))<=120;
    const gap=sec(c.t)-sec(p.t);
    c.rev=REV_WINDOW>0&&!sameFill&&p.pnl<0&&gap>=0&&gap<=REV_WINDOW;
    c.revSize=c.rev?(c.lot>p.lot?'higher':c.lot<p.lot?'lower':'equal'):null;
  }
  // Only re-render when explicitly asked (Save calling this later, once the page has
  // fully loaded) — not on this file's own initial pass below, where render()/card() and
  // the journal's `cur` state haven't been declared yet and would throw if called early.
  if(opts&&opts.rerender){
    if(typeof render==='function') render();
    if(typeof card==='function') card();
  }
};
window.jlRecomputeRevenge();

const WHY={SL:['Stop loss','t-sl'],TP:['Target','t-tp'],User:['Manual','']};
const why=s=>s?s.split('/').map(w=>'<span class="t-chip '+((WHY[w]||[])[1]||'')+'">'+((WHY[w]||[])[0]||w)+'</span>').join(''):'<span class="t-chip">Exit unknown</span>';
const COLS='<colgroup><col style="width:8%"><col style="width:14%"><col style="width:10%"><col style="width:15%"><col style="width:8%"><col style="width:8%"><col style="width:8%"><col style="width:11%"><col style="width:9%"><col style="width:9%"></colgroup>';
const HEAD='<thead><tr><th>Time IST</th><th>Trade</th><th>Session</th><th>Entry / exit</th><th>Stops</th><th>Size</th><th>Closed by</th><th>P&amp;L</th><th>Tags</th><th>Review</th></tr></thead>';
const TABS={ses:[['All','All sessions'],['London','London'],['New York','New York'],['Asia','Asia']],res:[['All','All results'],['win','Wins'],['loss','Losses'],['be','Break-even']],rec:[['All','All trades'],['10','Last 10'],['25','Last 25'],['50','Last 50'],['100','Last 100']]};

function group(a){const o=[];a.forEach(x=>{const g=o[o.length-1];
  if(g&&g.d===x.d&&g.side===x.side&&Math.abs(g.en-x.en)<.5&&Math.abs(sec(g.t)-sec(x.t))<=120){g.fills++;g.pnl+=x.pnl;g.lot+=x.lot;g.exs.push(x.ex);if(!g.whys.includes(x.why))g.whys.push(x.why)}
  else o.push({...x,fills:1,exs:[x.ex],whys:[x.why]})});
  return o.map(g=>({...g,ex:g.exs.reduce((s,v)=>s+v,0)/g.exs.length,why:g.whys.join('/')}))}

function row(x,mx,journals){const k=kind(x.pnl),mv=x.side==='BUY'?x.ex-x.en:x.en-x.ex;
  const rk=trKey(x),je=(journals||[]).find(e=>e.key===rk);
  x.j=!!je; // real check against the actual saved journal, not the always-false seed default
  const lines=[];
  if(je){
    if(je.emotion)lines.push('<b>Feeling</b> '+esc(je.emotion));if(je.conf&&je.conf.length)lines.push('<b>Confluences</b> '+esc(je.conf.join(', ')));
    if(je.mistake)lines.push('<b>Mistake</b> '+esc(je.mistake));
    if(je.before)lines.push('<b>Before</b> '+esc(je.before));
    if(je.after)lines.push('<b>After</b> '+esc(je.after));
  }
  const detailHtml=lines.length?lines.map(l=>'<p>'+l+'</p>').join(''):'<p class="t-expand-empty">No journal entry yet for this trade.</p>';
  return '<tr class="t-row" data-key="'+esc(rk)+'" style="--rc:'+col(k)+'"><td class="mono t-time">'+x.t+'</td>'+
  '<td><span class="t-sym">'+(window.iconFor?window.iconFor(x.sym):'<i class="t-coin"></i>')+x.sym+'</span><span class="side-tag '+(x.side==='BUY'?'long':'short')+'">'+x.side+'</span></td>'+
  '<td><span class="t-ses"><em style="background:'+SC[x.ses]+'"></em>'+x.ses+'</span></td>'+
  '<td class="mono">'+(Number.isFinite(x.en)?x.en.toFixed(2):'-')+'<span class="t-arr"> to </span>'+(Number.isFinite(x.ex)?x.ex.toFixed(2):'-')+'<small style="color:'+(Number.isFinite(mv)?(mv>=0?'var(--green)':'var(--red)'):'var(--sub)')+'">'+(Number.isFinite(mv)?(mv>=0?'+':'')+mv.toFixed(2)+' pts':'no price')+'</small></td>'+
  '<td>'+(x.sl==null?'<span class="t-chip t-warn" title="No stop loss set">No SL</span>':'<span class="mono">'+x.sl+'</span>')+'<small>No target</small></td>'+
  '<td class="mono">'+x.lot.toFixed(2)+(x.fills>1?'<b class="t-x" title="'+x.fills+' fills merged">×'+x.fills+'</b>':'')+'<small>'+(x.hold==null?'hold not tracked':'held '+(x.hold<60?x.hold+'s':x.hold<3600?(x.hold/60).toFixed(1)+'m':(x.hold/3600).toFixed(1)+'h'))+'</small></td>'+
  '<td><div class="t-whys">'+why(x.why)+'</div></td>'+
  '<td><div class="mono t-pl" style="color:'+col(k)+'">'+money(x.pnl)+'</div><div class="t-mag"><i style="width:'+Math.max(4,Math.abs(x.pnl)/mx*100)+'%;background:'+col(k)+'"></i></div></td>'+
  '<td>'+((je&&(je.setup||je.emotion))?'<div class="t-stags">'+(je.setup?'<span class="t-stag">'+esc(je.setup)+'</span>':'')+(je.emotion?'<span class="t-stag t-stag-emo">'+esc(je.emotion)+'</span>':'')+'</div>':'<span class="t-dash" title="No setup or emotion tagged">-</span>')+(je?'<div style="margin-top:6px">'+window.jGradeChip(je.q)+'</div>':'')+'</td>'+
  '<td>'+(x.tags&&x.tags.length?x.tags.map(g=>'<span class="t-tag">'+g+'</span>').join(''):'')+(x.rev?'<span class="t-tag t-tag-rev">Revenge trade · lot '+x.revSize+'</span>':'')+'<div class="t-jn'+(x.j?' ok':'')+'">'+(x.j?'Journaled':'Needs journal')+'</div></td></tr>'+
  '<tr class="t-expand-row" data-key="'+esc(rk)+'"><td colspan="10"><div class="t-expand-cell">'+detailHtml+'<button type="button" class="btn-ghost t-expand-open" data-openkey="'+esc(rk)+'">Open full journal →</button>'+((window.__qlM||{})[x._lk]?'<span class="t-ql-acts"><button type="button" class="btn-ghost t-ql-edit" data-qlid="'+esc((window.__qlM||{})[x._lk])+'">Edit trade</button><button type="button" class="btn-ghost t-ql-del" data-qlid="'+esc((window.__qlM||{})[x._lk])+'">Delete trade</button></span>':'')+'</div></td></tr>'}

function kpis(a){const w=a.filter(x=>kind(x.pnl)==='win'),l=a.filter(x=>kind(x.pnl)==='loss'),n=a.length,sum=z=>z.reduce((s,x)=>s+x.pnl,0),net=sum(a)+a.reduce((q,x)=>q+(x.cost||0),0),ns=a.filter(x=>x.sl==null).length,jd=a.filter(x=>x.j).length,rvTrades=a.filter(x=>x.rev),rv=rvTrades.length;
  const revWin=Number(window.jlRevWindowMin)||0;
  const sizeCounts={higher:0,lower:0,equal:0};rvTrades.forEach(x=>{if(x.revSize)sizeCounts[x.revSize]++});
  const revSub=rv?'Re-entry inside '+revWin+' min of a loss · lot '+sizeCounts.higher+' higher, '+sizeCounts.lower+' lower, '+sizeCounts.equal+' equal':(revWin>0?'No cooldown breaks in view':'Revenge window not set');
  $('tKP').innerHTML=[['Net P&amp;L',money(net),net<0?'var(--red)':'var(--green)',jlN(n,'trade')+' in view'],
  ['Win rate',n?Math.round(w.length/n*100)+'%':'—','',jlN(w.length,'win')+', '+jlN(l.length,'loss','losses')+', '+(n-w.length-l.length)+' break-even'],
  ['Avg win / avg loss',(w.length?'$'+(sum(w)/w.length).toFixed(2):'—')+' / '+(l.length?'$'+Math.abs(sum(l)/l.length).toFixed(2):'—'),'','Per trade'],
  ['Trades without SL',ns+' / '+n,ns?'var(--amber)':'var(--green)',ns?'Set a stop before entry':'All trades protected'],
  ['Revenge trades',rv+' / '+n,rv?'var(--amber)':'var(--green)',revSub],
  ['Journaled',jd+' / '+n,'',(n-jd)+' still need a note']].map(c=>'<div><span>'+c[0]+'</span><b'+(c[2]?' style="color:'+c[2]+'"':'')+'>'+c[1]+'</b><small>'+c[3]+'</small></div>').join('')}

function render(){
  window.__qlM=qlMap();
  let a=f.merge?group(T):T;
  a=a.filter(x=>(f.ses==='All'||x.ses===f.ses)&&(f.res==='All'||kind(x.pnl)===f.res));
  if(f.rec!=='All'){const keep=new Set(a.slice().sort((p,q)=>p.d+p.t<q.d+q.t?1:-1).slice(0,+f.rec));a=a.filter(x=>keep.has(x))}
  $('tSub').textContent=jlN(T.length,'trade')+' loaded'+(f.rec!=='All'?' \u00b7 showing latest '+a.length:'')+(window.__imported?' · from '+window.__imported:'');
  kpis(a);
  if(!a.length){$('tDays').innerHTML='<div class="a-s t-empty"><b>No trades match these filters</b><span>Try another session or result.</span><button class="btn-ghost" id="tClear">Clear filters</button></div>';$('tMore').innerHTML='';return}
  const journals=window.__getJournals?window.__getJournals():[];
  const shown=a.slice(0,f.n),mx=Math.max(1,...a.map(x=>Math.abs(x.pnl))),days=[];
  shown.forEach(x=>{let d=days[days.length-1];if(!d||d.d!==x.d)days.push(d={d:x.d,r:[]});d.r.push(x)});
  $('tDays').innerHTML=days.map(d=>{const all=a.filter(x=>x.d===d.d),net=all.reduce((s,x)=>s+x.pnl,0),
    dt=new Date(d.d+'T00:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
    return '<section class="a-s t-day"><div class="t-dh"><b>'+dt+'</b><span class="n">'+all.length+(all.length===1?' trade':' trades')+'</span><span class="a-badge'+(net>=0?' ok':'')+' mono">'+money(net)+'</span></div><div class="t-sc"><table>'+COLS+HEAD+'<tbody>'+d.r.map(x=>row(x,mx,journals)).join('')+'</tbody></table></div></section>'}).join('');
  const left=a.length-shown.length;
  $('tMore').innerHTML=left>0?'<button class="btn-ghost" id="tMoreBtn">Show '+Math.min(25,left)+' more ('+left+' remaining)</button>':'';
}
function tabs(){document.querySelectorAll('#view-trades .a-tabs[data-g]').forEach(g=>{const k=g.dataset.g;if(!TABS[k])return;
  g.innerHTML=TABS[k].map(t=>'<button class="a-tab'+(f[k]===t[0]?' on':'')+'" data-v="'+t[0]+'" aria-pressed="'+(f[k]===t[0])+'">'+t[1]+'</button>').join('')})}
$('view-trades').addEventListener('click',e=>{
  if(e.target.closest('#tMoreBtn')){f.n+=25;render();return}
  if(e.target.closest('#tClear')){f.ses=f.res=f.rec='All';f.n=25;tabs();render();return}
  const qlB=e.target.closest('.t-ql-edit,.t-ql-del');
  if(qlB){const fn=qlB.classList.contains('t-ql-edit')?window.qlEditTrade:window.qlDeleteTrade;if(typeof fn==='function')fn(qlB.getAttribute('data-qlid'),qlB);return}
  const openBtn=e.target.closest('.t-expand-open');
  if(openBtn){
    const idx=T.findIndex(t=>trKey(t)===openBtn.dataset.openkey);
    if(window.__route)window.__route('journal');
    try{history.replaceState(null,'','#journal')}catch(_){console.debug('[journall] ignored error in trades-tab.js:', _);}
    if(window.__jPick&&idx>=0)window.__jPick(idx);
    return;
  }
  const tRow=e.target.closest('tr.t-row');
  if(tRow){
    const next=tRow.nextElementSibling;
    if(next&&next.classList.contains('t-expand-row'))next.classList.toggle('show');
    return;
  }
  const b=e.target.closest('.a-tab');if(!b)return;const g=b.parentNode.dataset.g;
  if(g==='merge'){f.merge=!f.merge;b.classList.toggle('on',f.merge);b.setAttribute('aria-pressed',f.merge)}
  else{f[g]=b.dataset.v;b.parentNode.querySelectorAll('.a-tab').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b)})}
  f.n=25;render()});
window.__trades=T;window.__trRender=render;tabs();render();
})();
