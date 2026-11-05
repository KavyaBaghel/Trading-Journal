/* Quick Log: a floating button that opens a short form and saves a normal trade (plus a linked journal when an emotion, note or screenshot is given), dated now in IST. */
(function(){
  if(document.getElementById('qlFab'))return;
  /*QL-PURE-START*/
  var QL_IST=19800000,QL_EMO=['Calm','Confident','FOMO','Fear','Greed','Anxious','Frustrated','Revenge'];
  var QL_IMG=28000,QL_TOTAL=300000,QL_DOC=800000;
  function qlR2(x){return Math.round(x*100)/100}
  function qlNum(s){var t=String(s==null?'':s).replace(/,/g,'').trim();if(!/^(\d+\.?\d*|\.\d+)$/.test(t))return NaN;var n=Number(t);return isFinite(n)?n:NaN}
  function qlStamp(ms){var s=new Date(ms+QL_IST).toISOString();return{date:s.slice(0,10),time:s.slice(11,19)}}
  function qlLiveKey(t){return [t.date,t.time,t.symbol,t.side,t.entry!=null?t.entry:t.openPrice,t.exit!=null?t.exit:t.closePrice,t.pnl].join('|')}
  function qlMs(t){var m=Date.parse(String(t.date)+'T'+String(t.time||'00:00:00')+'Z');return isFinite(m)?m:NaN}
  function qlBuild(o){
    o=o||{};
    if(o.dir!=='BUY'&&o.dir!=='SELL')return{ok:false,why:'Pick Buy or Sell.'};
    if(o.res!=='win'&&o.res!=='loss')return{ok:false,why:'Pick Win or Loss.'};
    var amt=qlNum(o.amount);if(!(amt>0))return{ok:false,why:'Enter the result amount as a number above 0.'};
    var lot=qlNum(o.lot);if(!(lot>0))return{ok:false,why:'Enter the lot size as a number above 0.'};
    var pips=null;
    if(String(o.pips==null?'':o.pips).trim()!==''){pips=qlNum(o.pips);if(!(pips>=0))return{ok:false,why:'Pips must be a number, 0 or more.'}}
    var en=null,ex=null,enS=String(o.entry==null?'':o.entry).trim(),exS=String(o.exit==null?'':o.exit).trim();
    if(enS!==''){en=qlNum(enS);if(!(en>0))return{ok:false,why:'Entry price must be a number above 0.'}}
    if(exS!==''){ex=qlNum(exS);if(!(ex>0))return{ok:false,why:'Exit price must be a number above 0.'}}
    if(en!=null&&ex!=null){
      var mv=o.dir==='BUY'?ex-en:en-ex;
      if((o.res==='win'&&!(mv>0))||(o.res==='loss'&&mv>0)){
        var need={'BUY win':'the exit above the entry','SELL win':'the exit below the entry','BUY loss':'the exit at or below the entry','SELL loss':'the exit at or above the entry'}[o.dir+' '+o.res];
        return{ok:false,why:'These prices do not fit a '+(o.dir==='BUY'?'Buy':'Sell')+' '+o.res+'. It needs '+need+'. Fix them or clear one of the two.'}
      }
    }
    var sym=String(o.sym==null?'':o.sym).trim().toUpperCase().replace(/[^A-Z0-9._-]/g,'').slice(0,12);
    var emo=String(o.emotion||'');if(emo&&QL_EMO.indexOf(emo)<0)return{ok:false,why:'Unknown emotion.'};
    var note=String(o.note==null?'':o.note).trim().slice(0,300);
    var now=Number(o.now);if(!isFinite(now))return{ok:false,why:'No clock time.'};
    var sg=o.res==='win'?1:-1,st=qlStamp(now);
    var t={id:'ql-'+now.toString(36),date:st.date,time:st.time,symbol:sym,side:o.dir,volume:lot,sl:0,pnl:qlR2(sg*amt),reason:'Quick Log',mistakes:[],notes:note,source:'quicklog'};
    if(pips!=null)t.pips=qlR2(sg*pips);
    if(en!=null)t.entry=en;
    if(ex!=null)t.exit=ex;
    var j=null;
    if(emo||note||o.shot){
      j={id:now,tradeKey:qlLiveKey(t),trade:{date:t.date,time:t.time,symbol:sym,side:o.dir,pnl:t.pnl,mistakes:[]},date:t.date,
        title:(o.res==='win'?'Win':'Loss')+' Journal - '+[sym,o.dir].filter(Boolean).join(' '),category:'Journal',result:o.res,screenshot:'',
        emotion:emo,body:note,fields:{},updatedAt:new Date(now).toISOString(),source:'quicklog'};
    }
    return{ok:true,trade:t,journal:j};
  }
  function qlDupes(list,t){
    var out=[],base=qlMs(t);
    (Array.isArray(list)?list:[]).forEach(function(x){
      if(!x||typeof x!=='object'||!/^mt5-\d+$/.test(String(x.id)))return;
      if(x.side!==t.side)return;
      if(!(Math.abs(qlMs(x)-base)<=43200000))return;
      if(Math.abs(Number(x.volume)-t.volume)<1e-6)out.push(x);
    });
    return out;
  }
  function qlShotCheck(o){
    if(o.img>QL_IMG)return{ok:false,why:'That screenshot is still too large after shrinking.'};
    if(o.total>QL_TOTAL)return{ok:false,why:'Screenshot budget is full ('+Math.round(o.totalBefore/1000)+' of '+Math.round(QL_TOTAL/1000)+' KB used). Remove one in Journal first.'};
    if(o.doc>QL_DOC)return{ok:false,why:'Your synced data is close to the cloud size limit, so no more screenshots can be added.'};
    return{ok:true,why:''};
  }
  function qlOrigMs(id){var m=/^ql-([0-9a-z]+)$/.exec(String(id));if(!m)return NaN;var n=parseInt(m[1],36);return isFinite(n)&&n>0?n:NaN}
  function qlAutoTitle(res,sym,side){return(res==='win'?'Win':'Loss')+' Journal - '+[sym,side].filter(Boolean).join(' ')}
  function qlTomb(tomb,id,d,ts){var o={};if(tomb&&typeof tomb==='object'&&!Array.isArray(tomb))Object.keys(tomb).forEach(function(k){o[k]=tomb[k]});o[String(id)]={t:ts,d:d};return o}
  function qlEditBuild(old,oj,o){
    o=o||{};
    if(!old||typeof old!=='object'||!/^ql-/.test(String(old.id)))return{ok:false,why:'This is not a Quick Log trade.'};
    var ms=qlOrigMs(old.id);if(!isFinite(ms))return{ok:false,why:'Could not read the original time of this trade.'};
    var keep=!!(o.keepBody&&oj);
    var b=qlBuild({dir:o.dir,res:o.res,amount:o.amount,lot:o.lot,pips:o.pips,sym:o.sym,entry:o.entry,exit:o.exit,emotion:o.emotion,note:keep?String(oj.body||'').slice(0,300):o.note,shot:!!o.shot,now:ms});
    if(!b.ok)return b;
    var t=Object.assign({},old);
    t.side=b.trade.side;t.symbol=b.trade.symbol;t.volume=b.trade.volume;t.pnl=b.trade.pnl;t.notes=b.trade.notes;
    if(b.trade.pips!=null)t.pips=b.trade.pips;else if(old.pips!=null)t.pips=null;
    if(b.trade.entry!=null)t.entry=b.trade.entry;else if(old.entry!=null)t.entry=null;
    if(b.trade.exit!=null)t.exit=b.trade.exit;else if(old.exit!=null)t.exit=null;
    var key=qlLiveKey(t),emo=String(o.emotion||''),noteTxt=keep?String(oj.body||''):b.trade.notes;
    var has=!!(emo||noteTxt||o.shot);
    var out={ok:true,trade:t,journal:null,dropJournal:false};
    var ts=Number(o.editedAt),iso=isFinite(ts)?new Date(ts).toISOString():'';
    if(oj){
      var autoOld=qlAutoTitle(oj.result,old.symbol,old.side),plain=!oj.fields||Object.keys(oj.fields).length===0;
      if(!has&&plain&&oj.title===autoOld){out.dropJournal=true;return out}
      var j=Object.assign({},oj);
      j.tradeKey=key;
      j.trade=Object.assign({},oj.trade||{},{date:t.date,time:t.time,symbol:t.symbol,side:t.side,pnl:t.pnl});
      j.result=o.res;
      if(oj.title===autoOld)j.title=qlAutoTitle(o.res,t.symbol,t.side);
      j.emotion=emo;j.body=keep?oj.body:b.trade.notes;
      if(iso)j.updatedAt=iso;
      out.journal=j;
    }else if(has){out.journal=b.journal}
    return out;
  }
  /*QL-PURE-END*/

  var KT=JL_KEYS.keys.VIZTRADE_TRADING_PAGE_TRADES,KB=JL_KEYS.keys.VIZTRADE_TRADES,KJ=JL_KEYS.keys.KRISHNA_JOURNAL_PAGE_ENTRIES,KS=JL_KEYS.keys.JOURNALL_SHOTS_V1;
  function $(id){return document.getElementById(id)}
  function rd(k){try{var v=JSON.parse(localStorage.getItem(k)||'null');return Array.isArray(v)?v:[]}catch(e){return[]}}
  function rdShots(){try{var v=JSON.parse(localStorage.getItem(KS)||'null');return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}catch(e){return{}}}
  function chars(l){return(Array.isArray(l)?l:[]).reduce(function(n,x){return n+(typeof x==='string'?x.length:0)},0)}
  function shotsTotal(m){return Object.keys(m).reduce(function(n,k){return n+chars(m[k])},0)}
  function syncedSize(){var n=0;try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(!k||k===JL_KEYS.keys.KRISHNA_JOURNAL_FORM_DRAFT||k===JL_KEYS.keys.KRISHNA_PSYCHOLOGY_FORM_DRAFT)continue;
    if(k==='theme'||k==='selectedDate'||['viz','viztrade','krishna','journall'].some(function(p){return k.indexOf(p)===0}))n+=k.length+(localStorage.getItem(k)||'').length}}catch(e){console.debug('[journall] ignored error in quick-log.js:', e);}return n}
  function shrink(file){return new Promise(function(res,rej){var url=URL.createObjectURL(file),im=new Image();
    im.onload=function(){URL.revokeObjectURL(url);try{
      var sides=[560,480,400,320,260],qs=[.5,.4,.3];
      for(var a=0;a<sides.length;a++){var sc=Math.min(1,sides[a]/Math.max(im.naturalWidth,im.naturalHeight)),w=Math.max(1,Math.round(im.naturalWidth*sc)),h=Math.max(1,Math.round(im.naturalHeight*sc)),cv=document.createElement('canvas');
        cv.width=w;cv.height=h;var g=cv.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,w,h);g.drawImage(im,0,0,w,h);
        for(var b=0;b<qs.length;b++){var d=cv.toDataURL('image/jpeg',qs[b]);if(d.length<=QL_IMG){res(d);return}}}
      res(null)}catch(e){rej(e)}};
    im.onerror=function(){URL.revokeObjectURL(url);rej(new Error('bad image'))};im.src=url})}

  var fab=document.createElement('button');
  fab.id='qlFab';fab.type='button';fab.title='Quick log a trade';fab.setAttribute('aria-label','Quick log a trade');
  fab.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';

  var scrim=null,dir='',res='',emo='',shot=null,warned=false,busy=false,opener=null,editCtx=null;
  function build(){
    scrim=document.createElement('div');scrim.className='ql-scrim';scrim.id='qlScrim';scrim.hidden=true;
    scrim.innerHTML='<div class="ql-card" role="dialog" aria-modal="true" aria-labelledby="qlTitle">'
    +'<div class="ql-head"><h2 id="qlTitle">Quick log</h2><button type="button" class="ql-x" id="qlX" aria-label="Close">&times;</button></div>'
    +'<p class="ql-sub" id="qlSub">Saves as a normal trade, dated now in IST.</p>'
    +'<div class="ql-row"><div class="ql-seg" id="qlDir" role="group" aria-label="Direction"><button type="button" data-v="BUY" aria-pressed="false">Buy</button><button type="button" data-v="SELL" aria-pressed="false">Sell</button></div>'
    +'<div class="ql-seg win" id="qlRes" role="group" aria-label="Result"><button type="button" data-v="win" aria-pressed="false">Win</button><button type="button" data-v="loss" aria-pressed="false">Loss</button></div></div>'
    +'<div class="ql-grid"><label>Result amount (USD)<input type="text" id="qlAmt" inputmode="decimal" autocomplete="off"></label>'
    +'<label>Lot size<input type="text" id="qlLot" inputmode="decimal" autocomplete="off"></label>'
    +'<label>Pips (optional)<input type="text" id="qlPips" inputmode="decimal" autocomplete="off"></label>'
    +'<label>Symbol (optional)<input type="text" id="qlSym" maxlength="12" autocomplete="off" autocapitalize="characters"></label>'
    +'<label>Entry price (optional)<input type="text" id="qlEn" inputmode="decimal" autocomplete="off"></label>'
    +'<label>Exit price (optional)<input type="text" id="qlEx" inputmode="decimal" autocomplete="off"></label></div>'
    +'<div class="ql-lab" id="qlEmoL">How did you feel (optional)</div>'
    +'<div class="ql-chips" id="qlEmo" role="group" aria-labelledby="qlEmoL">'+QL_EMO.map(function(x){return'<button type="button" class="ql-chip" data-v="'+x+'" aria-pressed="false">'+x+'</button>'}).join('')+'</div>'
    +'<label>Short note (optional)<textarea id="qlNote" maxlength="300" rows="2"></textarea></label>'
    +'<div class="ql-shot"><input type="file" id="qlFile" accept="image/*" hidden><button type="button" class="ql-btn ql-ghost" id="qlAddShot">Add screenshot</button><span class="ql-m" id="qlShotMsg"></span><div id="qlThumb"></div></div>'
    +'<p class="ql-msg" id="qlMsg" role="status" aria-live="polite"></p>'
    +'<div class="ql-foot"><button type="button" class="ql-btn ql-ghost" id="qlCancel">Cancel</button><button type="button" class="ql-btn ql-pri" id="qlSave">Save trade</button></div></div>';
    document.body.appendChild(scrim);
    scrim.addEventListener('mousedown',function(e){if(e.target===scrim)close()});
    $('qlX').addEventListener('click',close);$('qlCancel').addEventListener('click',close);
    function seg(id,set){$(id).addEventListener('click',function(e){var b=e.target.closest('button[data-v]');if(!b)return;set(b.getAttribute('data-v'));paintSeg();reset()})}
    seg('qlDir',function(v){dir=v});seg('qlRes',function(v){res=v});
    $('qlEmo').addEventListener('click',function(e){var b=e.target.closest('button[data-v]');if(!b)return;var v=b.getAttribute('data-v');emo=emo===v?'':v;paintSeg()});
    ['qlAmt','qlLot','qlPips','qlSym','qlEn','qlEx','qlNote'].forEach(function(id){$(id).addEventListener('input',reset)});
    $('qlAddShot').addEventListener('click',function(){$('qlFile').click()});
    $('qlFile').addEventListener('change',onFile);
    $('qlSave').addEventListener('click',save);
    scrim.addEventListener('keydown',function(e){
      if(e.key==='Escape'){e.preventDefault();close();return}
      if(e.key!=='Tab')return;
      var f=Array.prototype.slice.call(scrim.querySelectorAll('button:not([disabled]),input:not([hidden]):not([disabled]),textarea')).filter(function(x){return x.offsetParent!==null});
      if(!f.length)return;var a=f[0],z=f[f.length-1];
      if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus()}});
  }
  function paintSeg(){
    [['qlDir',dir],['qlRes',res]].forEach(function(p){Array.prototype.forEach.call($(p[0]).querySelectorAll('button'),function(b){var on=b.getAttribute('data-v')===p[1];b.classList.toggle('on',on);b.setAttribute('aria-pressed',on?'true':'false')})});
    Array.prototype.forEach.call($('qlEmo').querySelectorAll('button'),function(b){var on=b.getAttribute('data-v')===emo;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on?'true':'false')});
  }
  function paintShot(){
    var t=$('qlThumb');t.innerHTML='';
    if(shot){var w=document.createElement('div');w.className='ql-thumb';var im=document.createElement('img');im.alt='Attached screenshot';im.src=shot;var x=document.createElement('button');x.type='button';x.setAttribute('aria-label','Remove screenshot');x.innerHTML='&times;';
      x.addEventListener('click',function(){shot=null;paintShot();msg('',false)});w.appendChild(im);w.appendChild(x);t.appendChild(w)}
    $('qlAddShot').textContent=shot?'Replace screenshot':'Add screenshot';
    $('qlShotMsg').textContent=shot?'1 of 1 screenshot':'';
  }
  function msg(t,err){var m=$('qlMsg');m.textContent=t||'';m.className='ql-msg'+(err?' err':'')}
  function reset(){if(warned){warned=false;$('qlSave').textContent='Save trade'}msg('',false)}
  function open(){
    if(!scrim)build();
    dir='';res='';emo='';shot=null;warned=false;busy=false;editCtx=null;
    $('qlTitle').textContent='Quick log';$('qlSub').textContent='Saves as a normal trade, dated now in IST.';$('qlNote').disabled=false;$('qlAddShot').hidden=false;
    ['qlAmt','qlLot','qlPips','qlSym','qlEn','qlEx','qlNote'].forEach(function(id){$(id).value=''});
    $('qlFile').value='';$('qlSave').textContent='Save trade';$('qlSave').disabled=false;msg('',false);paintSeg();paintShot();
    opener=document.activeElement;scrim.hidden=false;fab.style.visibility='hidden';
    var f=scrim.querySelector('#qlDir button');if(f)f.focus();
  }
  function close(){if(!scrim)return;scrim.hidden=true;fab.style.visibility='';try{(opener&&opener.focus?opener:fab).focus()}catch(e){console.debug('[journall] ignored error in quick-log.js:', e);}}
  async function onFile(e){
    var f=(e.target.files||[])[0];e.target.value='';if(!f)return;
    if(!/^image\//.test(f.type)){msg('Only image files can be attached.',true);return}
    var d=null;try{d=await shrink(f)}catch(_){msg('Could not read that image.',true);return}
    if(!d){msg('That screenshot is still too large after shrinking.',true);return}
    var m=rdShots(),before=shotsTotal(m)-(editCtx&&editCtx.jid!=null&&m[String(editCtx.jid)]?chars(m[String(editCtx.jid)]):0);
    var r=qlShotCheck({img:d.length,total:before+d.length,totalBefore:before,doc:syncedSize()+d.length});
    if(!r.ok){msg(r.why,true);return}
    shot=d;paintShot();msg('',false);
  }
  function commit(r){
    var prev={},wrote=[];
    function snap(k){prev[k]=localStorage.getItem(k)}
    try{
      if(r.journal&&shot){snap(KS);var m=rdShots();m[String(r.journal.id)]=[shot];localStorage.setItem(KS,JSON.stringify(m));wrote.push(KS)}
      snap(KT);var T=rd(KT);if(window.JLAccounts&&!r.trade.account)r.trade.account=window.JLAccounts.writeId();T.push(r.trade);localStorage.setItem(KT,JSON.stringify(T));wrote.push(KT);
      if(r.journal){snap(KJ);var J=rd(KJ);J.push(r.journal);localStorage.setItem(KJ,JSON.stringify(J));wrote.push(KJ)}
      return true;
    }catch(e){
      wrote.forEach(function(k){try{if(prev[k]==null)localStorage.removeItem(k);else localStorage.setItem(k,prev[k])}catch(_){console.debug('[journall] ignored error in quick-log.js:', _);}});
      return false;
    }
  }
  function save(){
    if(busy)return;
    if(editCtx){saveEdit();return}
    var r=qlBuild({dir:dir,res:res,amount:$('qlAmt').value,lot:$('qlLot').value,pips:$('qlPips').value,sym:$('qlSym').value,entry:$('qlEn').value,exit:$('qlEx').value,emotion:emo,note:$('qlNote').value,shot:!!shot,now:Date.now()});
    if(!r.ok){msg(r.why,true);return}
    if(!warned){
      var dp=qlDupes(rd(KB).concat(rd(KT)),r.trade);
      if(dp.length){
        var x=dp[0];
        msg('The MT5 bridge already has a '+x.side+' of the same lot at '+String(x.time||'').slice(0,5)+' on '+x.date+' (result '+x.pnl+'). Saving this would count it twice. Tap Save anyway to keep both, or Cancel.',false);
        warned=true;$('qlSave').textContent='Save anyway';return;
      }
    }
    busy=true;$('qlSave').disabled=true;
    if(!commit(r)){busy=false;$('qlSave').disabled=false;msg('Could not save. Your browser storage may be full. Nothing was changed.',true);return}
    close();
    if(typeof window.jlToast==='function')window.jlToast({icon:'check',text:'Trade logged',sub:'Updating the page',duration:2400});
    setTimeout(function(){try{location.reload()}catch(e){console.debug('[journall] ignored error in quick-log.js:', e);}},2500);
  }
  function toast(o){if(typeof window.jlToast==='function')window.jlToast(o)}
  function qlEv(n,id,en){try{window.dispatchEvent(new CustomEvent(n,{detail:{id:id,entry:en?JSON.parse(JSON.stringify(en)):null}}))}catch(e){console.debug('[journall] ignored error in quick-log.js:', e);}}
  var KJT=JL_KEYS.keys.JOURNALL_DELETED_JOURNALS;
  function rdObj(k){try{var v=JSON.parse(localStorage.getItem(k)||'null');return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}catch(e){return{}}}
  function findQl(id){
    var t=rd(KT).filter(function(x){return x&&x.id===id})[0];if(!t||!/^ql-/.test(String(id)))return null;
    var key=qlLiveKey(t),ms=qlOrigMs(id),J=rd(KJ);
    var oj=J.filter(function(e){return e&&String(e.tradeKey)===key})[0]||J.filter(function(e){return e&&String(e.id)===String(ms)})[0]||null;
    return{t:t,oj:oj};
  }
  function editTrade(id,btn){
    var f=findQl(id);
    if(!f){toast({icon:'trash',text:'Could not find that trade on this device',duration:3200,progress:false});return}
    var t=f.t,oj=f.oj,list=oj?(rdShots()[String(oj.id)]||[]):[];
    open();
    if(btn)opener=btn;
    editCtx={id:id,jid:oj?oj.id:null,locked:!!(oj&&String(oj.body||'').length>300),shotLocked:list.length>1};
    dir=t.side;res=Number(t.pnl)<0?'loss':'win';emo=oj&&QL_EMO.indexOf(oj.emotion)>=0?oj.emotion:'';
    $('qlAmt').value=String(Math.abs(Number(t.pnl)));$('qlLot').value=String(t.volume);
    $('qlPips').value=t.pips!=null&&isFinite(Number(t.pips))?String(Math.abs(Number(t.pips))):'';
    $('qlSym').value=t.symbol||'';$('qlEn').value=t.entry!=null&&isFinite(Number(t.entry))?String(t.entry):'';$('qlEx').value=t.exit!=null&&isFinite(Number(t.exit))?String(t.exit):'';
    $('qlNote').value=oj?String(oj.body||''):String(t.notes||'');
    shot=list.length===1?list[0]:null;
    $('qlTitle').textContent='Edit Quick Log trade';$('qlSub').textContent='Date and time stay as first logged.';$('qlSave').textContent='Save changes';
    paintSeg();paintShot();
    if(editCtx.locked){$('qlNote').disabled=true;msg('This note is longer than 300 characters, so it stays as it is. Edit it in Journal.',false)}
    if(editCtx.shotLocked){$('qlAddShot').hidden=true;$('qlShotMsg').textContent=list.length+' screenshots, manage them in Journal'}
  }
  function saveEdit(){
    var f=findQl(editCtx.id);
    if(!f){msg('That trade is no longer on this device. Nothing was changed.',true);return}
    var r=qlEditBuild(f.t,f.oj,{dir:dir,res:res,amount:$('qlAmt').value,lot:$('qlLot').value,pips:$('qlPips').value,sym:$('qlSym').value,entry:$('qlEn').value,exit:$('qlEx').value,emotion:emo,note:$('qlNote').value,keepBody:editCtx.locked,shot:!!shot,editedAt:Date.now()});
    if(!r.ok){msg(r.why,true);return}
    busy=true;$('qlSave').disabled=true;
    var prev={};
    function snap(k){if(!(k in prev))prev[k]=localStorage.getItem(k)}
    try{
      snap(KT);var T=rd(KT),i=T.findIndex(function(x){return x&&x.id===editCtx.id});if(i<0)throw new Error('gone');T[i]=r.trade;localStorage.setItem(KT,JSON.stringify(T));
      var oj=f.oj,jid=null;
      if(r.dropJournal||r.journal){
        snap(KJ);var J=rd(KJ);
        if(r.dropJournal){jid=oj.id;J=J.filter(function(e){return !(e&&String(e.id)===String(oj.id))});snap(KJT);localStorage.setItem(KJT,JSON.stringify(qlTomb(rdObj(KJT),oj.id,1,Date.now())))}
        else{
          jid=r.journal.id;var k=J.findIndex(function(e){return e&&String(e.id)===String(jid)});if(k>=0)J[k]=r.journal;else J.push(r.journal);
          var tb=rdObj(KJT);if(tb[String(jid)]&&tb[String(jid)].d===1){snap(KJT);localStorage.setItem(KJT,JSON.stringify(qlTomb(tb,jid,0,Date.now())))}
        }
        localStorage.setItem(KJ,JSON.stringify(J));
      }
      if(jid!=null&&!editCtx.shotLocked){
        var m=rdShots(),kk=String(jid),want=shot?[shot]:[];
        if(JSON.stringify(m[kk]||[])!==JSON.stringify(want)){snap(KS);m[kk]=want;localStorage.setItem(KS,JSON.stringify(m))}
      }
    }catch(e){
      Object.keys(prev).forEach(function(k){try{if(prev[k]==null)localStorage.removeItem(k);else localStorage.setItem(k,prev[k])}catch(_){console.debug('[journall] ignored error in quick-log.js:', _);}});
      busy=false;$('qlSave').disabled=false;msg('Could not save. Your browser storage may be full. Nothing was changed.',true);return;
    }
    if(editCtx.jid!=null&&r.dropJournal)qlEv('ql-journal-removed',editCtx.jid);else if(r.journal)qlEv('ql-journal-changed',r.journal.id,r.journal);
    close();
    toast({icon:'check',text:'Trade updated',sub:'Updating the page',duration:2400});
    setTimeout(function(){try{location.reload()}catch(e){console.debug('[journall] ignored error in quick-log.js:', e);}},2500);
  }
  window.qlEditTrade=editTrade;
  var KTT=JL_KEYS.keys.JOURNALL_DELETED_TRADES,delBusy=false;
  function deleteTrade(id,btn){
    if(delBusy)return;
    var f=findQl(id);
    if(!f){toast({icon:'trash',text:'Could not find that trade on this device',duration:3200,progress:false});return}
    if(typeof window.jlConfirm!=='function')return;
    var t=f.t,pnl=Number(t.pnl);
    window.jlConfirm({title:'Delete this Quick Log trade?',body:'This removes the trade, its journal entry and its screenshot, here and in your synced data. You get 5 seconds to undo it.',
      preview:{title:(pnl<0?'Loss':'Win')+' trade',sub:[t.date,t.symbol,t.side].filter(Boolean).join(' \u00b7 '),value:(pnl<0?'-':'+')+'$'+Math.abs(pnl).toFixed(2),color:pnl<0?'var(--red)':'var(--green)'},
      confirmText:'Delete',cancelText:'Keep it',danger:true,opener:btn}).then(function(ok){if(ok)doDelete(id)});
  }
  function doDelete(id){
    if(delBusy)return;
    var f=findQl(id);if(!f)return;
    var t=f.t,oj=f.oj,prev={},ts=Date.now(),ti=-1,ji=-1,jk=oj?String(oj.id):null,saved=[];
    function snap(k){if(!(k in prev))prev[k]=localStorage.getItem(k)}
    try{
      snap(KT);var T=rd(KT);ti=T.findIndex(function(x){return x&&x.id===id});if(ti<0)throw new Error('gone');T.splice(ti,1);localStorage.setItem(KT,JSON.stringify(T));
      snap(KTT);localStorage.setItem(KTT,JSON.stringify(qlTomb(rdObj(KTT),id,1,ts)));
      if(oj){
        snap(KJ);var J=rd(KJ);ji=J.findIndex(function(e){return e&&String(e.id)===jk});if(ji>=0){J.splice(ji,1);localStorage.setItem(KJ,JSON.stringify(J))}
        snap(KJT);localStorage.setItem(KJT,JSON.stringify(qlTomb(rdObj(KJT),oj.id,1,ts)));
        var m=rdShots();saved=(m[jk]||[]).slice();if(saved.length){snap(KS);m[jk]=[];localStorage.setItem(KS,JSON.stringify(m))}
      }
    }catch(e){
      Object.keys(prev).forEach(function(k){try{if(prev[k]==null)localStorage.removeItem(k);else localStorage.setItem(k,prev[k])}catch(_){console.debug('[journall] ignored error in quick-log.js:', _);}});
      toast({icon:'trash',text:'Could not delete. Nothing was changed.',duration:3600,progress:false});return;
    }
    delBusy=true;var undone=false;
    if(oj)qlEv('ql-journal-removed',oj.id);
    toast({icon:'trash',text:'Trade deleted',sub:[t.symbol,t.side].filter(Boolean).join(' \u00b7 '),actionText:'Undo',duration:5000,onAction:function(){
      if(undone)return;undone=true;
      try{
        var T2=rd(KT);if(!T2.some(function(x){return x&&x.id===id})){T2.splice(Math.min(ti,T2.length),0,t);localStorage.setItem(KT,JSON.stringify(T2))}
        localStorage.setItem(KTT,JSON.stringify(qlTomb(rdObj(KTT),id,0,Date.now())));
        if(oj){
          var J2=rd(KJ);if(!J2.some(function(e){return e&&String(e.id)===jk})){J2.splice(Math.min(Math.max(ji,0),J2.length),0,oj);localStorage.setItem(KJ,JSON.stringify(J2))}
          localStorage.setItem(KJT,JSON.stringify(qlTomb(rdObj(KJT),oj.id,0,Date.now())));
          if(saved.length){var m2=rdShots();m2[jk]=saved;localStorage.setItem(KS,JSON.stringify(m2))}
          qlEv('ql-journal-restored',oj.id);
        }
      }catch(e){console.debug('[journall] ignored error in quick-log.js:', e);}
      delBusy=false;toast({icon:'check',text:'Trade restored',duration:2200,progress:false});
    }});
    setTimeout(function(){if(!undone){try{location.reload()}catch(e){console.debug('[journall] ignored error in quick-log.js:', e);}}},5400);
  }
  window.qlDeleteTrade=deleteTrade;
  fab.addEventListener('click',open);
})();
