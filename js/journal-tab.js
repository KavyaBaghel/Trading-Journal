(function(){
const $=id=>document.getElementById(id),T=window.__trades||[],DK=JL_KEYS.keys.JL_JOURNALS;
$('dateStrJ').textContent=new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>(v<0?'-$':'+$')+Math.abs(v).toFixed(2),kind=p=>window.jlKind(p);
const col=k=>k==='win'?'var(--green)':k==='loss'?'var(--red)':'var(--faint)';
const key=t=>t.d+' '+t.t+' '+t.side+' '+t.en+' '+t.pnl;
const TAGS=['No Patience','Revenge Trade','Overtrading','Moved SL','No SL','FOMO','SL Too Tight','Early Exit','Early Entry','Fear Entry','Not My Setup','Same Entry','Over Limit','News Trade','Missed Entry','Trailed SL Early','Stacked Position','Lot Over Limit'];
const EMOTIONS=['Calm','Confident','FOMO','Fear','Greed','Anxious','Frustrated','Revenge'];
const PH={shot:'No screenshot attached',rec:'No recording attached'};
const SEED=[];
let J;try{J=JSON.parse(localStorage.getItem(DK))}catch(e){console.debug('[journall] ignored error in journal-tab.js:', e);}
if(!Array.isArray(J))J=SEED;
const save=()=>{try{localStorage.setItem(DK,JSON.stringify(J))}catch(e){console.debug('[journall] ignored error in journal-tab.js:', e);}window.__jlDirty=true};
let cur,filt='All',jf='All',qs='',urls={},jShown=30;
const blank=()=>{cur={idx:-1,free:false,q:[null,null,null],tags:[],conf:[],emotion:'',id:null,shot:'',shots:[],rec:''}};blank();
const msg=t=>{$('jMsg').textContent=t};
/* Setup combobox: hidden #jSetup keeps .value get/set working for the rest of this block */
const SETUPS=['Breakout','Pullback','Reversal','Range','Trend Continuation','Other'];let setupOpen=false;
(function(){const h=$('jSetup');let v='';
  Object.defineProperty(h,'value',{get(){return v},set(x){v=(x==null?'':String(x)).trim();$('jSetupLbl').textContent=v||'Select setup';$('jSetupLbl').style.color=v?'':'var(--faint)';if(window.jlSetupRulesPaint)window.jlSetupRulesPaint(v);if(setupOpen)setupList()}});})();
function setupList(){const cv=$('jSetup').value,base=window.jlSetupOptions?window.jlSetupOptions(SETUPS):SETUPS,opts=cv&&!base.includes(cv)?base.concat([cv]):base;$('jSetupList').innerHTML=opts.map(o=>'<div class="j-cb-opt" role="option" tabindex="-1" data-v="'+esc(o)+'" aria-selected="'+(o===$('jSetup').value)+'"><span class="j-cb-main"><span class="j-cb-t1">'+esc(o)+'</span></span><svg class="j-cb-ck" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg></div>').join('')}
function setupSet(open,focusBtn){setupOpen=open;$('jSetupCb').dataset.open=open?'1':'0';$('jSetupPop').hidden=!open;$('jSetupBtn').setAttribute('aria-expanded',open);if(open){setupList();const o=$('jSetupList').querySelector('[aria-selected="true"]');if(o)o.focus()}else if(focusBtn)$('jSetupBtn').focus()}
$('jSetupBtn').addEventListener('click',e=>{e.stopPropagation();setupSet(!setupOpen)});
$('jSetupBtn').addEventListener('keydown',e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setupSet(true)}});
$('jSetupList').addEventListener('click',e=>{const o=e.target.closest('.j-cb-opt');if(!o)return;$('jSetup').value=o.dataset.v;setupSet(false,true)});
$('jSetupList').addEventListener('keydown',e=>{const o=e.target.closest('.j-cb-opt');if(!o)return;
  if(e.key==='Enter'||e.key===' '){e.preventDefault();$('jSetup').value=o.dataset.v;setupSet(false,true)}
  else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const os=[...$('jSetupList').querySelectorAll('.j-cb-opt')],i=os.indexOf(o)+(e.key==='ArrowDown'?1:-1);(os[i]||o).focus()}});
document.addEventListener('click',e=>{if(setupOpen&&!$('jSetupCb').contains(e.target))setupSet(false)});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&setupOpen)setupSet(false,true)});
const seg=b=>b.parentNode.querySelectorAll('.a-tab').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b)});
const list=()=>T.map((t,i)=>i).filter(i=>filt==='All'||(filt==='need'?!T[i].j:T[i].j));

function fillSel(){
  const items=[{v:'free',lbl:'Free note (no trade)',sub:'Not linked to a trade',pnl:null,k:'note'}]
    .concat(list().map(i=>{const t=T[i];return{v:String(i),lbl:t.d.slice(5)+' · '+t.t+' IST',sub:t.side+' · '+t.ses+(t.j?' · journaled':' · needs journal'),pnl:t.pnl,k:kind(t.pnl)}}));
  const q=($('jSelSearch').value||'').toLowerCase();
  const shown=q?items.filter(o=>(o.lbl+' '+o.sub).toLowerCase().includes(q)):items;
  const selV=cur.free?'free':cur.idx>=0?String(cur.idx):'';
  $('jSelList').innerHTML=shown.length?shown.map(o=>{
    const sel=o.v===selV,dotc=o.pnl==null?'var(--faint)':col(o.k);
    return '<div class="j-cb-opt" role="option" data-v="'+o.v+'" aria-selected="'+sel+'"><span class="j-cb-dot" style="background:'+dotc+'"></span>'+
      '<span class="j-cb-main"><span class="j-cb-t1">'+esc(o.lbl)+'</span><span class="j-cb-t2">'+esc(o.sub)+'</span></span>'+
      (o.pnl==null?'':'<span class="j-cb-pnl" style="color:'+dotc+'">'+money(o.pnl)+'</span>')+
      '<svg class="j-cb-ck" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg></div>'}).join('')
    :'<div class="j-cb-empty">No trades match "'+esc(q)+'"</div>';
  const cur2=items.find(o=>o.v===selV);
  $('jSelLbl').textContent=cur2?cur2.lbl+(cur2.pnl==null?'':' · '+money(cur2.pnl)):'Choose a trade…'}
