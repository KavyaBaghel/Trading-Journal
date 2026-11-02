/* Step 3.7: Upload Data. Real imports into the LIVE trade keys, real MT5 bridge sync, honest sync status. No fake timers. */
(function(){
  var TK=[JL_KEYS.keys.VIZTRADE_TRADES,JL_KEYS.keys.VIZTRADE_TRADING_PAGE_TRADES],SS=JL_KEYS.keys.JOURNALL_BROKER_SYNC_SETTINGS,CK=JL_KEYS.keys.JOURNALL_ACCOUNT_CONFIG_V1;
  function rd(k){try{var v=JSON.parse(localStorage.getItem(k)||'null');return Array.isArray(v)?v:[]}catch(e){return []}}
  function rdo(k){try{var v=JSON.parse(localStorage.getItem(k)||'null');return v&&typeof v==='object'&&!Array.isArray(v)?v:null}catch(e){return null}}
  function r2(x){return Math.round(x*100)/100}
  function tkey(t){return t.id!=null?'i'+t.id:'k'+JLAdapter.liveKey(t)}
  function merge(list){var added=0;TK.forEach(function(k){var cur=rd(k),seen={};cur.forEach(function(t){if(t&&typeof t==='object')seen[tkey(t)]=1});var n=0;
    list.forEach(function(t){if(!t||typeof t!=='object')return;var q=tkey(t);if(seen[q])return;seen[q]=1;cur.push(t);n++});
    if(n){localStorage.setItem(k,JSON.stringify(cur));if(k===TK[0])added=n}});return added}
  function hash(s){var h=5381;for(var i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return (h>>>0).toString(36)}
  /* design trade (from the CSV/HTML importer) -> live record. pnl is NET (profit + commission + swap), like the MT5 report. */
  function toLive(t){var cost=t.cost||0,net=r2((t.pnl||0)+cost),o={id:'import-'+hash([t.d,t.t,t.sym,t.side,t.en,t.ex,t.lot].join('|')),date:t.d,time:t.t,symbol:t.sym,side:t.side,volume:t.lot,
    entry:t.en,exit:t.ex,sl:t.sl||0,rawProfit:t.pnl||0,commission:cost,pnl:net,reason:t.why||'Import',mistakes:[],notes:''};
    if(t.pos)o.position=t.pos;
    if(t.hold!=null)o.duration=t.hold/60;return o}
  /* Step 6: a report import is the truth for its date range. (1) each report trade overlays its bridge twin (bridge record 'mt5-<position>' with the same symbol, side, entry and lot, nearest in time, within 12 h; the bridge stamps times wrongly, so time cannot match exactly); (2) bridge records inside the report's whole-day range that have no twin are deleted; (3) a report trade that already exists as an earlier import (fundingpips-mt5-* or import-*, same symbol/side/entry/lot, within 2 min) is skipped. Journals on a replaced bridge trade are re-linked to the new record. */
  var BR=/^mt5-\d+$/;
  function ms(t){var m=Date.parse(String(t.date)+'T'+String(t.time||'00:00:00')+'Z');return isFinite(m)?m:NaN}
  function ots(t){return String(t.id).indexOf('fundingpips-mt5')===0&&/Z$/.test(t.openUtc||'')?Date.parse(t.openUtc)+19800000:ms(t)}  /* old imports store the CLOSE time; their OPEN time in IST is openUtc + 5:30 */
  function sameTrade(a,b){return a.symbol===b.symbol&&a.side===b.side&&Math.abs(Number(a.entry)-Number(b.entry))<1e-6&&Math.abs(Number(a.volume)-Number(b.volume))<1e-6}
  function replaceBridge(recs){var out={replaced:0,removed:0,skipped:0,relinked:0,fresh:recs,matched:[]};
    if(!recs.length)return out;
    var ds=recs.map(function(r){return r.date}).sort(),lo=ds[0],hi=ds[ds.length-1];
    var cur=rd(TK[0]),gone={},link={},used={};
    var others=cur.filter(function(t){return t&&typeof t==='object'&&!BR.test(String(t.id))});
    var usedO=[];
    /* Two passes so identical twin positions pair with their own result first (same exit and P&L), then any leftover match loosely. */
    var hitOf=[];
    recs.forEach(function(r,ri){var rm=ms(r);for(var i=0;i<others.length;i++){var o=others[i];
      if(!usedO[i]&&sameTrade(o,r)&&Math.abs(ots(o)-rm)<=120000&&Math.abs(Number(o.exit)-Number(r.exit))<1e-6&&Math.abs(Number(o.pnl)-Number(r.pnl))<=0.005){hitOf[ri]=i;usedO[i]=1;break}}});
    recs.forEach(function(r,ri){if(hitOf[ri]!=null)return;var rm=ms(r);for(var i=0;i<others.length;i++){var o=others[i];
      if(!usedO[i]&&sameTrade(o,r)&&Math.abs(ots(o)-rm)<=120000){hitOf[ri]=i;usedO[i]=1;break}}});
    var fresh=recs.filter(function(r,ri){if(hitOf[ri]!=null){out.skipped++;out.matched.push({old:others[hitOf[ri]],rec:r});return false}return true});
    fresh.forEach(function(r){var rm=ms(r),best=null,bd=1/0;
      cur.forEach(function(t){if(!t||typeof t!=='object'||!BR.test(String(t.id))||used[t.id]||!sameTrade(t,r))return;
        var d=Math.abs(ms(t)-rm);if(d<=43200000&&d<bd){best=t;bd=d}});
      if(best){used[best.id]=1;gone[best.id]=1;link[JLAdapter.liveKey(best)]=r;out.replaced++}});
    cur.forEach(function(t){if(!t||typeof t!=='object'||!BR.test(String(t.id))||gone[t.id])return;
      if(String(t.date)>=lo&&String(t.date)<=hi){gone[t.id]=1;out.removed++}});
    var kill=out.replaced+out.removed;
    if(kill){TK.forEach(function(k){var a=rd(k).filter(function(t){return !(t&&gone[t.id])});localStorage.setItem(k,JSON.stringify(a))});
      var LK=JL_KEYS.keys.KRISHNA_JOURNAL_PAGE_ENTRIES,J=rd(LK),ch=false;
      J.forEach(function(e){var r=e&&link[e.tradeKey];if(!r)return;
        e.tradeKey=JLAdapter.liveKey(r);e.trade=e.trade||{};
        ['date','time','symbol','side','entry','exit','pnl','volume','duration','sl'].forEach(function(f){if(r[f]!=null)e.trade[f]=r[f]});
        out.relinked++;ch=true});
      if(ch)localStorage.setItem(LK,JSON.stringify(J))}
    out.fresh=fresh;return out}
  /* Report wins: a report row that matches an existing (non-bridge) record refreshes that record's result fields (exit, P&L, commission, duration). The id, date, time and position never change. Journals follow the new trade key. Values within 0.005 count as equal, so re-importing the same report changes nothing. */
  function refreshMatched(pairs){var out={updated:0,relinked:0},chg={},dif=function(a,b){return typeof a==='number'&&typeof b==='number'?Math.abs(a-b)>0.005:a!==b};
    pairs.forEach(function(p){var o=p.old,r=p.rec;if(o&&r&&(dif(o.pnl,r.pnl)||dif(o.exit,r.exit)))chg[o.id]={rec:r,oldKey:JLAdapter.liveKey(o)}});
    if(!Object.keys(chg).length)return out;
    var link={};
    TK.forEach(function(k){var a=rd(k),hit=false;
      a.forEach(function(t){var c=t&&chg[t.id];if(!c)return;var r=c.rec;
        t.exit=r.exit;t.pnl=r.pnl;if(r.rawProfit!=null)t.rawProfit=r.rawProfit;if(r.commission!=null)t.commission=r.commission;if(r.duration!=null)t.duration=r.duration;
        hit=true;if(k===TK[0]){link[c.oldKey]=JLAdapter.liveKey(t);out.updated++}});
      if(hit)localStorage.setItem(k,JSON.stringify(a))});
    var LK=JL_KEYS.keys.KRISHNA_JOURNAL_PAGE_ENTRIES,J=rd(LK),ch=false,live=rd(TK[0]);
    J.forEach(function(e){var nk=e&&link[e.tradeKey];if(!nk)return;e.tradeKey=nk;e.trade=e.trade||{};
      var t=live.filter(function(x){return x&&JLAdapter.liveKey(x)===nk})[0];
      if(t)['exit','pnl','duration'].forEach(function(f){if(t[f]!=null)e.trade[f]=t[f]});
      out.relinked++;ch=true});
    if(ch)localStorage.setItem(LK,JSON.stringify(J));
    return out}
  window.jlSaveImport=function(R){var recs=(R.closed||[]).map(toLive),seenId={};
    recs.forEach(function(r,i){if(seenId[r.id]){r.id=r.id+'-p'+(r.position||('n'+i))}seenId[r.id]=1});
    var rp=replaceBridge(recs),added=merge(rp.fresh),up=refreshMatched(rp.matched);
    localStorage.setItem(JL_KEYS.keys.JL_OPEN_POSITIONS,JSON.stringify(R.open||[]));return {added:added,total:recs.length,replaced:rp.replaced,removed:rp.removed,skipped:rp.skipped,relinked:rp.relinked+up.relinked,updated:up.updated}};
  window.jlSaveSyncTrades=function(list){var have={};rd(TK[0]).forEach(function(t){if(t&&typeof t==='object'&&!BR.test(String(t.id))&&t.position)have[String(t.position)]=1});
    var all=list||[],recs=all.map(toLive).filter(function(r){return !(r.position&&have[String(r.position)])}),seenId={};
    recs.forEach(function(r,i){if(seenId[r.id]){r.id=r.id+'-p'+(r.position||('n'+i))}seenId[r.id]=1});
    var rp=replaceBridge(recs),added=merge(rp.fresh);
    return {added:added,total:all.length,known:all.length-recs.length,replaced:rp.replaced,removed:rp.removed,skipped:rp.skipped}};
  function ago(ts){var d=Date.now()-ts;if(!(d>=0))return 'just now';var m=Math.floor(d/60000);if(m<1)return 'just now';if(m<60)return m+'m ago';var h=Math.floor(m/60);if(h<24)return h+'h ago';return Math.floor(h/24)+'d ago'}
  function last(){var s=rdo(SS),t=s&&s.lastSynced?Date.parse(s.lastSynced):NaN;return isFinite(t)?t:null}
  function T(id,txt){var e=document.getElementById(id);if(e)e.textContent=txt}
  window.jlPaintSync=function(){var t=last(),on=t!=null,q=function(id){return document.getElementById(id)};
    T('navSyncTxt',on?ago(t):'Awaiting sync');T('udSyncTxt',on?ago(t):'not synced yet');T('syncTxt',on?'Last synced '+ago(t):'Not synced yet');
    T('udLastSync',on?new Date(t).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'\u2014');
    if(q('navSync'))q('navSync').classList.toggle('on',on);if(q('udDot'))q('udDot').classList.toggle('on',on);if(q('ftLit'))q('ftLit').classList.toggle('lit',on);
    var ti=q('udTitle');if(ti&&!window.__jlSyncBusy&&!window.__jlSyncMsg)ti.textContent=on?'Synced':'Awaiting sync'};
  document.addEventListener('DOMContentLoaded',function(){window.jlPaintSync();setInterval(window.jlPaintSync,30000)});
  window.jlSyncMt5=function(o){var btn=o.btn,ti=document.getElementById('udTitle');
    function msg(t){window.__jlSyncMsg=t;if(ti)ti.textContent=t}
    function done(){window.__jlSyncBusy=false;btn.disabled=false;btn.textContent='\u27f3 Sync balance'}
    window.__jlSyncBusy=true;window.__jlSyncMsg='';btn.disabled=true;btn.textContent='Syncing\u2026';msg('Connecting to MT5 bridge\u2026');
    var ac=typeof AbortController==='function'?new AbortController():null,to=ac&&setTimeout(function(){ac.abort()},45000);
    fetch(((window.JL_CONFIG&&window.JL_CONFIG.localBridgeUrl)||'http://localhost:8787')+'/api/sync-broker',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({platform:'mt5',days:3}),cache:'no-store',signal:ac?ac.signal:undefined})
    .then(function(r){return r.json()}).then(function(d){if(to)clearTimeout(to);
      if(d&&d.error){msg('MT5 error: '+d.error);done();return}
      /* Sync reads the balance and adds recent trades. Trade times come from the bridge's openTime (MT5 server clock, same as a report), and a position already in the journal is never added twice. */
      var bal=d&&typeof d.account_balance==='number'&&isFinite(d.account_balance)?d.account_balance:null;
      if(bal==null){msg('Bridge connected, but MT5 returned no balance.');done();return}
       var imp=null;try{imp=window.jlSaveSyncTrades((Array.isArray(d.trades)?d.trades:[]).map(function(t){if(!t||!t.openTime)return null;var p=String(t.openTime).split(' ');if(p.length<2)return null;return {d:p[0],t:p[1],side:t.side,en:t.openPrice,ex:t.closePrice,pnl:typeof t.profit==='number'?t.profit:t.pnl,cost:r2((t.commission||0)+(t.swap||0)),lot:t.volume,sym:t.symbol,pos:String(t.id||'').replace(/\D/g,''),hold:typeof t.holdSec==='number'?t.holdSec:null,sl:null,why:(t.reason==='TP'||t.reason==='SL')?t.reason:''}}).filter(Boolean))}catch(e){imp=null}
      var c=rdo(CK);if(c){c.mt5CurrentBalance=bal;c.mt5BalanceSource='mt5';c.mt5BalanceTimestamp=Date.now();localStorage.setItem(CK,JSON.stringify(c))}
      localStorage.setItem(SS,JSON.stringify({platform:'mt5',days:30,lastSynced:new Date().toISOString()}));
      window.__jlSyncMsg=(c?'Synced, balance updated':'Synced, balance read (save Account Settings to keep it)')+(imp?(imp.added?', '+imp.added+' new trade'+(imp.added===1?'':'s'):', no new trades'):'');
      if(ti)ti.textContent=window.__jlSyncMsg;done();window.jlPaintSync();
      if(c||(imp&&imp.added>0))setTimeout(function(){location.reload()},1200)})
    .catch(function(e){if(to)clearTimeout(to);done();
      msg(e&&e.name==='AbortError'?'MT5 bridge timed out (45 s). Is MetaTrader 5 open?':'MT5 bridge not reachable. Open MetaTrader 5, start the local bridge, then try again.')})}
})();
