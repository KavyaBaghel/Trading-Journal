/* Journall data adapter: live storage <-> new design. No DOM, no network. */
(function(root){
  var IST=19800000, r2=function(x){return Math.round(x*100)/100}, z=function(n){return String(n).padStart(2,'0')};
  var posOf=function(t){return t.position||((/^mt5-(\d+)$/.exec(String(t.id||''))||[])[1])||''};
  var isImp=function(t){return String(t.id||'').indexOf('fundingpips-mt5')===0};
  var liveKey=function(t){return [t.date,t.time,t.symbol,t.side,t.entry!=null?t.entry:t.openPrice,t.exit!=null?t.exit:t.closePrice,t.pnl].join('|')};
  var dKey=function(t){return t.d+' '+t.t+' '+t.side+' '+t.en+' '+t.pnl};
  var sesOf=function(h){return h<8?'Asia':h<14?'London':'New York'};
  function why(r){r=String(r==null?'':r);var m=/^\[?\s*(SL|TP)\b/i.exec(r);return m?m[1].toUpperCase():r}
  /* Decision: one record per MT5 position, prefer the fundingpips-mt5 import record. */
  function dedupe(list){var by={},out=[];list.forEach(function(t){var p=posOf(t);if(!p){out.push(t);return}
    var c=by[p];if(!c||(!isImp(c)&&isImp(t)))by[p]=t});Object.keys(by).forEach(function(p){out.push(by[p])});return out}
  /* Decision: import records show OPEN time in IST (from openUtc); bridge-only records show stored date/time as-is. */
  function toDesignTrade(t){var d=t.date,tm=t.time,hold=null,bt=1;
    if(isImp(t)&&/Z$/.test(t.openUtc||'')){bt=0;var s=new Date(Date.parse(t.openUtc)+IST).toISOString();d=s.slice(0,10);tm=s.slice(11,19)}
    if(t.duration!=null&&t.duration>0)hold=Math.round(t.duration*60); else if(!isImp(t))hold=0;
    var en=t.entry!=null?t.entry:t.openPrice,ex=t.exit!=null?t.exit:t.closePrice;
    return {d:d,t:tm,_bt:bt,side:t.side,ses:sesOf(+tm.slice(0,2)),en:en,ex:ex,why:why(t.reason),pnl:r2(t.pnl),lot:t.volume,
      sl:t.sl>0?t.sl:null,tag:'',j:false,sym:t.symbol,hold:hold,cost:0,_pos:posOf(t),_lk:liveKey(t)}}
  function buildImport(live){var kept=dedupe(live||[]);var closed=kept.map(toDesignTrade);
    var lk={};(live||[]).forEach(function(t){var p=posOf(t),k=p?kept.filter(function(x){return posOf(x)===p})[0]:(kept.indexOf(t)>=0?t:null);if(k)lk[liveKey(t)]=closed[kept.indexOf(k)]});  /* records with no position (report imports) map to themselves, never to another position-less record */
    return {file:'Journall live data',closed:closed,open:[],_lk:lk}}
  /* Journals: live entry -> design entry (id gets prefix L so write-back can find the live original). */
  function journalToDesign(e,imp){var tr=e.trade||{},f=e.fields||{},d=imp&&imp._lk[e.tradeKey];
    var base=d||{d:tr.date||e.date,t:tr.time||'',side:tr.side||'',en:tr.entry,pnl:r2(tr.pnl||0),sym:tr.symbol||''};
    return {id:'L'+e.id,key:dKey(base),date:e.date||base.d,time:base.t,sym:base.sym,side:base.side,pnl:base.pnl,setup:f.setup||'',
      q:[f.goodEntryPoint||null,f.entryConfirmation||null,f.exitConfirmation||null],tags:(tr.mistakes||[]).slice(),emotion:e.emotion||'',
      mistake:f.mistake||'',before:f.emotionBefore||'',after:f.emotionAfter||'',improve:f.improvement||'',shot:'',rec:'',conf:Array.isArray(f.confluences)?f.confluences.slice():[]}}
  /* Write back: overlay design edits on the live originals so live-only fields (title, body, category, result, screenshot, tradeKey) survive. */
  function journalToLive(de,orig,imp){var o=orig?JSON.parse(JSON.stringify(orig)):null,lk=null;
    if(!o){var k=Object.keys(imp._lk).filter(function(x){return dKey(imp._lk[x])===de.key})[0];lk=k||''}
    var e=o||{id:Date.now(),tradeKey:lk,trade:{date:de.date,time:de.time,symbol:de.sym,side:de.side,pnl:de.pnl},date:de.date,
      title:(de.pnl<0?'Loss':'Win')+' Journal - '+de.sym+' '+de.side,category:'Journal',result:de.pnl<0?'loss':'win',screenshot:'',fields:{}};
    e.trade=e.trade||{};e.trade.mistakes=de.tags.slice();e.emotion=de.emotion;
    var f=e.fields=e.fields||{};f.setup=de.setup;f.goodEntryPoint=de.q[0];f.entryConfirmation=de.q[1];f.exitConfirmation=de.q[2];
    f.emotionBefore=de.before;f.emotionAfter=de.after;f.mistake=de.mistake;f.improvement=de.improve;f.confluences=Array.isArray(de.conf)?de.conf.slice():[];e.updatedAt=new Date().toISOString();return e}
  root.JLAdapter={dedupe:dedupe,buildImport:buildImport,journalToDesign:journalToDesign,journalToLive:journalToLive,why:why,liveKey:liveKey};
  if(typeof module!=='undefined')module.exports=root.JLAdapter;
})(typeof window!=='undefined'?window:globalThis);
