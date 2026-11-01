(function(){
/* Study notes in the AI Coach tab: a playbook of setups plus free notes.
   Keys start with journall_, so the existing cloud save picks them up. Setup names feed the Setup field in the Journal tab. */
var PBK=JL_KEYS.keys.JOURNALL_PLAYBOOK_V1,NK=JL_KEYS.keys.JOURNALL_STUDY_NOTES_V1;
/*PB-PURE-START*/
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function uid(p){return p+Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
function nm(v){return String(v==null?'':v).replace(/\s+/g,' ').trim()}
function low(v){return nm(v).toLowerCase()}
function cleanPlaybook(raw){var out=[],seen={};if(!Array.isArray(raw))return out;
  raw.forEach(function(x){if(!x||typeof x!=='object')return;var n=nm(x.name).slice(0,40),k=n.toLowerCase();if(!n||seen[k])return;seen[k]=1;
    out.push({id:(typeof x.id==='string'&&x.id)?x.id:uid('s'),name:n,take:typeof x.take==='string'?x.take:'',skip:typeof x.skip==='string'?x.skip:''})});
  return out}
function cleanNotes(raw){var out=[],seen={};if(!Array.isArray(raw))return out;
  raw.forEach(function(x){if(!x||typeof x!=='object')return;var id=(typeof x.id==='string'&&x.id)?x.id:uid('n');if(seen[id])return;seen[id]=1;
    var u=Number(x.u);out.push({id:id,title:typeof x.title==='string'?x.title.slice(0,80):'',body:typeof x.body==='string'?x.body:'',u:isFinite(u)&&u>0?u:0})});
  return out}
function usable(j){return !!j&&j.pnl!=null&&j.pnl!==''&&isFinite(j.pnl)}
function pbStats(journals,name,kind){var k=low(name),n=0,w=0,l=0,net=0;
  (Array.isArray(journals)?journals:[]).forEach(function(j){if(!usable(j)||low(j.setup)!==k)return;var p=Number(j.pnl);n++;net+=p;var c=kind(p);if(c==='win')w++;else if(c==='loss')l++});
  return{n:n,w:w,l:l,be:n-w-l,net:net}}
function pbUnlinked(journals,playbook){var have={},seen={},out=[];
  (Array.isArray(playbook)?playbook:[]).forEach(function(p){have[low(p.name)]=1});
  (Array.isArray(journals)?journals:[]).forEach(function(j){if(!usable(j))return;var n=nm(j.setup),k=n.toLowerCase();if(!n||have[k])return;
    if(!seen[k]){seen[k]={name:n.slice(0,40),n:0};out.push(seen[k])}seen[k].n++});
  out.sort(function(a,b){return b.n-a.n||(a.name<b.name?-1:a.name>b.name?1:0)});return out}
function setupOptions(base,playbook){var out=(Array.isArray(base)?base:[]).slice(),have={};out.forEach(function(o){have[low(o)]=1});
  (Array.isArray(playbook)?playbook:[]).forEach(function(p){var k=low(p.name);if(p.name&&!have[k]){have[k]=1;out.push(p.name)}});return out}
function setupRules(playbook,name){var k=low(name);if(!k)return null;var p=null;(Array.isArray(playbook)?playbook:[]).forEach(function(x){if(x&&low(x.name)===k)p=x});if(!p)return null;
  var t=typeof p.take==='string'?p.take.trim():'',s=typeof p.skip==='string'?p.skip.trim():'';return(t||s)?{take:t,skip:s}:null}
function rulesHtml(r){if(!r)return '';return (r.take?'<div class="jsr-b"><span class="jsr-l">Rules to take it</span><p>'+esc(r.take)+'</p></div>':'')+(r.skip?'<div class="jsr-b"><span class="jsr-l">When to skip it</span><p>'+esc(r.skip)+'</p></div>':'')}
function filterNotes(notes,q){var s=low(q),a=(Array.isArray(notes)?notes:[]).filter(function(n){return !s||low(n.title).indexOf(s)>=0||low(n.body).indexOf(s)>=0});
  return a.slice().sort(function(x,y){return y.u-x.u})}
function money(v){return(Math.abs(v)<0.005?'$':v<0?'-$':'+$')+Math.abs(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}
function statHtml(s){if(!s.n)return 'No journaled trades yet';
  return s.n+(s.n===1?' trade':' trades')+' \u00b7 '+Math.round(s.w/s.n*100)+'% win \u00b7 <span class="'+(s.net>0?'pos':s.net<0?'neg':'')+'">'+money(s.net)+'</span>'}
var MN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function noteDate(u){if(!u)return 'Not saved yet';var d=new Date(u);return MN[d.getMonth()]+' '+d.getDate()+', '+d.getFullYear()}
function pItem(p,js,open,kind){return '<details class="pb-item" data-id="'+esc(p.id)+'"'+(open?' open':'')+'><summary><b>'+esc(p.name)+'</b><span class="pb-stat">'+statHtml(pbStats(js,p.name,kind))+'</span></summary>'
  +'<div class="pb-body"><label><span class="pb-l">Rules to take it</span><textarea class="j-ta" data-f="take" maxlength="2000" placeholder="What has to be true before you enter?">'+esc(p.take)+'</textarea></label>'
  +'<label><span class="pb-l">When to skip it</span><textarea class="j-ta" data-f="skip" maxlength="2000" placeholder="What makes this setup not worth taking?">'+esc(p.skip)+'</textarea></label>'
  +'<div class="pb-foot"><button type="button" class="gg-btn-outline pb-del" data-del="'+esc(p.id)+'">Delete setup</button></div></div></details>'}
function nItem(n,open){return '<details class="pb-item pn-item" data-id="'+esc(n.id)+'"'+(open?' open':'')+'><summary><b>'+esc(n.title||'Untitled note')+'</b><span class="pb-stat">'+esc(noteDate(n.u))+'</span></summary>'
  +'<div class="pb-body"><label><span class="pb-l">Title</span><input type="text" class="pb-in" data-f="title" maxlength="80" value="'+esc(n.title)+'"></label>'
  +'<label><span class="pb-l">Note</span><textarea class="j-ta pn-ta" data-f="body" maxlength="8000" placeholder="Write what you are studying or want to remember.">'+esc(n.body)+'</textarea></label>'
  +'<div class="pb-foot"><button type="button" class="gg-btn-outline pb-del" data-del="'+esc(n.id)+'">Delete note</button></div></div></details>'}
/*PB-PURE-END*/
function $(id){return document.getElementById(id)}
function rd(k){try{return JSON.parse(localStorage.getItem(k))}catch(_){return null}}
function msg(t){var m=$('pbMsg');if(!m)return;m.textContent=t||'';clearTimeout(msg.t);if(t)msg.t=setTimeout(function(){m.textContent=''},3500)}
function wr(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(_){msg('Could not save. Browser storage may be full.');return false}}
function journals(){try{return typeof window.__getJournals==='function'?window.__getJournals():[]}catch(_){return[]}}
function kind(p){return typeof window.jlKind==='function'?window.jlKind(p):(Math.abs(p)<1?'be':p>0?'win':'loss')}
var PB=[],NT=[],tab='play',openP={},openN={},q='',armT=0;
function load(){PB=cleanPlaybook(rd(PBK));NT=cleanNotes(rd(NK))}
window.jlSetupOptions=function(base){return setupOptions(base,cleanPlaybook(rd(PBK)))};
window.jlSetupRulesPaint=function(name){var box=$('jSetupRules');if(!box)return;var h=rulesHtml(setupRules(cleanPlaybook(rd(PBK)),name));box.innerHTML=h;box.hidden=!h};
function repaintRules(){var h=$('jSetup');window.jlSetupRulesPaint(h?h.value:'')}
function renderPlay(){var box=$('pbList'),un=$('pbUn');if(!box||!un)return;var js=journals(),u=pbUnlinked(js,PB);
  un.hidden=!u.length;
  un.innerHTML=u.length?'<span class="pb-un-t">Used in your journal, not in your playbook</span>'+u.map(function(x){return '<button type="button" class="pb-chip" data-addname="'+esc(x.name)+'">+ '+esc(x.name)+' ('+x.n+')</button>'}).join(''):'';
  box.innerHTML=PB.length?PB.map(function(p){return pItem(p,js,openP[p.id],kind)}).join(''):'<div class="pb-none">No setups yet. Add one above.</div>'}
function renderNotes(){var box=$('pnList');if(!box)return;var a=filterNotes(NT,q);
  box.innerHTML=a.length?a.map(function(n){return nItem(n,openN[n.id])}).join(''):'<div class="pb-none">'+(q?'No notes match your search.':'No notes yet. Tap New note to write one.')+'</div>'}
function setTab(t){tab=t;var r=$('pbRoot');if(!r)return;
  [].forEach.call(r.querySelectorAll('[data-pbt]'),function(b){var on=b.getAttribute('data-pbt')===t;b.classList.toggle('on',on);b.setAttribute('aria-selected',on)});
  $('pbPlay').hidden=t!=='play';$('pbNotes').hidden=t!=='notes'}
function render(force){var r=$('pbRoot');if(!r)return;
  if(!force){var a=document.activeElement;if(a&&r.contains(a)&&/^(INPUT|TEXTAREA)$/.test(a.tagName))return}
  load();renderPlay();renderNotes();setTab(tab);repaintRules()}
function addSetup(name){var n=nm(name).slice(0,40);if(!n)return false;
  load();if(PB.some(function(p){return low(p.name)===low(n)})){msg('That setup is already in your playbook.');return false}
  var p={id:uid('s'),name:n,take:'',skip:''};PB.push(p);openP[p.id]=true;if(!wr(PBK,PB))return false;render(true);return true}
function addNote(){load();var n={id:uid('n'),title:'',body:'',u:Date.now()};NT.unshift(n);openN[n.id]=true;q='';var s=$('pbSearch');if(s)s.value='';if(!wr(NK,NT))return;render(true)}
function delItem(id,isNote){load();if(isNote){NT=NT.filter(function(n){return n.id!==id});delete openN[id];wr(NK,NT)}else{PB=PB.filter(function(p){return p.id!==id});delete openP[id];wr(PBK,PB)}render(true)}
var root=$('pbRoot');
if(root){
  root.addEventListener('click',function(e){var t=e.target;if(!t.closest)return;
    var tb=t.closest('[data-pbt]');if(tb){setTab(tb.getAttribute('data-pbt'));return}
    if(t.closest('#pbAdd')){var i=$('pbName');if(addSetup(i.value))i.value='';return}
    var ch=t.closest('[data-addname]');if(ch){addSetup(ch.getAttribute('data-addname'));return}
    if(t.closest('#pbNew')){addNote();return}
    var d=t.closest('[data-del]');if(d){
      if(d.getAttribute('data-arm')!=='1'){d.setAttribute('data-arm','1');d.textContent='Tap again to delete';clearTimeout(armT);armT=setTimeout(function(){render(true)},3000);return}
      clearTimeout(armT);delItem(d.getAttribute('data-del'),!!d.closest('.pn-item'))}});
  root.addEventListener('input',function(e){var t=e.target,f=t.getAttribute&&t.getAttribute('data-f');
    if(t.id==='pbSearch'){q=t.value;clearTimeout(window.__pbT);window.__pbT=setTimeout(renderNotes,150);return}
    if(!f)return;var it=t.closest('.pb-item');if(!it)return;var id=it.getAttribute('data-id');
    if(it.classList.contains('pn-item')){var n=NT.filter(function(x){return x.id===id})[0];if(!n)return;n[f]=t.value;n.u=Date.now();wr(NK,NT);
      if(f==='title')it.querySelector('summary b').textContent=t.value.trim()||'Untitled note';it.querySelector('.pb-stat').textContent=noteDate(n.u)}
    else{var p=PB.filter(function(x){return x.id===id})[0];if(!p)return;p[f]=t.value;wr(PBK,PB);repaintRules()}});
  root.addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target.id==='pbName'){e.preventDefault();var i=e.target;if(addSetup(i.value))i.value=''}});
  root.addEventListener('toggle',function(e){var it=e.target;if(!it.classList||!it.classList.contains('pb-item'))return;var id=it.getAttribute('data-id');(it.classList.contains('pn-item')?openN:openP)[id]=it.open},true);
}
var view=$('view-ai');
if(view&&typeof MutationObserver==='function')new MutationObserver(function(){if(!view.hidden)render(true)}).observe(view,{attributes:true,attributeFilter:['hidden']});
window.addEventListener('storage',function(ev){if(!ev.key||ev.key===PBK||ev.key===NK||ev.key==='jlJournals')render()});
document.addEventListener('visibilitychange',function(){if(!document.hidden)render()});
setTimeout(function(){render(true)},1500);render(true);
})();