let jCbOpen=false;
function jCbSet(open){jCbOpen=open;$('jCb').dataset.open=open?'1':'0';$('jSelPop').hidden=!open;$('jSelBtn').setAttribute('aria-expanded',open);if(open){$('jSelSearch').value='';fillSel();setTimeout(()=>$('jSelSearch').focus(),0)}}
$('jSelBtn').addEventListener('click',e=>{e.stopPropagation();jCbSet(!jCbOpen)});
{let jSelT;$('jSelSearch').addEventListener('input',()=>{clearTimeout(jSelT);jSelT=setTimeout(fillSel,120)})}
$('jSelList').addEventListener('click',e=>{const o=e.target.closest('.j-cb-opt');if(!o)return;const v=o.dataset.v;jCbSet(false);pick(v==='free'?-2:+v)});
document.addEventListener('click',e=>{if(jCbOpen&&!$('jCb').contains(e.target))jCbSet(false)});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&jCbOpen)jCbSet(false)});
function card(){const t=T[cur.idx],el=$('jTrade');
  if(!t){el.className='j-tc empty';el.style.removeProperty('--rc');el.innerHTML=cur.free?'<b>Free note</b><span>Not linked to a trade. Use it for lessons, sessions or rule changes.</span>':'<b>No trade selected</b><span>Pick a trade above to start its journal.</span>';return}
  const k=kind(t.pnl),c=col(k),W={SL:'stop loss',TP:'target',User:'manual close'};
  const arrow=t.side==='BUY'?'<path d="M12 19V5M6 11l6-6 6 6"/>':'<path d="M12 5v14M6 13l6 6 6-6"/>';
  const mv=t.side==='BUY'?t.ex-t.en:t.en-t.ex;
  el.className='j-tc';el.style.setProperty('--rc',c);
  el.innerHTML='<span class="j-tc-ic"><svg viewBox="0 0 24 24">'+arrow+'</svg></span>'+
  '<div><span class="t-sym">'+(window.iconFor?window.iconFor(t.sym):'<i class="t-coin"></i>')+t.sym+'</span><span class="side-tag '+(t.side==='BUY'?'long':'short')+'">'+t.side+'</span>'+(t.rev?'<span class="t-tag t-tag-rev" style="margin-left:6px">Revenge trade · lot '+t.revSize+'</span>':'')+'<small>'+t.d+' · '+t.t+' IST · '+t.ses+'</small></div>'+
  '<div class="tp"><div class="tp-row">'+
    '<div class="tp-pt"><span>ENTRY</span><b class="mono">'+(Number.isFinite(t.en)?t.en.toFixed(2):'-')+'</b></div>'+
    '<div class="tp-track"><i></i><span class="tp-dot a"></span><span class="tp-dot b"></span></div>'+
    '<div class="tp-pt tp-r"><span>EXIT</span><b class="mono">'+(Number.isFinite(t.ex)?t.ex.toFixed(2):'-')+'</b></div>'+
  '</div><div class="tp-foot"><span class="tp-pts" style="color:'+c+'">'+(Number.isFinite(mv)?(mv>=0?'+':'')+mv.toFixed(2)+' pts':'no price data')+'</span>'+(W[t.why]?'<span>· Closed by '+W[t.why]+'</span>':'')+'</div></div>'+
  '<div>'+(t.sl==null?'<span class="t-chip t-warn">No SL</span>':'')+'</div><div class="j-pl mono" style="color:'+c+'">'+money(t.pnl)+'</div>'+
  '<div class="j-emo-row" style="grid-column:1/-1;margin-top:10px;display:flex;flex-wrap:wrap;gap:6px">'+EMOTIONS.map(x=>'<button type="button" class="j-tg'+(cur.emotion===x?' on':'')+'" data-emo="'+x+'" aria-pressed="'+(cur.emotion===x)+'">'+x+'</button>').join('')+'</div>'}
window.jGrade=function(q){if(!Array.isArray(q)||q.length<3||q.slice(0,3).some(function(v){return v!=='Yes'&&v!=='No'}))return null;var n=q.slice(0,3).filter(function(v){return v==='Yes'}).length;return [{g:'F',c:'var(--red)'},{g:'C',c:'var(--amber)'},{g:'B',c:'var(--accent-2)'},{g:'A+',c:'var(--green)'}][n]};
window.jGradeChip=function(q){var r=window.jGrade(q);return r?'<span class="j-gr" style="--gc:'+r.c+'" title="Trade grade from your 3 Yes/No checks"><b>'+r.g+'</b>Grade</span>':'<span class="j-gr none" title="Answer all 3 Yes/No checks to grade this trade"><b>–</b>Not graded</span>'};
function yn(){var gb=document.getElementById('jGradeBox');if(gb)gb.innerHTML=window.jGradeChip(cur.q)+'<span class="sub">Auto-graded from your 3 Yes/No checks.</span>';document.querySelectorAll('#view-journal .j-yn[data-q]').forEach(g=>g.querySelectorAll('.a-tab').forEach(b=>{const on=cur.q[+g.dataset.q]===b.dataset.v;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)}))}
function tags(){$('jTags').innerHTML=TAGS.map(t=>{const on=cur.tags.includes(t);return '<button type="button" class="j-tg'+(on?' on':'')+'" data-t="'+t+'" aria-pressed="'+on+'">'+t+'</button>'}).join('')}
/*SH-START*/
/* Several screenshots per journal. Stored as tiny JPEGs in one synced key, journall_shots_v1, with a small total budget
   and a check against the cloud document size limit, because every synced key lives in one Firestore document. */
