/* Step 3.3: journals. Live krishna_journal_page_entries -> design jlJournals (derived cache), and design saves -> live. */
(function(){
  /* Journals are identified by id for delete, undo and cloud deletion records. Two journals that share an id break all three
     (deleting one leaves the other holding the id, so no deletion record is made and the cloud copy brings it back).
     Give every later duplicate a new id derived from its own content, so every device computes the same ids. */
  window.__jlUniqIds=function(list){
    if(!Array.isArray(list))return list;
    function sig(e){return String(e.tradeKey||'')+'|'+String(e.title||'')+'|'+String(e.date||'')}
    function hs(s){var x=5381;for(var i=0;i<s.length;i++)x=((x<<5)+x+s.charCodeAt(i))>>>0;return x.toString(36)}
    var g={},out=list.slice(),ch=false;
    list.forEach(function(e,i){if(e&&typeof e==='object'&&e.id!=null){var k=String(e.id);(g[k]=g[k]||[]).push(i)}});
    Object.keys(g).forEach(function(k){
      var ix=g[k];if(ix.length<2)return;
      ix.sort(function(a,b){var sa=sig(list[a]),sb=sig(list[b]);return sa<sb?-1:sa>sb?1:a-b});
      for(var n=1;n<ix.length;n++){var e=Object.assign({},list[ix[n]]);e.id=k+'_'+hs(sig(e))+(n>1?'_'+n:'');out[ix[n]]=e;ch=true}
    });
    return ch?out:list;
  };
})();
(function(){
  var A=window.JLAdapter,imp=window.__jlImp,LK='krishna_journal_page_entries';if(!A||!imp)return;
  function rd(k){try{var v=JSON.parse(localStorage.getItem(k)||'null');return Array.isArray(v)?v:[]}catch(e){return []}}
  function lid(id){id=String(id);var c=id.charAt(0);return(c==='L'||c==='j')?id.slice(1):id}
  var F=['key','date','time','sym','side','pnl','setup','mistake','before','after','improve','emotion'];
  function same(a,b){for(var i=0;i<F.length;i++)if(a[F[i]]!==b[F[i]])return false;return JSON.stringify(a.q)===JSON.stringify(b.q)&&JSON.stringify(a.tags)===JSON.stringify(b.tags)&&JSON.stringify(a.conf||[])===JSON.stringify(b.conf||[])}
  try{var _l=rd(LK),_u=window.__jlUniqIds(_l);if(_u!==_l)localStorage.setItem(LK,JSON.stringify(_u))}catch(_){console.debug('[journall] ignored error in journal-sync.js:', _);}
  try{
    var des=rd(LK).filter(function(e){return e&&typeof e==='object'&&e.id!=null}).map(function(e){return A.journalToDesign(e,imp)});
    if(des.length)localStorage.setItem('jlJournals',JSON.stringify(des));else localStorage.removeItem('jlJournals');
  }catch(e){try{localStorage.removeItem('jlJournals')}catch(_){console.debug('[journall] ignored error in journal-sync.js:', _);}console.error('[Journall] journal bootstrap failed',e)}
  function writeBack(v,oldV){
    try{
      var J=JSON.parse(v);if(!Array.isArray(J))return;
      var by={};rd(LK).forEach(function(e){if(e&&e.id!=null)by[String(e.id)]=e});
      var out=J.filter(function(d){return d&&d.id!=null}).map(function(d){
        var id=lid(d.id),o=by[id]||null;
        if(o&&same(d,A.journalToDesign(o,imp)))return o;      // unchanged: keep the live original byte-for-byte
        var e=A.journalToLive(d,o,imp);if(!o)e.id=/^\d+$/.test(id)?Number(id):id;return e});
      /* deletions: remember them so cloud sync cannot bring a deleted journal back from another device (d:1 deleted, d:0 restored) */
      try{
        var TKD='journall_deleted_journals',tomb={},ts=Date.now(),tch=false,newIds={},oldL=[];
        try{var tv=JSON.parse(localStorage.getItem(TKD)||'null');if(tv&&typeof tv==='object'&&!Array.isArray(tv))tomb=tv}catch(_){console.debug('[journall] ignored error in journal-sync.js:', _);}
        try{var ov=JSON.parse(oldV||'null');if(Array.isArray(ov))oldL=ov}catch(_){console.debug('[journall] ignored error in journal-sync.js:', _);}
        J.forEach(function(d){if(d&&d.id!=null){var k=lid(d.id);newIds[k]=1;if(tomb[k]&&tomb[k].d===1){tomb[k]={t:ts,d:0};tch=true}}});
        oldL.forEach(function(d){if(!d||d.id==null)return;var k=lid(d.id);if(!newIds[k]&&!(tomb[k]&&tomb[k].d===1)){tomb[k]={t:ts,d:1};tch=true}});
        if(tch)localStorage.setItem(TKD,JSON.stringify(tomb));
      }catch(_){console.debug('[journall] ignored error in journal-sync.js:', _);}
      var next=JSON.stringify(out);
      if(next!==JSON.stringify(rd(LK)))localStorage.setItem(LK,next);
    }catch(e){console.error('[Journall] journal write-back failed',e)}
  }
  var prev=Storage.prototype.setItem;
  Storage.prototype.setItem=function(k,v){var old=(this===localStorage&&k==='jlJournals')?this.getItem('jlJournals'):null;prev.call(this,k,v);if(this===localStorage&&k==='jlJournals')writeBack(v,old)};
})();
