/* Step 3.2: derive the design's data caches from the LIVE synced keys, before any design script runs.
   jlImport is a derived, unsynced cache (key is not in the sync prefixes): rebuilt on every load, never the source of truth. */
(function(){
  var SK=['viztrade_trades','viztrade_trading_page_trades','krishna_journal_page_entries','journall_account_config_v1'];
  window.jlDataSig=function(){var h=5381,n=0;SK.forEach(function(k){var v=localStorage.getItem(k)||'';n+=v.length;for(var i=0;i<v.length;i++)h=((h<<5)+h+v.charCodeAt(i))|0;h=((h<<5)+h+124)|0});return h+':'+n};
  window.__jlSig=window.jlDataSig();   /* what the design is about to render */
  function rd(k){try{var v=JSON.parse(localStorage.getItem(k)||'null');return Array.isArray(v)?v:[]}catch(e){return []}}
  try{
    var A=rd('viztrade_trades'),B=rd('viztrade_trading_page_trades'),seen={},all=[];
    A.concat(B).forEach(function(t){if(!t||typeof t!=='object')return;var k=t.id!=null?'i'+t.id:'k'+JLAdapter.liveKey(t);if(seen[k])return;seen[k]=1;all.push(t)});
    var imp=JLAdapter.buildImport(all);imp.open=rd('jlOpenPositions');window.__jlImp=imp;
    if(imp.closed.length||imp.open.length){var slim={file:imp.file,closed:imp.closed,open:imp.open};localStorage.setItem('jlImport',JSON.stringify(slim))}
    else localStorage.removeItem('jlImport');
  }catch(e){window.__jlImp={file:'',closed:[],open:[],_lk:{}};try{localStorage.removeItem('jlImport')}catch(_){console.debug('[journall] ignored error in data-bootstrap.js:', _);}
    console.error('[Journall] live data bootstrap failed',e)}
})();
