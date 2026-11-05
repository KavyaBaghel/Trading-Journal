/* Accounts layer: several trading accounts (MT5, Match-Trader, ...) in one journal.
   A trade carries an `account` id. A trade with no id belongs to the default account, so existing data needs no migration.
   The account list is synced (journall_accounts_v1). Which account you are looking at is a per-device choice (jlActiveAccount, not synced). */
(function(){
  var K=JL_KEYS.keys,RK=K.JOURNALL_ACCOUNTS_V1,AK=K.JL_ACTIVE_ACCOUNT,DEF='fundingpips-mt5',ALL='all';
  var PLAT={mt5:'MetaTrader 5',matchtrader:'Match-Trader',other:'Other'};
  var SEED={id:DEF,name:'FundingPips MT5',broker:'FundingPips',platform:'mt5'};
  function ok(a){return !!a&&typeof a==='object'&&typeof a.id==='string'&&a.id!==''&&a.id!==ALL&&typeof a.name==='string'&&a.name.trim()!==''}
  /* The default account always exists, even before anything is saved, so nothing is written on load. */
  function list(){var v=null;try{v=JSON.parse(localStorage.getItem(RK)||'null')}catch(e){v=null}
    var out=Array.isArray(v)?v.filter(ok):[];if(!out.some(function(a){return a.id===DEF}))out.unshift(SEED);return out}
  function find(id){var L=list();for(var i=0;i<L.length;i++)if(L[i].id===id)return L[i];return null}
  function active(){var raw=null;try{raw=localStorage.getItem(AK)}catch(e){raw=null}
    var L=list();if(raw===ALL&&L.length>1)return ALL;
    if(raw&&find(raw))return raw;
    return L.length>1?ALL:L[0].id}
  function accountOf(t){return t&&typeof t.account==='string'&&t.account?t.account:DEF}
  function filter(trades){var a=active();if(a===ALL||!Array.isArray(trades))return trades;return trades.filter(function(t){return accountOf(t)===a})}
  function platformOf(id){var a=find(id);return a?a.platform:'other'}
  /* Where a trade created by hand or by a file import is saved: the account on screen, or the default one in the combined view. */
  function writeId(){var a=active();return a===ALL?DEF:a}
  /* Open positions come from the MT5 report only. */
  function showsOpen(){var a=active();return a===ALL||platformOf(a)==='mt5'}
  function slug(s){return String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,24)}
  function add(name,platform,broker){
    name=String(name||'').trim().slice(0,40);if(!name)return {ok:false,why:'Give the account a name.'};
    if(!PLAT[platform])platform='other';
    var L=list();if(L.some(function(a){return a.name.toLowerCase()===name.toLowerCase()}))return {ok:false,why:'An account with that name already exists.'};
    var base=platform+'-'+(slug(name)||'account'),id=base,n=2;while(L.some(function(a){return a.id===id}))id=base+'-'+(n++);
    var acc={id:id,name:name,broker:String(broker||'').trim().slice(0,40),platform:platform};
    L.push(acc);
    try{localStorage.setItem(RK,JSON.stringify(L))}catch(e){return {ok:false,why:'Could not save the account.'}}
    return {ok:true,account:acc}}
  /* Every tab derives its data at load, so a switch reloads the page, like a sync does. */
  function setActive(id){if(id!==ALL&&!find(id))return;try{localStorage.setItem(AK,id)}catch(e){return}location.reload()}

  function el(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e}
  function label(){var a=active();if(a===ALL)return {n:'All accounts',s:'Combined view'};var x=find(a);return {n:x.name,s:PLAT[x.platform]||''}}

  function openAdd(){
    var scrim=el('div','acct-scrim'),card=el('div','acct-card'),h=el('h2','','Add account'),plat='matchtrader';
    card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');card.setAttribute('aria-labelledby','acctDlgT');h.id='acctDlgT';card.appendChild(h);
    var l1=el('label','','Account name'),nameIn=el('input');nameIn.type='text';nameIn.maxLength=40;nameIn.placeholder='e.g. FundingPips Match-Trader';nameIn.autocomplete='off';l1.appendChild(nameIn);card.appendChild(l1);
    card.appendChild(el('div','acct-lab','Platform'));
    var seg=el('div','acct-seg');
    ['matchtrader','mt5','other'].forEach(function(p){var b=el('button','',PLAT[p]);b.type='button';b.setAttribute('data-v',p);b.setAttribute('aria-pressed',p===plat?'true':'false');
      b.addEventListener('click',function(){plat=p;Array.prototype.forEach.call(seg.children,function(x){x.setAttribute('aria-pressed',x.getAttribute('data-v')===p?'true':'false')})});seg.appendChild(b)});
    card.appendChild(seg);
    var l3=el('label','','Broker (optional)'),brIn=el('input');brIn.type='text';brIn.maxLength=40;brIn.placeholder='FundingPips';brIn.autocomplete='off';l3.appendChild(brIn);card.appendChild(l3);
    var msg=el('p','acct-msg');msg.setAttribute('role','status');card.appendChild(msg);
    var foot=el('div','acct-foot'),cancel=el('button','acct-btn2','Cancel'),save=el('button','acct-btn2 pri','Add account');cancel.type='button';save.type='button';foot.appendChild(cancel);foot.appendChild(save);card.appendChild(foot);
    scrim.appendChild(card);document.body.appendChild(scrim);nameIn.focus();
    function done(){if(scrim.parentNode)scrim.parentNode.removeChild(scrim);document.removeEventListener('keydown',esc)}
    function esc(e){if(e.key==='Escape')done()}
    document.addEventListener('keydown',esc);
    scrim.addEventListener('click',function(e){if(e.target===scrim)done()});
    cancel.addEventListener('click',done);
    save.addEventListener('click',function(){var r=add(nameIn.value,plat,brIn.value);if(!r.ok){msg.textContent=r.why;return}setActive(r.account.id)});
    nameIn.addEventListener('keydown',function(e){if(e.key==='Enter')save.click()})}

  function mount(){
    var nav=document.getElementById('sbNav');if(!nav||document.getElementById('acct'))return;
    var box=el('div','acct'),btn=el('button','acct-btn'),tx=el('span','acct-txt lbl'),nm=el('b'),sb=el('small'),menu=el('div','acct-menu');
    box.id='acct';btn.type='button';btn.id='acctBtn';btn.setAttribute('aria-haspopup','listbox');btn.setAttribute('aria-expanded','false');
    tx.appendChild(nm);tx.appendChild(sb);btn.appendChild(el('span','acct-dot'));btn.appendChild(tx);btn.appendChild(el('span','acct-chev lbl','\u25BE'));
    menu.id='acctMenu';menu.setAttribute('role','listbox');menu.hidden=true;box.appendChild(btn);box.appendChild(menu);nav.parentNode.insertBefore(box,nav);
    function close(){menu.hidden=true;btn.setAttribute('aria-expanded','false')}
    function item(text,sub,on,fn){var b=el('button','acct-it'+(on?' on':''));b.type='button';b.setAttribute('role','option');b.setAttribute('aria-selected',on?'true':'false');
      b.appendChild(el('b','',text));if(sub)b.appendChild(el('small','',sub));b.addEventListener('click',function(){close();fn()});return b}
    function build(){menu.textContent='';var L=list(),a=active();
      if(L.length>1)menu.appendChild(item('All accounts','Combined view',a===ALL,function(){setActive(ALL)}));
      L.forEach(function(x){menu.appendChild(item(x.name,(PLAT[x.platform]||'')+(x.broker?' \u00b7 '+x.broker:''),a===x.id,function(){setActive(x.id)}))});
      var ad=el('button','acct-it acct-add','+ Add account');ad.type='button';ad.addEventListener('click',function(){close();openAdd()});menu.appendChild(ad)}
    btn.addEventListener('click',function(){if(menu.hidden){build();menu.hidden=false;btn.setAttribute('aria-expanded','true')}else close()});
    document.addEventListener('click',function(e){if(!box.contains(e.target))close()});
    document.addEventListener('keydown',function(e){if(e.key==='Escape')close()});
    var l=label();nm.textContent=l.n;sb.textContent=l.s}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();

  window.JLAccounts={ALL:ALL,DEFAULT_ID:DEF,list:list,find:find,active:active,accountOf:accountOf,filter:filter,platformOf:platformOf,writeId:writeId,showsOpen:showsOpen,add:add,setActive:setActive};
})();
