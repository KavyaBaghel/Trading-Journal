(function(){
/*SC-PURE-START*/
var DNAME=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],MNAME=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function scDate(s){var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s||''));if(!m)return String(s||'');var d=new Date(Date.UTC(+m[1],+m[2]-1,+m[3]));return DNAME[d.getUTCDay()]+' '+(+m[3])+' '+MNAME[d.getUTCMonth()]+' '+m[1]}
function scHold(sec){sec=Number(sec);if(!isFinite(sec)||sec<=0)return '';if(sec<60)return Math.max(1,Math.round(sec))+'s';var m=Math.round(sec/60);if(m<60)return m+'m';var h=Math.floor(m/60);m=m%60;if(h<24)return h+'h '+m+'m';return Math.floor(h/24)+'d '+(h%24)+'h'}
function scNum(v){v=Number(v);return isFinite(v)?String(+v.toFixed(5)):''}
function scMoney(v){return (v<0?'-$':'+$')+Math.abs(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}
function shareModel(e,t,o){
  o=o||{};e=e||{};
  var kindFn=o.kindFn||function(p){return p<0?'loss':p>0?'win':'be'};
  var has=e.pnl!=null&&isFinite(Number(e.pnl)),pnl=has?Number(e.pnl):null;
  var kind=has?kindFn(pnl):'note',side=String(e.side||'').toUpperCase();
  var dir=/^S/.test(side)?-1:/^B/.test(side)?1:0,r=null;
  if(t&&dir){var en=Number(t.en),ex=Number(t.ex),sl=Number(t.sl);
    if(t.sl!=null&&isFinite(en)&&isFinite(ex)&&isFinite(sl)&&sl>0&&en!==sl)r=dir*(ex-en)/Math.abs(en-sl)}
  var bal=Number(o.balance),pct=(has&&isFinite(bal)&&bal>0)?pnl/bal*100:null;
  var g=typeof o.gradeFn==='function'?o.gradeFn(e.q):null;
  return{sym:String(e.sym||''),side:/^S/.test(side)?'SELL':/^B/.test(side)?'BUY':side,date:scDate(e.date),kind:kind,
    word:{win:'WIN',loss:'LOSS',be:'BREAK-EVEN',note:'NOTE'}[kind]||'',usd:pnl,r:r,pct:pct,
    entry:t?scNum(t.en):'',exit:t?scNum(t.ex):'',held:t?scHold(t.hold):'',grade:g?g.g:'',
    setup:String(e.setup||''),conf:Array.isArray(e.conf)?e.conf.filter(Boolean).map(String):[]};
}
function shareBig(m,dollars){
  if(dollars&&m.usd!=null)return{text:scMoney(m.usd),caption:'Net P&L',mode:'usd'};
  if(m.r!=null)return{text:(m.r<0?'-':'+')+Math.abs(m.r).toFixed(2)+'R',caption:'R multiple, from your stop loss',mode:'r'};
  if(m.pct!=null)return{text:(m.pct<0?'-':'+')+Math.abs(m.pct).toFixed(2)+'%',caption:'Of starting balance',mode:'pct'};
  return{text:m.word,caption:'Result',mode:'none'};
}
/*SC-PURE-END*/
var HINT={usd:'Dollar amount is visible on the card.',r:'Dollar amounts are hidden. Showing the R multiple.',pct:'Dollar amounts are hidden. Showing percent of your starting balance.',none:'Dollar amounts are hidden. No stop loss or starting balance is set, so only the result shows.'};
var COL={win:'#43d787',loss:'#f0685c',be:'#9aa3b2',note:'#818cf8'},FONT='Inter, "Helvetica Neue", Arial, sans-serif';
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
function pill(c,x,y,text,font,fg,bg,padX,h){c.font=font;var w=c.measureText(text).width+padX*2;rr(c,x,y,w,h,h/2);c.fillStyle=bg;c.fill();c.fillStyle=fg;c.textBaseline='middle';c.textAlign='left';c.fillText(text,x+padX,y+h/2+1);return w}
function drawCard(cv,m,dollars){
  var c=cv.getContext('2d'),W=1080,H=1080,P=72,kc=COL[m.kind]||COL.note,big=shareBig(m,dollars);
  var bg=c.createLinearGradient(0,0,W,H);bg.addColorStop(0,'#0f1322');bg.addColorStop(1,'#080a10');c.fillStyle=bg;c.fillRect(0,0,W,H);
  var gl=c.createRadialGradient(W-120,80,0,W-120,80,620);gl.addColorStop(0,kc+'40');gl.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=gl;c.fillRect(0,0,W,H);
  c.textBaseline='alphabetic';c.textAlign='left';c.fillStyle='#e8ebf4';c.font='700 30px '+FONT;
  try{c.letterSpacing='6px'}catch(e){console.debug('[journall] ignored error in share-card.js:', e);}c.fillText('JOURNALL',P,112);try{c.letterSpacing='0px'}catch(e){console.debug('[journall] ignored error in share-card.js:', e);}
  c.textAlign='right';c.fillStyle='#8b93a7';c.font='500 30px '+FONT;c.fillText(m.date,W-P,112);c.textAlign='left';
  c.fillStyle='#ffffff';c.font='800 96px '+FONT;var sym=m.sym||'Trade';c.fillText(sym,P,260);
  var sw=c.measureText(sym).width,x=P+sw+28;
  if(m.side)pill(c,x,196,m.side,'700 32px '+FONT,'#c4c9ff','rgba(129,140,248,.22)',26,64);
  pill(c,P,300,m.word,'800 30px '+FONT,'#0b0d12',kc,28,60);
  var size=168;c.font='800 '+size+'px '+FONT;while(size>64&&c.measureText(big.text).width>W-P*2){size-=6;c.font='800 '+size+'px '+FONT}
  c.fillStyle=kc;c.fillText(big.text,P,590);
  c.fillStyle='#8b93a7';c.font='500 32px '+FONT;c.fillText(big.caption,P,650);
  c.fillStyle='rgba(255,255,255,.1)';c.fillRect(P,720,W-P*2,2);
  var cols=[['ENTRY',m.entry],['EXIT',m.exit],['HELD',m.held],['GRADE',m.grade]],cw=(W-P*2)/4;
  cols.forEach(function(k,i){var cx=P+cw*i;c.fillStyle='#6f778a';c.font='700 22px '+FONT;c.fillText(k[0],cx,780);c.fillStyle='#ffffff';c.font='700 44px '+FONT;c.fillText(k[1]||'-',cx,840)});
  var chips=[];if(m.setup)chips.push(m.setup);m.conf.forEach(function(s){chips.push(s)});
  var cx=P,cy=904,n=0;
  for(var i=0;i<chips.length;i++){c.font='600 28px '+FONT;var w=c.measureText(chips[i]).width+44;
    if(cx+w>W-P-(i<chips.length-1?90:0)&&i>0){var more='+'+(chips.length-i);pill(c,cx,cy,more,'600 28px '+FONT,'#8b93a7','rgba(255,255,255,.07)',22,58);break}
    pill(c,cx,cy,chips[i],'600 28px '+FONT,i===0&&m.setup?'#c4c9ff':'#d7dbe8',i===0&&m.setup?'rgba(129,140,248,.2)':'rgba(255,255,255,.08)',22,58);cx+=w+12;n++}
  return big;
}
var box=null,cv,cur=null,opener=null;
function $(id){return document.getElementById(id)}
function build(){
  if(box)return;
  box=document.createElement('div');box.id='jlShare';box.className='jls';box.hidden=true;box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label','Share trade card');
  box.innerHTML='<div class="jls-box"><div class="jls-head"><b>Share card</b><button type="button" class="jls-x" id="jlsX" aria-label="Close">\u00d7</button></div><canvas id="jlsCv" width="1080" height="1080"></canvas><label class="jls-sw"><input type="checkbox" id="jlsDol"><span>Show dollar amounts</span></label><small id="jlsHint"></small><div class="jls-act"><button type="button" class="jls-btn" id="jlsCopy">Copy image</button><button type="button" class="jls-btn pri" id="jlsDl">Download PNG</button></div><small id="jlsMsg" role="status"></small></div>';
  document.body.appendChild(box);cv=$('jlsCv');
  $('jlsX').addEventListener('click',close);
  box.addEventListener('click',function(ev){if(ev.target===box)close()});
  document.addEventListener('keydown',function(ev){if(!box.hidden&&ev.key==='Escape')close()});
  $('jlsDol').addEventListener('change',paint);
  $('jlsDl').addEventListener('click',download);$('jlsCopy').addEventListener('click',copy);
}
function paint(){if(!cur)return;var big=drawCard(cv,cur,$('jlsDol').checked);$('jlsHint').textContent=HINT[big.mode]||'';$('jlsMsg').textContent=''}
function findTrade(e){var k=e.key;if(!k)return null;var a=window.__trades||[];for(var i=0;i<a.length;i++){var t=a[i];if(t&&(t.d+' '+t.t+' '+t.side+' '+t.en+' '+t.pnl)===k)return t}return null}
function open(e,btn){
  build();opener=btn||null;
  cur=shareModel(e,findTrade(e),{kindFn:typeof window.jlKind==='function'?window.jlKind:null,balance:window.jlStartBalance,gradeFn:window.jGrade});
  $('jlsDol').checked=false;paint();box.hidden=false;$('jlsX').focus();
}
function close(){if(box)box.hidden=true;if(opener&&opener.focus){try{opener.focus()}catch(e){console.debug('[journall] ignored error in share-card.js:', e);}}}
function blobOf(cb){cv.toBlob(function(b){cb(b)},'image/png')}
function fname(){var s=(cur&&cur.sym||'trade').replace(/[^A-Za-z0-9]+/g,'');return 'journall-'+s+'-'+(cur&&cur.date?cur.date.replace(/\s+/g,'-'):'card')+'.png'}
function download(){blobOf(function(b){if(!b){$('jlsMsg').textContent='Could not create the image.';return}var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=fname();document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href)},2000);$('jlsMsg').textContent='Image downloaded.'})}
function copy(){
  if(!(navigator.clipboard&&window.ClipboardItem)){$('jlsMsg').textContent='Copy is not supported in this browser. Use Download PNG.';return}
  blobOf(function(b){if(!b){$('jlsMsg').textContent='Could not create the image.';return}
    navigator.clipboard.write([new ClipboardItem({'image/png':b})]).then(function(){$('jlsMsg').textContent='Image copied.';if(typeof window.jlToast==='function')window.jlToast({icon:'check',text:'Image copied',duration:2200,progress:false})},function(){$('jlsMsg').textContent='Copy was blocked. Use Download PNG.'})})
}
document.addEventListener('click',function(ev){var b=ev.target&&ev.target.closest?ev.target.closest('[data-share]'):null;if(!b)return;var e=(window.__jlShareE||{})[b.getAttribute('data-share')];if(!e)return;ev.preventDefault();open(e,b)});
window.jlShareModel=shareModel;window.jlShareOpen=open;
})();
