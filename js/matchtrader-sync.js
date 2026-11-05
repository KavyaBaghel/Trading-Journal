/* Match-Trader sync (Upload data page). Active only while a Match-Trader account is selected; the MT5 bridge sync is untouched.
   The Match-Trader API token lives in the Cloudflare Worker (secret MT_TRADER_TOKEN), never here. This page asks the Worker's /matchtrader route
   for closed positions and the account summary, then saves new trades into the selected account. A position already saved is never added twice. */
(function(){
  var A=window.JLAccounts;if(!A)return;
  var K=JL_KEYS.keys,TK=[K.VIZTRADE_TRADES,K.VIZTRADE_TRADING_PAGE_TRADES],CK=K.JOURNALL_ACCOUNT_CONFIG_V1,IST=19800000,DAY=86400000;
  function isMT(){var a=A.active();return a!==A.ALL&&A.platformOf(a)==='matchtrader'}
  function syncKey(){return 'journall_matchtrader_sync__'+A.active()}
  function rd(k){try{var v=JSON.parse(localStorage.getItem(k)||'null');return Array.isArray(v)?v:[]}catch(e){return []}}
  function rdo(k){try{var v=JSON.parse(localStorage.getItem(k)||'null');return v&&typeof v==='object'&&!Array.isArray(v)?v:null}catch(e){return null}}
  function r2(x){return Math.round(x*100)/100}
  function num(x){x=Number(x);return isFinite(x)?x:null}
  function lastSynced(){var s=rdo(syncKey()),t=s&&s.lastSynced?Date.parse(s.lastSynced):NaN;return isFinite(t)?t:null}
  function ago(ts){var d=Date.now()-ts;if(!(d>=0))return 'just now';var m=Math.floor(d/60000);if(m<1)return 'just now';if(m<60)return m+'m ago';var h=Math.floor(m/60);if(h<24)return h+'h ago';return Math.floor(h/24)+'d ago'}
  function T(id,txt){var e=document.getElementById(id);if(e)e.textContent=txt}

  /* Match-Trader closed position -> live trade record. Time shown is the OPEN time in IST, like the rest of the journal.
     Net P&L is the platform's netProfit, so it always matches what Match-Trader reports. */
  function reasonOf(c){var s=String(c==null?'':c).toUpperCase();
    if(/STOP_?LOSS|(^|_)SL($|_)/.test(s))return 'SL';
    if(/TAKE_?PROFIT|(^|_)TP($|_)/.test(s))return 'TP';
    if(/STOP_?OUT/.test(s))return 'Stop out';
    if(/USER|MANUAL/.test(s))return 'Manual';
    return s?s.replace(/^CLOSE_REASON_/,'').replace(/_/g,' ').toLowerCase().replace(/^./,function(c){return c.toUpperCase()}):'Import'}
  function toRec(p,acct){
    if(!p||p.id==null)return null;
    var o=num(p.openTime),c=num(p.closeTime);if(o==null)return null;
    var s=new Date(o+IST).toISOString(),raw=num(p.profit),net=num(p.netProfit);
    if(net==null)net=raw;if(net==null)return null;if(raw==null)raw=net;
    var sl=num(p.slPrice);
    return {id:'matchtrader-'+p.id,account:acct,date:s.slice(0,10),time:s.slice(11,19),symbol:String(p.symbol||p.alias||''),side:String(p.side||'').toUpperCase(),
      volume:num(p.volume),entry:num(p.openPrice),exit:num(p.closePrice),sl:sl>0?sl:0,rawProfit:r2(raw),commission:r2(net-raw),pnl:r2(net),
      reason:reasonOf(p.closeReason),mistakes:[],notes:'',position:String(p.id),duration:c!=null&&c>o?(c-o)/60000:0,source:'matchtrader',closeTime:c}}
  function merge(recs){var added=0;
    TK.forEach(function(k){var cur=rd(k),seen={};cur.forEach(function(t){if(t&&t.id!=null)seen[String(t.id)]=1});var n=0;
      recs.forEach(function(r){if(seen[r.id])return;seen[r.id]=1;cur.push(r);n++});
      if(n){localStorage.setItem(k,JSON.stringify(cur));if(k===TK[0])added=n}});
    return added}

  /* Sync: first run reads the last 90 days; later runs overlap the previous sync by 2 days. */
  function sync(o){
    var btn=o.btn,ti=document.getElementById('udTitle');
    function msg(t){window.__jlSyncMsg=t;if(ti)ti.textContent=t}
    function done(){window.__jlSyncBusy=false;btn.disabled=false;btn.textContent='⟳ Sync balance'}
    var acct=A.active(),ep=String(window.journallAiProxyUrl||'').trim();
    window.__jlSyncBusy=true;window.__jlSyncMsg='';btn.disabled=true;btn.textContent='Syncing…';
    if(!ep){msg('The Worker address is missing from this build.');done();return}
    msg('Connecting to Match-Trader…');
    var tp=typeof window.journallGetFirebaseIdToken==='function'?Promise.resolve(window.journallGetFirebaseIdToken()):Promise.resolve(null);
    tp.then(function(tok){
      if(!tok){msg('Sign in first, then sync.');done();return}
      var last=lastSynced(),now=Date.now(),from=last?Math.max(0,last-2*DAY):now-90*DAY;
      var ac=typeof AbortController==='function'?new AbortController():null,to=ac&&setTimeout(function(){ac.abort()},45000);
      return fetch(ep.replace(/\/+$/,'')+'/matchtrader',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+tok},body:JSON.stringify({from:from,to:now+DAY}),cache:'no-store',signal:ac?ac.signal:undefined})
      .then(function(r){return r.json().catch(function(){return {error:'The Worker returned an unreadable answer.'}}).then(function(d){return {ok:r.ok,d:d}})})
      .then(function(x){if(to)clearTimeout(to);var d=x.d||{};
        if(!x.ok||d.error){msg(String(d.error||'Match-Trader sync failed.'));done();return}
        if(d.service&&!d.closedPositions){msg('The Worker has no /matchtrader route yet. Deploy the updated Worker.');done();return}
        var recs=(Array.isArray(d.closedPositions)?d.closedPositions:[]).map(function(p){return toRec(p,acct)}).filter(Boolean),added=merge(recs);
        var bal=d.summary&&num(d.summary.balance),c=rdo(CK),balOk=false;
        if(bal!=null&&bal>0&&c){c.mt5CurrentBalance=bal;c.mt5BalanceSource='mt5';c.mt5BalanceTimestamp=Date.now();localStorage.setItem(CK,JSON.stringify(c));balOk=true}
        localStorage.setItem(syncKey(),JSON.stringify({lastSynced:new Date().toISOString()}));
        var parts=[added?added+' new trade'+(added===1?'':'s'):'no new trades'];
        if(balOk)parts.unshift('balance updated');
        else if(bal!=null&&!c)parts.unshift('balance read, set up Account Settings to keep it');
        else if(d.summaryError)parts.push(d.summaryError);
        if(d.truncated)parts.push('history is long, sync again to fetch older trades');
        msg('Synced: '+parts.join(', '));done();window.jlPaintSync&&window.jlPaintSync();
        if(added>0||balOk)setTimeout(function(){location.reload()},1400)})
    }).catch(function(e){done();msg(e&&e.name==='AbortError'?'Match-Trader sync timed out (45 s). Try again.':'Could not reach the Worker. Check your connection and try again.')})}

  /* Hooks: the Upload page button and status painter call these by name, so wrapping them leaves the MT5 account exactly as before. */
  var origSync=window.jlSyncMt5;
  window.jlSyncMt5=function(o){return isMT()?sync(o):(origSync&&origSync(o))};
  var origPaint=window.jlPaintSync;
  function paint(){var t=lastSynced(),on=t!=null,q=function(id){return document.getElementById(id)};
    T('navSyncTxt',on?ago(t):'Awaiting sync');T('udSyncTxt',on?ago(t):'not synced yet');T('syncTxt',on?'Last synced '+ago(t):'Not synced yet');
    T('udLastSync',on?new Date(t).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'—');
    if(q('navSync'))q('navSync').classList.toggle('on',on);if(q('udDot'))q('udDot').classList.toggle('on',on);if(q('ftLit'))q('ftLit').classList.toggle('lit',on);
    var ti=q('udTitle');if(ti&&!window.__jlSyncBusy&&!window.__jlSyncMsg)ti.textContent=on?'Synced':'Awaiting sync'}
  window.jlPaintSync=function(){if(isMT())return paint();return origPaint&&origPaint()};

  /* Page text: say Match-Trader instead of MT5 while a Match-Trader account is selected. */
  function textOf(sel,match){var l=document.querySelectorAll(sel);for(var i=0;i<l.length;i++)if(l[i].textContent.trim()===match)return l[i];return null}
  function relabel(){
    if(!isMT())return;
    var sub=document.querySelector('.ud-status-sub');if(sub&&sub.firstChild&&sub.firstChild.nodeType===3)sub.firstChild.nodeValue='Match-Trader API · ';
    var b1=textOf('.up-risk-row b','MetaTrader 5');if(b1)b1.textContent='Match-Trader';
    var br=textOf('.up-risk-row span','Bridge');if(br)br.textContent='Connection';
    var b2=textOf('.up-risk-row b','Local, localhost:8787');if(b2)b2.textContent='Trader API (read-only), via your Worker';
    var note=document.querySelector('.ud-note');
    if(note)note.innerHTML='<b>Sync balance</b> reads your balance and closed trades from Match-Trader (read-only) and adds the ones that are not in this account yet. Journal notes, screenshots and psychology checks stay local and are never overwritten.';
    var heads=document.querySelectorAll('.up-card-head'),h;for(var i=0;i<heads.length;i++)if(heads[i].textContent.trim()==='Bridge setup'){h=heads[i];break}
    if(h){h.lastChild.nodeValue='How the sync works';var steps=h.parentNode.querySelectorAll('.ud-step');
      var S=[['Token stays on the server','Your read-only Match-Trader token is stored as a Worker secret, never in this page.'],['Press Sync balance','The Worker reads your account and closed trades from Match-Trader.'],['Trades land in this account','Only new trades are added, and your MT5 account is never touched.']];
      for(var j=0;j<steps.length&&j<S.length;j++){var bb=steps[j].querySelector('b'),dd=steps[j].querySelector('.ud-step-d');if(bb)bb.textContent=S[j][0];if(dd)dd.textContent=S[j][1]}}
    paint()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',relabel);else relabel();
  window.JLMatchTrader={toRec:toRec,reasonOf:reasonOf,isMT:isMT};
})();