const SHK=JL_KEYS.keys.JOURNALL_SHOTS_V1,SH_PER=4,SH_IMG=28000,SH_TOTAL=300000,SH_DOC=800000;
/*SH-PURE-START*/
const shId=id=>{id=String(id==null?'':id);const c=id.charAt(0);return(c==='L'||c==='j')?id.slice(1):id};
const shClean=raw=>{const out={};if(!raw||typeof raw!=='object'||Array.isArray(raw))return out;Object.keys(raw).forEach(k=>{const v=raw[k];if(!Array.isArray(v))return;out[k]=v.filter(x=>typeof x==='string'&&/^data:image\/jpeg;base64,/.test(x)).slice(0,4)});return out};
const shChars=list=>(Array.isArray(list)?list:[]).reduce((n,x)=>n+x.length,0);
const shTotal=map=>Object.keys(map).reduce((n,k)=>n+shChars(map[k]),0);
const shCheck=o=>{if(o.count>o.per)return{ok:false,why:'A trade can hold up to '+o.per+' screenshots.'};if(o.img>o.maxImg)return{ok:false,why:'That screenshot is still too large after shrinking.'};if(o.total>o.maxTotal)return{ok:false,why:'Screenshot budget is full ('+Math.round(o.totalBefore/1000)+' of '+Math.round(o.maxTotal/1000)+' KB used). Remove one first.'};if(o.doc>o.maxDoc)return{ok:false,why:'Your synced data is close to the cloud size limit, so no more screenshots can be added.'};return{ok:true,why:''}};
/*SH-PURE-END*/
const shRead=()=>{try{return shClean(JSON.parse(localStorage.getItem(SHK)))}catch(_){return{}}};
const shWrite=m=>{try{localStorage.setItem(SHK,JSON.stringify(m));return true}catch(_){return false}};
const shFor=id=>(shRead()[shId(id)]||[]).slice();
function shSave(id){const m=shRead(),k=shId(id),l=(cur.shots||[]).slice();if(!l.length&&!(k in m))return true;m[k]=l;return shWrite(m)}
function shClear(id){const m=shRead(),k=shId(id);if(m[k]&&m[k].length){m[k]=[];shWrite(m)}}
function shSynced(){let n=0;try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(!k||k===JL_KEYS.keys.KRISHNA_JOURNAL_FORM_DRAFT||k===JL_KEYS.keys.KRISHNA_PSYCHOLOGY_FORM_DRAFT)continue;if(k==='theme'||k==='selectedDate'||['viz','viztrade','krishna','journall'].some(p=>k.indexOf(p)===0))n+=k.length+(localStorage.getItem(k)||'').length}}catch(_){console.debug('[journall] ignored error in journal-tab.js:', _);}return n}
function shShrink(file){return new Promise((res,rej)=>{const url=URL.createObjectURL(file),im=new Image();
  im.onload=()=>{URL.revokeObjectURL(url);try{
    for(const side of [560,480,400,320,260]){const sc=Math.min(1,side/Math.max(im.naturalWidth,im.naturalHeight)),w=Math.max(1,Math.round(im.naturalWidth*sc)),h=Math.max(1,Math.round(im.naturalHeight*sc)),cv=document.createElement('canvas');cv.width=w;cv.height=h;const g=cv.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,w,h);g.drawImage(im,0,0,w,h);
      for(const q of [.5,.4,.3]){const d=cv.toDataURL('image/jpeg',q);if(d.length<=SH_IMG){res(d);return}}}
    res(null)}catch(e){rej(e)}};
  im.onerror=()=>{URL.revokeObjectURL(url);rej(new Error('bad image'))};im.src=url})}
function shPaint(){const box=$('jShotBox');if(!box)return;const m=shRead(),own=m[shId(cur.id)]||[],pend=cur.shots||[],used=shTotal(m)-shChars(own)+shChars(pend);let h='';
  if(pend.length)h+='<div class="j-shots">'+pend.map((d,i)=>'<figure class="j-shot"><img alt="Screenshot '+(i+1)+'" src="'+d+'" data-shbig="'+i+'"><button type="button" class="j-shx" data-shx="'+i+'" aria-label="Remove screenshot '+(i+1)+'">&times;</button></figure>').join('')+'</div>';
  h+='<span class="j-shm">'+(pend.length?pend.length+' of '+SH_PER+' screenshots. ':'No screenshots attached. ')+'Budget '+Math.round(used/1000)+' of '+Math.round(SH_TOTAL/1000)+' KB.</span>';box.innerHTML=h}
