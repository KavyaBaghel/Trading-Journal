(function(){
/* Prop firm progress: consistency rule, minimum trading days, profit split and a payout log.
   Every number comes from Account Settings or from what you type. Nothing is assumed. */
var PK='journall_payouts_v1';
/*PR-PURE-START*/
function dayNets(trades){var m={},order=[];(Array.isArray(trades)?trades:[]).forEach(function(t){if(!t||!t.d)return;var p=Number(t.pnl);if(!isFinite(p))return;if(!(t.d in m)){m[t.d]=0;order.push(t.d)}m[t.d]+=p});
  return order.sort().map(function(d){return{d:d,net:Math.round(m[d]*100)/100}})}
function propStats(trades,o){var days=dayNets(trades),net=0,best=null;
  days.forEach(function(x){net+=x.net;if(!best||x.net>best.net)best=x});net=Math.round(net*100)/100;
  var r={days:days.length,net:net,best:(best&&best.net>0)?best:null,cons:null,minDays:null};
  if(o.consPct>0){if(net>0&&r.best){var sh=r.best.net/net*100;r.cons={share:sh,limit:o.consPct,ok:sh<=o.consPct+1e-9,maxBest:Math.round(net*o.consPct)/100}}
    else r.cons={share:null,limit:o.consPct,ok:null,maxBest:0}}
  if(o.minDays>0)r.minDays={have:days.length,need:o.minDays,left:Math.max(0,o.minDays-days.length),ok:days.length>=o.minDays};
  return r}
function splitShare(net,pct){return net>0&&pct>0?Math.round(net*pct)/100:0}
function cleanPayouts(raw){var out=[],seen={};if(!Array.isArray(raw))return out;
  raw.forEach(function(x){if(!x||typeof x!=='object')return;var a=Number(x.amount),d=typeof x.date==='string'?x.date:'';if(!isFinite(a)||a<=0||!/^\d{4}-\d{2}-\d{2}$/.test(d))return;
    var id=(typeof x.id==='string'&&x.id)?x.id:'p'+d+'-'+a;if(seen[id])return;seen[id]=1;out.push({id:id,date:d,amount:Math.round(a*100)/100})});
  return out.sort(function(a,b){return a.date<b.date?1:a.date>b.date?-1:0})}
function payoutTotal(list){return Math.round((Array.isArray(list)?list:[]).reduce(function(s,p){return s+p.amount},0)*100)/100}
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function money(v){return(v<0?'-$':'$')+Math.abs(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}
function dayLabel(d){var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(d||'');if(!m)return d||'';var M=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];return M[+m[2]-1]+' '+(+m[3])+', '+m[1]}
function row(label,val,cls,meta,pct){return '<div class="pr-row"><span class="pr-l">'+esc(label)+'</span><span class="pr-v '+(cls||'')+'">'+esc(val)+'</span>'+((typeof pct==='number'&&isFinite(pct))?'<span class="pr-bar '+(cls||'')+'"><i style="width:'+Math.max(0,Math.min(100,pct)).toFixed(1)+'%"></i></span>':'')+(meta?'<span class="pr-m">'+esc(meta)+'</span>':'')+'</div>'}
function summaryHtml(st,o,paid){var h='';
  if(!(o.consPct>0))h+=row('Consistency rule','Not set','mute','Set it in Account Settings.');
  else if(st.cons.ok===null)h+=row('Consistency rule','No profit yet','mute','The rule limits your best day to '+o.consPct+'% of total profit.');
  else h+=row('Consistency rule',st.cons.share.toFixed(1)+'% of profit',st.cons.ok?'ok':'bad',(st.cons.ok?'Within the limit. ':'Over the limit. ')+'Best day '+money(st.best.net)+' on '+dayLabel(st.best.d)+'. At '+o.consPct+'% of '+money(st.net)+' the best day can be up to '+money(st.cons.maxBest)+'.',st.cons.share/o.consPct*100);
  if(!(o.minDays>0))h+=row('Trading days','Not set','mute','Set a minimum in Account Settings.');
  else h+=row('Trading days',st.minDays.have+' of '+st.minDays.need,st.minDays.ok?'ok':'',st.minDays.ok?'Minimum reached.':st.minDays.left+(st.minDays.left===1?' more trading day needed.':' more trading days needed.'),st.minDays.have/st.minDays.need*100);
  if(!(o.split>0))h+=row('Profit split','Not set','mute','Set the split in Account Settings to see your share.');
  else{var sh=splitShare(st.net,o.split);h+=row('Your share ('+o.split+'%)',money(sh),sh>0?'ok':'mute','Estimated from net profit of '+money(st.net)+'.'+(sh>0?' Paid out so far: '+money(paid)+'. Not yet paid: '+money(Math.max(0,Math.round((sh-paid)*100)/100))+'.':''))}
  h+=row('Paid out so far',money(paid),paid>0?'':'mute','');return h}
function listHtml(list){return list.length?list.map(function(p){return '<div class="pr-item"><div class="pr-item-main"><b>'+esc(money(p.amount))+'</b><span class="pr-item-sub">'+esc(dayLabel(p.date))+'</span></div><button type="button" class="pr-btn pr-btn-sm" data-prdel="'+esc(p.id)+'">Delete</button></div>'}).join(''):'<div class="pr-none">No payouts logged yet.</div>'}
function cleanChallenges(raw){var out=[],seen={},re=/^\d{4}-\d{2}-\d{2}$/;if(!Array.isArray(raw))return out;
  raw.forEach(function(x){if(!x||typeof x!=='object')return;var n=typeof x.name==='string'?x.name.trim().slice(0,40):'',s=typeof x.start==='string'?x.start:'',e=typeof x.end==='string'?x.end:'';
    if(!n||!re.test(s)||(e&&(!re.test(e)||e<s)))return;var id=(typeof x.id==='string'&&x.id)?x.id:'c'+s+'-'+n;if(seen[id])return;seen[id]=1;var o={id:id,name:n,start:s,end:e};['dl','md','pt'].forEach(function(k){var v=Number(x[k]);if(x[k]!==''&&x[k]!=null&&isFinite(v)&&v>0&&v<=100)o[k]=Math.round(v*100)/100});out.push(o)});
  return out.sort(function(a,b){return a.start<b.start?-1:a.start>b.start?1:0})}
function scopeTrades(trades,ch){var l=Array.isArray(trades)?trades:[];if(!ch)return l;return l.filter(function(t){return t&&t.d&&t.d>=ch.start&&(!ch.end||t.d<=ch.end)})}
function chipsHtml(list,sel){var h='<button type="button" class="pr-chip'+(sel?'':' on')+'" data-prsc="">All trades</button>';list.forEach(function(c){h+='<button type="button" class="pr-chip'+(sel===c.id?' on':'')+'" data-prsc="'+esc(c.id)+'">'+esc(c.name)+'</button>'});return h}
function limTxt(c){var p=[];if(c.dl)p.push('Daily loss '+c.dl+'%');if(c.md)p.push('Max loss '+c.md+'%');if(c.pt)p.push('Target '+c.pt+'%');return p.length?'<span class="pr-tags">'+p.map(function(x){return '<span class="pr-tag">'+esc(x)+'</span>'}).join('')+'</span>':''}
function limitsHtml(info,anySet){if(!anySet)return '';
  if(!info)return row('Limits in use','Account Settings','mute','No running challenge has its own limits today.');
  var p=[];if(info.dl)p.push('daily loss '+info.dl+'%');if(info.md)p.push('max loss '+info.md+'%');if(info.pt)p.push('target '+info.pt+'%');
  return row('Limits in use',info.name,'ok','From this challenge: '+p.join(', ')+'. Anything not listed uses Account Settings.')}
function chListHtml(list){return list.length?list.map(function(c){return '<div class="pr-item"><div class="pr-item-main"><b>'+esc(c.name)+'</b><span class="pr-item-sub">'+esc(dayLabel(c.start))+' to '+(c.end?esc(dayLabel(c.end)):'now')+'</span>'+limTxt(c)+'</div><button type="button" class="pr-btn pr-btn-sm" data-chdel="'+esc(c.id)+'">Delete</button></div>'}).join(''):'<div class="pr-none">No challenges logged yet.</div>'}
function subText(ch){return ch?('Uses trades from '+ch.name+', '+dayLabel(ch.start)+' to '+(ch.end?dayLabel(ch.end):'now')+'. Rules come from Account Settings.'):'Uses all trades in your data. Add a challenge below to scope it to a phase.'}
function lastClosedDay(trades){var m='',re=/^\d{4}-\d{2}-\d{2}$/;(Array.isArray(trades)?trades:[]).forEach(function(t){if(t&&typeof t.d==='string'&&re.test(t.d)&&t.d>m)m=t.d});return m}
function dayGap(a,b){var x=/^(\d{4})-(\d{2})-(\d{2})$/.exec(a||''),y=/^(\d{4})-(\d{2})-(\d{2})$/.exec(b||'');if(!x||!y)return null;return Math.max(0,Math.round((Date.UTC(+y[1],+y[2]-1,+y[3])-Date.UTC(+x[1],+x[2]-1,+x[3]))/864e5))}
function inactHtml(trades,today){var last=lastClosedDay(trades),n=last?dayGap(last,today):null;
  if(last&&n===null)return '';
  if(n===null)return row('Days without a closed trade','No closed trades yet','mute','The count starts from your first closed trade. FundingPips closes the account after 30 days in a row with no fully closed trade.');
  return row('Days without a closed trade','Day '+n+' of 30',n>=30?'bad':'','Last closed trade on '+dayLabel(last)+'. FundingPips closes the account after 30 days in a row with no fully closed trade. An open trade does not reset it.',Math.min(100,n/30*100))}
/*FP-PURE-START*/
/* FundingPips 5K plans. Only values that the published rule sets agree on are filled; the rest is listed in "skip" so you check it on your dashboard. */
var FP_PLANS=[
 {key:'2step-flex',name:'2 Step Flex',size:5000,phases:[{n:'Phase 1',dl:4,md:12,pt:10},{n:'Phase 2',dl:4,md:12,pt:6}],fill:{cns:0,mtd:0},skip:''},
 {key:'2step-pro',name:'2 Step Pro',size:5000,phases:[{n:'Phase 1',dl:3,md:6,pt:6},{n:'Phase 2',dl:3,md:6,pt:6}],fill:{},skip:'consistency rule and minimum trading days (published sources disagree)'},
 {key:'1step-std',name:'1-Step Standard',size:5000,phases:[{n:'Phase 1',dl:3,md:6,pt:10}],fill:{mtd:3},skip:'consistency rule'},
 {key:'1step-flex',name:'1-Step Flex',size:5000,phases:[{n:'Phase 1',dl:3,md:12,pt:12}],fill:{mtd:0},skip:'consistency rule'},
 {key:'zero',name:'Zero (instant funded)',size:5000,phases:[{n:'Master account',dl:3,md:5,pt:0}],fill:{cns:15},skip:'minimum trading days (published sources disagree). Zero\'s 5% loss limit trails your peak equity, while the drawdown buffer here uses a fixed floor from your initial balance'}
];
function fpPct(v,u,bal){v=Number(v);if(!isFinite(v)||v<=0)return 0;return u==='$'?(bal>0?Math.round(v/bal*10000)/100:0):v}
function fpFind(k){for(var i=0;i<FP_PLANS.length;i++)if(FP_PLANS[i].key===k)return FP_PLANS[i];return null}
function fpDetect(acc){acc=acc&&typeof acc==='object'?acc:{};var bal=Number(acc.balance)||0;
  if(!(bal>0))return{s:'none',why:'Set your initial balance in Account Settings to detect the plan.'};
  if(bal!==5000)return{s:'none',why:'This list covers 5K accounts only. Your initial balance is not 5,000.'};
  var dl=fpPct(acc.maxDailyLossValue,acc.maxDailyLossUnit,bal),md=fpPct(acc.maxDrawdown,acc.maxDrawdownUnit,bal),pt=Number(acc.profitTargetPct)||0;
  if(!(dl>0&&md>0))return{s:'none',why:'Set daily loss and max drawdown in Account Settings to detect the plan.'};
  var hits=[];FP_PLANS.forEach(function(p){p.phases.forEach(function(ph,i){if(Math.abs(ph.dl-dl)<.011&&Math.abs(ph.md-md)<.011)hits.push({p:p,i:i})})});
  if(!hits.length)return{s:'none',why:'Daily loss '+dl+'% and max loss '+md+'% do not match any plan in this list.'};
  var byPt=hits.filter(function(h){return Math.abs((h.p.phases[h.i].pt||0)-pt)<.011}),use=byPt.length?byPt:hits,keys=[];
  use.forEach(function(h){if(keys.indexOf(h.p.key)<0)keys.push(h.p.key)});
  var info={dl:dl,md:md,pt:pt,ptOk:byPt.length>0};
  if(keys.length>1){info.s='multi';info.keys=keys;return info}
  var plan=use[0].p,idx=use.map(function(h){return h.i});info.s='one';info.key=plan.key;info.phase=idx.length===1?idx[0]:-1;return info}
/*FP-PURE-END*/
/*PR-PURE-END*/
function $(id){return document.getElementById(id)}
function rd(){try{return JSON.parse(localStorage.getItem(PK))}catch(_){return null}}
function wr(v){try{localStorage.setItem(PK,JSON.stringify(v));return true}catch(_){msg('Could not save. Browser storage may be full.');return false}}
function msg(t){var m=$('prMsg');if(m)m.textContent=t||''}
function opts(){return{consPct:Number(window.jlConsistencyPct)||0,minDays:Number(window.jlMinTradingDays)||0,split:Number(window.jlProfitSplit)||0}}
var CK='journall_challenges_v1',SK='journall_prop_scope_v1';
function rdC(){try{return JSON.parse(localStorage.getItem(CK))}catch(_){return null}}
function wrC(v){try{localStorage.setItem(CK,JSON.stringify(v));return true}catch(_){cmsg('Could not save. Browser storage may be full.');return false}}
function cmsg(t){var m=$('chMsg');if(m)m.textContent=t||''}
function selId(){try{return localStorage.getItem(SK)||''}catch(_){return ''}}
function render(){var b=$('ggPropBody');if(!b)return;if(window.jlApplyChLimits)window.jlApplyChLimits();var list=cleanPayouts(rd()),chs=cleanChallenges(rdC()),sid=selId(),ch=chs.filter(function(c){return c.id===sid})[0]||null;
  b.innerHTML=limitsHtml(window.jlChInfo||null,chs.some(function(c){return c.dl||c.md||c.pt}))+inactHtml(window.__trades||[],typeof window.getTradingDayIST==='function'?window.getTradingDayIST():'')+summaryHtml(propStats(scopeTrades(window.__trades||[],ch),opts()),opts(),payoutTotal(list));var l=$('prList');if(l)l.innerHTML=listHtml(list);
  var tc=$('prTabCh');if(tc)tc.textContent=String(chs.length);var tp=$('prTabPay');if(tp)tp.textContent=String(list.length);var pbg=$('prPaidBig');if(pbg)pbg.textContent=money(payoutTotal(list));var sb=$('prSub');if(sb)sb.textContent=subText(ch);var sc=$('prScope');if(sc)sc.innerHTML=chipsHtml(chs,ch?ch.id:'');var cl=$('chList');if(cl)cl.innerHTML=chListHtml(chs);planRender()}
window.__renderProp=render;
var card=$('ggPropCard'),armT=0;
if(card)card.addEventListener('click',function(e){var t=e.target;if(!t.closest)return;
  var scb=t.closest('[data-prsc]');if(scb){try{localStorage.setItem(SK,scb.getAttribute('data-prsc')||'')}catch(_){}render();return}
  if(t.closest('#chAdd')){var cn=($('chName').value||'').trim(),cs=$('chStart').value,ce=$('chEnd').value,cre=/^\d{4}-\d{2}-\d{2}$/,lm={},bad=false;
    [['dl','chDl'],['md','chMd'],['pt','chPt']].forEach(function(k){var el=$(k[1]),v=el?String(el.value||'').trim():'';if(!v)return;var x=Number(v);if(!isFinite(x)||!(x>0)||x>100)bad=true;else lm[k[0]]=Math.round(x*100)/100});
    if(!cn||!cre.test(cs)){cmsg('Enter a name and a start date.');return}
    if(ce&&(!cre.test(ce)||ce<cs)){cmsg('The end date cannot be before the start date.');return}
    if(bad){cmsg('Limits must be a percent above 0 and up to 100, or left empty.');return}
    var cl=cleanChallenges(rdC());cl.push({id:'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),name:cn.slice(0,40),start:cs,end:ce||'',dl:lm.dl,md:lm.md,pt:lm.pt});
    if(wrC(cleanChallenges(cl))){$('chName').value='';$('chStart').value='';$('chEnd').value='';['chDl','chMd','chPt'].forEach(function(k){var el=$(k);if(el)el.value=''});cmsg('');render()}return}
  var cdel=t.closest('[data-chdel]');if(cdel){
    if(cdel.getAttribute('data-arm')!=='1'){cdel.setAttribute('data-arm','1');cdel.textContent='Tap again to delete';clearTimeout(armT);armT=setTimeout(render,3000);return}
    clearTimeout(armT);var cid=cdel.getAttribute('data-chdel');if(wrC(cleanChallenges(rdC()).filter(function(c){return c.id!==cid}))){if(selId()===cid){try{localStorage.setItem(SK,'')}catch(_){}}render()}return}
  if(t.closest('#prAdd')){var d=$('prDate').value,a=Number($('prAmt').value);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!(a>0)){msg('Pick a date and enter an amount above zero.');return}
    var list=cleanPayouts(rd());list.push({id:'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),date:d,amount:Math.round(a*100)/100});
    if(wr(cleanPayouts(list))){$('prAmt').value='';msg('');render()}return}
  var del=t.closest('[data-prdel]');if(del){
    if(del.getAttribute('data-arm')!=='1'){del.setAttribute('data-arm','1');del.textContent='Tap again to delete';clearTimeout(armT);armT=setTimeout(render,3000);return}
    clearTimeout(armT);var id=del.getAttribute('data-prdel');wr(cleanPayouts(rd()).filter(function(p){return p.id!==id}));render()}});
function rdA(){try{return JSON.parse(localStorage.getItem('jlAccountSettings'))}catch(_){return null}}
var planTouched=false;
function pmsg(t){var m=$('prPlanMsg');if(m)m.textContent=t||''}
function planPhases(key,sel){var p=fpFind(key),ph=$('prPlanPh');if(!ph)return;
  ph.innerHTML=p?p.phases.map(function(x,i){return '<option value="'+i+'">'+esc(x.n)+'</option>'}).join(''):'<option value="">Phase</option>';
  ph.disabled=!p||p.phases.length<2;if(p&&typeof sel==='number'&&sel>=0)ph.value=String(sel);syncChips()}
function planRender(){var sel=$('prPlanSel'),det=$('prPlanDet');if(!sel||!det)return;
  if(!sel.options.length){sel.innerHTML='<option value="">Choose a plan</option>'+FP_PLANS.map(function(p){return '<option value="'+esc(p.key)+'">'+esc(p.name)+'</option>'}).join('');planPhases('')}
  var d=fpDetect(rdA()),t='';
  if(d.s==='none')t='Plan not detected. '+d.why;
  else if(d.s==='multi')t='Detected one of: '+d.keys.map(function(k){return fpFind(k).name}).join(' or ')+'. Set the profit target in Account Settings to tell them apart, or pick the plan below.';
  else{var p=fpFind(d.key);t='Detected: '+p.name+(d.phase>=0&&p.phases.length>1?', '+p.phases[d.phase].n:'')+' (daily loss '+d.dl+'%, max loss '+d.md+'%'+(d.pt>0?', target '+d.pt+'%':'')+').'+(d.ptOk?'':' The profit target differs from the plan.')}
  det.textContent=t;det.className='pr-plan-det'+(d.s==='one'?' ok':'');
  if(!planTouched&&!sel.value&&d.s==='one'){sel.value=d.key;planPhases(d.key,d.phase)}syncChips()}
var cardP=$('ggPropCard');
if(cardP){
  cardP.addEventListener('change',function(e){if(e.target&&e.target.id==='prPlanSel'){planTouched=true;planPhases(e.target.value);pmsg('')}});
  cardP.addEventListener('click',function(e){var t=e.target;if(!t.closest)return;
    if(t.closest('#prPlanApply')){var p=fpFind(($('prPlanSel')||{}).value);if(!p){pmsg('Pick a plan first.');return}
      var ph=p.phases[Number(($('prPlanPh')||{}).value)||0];
      if(typeof window.ggFpFill!=='function'){pmsg('Account Settings is not ready yet. Try again in a moment.');return}
      var v={bal:p.size,mdl:ph.dl,mdd:ph.md,pt:ph.pt||0};Object.keys(p.fill).forEach(function(k){v[k]=p.fill[k]});window.ggFpFill(v);
      var nm=$('chName'),dl=$('chDl'),md=$('chMd'),pt=$('chPt');
      if(nm)nm.value=(p.name+' '+ph.n).slice(0,40);if(dl)dl.value=ph.dl;if(md)md.value=ph.md;if(pt)pt.value=ph.pt>0?ph.pt:'';
      pmsg('Filled '+p.name+', '+ph.n+' in Account Settings (initial balance 5,000) and in the Challenges form. Add a start date there and tap Add challenge. Tap Save setup to keep the Account Settings values.'+(p.skip?' Not filled: '+p.skip+'. Check your FundingPips dashboard.':''));
      if(typeof window.jlToast==='function')window.jlToast({text:p.name+' '+ph.n+' values filled',sub:'Tap Save setup to keep them',duration:4000});return}
    if(t.closest('#prPlanSplBtn')){var x=Number(($('prPlanSpl')||{}).value);
      if(!isFinite(x)||!(x>0)||x>100){pmsg('Enter a profit split above 0 and up to 100.');return}
      if(typeof window.ggFpFill!=='function'){pmsg('Account Settings is not ready yet. Try again in a moment.');return}
      window.ggFpFill({spl:Math.round(x*100)/100});pmsg('Profit split set to '+(Math.round(x*100)/100)+'%. Tap Save setup to keep it.')}})}
/* Plan chips, phase toggle and tabs. The two hidden selects stay the source of truth for the plan and phase. */
function syncChips(){var sel=$('prPlanSel'),ph=$('prPlanPh'),pc=$('prPlanChips'),sg=$('prPhaseSeg');if(!sel||!ph||!pc||!sg)return;
  if(pc.children.length!==FP_PLANS.length)pc.innerHTML=FP_PLANS.map(function(p){return '<button type="button" class="pr-pchip" role="radio" aria-checked="false" data-prplan="'+esc(p.key)+'"><b>'+esc(p.name)+'</b><small>'+(p.phases.length>1?p.phases.length+' phases':esc(p.phases[0].n))+'</small></button>'}).join('');
  Array.prototype.forEach.call(pc.children,function(b){var on=b.getAttribute('data-prplan')===sel.value;b.classList.toggle('on',on);b.setAttribute('aria-checked',on?'true':'false')});
  var p=fpFind(sel.value);
  if(!p){sg.innerHTML='<span class="pr-seg-empty">Pick a plan</span>';sg.removeAttribute('data-key');return}
  if(sg.getAttribute('data-key')!==p.key){sg.setAttribute('data-key',p.key);sg.innerHTML=p.phases.map(function(x,i){return '<button type="button" class="pr-seg-b" role="radio" aria-checked="false" data-prph="'+i+'"'+(p.phases.length<2?' disabled':'')+'>'+esc(x.n)+'</button>'}).join('')}
  Array.prototype.forEach.call(sg.children,function(b){var on=b.getAttribute('data-prph')===(ph.value||'0');b.classList.toggle('on',on);b.setAttribute('aria-checked',on?'true':'false')})}
var TK='jl_pr_tab_v1';
function setTab(id,focus){if(!cardP)return;var tabs=Array.prototype.slice.call(cardP.querySelectorAll('[data-prtab]'));
  if(!tabs.some(function(b){return b.getAttribute('data-prtab')===id}))id='ov';
  tabs.forEach(function(b){var on=b.getAttribute('data-prtab')===id;b.classList.toggle('on',on);b.setAttribute('aria-selected',on?'true':'false');b.tabIndex=on?0:-1;if(on&&focus)b.focus()});
  Array.prototype.forEach.call(cardP.querySelectorAll('[data-prpanel]'),function(p){p.hidden=p.getAttribute('data-prpanel')!==id});
  try{sessionStorage.setItem(TK,id)}catch(_){}}
if(cardP){
  cardP.addEventListener('click',function(e){var t=e.target;if(!t.closest)return;
    var tb=t.closest('[data-prtab]');if(tb){setTab(tb.getAttribute('data-prtab'));return}
    var pc=t.closest('[data-prplan]');if(pc){var sel=$('prPlanSel');if(sel){sel.value=pc.getAttribute('data-prplan');sel.dispatchEvent(new Event('change',{bubbles:true}));syncChips()}return}
    var pb=t.closest('[data-prph]');if(pb){var ph=$('prPlanPh');if(ph&&!ph.disabled){ph.value=pb.getAttribute('data-prph');syncChips()}}});
  cardP.addEventListener('keydown',function(e){var tb=e.target.closest&&e.target.closest('[data-prtab]');if(!tb||['ArrowRight','ArrowLeft','Home','End'].indexOf(e.key)<0)return;
    var all=Array.prototype.slice.call(cardP.querySelectorAll('[data-prtab]')),i=all.indexOf(tb);
    i=e.key==='Home'?0:e.key==='End'?all.length-1:(i+(e.key==='ArrowRight'?1:-1)+all.length)%all.length;e.preventDefault();setTab(all[i].getAttribute('data-prtab'),true)});
  var st='ov';try{st=sessionStorage.getItem(TK)||'ov'}catch(_){}setTab(st)}
window.addEventListener('storage',function(ev){if(!ev.key||ev.key===PK||ev.key===CK||ev.key===SK)render()});
setTimeout(render,1500);setInterval(render,30000);render();
})();
