(function(){
/* Daily journal: one entry per IST trading day (06:00 reset), a "before" part and an "after" part.
   Stored as one object under krishna_daily_journal ({day:{pre:{...},post:{...}}}) so it syncs with the rest of the app.
   Only what you type or tap is saved. Nothing is prefilled. */
var KEY='krishna_daily_journal';
/*DJ-PURE-START*/
var MOODS=['Calm','Confident','FOMO','Fear','Greed','Anxious','Frustrated','Revenge'];
var FOLLOW=['Yes','Partly','No'];
var TEXT={plan:1,rules:1,well:1,fix:1};
var MAXLEN=600;
function djClean(field,value){
  if(TEXT[field]){ var s=String(value==null?'':value).trim().slice(0,MAXLEN); return s?s:undefined; }
  if(field==='mood') return MOODS.indexOf(value)>-1?value:undefined;
  if(field==='followed') return FOLLOW.indexOf(value)>-1?value:undefined;
  if(field==='sleep'||field==='focus'){ var n=Number(value); return (n===Math.floor(n)&&n>=1&&n<=5)?n:undefined; }
  return undefined;
}
function djSet(map,day,part,field,value){
  var m={}; if(map&&typeof map==='object'&&!Array.isArray(map)) Object.keys(map).forEach(function(k){ m[k]=map[k]; });
  var d={}; if(m[day]&&typeof m[day]==='object'&&!Array.isArray(m[day])) Object.keys(m[day]).forEach(function(k){ d[k]=m[day][k]; });
  var p={}; if(d[part]&&typeof d[part]==='object'&&!Array.isArray(d[part])) Object.keys(d[part]).forEach(function(k){ p[k]=d[part][k]; });
  var v=djClean(field,value);
  if(v===undefined) delete p[field]; else p[field]=v;
  if(Object.keys(p).length) d[part]=p; else delete d[part];
  m[day]=d; /* an emptied day stays as {} so the clear also wins when it syncs */
  return m;
}
/*DJ-PURE-END*/
var PRE=document.getElementById('djPre'),POST=document.getElementById('djPost'),PANEL=document.getElementById('djPanel'),HINT=document.getElementById('djHint');
if(!PRE||!POST||!PANEL) return;
var day='',timers={},flashT=0;
function esc(v){ return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function readMap(){ try{ var o=JSON.parse(localStorage.getItem(KEY)||'{}'); return (o&&typeof o==='object'&&!Array.isArray(o))?o:{}; }catch(_){ return {}; } }
function writeMap(m){ try{ localStorage.setItem(KEY,JSON.stringify(m)); return true; }catch(_){ return false; } }
function today(){ return typeof window.getTradingDayIST==='function'?window.getTradingDayIST():''; }
function entry(part){ var d=readMap()[day]; return (d&&typeof d==='object'&&d[part]&&typeof d[part]==='object')?d[part]:{}; }
function label(){ return day?'IST trading day '+day:''; }
function flash(t){ if(!HINT) return; HINT.textContent=t; clearTimeout(flashT); flashT=setTimeout(function(){ flashT=0; HINT.textContent=label(); },1600); }
function chips(part,field,opts,sel){
  return '<div class="dj-chips" id="djg-'+part+'-'+field+'" role="group">'+opts.map(function(o){
    return '<button type="button" class="dj-chip" data-dj="'+part+'.'+field+'" data-v="'+esc(o)+'" aria-pressed="'+(String(sel)===String(o))+'">'+esc(o)+'</button>';
  }).join('')+'</div>';
}
function area(part,field,ph,val){ return '<textarea class="dj-ta" data-dj="'+part+'.'+field+'" maxlength="'+MAXLEN+'" placeholder="'+esc(ph)+'" aria-label="'+esc(ph)+'">'+esc(val||'')+'</textarea>'; }
function block(l,inner){ return '<div><div class="dj-l">'+l+'</div>'+inner+'</div>'; }
function render(){
  day=today(); if(!day){ return; }
  var a=entry('pre'),b=entry('post'),R=[1,2,3,4,5];
  PRE.innerHTML='<h3 class="dj-h">Before session</h3>'+
    block('Mood',chips('pre','mood',MOODS,a.mood))+
    block('Plan for today',area('pre','plan','Bias, levels, what you will trade',a.plan))+
    block('Rules I will not break',area('pre','rules','The rules you will not break today',a.rules))+
    '<div class="dj-rate">'+block('Sleep (1 to 5)',chips('pre','sleep',R,a.sleep))+block('Focus (1 to 5)',chips('pre','focus',R,a.focus))+'</div>';
  POST.innerHTML='<h3 class="dj-h">After session</h3>'+
    block('Mood',chips('post','mood',MOODS,b.mood))+
    block('Did I follow my rules?',chips('post','followed',FOLLOW,b.followed))+
    block('What went well',area('post','well','What went well',b.well))+
    block('What to fix tomorrow',area('post','fix','What to fix tomorrow',b.fix));
  if(HINT&&!flashT) HINT.textContent=label();
}
function commit(key,value){
  var p=key.split('.'); var m=djSet(readMap(),day,p[0],p[1],value);
  flash(writeMap(m)?'Saved':'Could not save');
}
function flushAll(){ Object.keys(timers).forEach(function(k){ var t=timers[k]; clearTimeout(t.id); delete timers[k]; commit(k,t.v); }); }
function regroup(key){
  var p=key.split('.'),el=document.getElementById('djg-'+p[0]+'-'+p[1]); if(!el) return;
  var e=entry(p[0]),opts=p[1]==='followed'?FOLLOW:(p[1]==='mood'?MOODS:[1,2,3,4,5]);
  el.outerHTML=chips(p[0],p[1],opts,e[p[1]]);
}
PANEL.addEventListener('click',function(ev){
  var b=ev.target.closest&&ev.target.closest('button[data-dj]'); if(!b) return;
  flushAll();
  var key=b.getAttribute('data-dj'),v=b.getAttribute('data-v'),p=key.split('.');
  var cur=entry(p[0])[p[1]];
  commit(key,String(cur)===String(v)?'':v); /* tapping the chosen chip again clears it */
  regroup(key);
});
PANEL.addEventListener('input',function(ev){
  var t=ev.target; if(!t||!t.getAttribute||t.tagName!=='TEXTAREA') return;
  var key=t.getAttribute('data-dj'); if(!key) return;
  if(timers[key]) clearTimeout(timers[key].id);
  timers[key]={v:t.value,id:setTimeout(function(){ var x=timers[key]; delete timers[key]; if(x) commit(key,x.v); },500)};
});
PANEL.addEventListener('focusout',function(){ flushAll(); });
window.addEventListener('beforeunload',flushAll);
function editing(){ var a=document.activeElement; return !!(a&&a.tagName==='TEXTAREA'&&PANEL.contains(a)); }
document.addEventListener('visibilitychange',function(){ if(document.hidden) flushAll(); else if(!editing()) render(); });
setInterval(function(){ if(today()!==day&&!editing()) render(); },60000);
setTimeout(function(){ if(!editing()) render(); },1500);
render();
})();