$('jShotF').addEventListener('change',async e=>{const files=Array.from(e.target.files||[]);e.target.value='';if(!files.length)return;cur.shots=cur.shots||[];let note='';
  for(const f of files){if(!/^image\//.test(f.type)){note='Only image files can be attached.';continue}
    if(cur.shots.length>=SH_PER){note='A trade can hold up to '+SH_PER+' screenshots.';break}
    let d=null;try{d=await shShrink(f)}catch(_){note='Could not read '+f.name+'.';continue}
    if(!d){note=f.name+' is still too large after shrinking.';continue}
    const m=shRead(),own=m[shId(cur.id)]||[],before=shTotal(m)-shChars(own)+shChars(cur.shots);
    const r=shCheck({count:cur.shots.length+1,per:SH_PER,img:d.length,maxImg:SH_IMG,total:before+d.length,totalBefore:before,maxTotal:SH_TOTAL,doc:shSynced()-shChars(own)+shChars(cur.shots)+d.length,maxDoc:SH_DOC});
    if(!r.ok){note=r.why;break}
    cur.shots.push(d)}
  shPaint();msg(note)});
$('jShotBox').addEventListener('click',e=>{const x=e.target.closest('[data-shx]');if(x){cur.shots.splice(+x.dataset.shx,1);shPaint();msg('');return}const im=e.target.closest('[data-shbig]');if(im)im.closest('.j-shot').classList.toggle('big')});
/*SH-END*/
function resetAtt(){if(urls.rec){URL.revokeObjectURL(urls.rec);urls.rec=null}$('jRecBox').textContent=cur.rec?cur.rec+' (attach again to preview)':PH.rec;shPaint()}
function fields(e){e=e||{};$('jMis').value=e.mistake||'';$('jBef').value=e.before||'';$('jAft').value=e.after||'';$('jImp').value=e.improve||'';$('jDate').value=e.date||(window.getTradingDayIST?window.getTradingDayIST():new Date().toISOString().slice(0,10));$('jSetup').value=e.setup||''}
/*CF-START*/
const CFK=JL_KEYS.keys.JOURNALL_CONFLUENCE_LIST_V1;let CF=[];try{const v=JSON.parse(localStorage.getItem(CFK));if(Array.isArray(v))CF=v.filter(x=>typeof x==='string'&&x.trim()).map(x=>x.trim())}catch(e){console.debug('[journall] ignored error in journal-tab.js:', e);}
let cfEdit=false;const cfSave=()=>{try{localStorage.setItem(CFK,JSON.stringify(CF))}catch(e){console.debug('[journall] ignored error in journal-tab.js:', e);}};
function conf(){const w=$('jConf');if(!w)return;const all=CF.concat((cur.conf||[]).filter(x=>!CF.includes(x)));
  w.innerHTML=all.length?all.map(t=>{const on=cur.conf.includes(t),inList=CF.includes(t);return '<button type="button" class="j-tg cf'+(on?' on':'')+'" data-cf="'+esc(t)+'" aria-pressed="'+on+'">'+esc(t)+(cfEdit&&inList?'<span class="cf-x" data-cfx="'+esc(t)+'" role="button" aria-label="Remove '+esc(t)+' from list">×</span>':'')+'</button>'}).join(''):'<span class="j-cf-empty">No confluences yet. Add your first one below.</span>';
  $('jConfMg').setAttribute('aria-pressed',cfEdit);$('jConfMg').textContent=cfEdit?'Done':'Edit list'}
function addConf(){const inp=$('jConfNew'),v=inp.value.replace(/\s+/g,' ').trim();if(!v)return;const dup=CF.find(c=>c.toLowerCase()===v.toLowerCase()),name=dup||v;
  if(!dup){CF.push(name);cfSave()}if(!cur.conf.includes(name))cur.conf.push(name);inp.value='';conf()}
$('jConfWrap').addEventListener('click',e=>{const x=e.target.closest('[data-cfx]');
  if(x){const v=x.dataset.cfx;CF=CF.filter(c=>c!==v);cfSave();conf();return}
  const t=e.target.closest('[data-cf]');if(t){const v=t.dataset.cf,i=cur.conf.indexOf(v);if(i<0)cur.conf.push(v);else cur.conf.splice(i,1);conf();return}
  if(e.target.closest('#jConfMg')){cfEdit=!cfEdit;conf();return}if(e.target.closest('#jConfAdd'))addConf()});
$('jConfNew').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addConf()}});
/*CF-END*/
function paint(){fillSel();card();yn();tags();conf();resetAtt();if(typeof syncCounts==='function')syncCounts();$('jChk').innerHTML=''}
function load(e){blank();cur.id=e.id;cur.idx=T.findIndex(t=>key(t)===e.key);cur.free=cur.idx<0;cur.q=(e.q||[null,null,null]).slice();cur.tags=(e.tags||[]).map(x=>x==='Lot Over 0.02'?'Lot Over Limit':x);cur.conf=(e.conf||[]).slice();cur.emotion=e.emotion||'';cur.shot=e.shot||'';cur.shots=shFor(e.id);cur.rec=e.rec||'';fields(e);paint();msg('Editing saved journal.')}
function pick(i){const e0=i>=0?J.find(e=>e.key===key(T[i])):null;if(e0){load(e0);return}
  blank();cur.idx=i>=0?i:-1;cur.free=i===-2;fields(null);
  if(i>=0){const t=T[i];$('jDate').value=t.d;$('jSetup').value='';cur.tags=(t.tags||[]).slice().concat(t.sl==null&&!(t.tags||[]).includes('No SL')?['No SL']:[])}
  paint();msg('')}
window.__jPick = pick;
// Getter (not a snapshot) because J gets reassigned on delete/import, not just mutated —
// a plain window.__journals=J here would go stale after those. Used by the Calendar day
// panel to show mistake/emotion/notes without duplicating this file's persistence logic.
window.__getJournals = () => J;
// The Trades script's own initial render() already ran before this script (document
// order), when window.__getJournals didn't exist yet — so its "Journaled" status and
// inline mistake/emotion details would be stale/empty until something re-renders it.
// Re-render it now that real journal data is available.
if(window.__trRender) window.__trRender();
function read(){const t=T[cur.idx],o=J.find(x=>x.id===cur.id)||{};
  return{id:cur.id||'j'+Date.now(),key:t?key(t):(o.key||''),date:$('jDate').value,time:t?t.t:(o.time||''),sym:t?t.sym:(o.sym||''),side:t?t.side:(o.side||''),pnl:t?t.pnl:(o.pnl==null?null:o.pnl),setup:$('jSetup').value,q:cur.q.slice(),tags:cur.tags.slice(),conf:cur.conf.slice(),emotion:cur.emotion||'',mistake:$('jMis').value.trim(),before:$('jBef').value.trim(),after:$('jAft').value.trim(),improve:$('jImp').value.trim(),shot:cur.shot,rec:cur.rec}}
function saveJ(){if(cur.idx<0&&!cur.free){msg('Pick a trade or choose Free note first.');return}
  const e=read();if(!e.improve&&!e.mistake&&!e.before){msg('Write at least one note before saving.');return}
  const i=J.findIndex(x=>x.id===e.id);if(i>=0)J[i]=e;else J.unshift(e);cur.id=e.id;save();sync();drDelFor(e);msg(shSave(e.id)?'Journal saved.':'Journal saved, but the screenshots could not be stored. Browser storage may be full.')}
