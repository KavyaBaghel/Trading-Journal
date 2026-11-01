(function(){
/* AI Coach: today's rule (typed, else latest Daily journal fix), today's focus and widget pins, all saved. */
var RK='journall_ai_rule_v1',FK='journall_ai_focus_v1',PK='journall_ai_pins_v1',DJ='krishna_daily_journal';
/*AF-PURE-START*/
function clean(v){return String(v==null?'':v).replace(/\s+/g,' ').trim()}
function pickRule(typed,map,today){var t=clean(typed&&typeof typed==='object'?typed.text:'').slice(0,140);if(t)return{text:t,src:'typed',day:''};
  var best='';if(map&&typeof map==='object'&&!Array.isArray(map))Object.keys(map).forEach(function(k){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(k)||(today&&k>=today))return;var e=map[k],f=e&&e.post&&typeof e.post.fix==='string'?clean(e.post.fix):'';if(f&&k>best)best=k});
  if(!best)return{text:'',src:'',day:''};return{text:clean(map[best].post.fix).slice(0,300),src:'journal',day:best}}
function cleanPins(raw){var out=[],seen={};if(!Array.isArray(raw))return out;raw.forEach(function(x){var s=clean(x).slice(0,60);if(s&&!seen[s]){seen[s]=1;out.push(s)}});return out.slice(0,40)}
function focusOn(raw,today){return !!raw&&typeof raw==='object'&&raw.on===true&&!!today&&raw.day===today}
var DN=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],MN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function dayLabel(day){var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(day||''));if(!m)return String(day||'');var d=new Date(Date.UTC(+m[1],+m[2]-1,+m[3]));return DN[d.getUTCDay()]+' '+(+m[3])+' '+MN[d.getUTCMonth()]}
/*AF-PURE-END*/
function $(id){return document.getElementById(id)}
function rd(k){try{return JSON.parse(localStorage.getItem(k))}catch(_){return null}}
function wr(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(_){return false}}
function today(){return typeof window.getTradingDayIST==='function'?window.getTradingDayIST():''}
window.jlTodayRule=function(){return pickRule(rd(RK),rd(DJ),today())};
window.jlAiState={
  isPinned:function(label){return cleanPins(rd(PK)).indexOf(clean(label))>=0},
  setPin:function(label,on){var l=clean(label),a=cleanPins(rd(PK)).filter(function(x){return x!==l});if(on)a.push(l);wr(PK,a)}
};
function paint(){var tx=$('aicRuleTxt');if(!tx)return;var r=window.jlTodayRule();
  tx.textContent=r.text||'No rule set yet';
  var s=$('aicRuleSrc');if(s)s.textContent=r.src==='typed'?'Your own rule':r.src==='journal'?'From your Daily journal, '+dayLabel(r.day):'Type one below, or fill in "What to fix tomorrow" in your Daily journal.';
  var c=$('aicRuleClear');if(c)c.hidden=r.src!=='typed';
  var b=$('aicMark');if(b){var on=focusOn(rd(FK),today());b.classList.toggle('on',on);b.textContent=on?"Today's focus set":"Mark as today's focus"}}
function saveRule(){var i=$('aicRuleIn');if(!i)return;var v=clean(i.value).slice(0,140);if(!v)return;if(wr(RK,{text:v}))i.value='';paint()}
var sv=$('aicRuleSave'),cl=$('aicRuleClear'),mk=$('aicMark'),inp=$('aicRuleIn');
if(sv)sv.addEventListener('click',saveRule);
if(inp)inp.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();saveRule()}});
if(cl)cl.addEventListener('click',function(){try{localStorage.removeItem(RK)}catch(_){}paint()});
if(mk)mk.addEventListener('click',function(){var on=focusOn(rd(FK),today());wr(FK,{day:today(),on:!on});paint()});
var view=$('view-ai');
if(view&&typeof MutationObserver==='function')new MutationObserver(function(){if(!view.hidden)paint()}).observe(view,{attributes:true,attributeFilter:['hidden']});
window.addEventListener('storage',function(ev){if(!ev.key||ev.key===RK||ev.key===FK||ev.key===DJ)paint()});
setTimeout(paint,1500);paint();
})();
