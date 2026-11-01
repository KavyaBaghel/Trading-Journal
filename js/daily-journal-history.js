(function(){
/* Read-only view of past daily journal entries. Data comes from krishna_daily_journal, written by the Daily journal panel. */
var KEY='krishna_daily_journal';
/*DH-PURE-START*/
var DN=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],MN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function dhLabel(day){var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(day||''));if(!m)return String(day||'');var d=new Date(Date.UTC(+m[1],+m[2]-1,+m[3]));return DN[d.getUTCDay()]+' '+(+m[3])+' '+MN[d.getUTCMonth()]+' '+m[1]}
var PRE=['mood','plan','rules','sleep','focus'],POST=['mood','followed','well','fix'];
function pick(part,fields){var o={},n=0;if(part&&typeof part==='object'&&!Array.isArray(part))fields.forEach(function(f){var v=part[f];if(typeof v==='number'&&isFinite(v)){o[f]=v;n++}else if(typeof v==='string'&&v.trim()){o[f]=v;n++}});return n?o:null}
function dhEntry(raw){if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;var pre=pick(raw.pre,PRE),post=pick(raw.post,POST);return(pre||post)?{pre:pre,post:post}:null}
function dhDays(map){var out=[];if(!map||typeof map!=='object'||Array.isArray(map))return out;
  Object.keys(map).forEach(function(k){if(!/^\d{4}-\d{2}-\d{2}$/.test(k))return;var e=dhEntry(map[k]);if(e){e.day=k;out.push(e)}});
  out.sort(function(a,b){return a.day<b.day?1:a.day>b.day?-1:0});return out}
function row(l,v){return '<div class="djh-row"><small>'+l+'</small><span>'+esc(v)+'</span></div>'}
function col(title,rows){return '<div class="djh-col"><h4>'+title+'</h4>'+(rows.length?rows.join(''):'<div class="djh-none">Nothing saved</div>')+'</div>'}
function dhBody(e){
  var a=e.pre||{},b=e.post||{},L={plan:'Plan for the day',rules:'Rules I will not break',well:'What went well',fix:'What to fix tomorrow'},r1=[],r2=[];
  if(a.mood)r1.push(row('Mood',a.mood));if(a.plan)r1.push(row(L.plan,a.plan));if(a.rules)r1.push(row(L.rules,a.rules));
  if(a.sleep!=null)r1.push(row('Sleep',a.sleep+' / 5'));if(a.focus!=null)r1.push(row('Focus',a.focus+' / 5'));
  if(b.mood)r2.push(row('Mood',b.mood));if(b.followed)r2.push(row('Followed my rules',b.followed));if(b.well)r2.push(row(L.well,b.well));if(b.fix)r2.push(row(L.fix,b.fix));
  return '<div class="djh-body">'+col('Before session',r1)+col('After session',r2)+'</div>';
}
function dhTags(e){var t=[],a=e.pre||{},b=e.post||{};
  if(a.mood)t.push('<span class="djh-tag">Before: '+esc(a.mood)+'</span>');
  if(b.mood)t.push('<span class="djh-tag">After: '+esc(b.mood)+'</span>');
  if(b.followed)t.push('<span class="djh-tag '+({Yes:'y',Partly:'p',No:'n'}[b.followed]||'')+'">Rules: '+esc(b.followed)+'</span>');
  return t.join('')}
/*DH-PURE-END*/
function readMap(){try{var o=JSON.parse(localStorage.getItem(KEY)||'{}');return(o&&typeof o==='object'&&!Array.isArray(o))?o:{}}catch(_){return{}}}
window.jlDjView=function(day){
  var map=readMap(),e=dhEntry(map[day]);if(!e)return '';
  return '<div class="panel-head"><div class="a-s-ttl"><span class="a-s-ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/></svg></span><h2>Daily journal</h2></div><span class="hint">Read only</span></div>'+dhBody(e);
};
var STEP=30,shown=STEP;
function today(){return typeof window.getTradingDayIST==='function'?window.getTradingDayIST():''}
function render(){
  var body=document.getElementById('djhBody');if(!body)return;
  var days=dhDays(readMap()),cnt=document.getElementById('djhCnt'),more=document.getElementById('djhMore'),td=today();
  if(cnt)cnt.textContent=days.length+(days.length===1?' day':' days');
  if(!days.length){body.innerHTML='<div class="djh-none">No daily journal entries yet.</div>';if(more)more.hidden=true;return}
  body.innerHTML=days.slice(0,shown).map(function(e){
    return '<details class="djh-day"><summary><b>'+esc(dhLabel(e.day))+(e.day===td?' (today)':'')+'</b>'+dhTags(e)+'</summary>'+dhBody(e)+'</details>'}).join('');
  if(more)more.hidden=days.length<=shown;
}
var mb=document.getElementById('djhMore');if(mb)mb.addEventListener('click',function(){shown+=STEP;render()});
var view=document.getElementById('view-journal');
if(view&&typeof MutationObserver==='function')new MutationObserver(function(){if(!view.hidden)render()}).observe(view,{attributes:true,attributeFilter:['hidden']});
window.addEventListener('storage',function(ev){if(!ev.key||ev.key===KEY)render()});
document.addEventListener('visibilitychange',function(){if(!document.hidden)render()});
setTimeout(render,1500);render();
})();