function step(d){const l=list(),p=l.indexOf(cur.idx),n=l[p<0?(d>0?0:l.length-1):p+d];if(n==null){msg('No more trades in this view.');return}pick(n)}
function check(){const e=read(),t=T[cur.idx],r=[],bad=s=>r.push(['var(--red)',s]),warn=s=>r.push(['var(--amber)',s]);
  if(cur.idx<0&&!cur.free)bad('No trade selected. Pick the trade this journal belongs to.');
  if(e.q.some(x=>x==null))warn('Answer all three Yes/No questions. Skipped answers hide rule breaks.');
  if(e.q[1]==='No'||e.q[2]==='No')bad('Entry or exit without confirmation. Log it as a mistake.');
  if(t&&t.sl==null)bad('This trade had no stop loss. Log it as a mistake.');
  if(t&&kind(t.pnl)==='loss'&&!e.tags.length&&!e.mistake)warn('Losing trade with no mistake logged. If the trade was valid, say so in Improvement.');
  if(e.tags.includes('Revenge Trade'))bad('Revenge trade logged. Stop trading for today.');
  if(!e.before)warn('Write the emotion before entry. This is where FOMO and revenge show up.');
  if(e.improve.length<15)warn('Improvement is too short. Write one concrete change for the next trade.');
  const nb=r.filter(x=>x[0]==='var(--red)').length,nw=r.filter(x=>x[0]==='var(--amber)').length;
  if(!r.length)r.push(['var(--green)','No gaps found. Save the journal.']);
  const grade=nb?['var(--red)','#2b0b08','!']:nw?['var(--amber)','#2b1c04',String(nw)]:['var(--green)','#062b17','✓'];
  const head='<div class="j-chk-head"><span class="j-badge" style="background:linear-gradient(135deg,'+grade[0]+',color-mix(in srgb,'+grade[0]+' 60%,#000));color:'+grade[1]+'">'+grade[2]+'</span><div><b style="font-size:13.5px">'+(nb?nb+' blocking issue'+(nb>1?'s':''):nw?nw+' thing'+(nw>1?'s':'')+' worth fixing':'Ready to save')+'</b><div class="sub" style="margin-top:2px">'+(nb?'Fix these before you save.':nw?'Not blocking, but worth a look.':'No gaps found in this journal.')+'</div></div></div>';
  $('jChk').innerHTML=head+'<ul class="a-ins tight" style="margin-top:14px">'+r.map(x=>'<li style="--c:'+x[0]+'">'+x[1]+'</li>').join('')+'</ul>'}
function ecard(e){(window.__jlShareE=window.__jlShareE||{})[e.id]=e;const k=e.pnl==null?'note':kind(e.pnl),c=k==='note'?'var(--accent-2)':col(k),ttl={win:'Win journal',loss:'Loss journal',be:'Break-even journal',note:'Free note'}[k];
  const ic={win:'<path d="M12 19V5M6 11l6-6 6 6"/>',loss:'<path d="M12 5v14M6 13l6 6 6-6"/>',be:'<path d="M5 12h14"/>',note:'<path d="M12 6v14M12 6C10 4.5 7 4 3 4v14c4 0 7 .5 9 2 2-1.5 5-2 9-2V4c-4 0-7 .5-9 2z"/>'}[k];
  const real=v=>{v=String(v==null?'':v).trim();return v&&!/^none$/i.test(v)?v:''},mis=real(e.mistake),imp=real(e.improve);
  const chips=(e.setup?'<span class="jv-chip"><i>Setup</i>'+esc(e.setup)+'</span>':'')+(e.emotion?'<span class="jv-chip"><i>Feeling</i>'+esc(e.emotion)+'</span>':'')+(e.conf&&e.conf.length?e.conf.map(c=>'<span class="jv-cf">'+esc(c)+'</span>').join(''):'')+(e.tags&&e.tags.length?e.tags.map(t=>'<span class="t-tag">'+esc(t==='Lot Over 0.02'?'Lot Over Limit':t)+'</span>').join(''):'');
  const notes=(mis?'<div class="jv-note jv-bad"><small>Mistake</small>'+esc(mis)+'</div>':'')+(imp?'<div class="jv-note jv-good"><small>Improve</small>'+esc(imp)+'</div>':'');
  return '<article class="j-entry jv" style="--c:'+c+'"><div class="jv-top"><span class="jv-ic"><svg viewBox="0 0 24 24">'+ic+'</svg></span>'+
    '<div class="jv-id"><b>'+ttl+'</b><span class="mono">'+esc([e.date,e.time,e.sym,e.side].filter(Boolean).join(' · '))+'</span></div>'+
    '<div class="jv-r">'+(e.pnl==null?'':'<span class="jv-pnl mono">'+money(e.pnl)+'</span>')+window.jGradeChip(e.q)+'</div></div>'+
    (chips?'<div class="jv-chips">'+chips+'</div>':'')+(notes?'<div class="jv-notes">'+notes+'</div>':'')+
    '<div class="jv-foot">'+(e.pnl==null?'':'<button type="button" class="btn-ghost j-sm" data-share="'+esc(e.id)+'">Share</button>')+'<button type="button" class="btn-ghost j-sm" data-ed="'+esc(e.id)+'">Edit</button><button type="button" class="btn-ghost j-sm" data-del="'+esc(e.id)+'">Delete</button>'+(qlByKey[e.key]?'<button type="button" class="btn-ghost j-sm" data-qled="'+esc(qlByKey[e.key])+'">Edit trade</button><button type="button" class="btn-ghost j-sm j-ql-del" data-qldel="'+esc(qlByKey[e.key])+'">Delete trade</button>':'')+'</div></article>'}
var qlByKey={};
function qlKeys(){const m={},lk={};try{(JSON.parse(localStorage.getItem(JL_KEYS.keys.VIZTRADE_TRADING_PAGE_TRADES)||'[]')||[]).forEach(t=>{if(t&&/^ql-/.test(String(t.id)))lk[window.JLAdapter.liveKey(t)]=t.id})}catch(_){console.debug('[journall] ignored error in journal-tab.js:', _);}
  T.forEach(t=>{const id=t&&t._lk!=null?lk[t._lk]:null;if(id)m[key(t)]=id});return m}
function renderList(){qlByKey=qlKeys();const s=qs.toLowerCase(),a=J.filter(e=>(jf==='All'||(e.pnl==null?'note':kind(e.pnl))===jf)&&(!s||JSON.stringify(e).toLowerCase().includes(s)));
  $('jCnt').textContent=J.length+(J.length===1?' entry':' entries');
  $('jList').innerHTML=a.length?a.slice(0,jShown).map(ecard).join('')+(a.length>jShown?'<div style="text-align:center;margin:14px 0"><button type="button" class="gg-btn-solid" id="jMore">Show '+Math.min(30,a.length-jShown)+' more ('+(a.length-jShown)+' left)</button></div>':''):'<div class="j-none">No journals match. Save a trade journal or clear the search.</div>'}
function jKP(){const d=T.filter(t=>t.j).length,left=T.length-d,pct=T.length?d/T.length*100:0,
  breaks=J.reduce((s,e)=>s+(e.tags?e.tags.length:0),0),
  answered=J.filter(e=>e.q&&e.q.some(v=>v)),
  clean=J.filter(e=>e.q&&e.q.length===3&&e.q.every(v=>v==='Yes')).length,
  cleanPct=answered.length?clean/answered.length*100:0,
  mist=J.filter(e=>e.mistake&&e.mistake.trim()).length;
  $('jKP').innerHTML=[
    ['Coverage',pct.toFixed(0)+'%',pct>=80?'var(--green)':pct>=40?'var(--amber)':'var(--red)',d+' of '+jlN(T.length,'trade')+' journaled'],
    ['Needs journal',String(left),left?'var(--amber)':'var(--green)',left?'Trades still missing a note':'All trades journaled'],
    ['Entries saved',String(J.length),'var(--text)',J.length===1?'1 note on this device':J.length+' notes on this device'],
    ['Checklist clean',answered.length?cleanPct.toFixed(0)+'%':'—',cleanPct>=70?'var(--green)':cleanPct>=40?'var(--amber)':'var(--red)',clean+' of '+answered.length+' fully confirmed'],
    ['Rule breaks logged',String(breaks),breaks?'var(--red)':'var(--green)',mist+' entries with a named mistake']
  ].map(k=>'<div><span>'+k[0]+'</span><b style="color:'+k[2]+'">'+k[1]+'</b><small>'+k[3]+'</small></div>').join('')}
let misP='Today';
function weekBounds(){const today=window.getTradingDayIST?window.getTradingDayIST():new Date().toISOString().slice(0,10),p=today.split('-').map(Number),dt=new Date(Date.UTC(p[0],p[1]-1,p[2])),dow=(dt.getUTCDay()+6)%7;return{today,ws:new Date(dt.getTime()-dow*864e5).toISOString().slice(0,10),we:new Date(dt.getTime()+(6-dow)*864e5).toISOString().slice(0,10)}}
function misCounts(){const b=weekBounds(),inP=d=>misP==='All'?true:misP==='Today'?d===b.today:misP==='Week'?(d>=b.ws&&d<=b.we):d.slice(0,7)===b.today.slice(0,7),c={};
  J.forEach(e=>{if(!e||!e.date||!Array.isArray(e.tags)||!inP(e.date))return;e.tags.forEach(g=>{c[g]=(c[g]||0)+1})});
  return Object.entries(c).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))}
function misCard(){const bd=$('jMisBody');if(!bd)return;const r=misCounts(),mx=r.length?r[0][1]:1,lbl={Today:'today',Week:'this week',Month:'this month',All:'yet'}[misP];
  document.querySelectorAll('#jMisTabs .a-tab').forEach(x=>{const on=x.dataset.p===misP;x.classList.toggle('on',on);x.setAttribute('aria-pressed',on)});
  bd.innerHTML=r.length?r.map(x=>'<div class="j-mc-r"><span>'+esc(x[0])+'</span><div class="j-mc-t"><i style="width:'+(x[1]/mx*100).toFixed(0)+'%"></i></div><b class="mono">'+x[1]+'</b></div>').join(''):'<div class="j-mc-e">No mistakes logged '+lbl+'.</div>'}
function sync(){T.forEach(t=>{t.j=J.some(e=>e.key===key(t))});const d=T.filter(t=>t.j).length,pct=T.length?d/T.length:0;
  $('jCov').textContent=d+' of '+jlN(T.length,'trade')+' journaled';$('jBar').style.width=(pct*100)+'%';
  const jFull = T.length>0 && d===T.length, jWasFull = $('jBarWrap').classList.contains('full');
  $('jBarWrap').classList.toggle('full', jFull);
  if(jFull && !jWasFull){ const w=$('jBarWrap'); w.style.animation='none'; void w.offsetWidth; w.style.animation=''; }
  $('jRingV').style.strokeDashoffset=(100.5*(1-pct)).toFixed(1);
  $('jSub').textContent=jlN(T.length,'trade')+' · '+J.length+(J.length===1?' journal entry':' journal entries')+' · saved on this device';
  jKP();renderList();misCard();fillSel();if(window.__trRender)window.__trRender()}

$('view-journal').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const d=b.dataset,pid=b.parentNode.id;
  if(d.qled||d.qldel){const fn=d.qled?window.qlEditTrade:window.qlDeleteTrade;if(typeof fn==='function')fn(d.qled||d.qldel,b);return}
  if(d.emo){cur.emotion=cur.emotion===d.emo?'':d.emo;card();return}
  if(d.t){const i=cur.tags.indexOf(d.t);if(i<0)cur.tags.push(d.t);else cur.tags.splice(i,1);tags();return}
  if(b.parentNode.dataset.q!=null){cur.q[+b.parentNode.dataset.q]=d.v;yn();return}
  if(d.pick){$(d.pick).click();return}
  if(d.ed){const x=J.find(y=>y.id===d.ed);if(x)load(x);return}
  if(d.del){const x=J.find(y=>y.id===d.del);if(!x)return;
    const k=x.pnl==null?'note':kind(x.pnl),ttl={win:'Win journal',loss:'Loss journal',be:'Break-even journal',note:'Free note'}[k];
    window.jlConfirm({title:'Delete this journal?',body:'This removes the entry from this device. You get 5 seconds to undo it.',
      preview:{title:ttl,sub:[x.date,x.sym,x.side].filter(Boolean).join(' · '),value:x.pnl==null?'':money(x.pnl),color:k==='note'?'var(--accent-2)':col(k)},
      confirmText:'Delete',cancelText:'Keep it',danger:true,opener:b}).then(ok=>{
      if(!ok)return;const i=J.findIndex(y=>y.id===x.id);if(i<0)return;
      J.splice(i,1);save();sync();setTimeout(()=>{if(!J.some(y=>y.id===x.id))shClear(x.id)},6000);
      window.jlToast({icon:'trash',text:'Journal deleted',sub:[ttl,x.sym].filter(Boolean).join(' · '),actionText:'Undo',duration:5000,
        onAction:()=>{if(J.some(y=>y.id===x.id))return;J.splice(Math.min(i,J.length),0,x);save();sync();window.jlToast({icon:'check',text:'Journal restored',duration:2200,progress:false})}})});
    return}
  if(pid==='jFilt'){filt=d.v;seg(b);fillSel();return}
  if(pid==='jRes'){jf=d.v;jShown=30;seg(b);renderList();return}
  ({jSave:saveJ,jDraft:drSaveBtn,jDrResume:drResume,jDrDiscard:drDiscard,jNext:()=>step(1),jPrev:()=>step(-1),jCheck:check,jClear:()=>{drDelFor(read());blank();fields(null);paint();msg('')},jImpB:()=>$('jImpFile').click(),
   jExp:()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(J,null,2)],{type:'application/json'}));a.download='journall-journals.json';a.click();URL.revokeObjectURL(a.href)}})[b.id]?.()});
{let jST;$('jSrch').addEventListener('input',e=>{qs=e.target.value;jShown=30;clearTimeout(jST);jST=setTimeout(renderList,150)});$('jList').addEventListener('click',e=>{if(e.target.closest&&e.target.closest('#jMore')){jShown+=30;renderList()}})}
/* Quick Log trade delete: keep this page's in-memory journals in step, so a later save cannot write a deleted journal back (and flip its deletion record). Nothing is saved here. */
const qlHold={},qlJid=v=>String(v).replace(/^[Lj]/,'');
window.addEventListener('ql-journal-removed',ev=>{const w=qlJid(ev.detail&&ev.detail.id),i=J.findIndex(x=>x&&qlJid(x.id)===w);if(i<0)return;
  qlHold[w]={e:J[i],i:i};const gone=String(J[i].id);J.splice(i,1);
  if(cur.id!=null&&String(cur.id)===gone){blank();fields(null);paint();msg('This journal was deleted with its trade.')}
  sync()});
window.addEventListener('ql-journal-changed',ev=>{const en=ev.detail&&ev.detail.entry;if(!en||en.id==null||!window.JLAdapter||!window.__jlImp)return;
  let d;try{d=window.JLAdapter.journalToDesign(en,window.__jlImp)}catch(_){return}
  const w=qlJid(en.id),i=J.findIndex(x=>x&&qlJid(x.id)===w);if(i>=0)J[i]=d;else J.push(d);
  if(cur.id!=null&&qlJid(cur.id)===w){blank();fields(null);paint();msg('This journal was updated with its trade. Open it again to keep editing.')}
  sync()});
window.addEventListener('ql-journal-restored',ev=>{const w=qlJid(ev.detail&&ev.detail.id),h=qlHold[w];if(!h)return;delete qlHold[w];
  if(!J.some(x=>x&&qlJid(x.id)===w))J.splice(Math.min(h.i,J.length),0,h.e);sync()});
$('jMisTabs').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!b.dataset.p)return;misP=b.dataset.p;misCard()});
[['jRecF','rec','jRecBox']].forEach(([id,k,box])=>$(id).addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;
  if(urls[k])URL.revokeObjectURL(urls[k]);const u=urls[k]=URL.createObjectURL(f);cur[k]=f.name;
  $(box).innerHTML=(k==='shot'?'<img alt="Attached screenshot" src="'+u+'">':'<video controls src="'+u+'"></video>')+'<span>'+esc(f.name)+'</span>'}));
$('jImpFile').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();
  r.onload=()=>{try{let d=JSON.parse(r.result),n=0;d=Array.isArray(d)?d:(d.journals||d.entries||[]);
    d.forEach(x=>{if(!x||typeof x!=='object')return;n++;J.push({id:'i'+Date.now()+'_'+n,key:x.key||'',date:x.date||'',time:x.time||'',sym:x.sym||x.symbol||'',side:x.side||'',pnl:x.pnl==null?null:+x.pnl,setup:x.setup||'',q:x.q||[null,null,null],tags:x.tags||[],mistake:x.mistake||'',before:x.before||'',after:x.after||'',improve:x.improve||x.improvement||''})});
    save();sync();msg('Imported '+n+' journals.')}catch(_){msg('That file is not valid JSON.')}};r.readAsText(f);e.target.value=''});
[['jMis','jMisC'],['jBef','jBefC'],['jAft','jAftC'],['jImp','jImpC']].forEach(([id,cid])=>$(id).addEventListener('input',()=>{$(cid).textContent=$(id).value.length}));
function syncCounts(){[['jMis','jMisC'],['jBef','jBefC'],['jAft','jAftC'],['jImp','jImpC']].forEach(([id,cid])=>{$(cid).textContent=$(id).value.length})}
/*DR-START*/
const DRK=JL_KEYS.keys.KRISHNA_JOURNAL_FORM_DRAFT;
/*DR-PURE-START*/
const drNorm=v=>v==null||v===''||(Array.isArray(v)&&v.every(x=>x==null||x===''))?'':v;
const DRF=['date','setup','q','tags','conf','emotion','mistake','before','after','improve','shot','rec'];
const drHasContent=e=>!!e&&!!(e.mistake||e.before||e.after||e.improve||e.setup||e.emotion||e.shot||e.rec||(e.conf&&e.conf.length)||(e.q&&e.q.some(x=>x)));
const drSame=(e,o)=>!!o&&DRF.every(k=>JSON.stringify(drNorm(e[k]))===JSON.stringify(drNorm(o[k])));
const drMatches=(d,e,free)=>!!d&&((!!d.id&&d.id===e.id)||(d.e.key===e.key&&!!d.free===!!free));
/*DR-PURE-END*/
const drRead=()=>{try{const d=JSON.parse(localStorage.getItem(DRK));return d&&typeof d==='object'&&d.e&&typeof d.e==='object'?d:null}catch(_){return null}};
const drWrite=d=>{try{localStorage.setItem(DRK,JSON.stringify(d));return true}catch(_){return false}};
let drTimer=null;
function drDel(){clearTimeout(drTimer);try{localStorage.removeItem(DRK)}catch(_){console.debug('[journall] ignored error in journal-tab.js:', _);}drRender()}
function drDelFor(e){const d=drRead();if(drMatches(d,e,cur.free))drDel()}
function drCapture(){if(cur.idx<0&&!cur.free)return false;const e=read();
  if(!drHasContent(e)||drSame(e,J.find(x=>x.id===cur.id)))return false;
  const old=drRead();if(old&&(old.id||null)===(cur.id||null)&&!!old.free===!!cur.free&&DRF.every(k=>JSON.stringify(old.e[k])===JSON.stringify(e[k])))return false;
  return drWrite({v:1,at:Date.now(),free:!!cur.free,id:cur.id||null,e:e})}
function drQueue(){clearTimeout(drTimer);drTimer=setTimeout(()=>{if(drCapture())drRender()},800)}
function drRender(){const sec=$('jDraftSec');if(!sec)return;const d=drRead();
  if(!d){sec.style.display='none';$('jDraftBody').innerHTML='';return}
  const e=d.e,k=e.pnl==null?'note':kind(e.pnl),c=k==='note'?'var(--accent-2)':col(k),
    ttl={win:'Win journal draft',loss:'Loss journal draft',be:'Break-even journal draft',note:'Free note draft'}[k],
    ic={win:'<path d="M12 19V5M6 11l6-6 6 6"/>',loss:'<path d="M12 5v14M6 13l6 6 6-6"/>',be:'<path d="M5 12h14"/>',note:'<path d="M12 6v14M12 6C10 4.5 7 4 3 4v14c4 0 7 .5 9 2 2-1.5 5-2 9-2V4c-4 0-7 .5-9 2z"/>'}[k],
    real=v=>String(v==null?'':v).trim(),
    snip=[e.mistake,e.improve,e.before,e.after].map(real).find(x=>x&&!/^none$/i.test(x))||'',
    chips=(e.setup?'<span class="jv-chip"><i>Setup</i>'+esc(e.setup)+'</span>':'')+(e.emotion?'<span class="jv-chip"><i>Feeling</i>'+esc(e.emotion)+'</span>':'')+(e.conf&&e.conf.length?e.conf.map(x=>'<span class="jv-cf">'+esc(x)+'</span>').join(''):''),
    at=new Date(d.at);
  $('jDraftPill').textContent='Saved '+at.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
  $('jDraftBody').innerHTML='<article class="j-entry jv" style="--c:'+c+'"><div class="jv-top"><span class="jv-ic"><svg viewBox="0 0 24 24">'+ic+'</svg></span>'+
    '<div class="jv-id"><b>'+ttl+'</b><span class="mono">'+esc([e.date,e.time,e.sym,e.side].filter(Boolean).join(' · '))+'</span></div>'+
    '<div class="jv-r">'+(e.pnl==null?'':'<span class="jv-pnl mono">'+money(e.pnl)+'</span>')+window.jGradeChip(e.q)+'</div></div>'+
    (chips?'<div class="jv-chips">'+chips+'</div>':'')+
    (snip?'<div class="jv-notes"><div class="jv-note"><small>Last note</small>'+esc(snip.length>140?snip.slice(0,140)+'...':snip)+'</div></div>':'')+
    '<div class="jv-foot"><button type="button" class="btn-primary j-sm" id="jDrResume">Resume</button><button type="button" class="btn-ghost j-sm" id="jDrDiscard">Discard</button></div></article>';
  sec.style.display=''}
function drResume(){const d=drRead();if(!d)return;const e=d.e,o=d.id?J.find(x=>x.id===d.id):null;
  blank();const idx=d.free?-1:T.findIndex(t=>key(t)===e.key);
  cur.idx=idx;cur.free=!!d.free||idx<0;cur.id=o?o.id:null;cur.shots=cur.id?shFor(cur.id):[];
  cur.q=(e.q||[null,null,null]).slice();cur.tags=(e.tags||[]).map(x=>x==='Lot Over 0.02'?'Lot Over Limit':x);cur.conf=(e.conf||[]).slice();cur.emotion=e.emotion||'';cur.shot=e.shot||'';cur.rec=e.rec||'';
  fields(e);paint();
  msg(!d.free&&idx<0?'That trade is no longer in your list, so the draft opened as a free note.':'Draft restored.');
  const el=$('jTrade');if(el&&el.scrollIntoView)el.scrollIntoView({behavior:'smooth',block:'center'})}
function drDiscard(){const d=drRead();if(!d)return;drDel();
  if(window.jlToast)window.jlToast({icon:'trash',text:'Draft discarded',actionText:'Undo',duration:5000,onAction:()=>{if(!drRead()){drWrite(d);drRender()}}})}
function drSaveBtn(){if(cur.idx<0&&!cur.free){msg('Pick a trade or choose Free note first.');return}
  const e=read();if(!drHasContent(e)){msg('Nothing to save yet. Add a note, setup or answer first.');return}
  if(drSame(e,J.find(x=>x.id===cur.id))){msg('This is already saved as a journal, so no draft is needed.');return}
  clearTimeout(drTimer);drCapture();drRender();msg('Draft saved.')}
(function(){const vj=$('view-journal');
  vj.addEventListener('click',e=>{if(e.target.closest('#jDraftSec'))return;if(drCapture())drRender()},true);
  vj.addEventListener('click',e=>{if(e.target.closest('#jDraftSec'))return;drQueue()});
  vj.addEventListener('input',drQueue);
  window.addEventListener('pagehide',()=>{clearTimeout(drTimer);drCapture()});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(drTimer);drCapture()}});})();
/*DR-END*/
fields(null);paint();syncCounts();sync();drRender();
})();
