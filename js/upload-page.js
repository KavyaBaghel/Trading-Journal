(function(){
  const dEl = document.getElementById('dateStrUp');
  if(dEl) dEl.textContent = new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});

  const dot = document.getElementById('udDot'), title = document.getElementById('udTitle'),
    syncTxt = document.getElementById('udSyncTxt'), lastSync = document.getElementById('udLastSync'),
    syncBtn = document.getElementById('udSyncBtn'), drop = document.getElementById('udDrop'),
    fileInput = document.getElementById('udFile'), result = document.getElementById('udResult');
  let mounted = false;

  function setSynced(){ if(window.jlPaintSync) window.jlPaintSync(); }

  function mount(){
    if(mounted) return; mounted = true;

    syncBtn.addEventListener('click', ()=>{ if(window.jlSyncMt5) window.jlSyncMt5({btn:syncBtn}); });
    setSynced();

    function showResult(text, cls){
      result.hidden = false; result.className = 'ud-drop-result'; void result.offsetWidth;
      result.classList.add(cls); result.textContent = text;
    }


    function parseTrades(txt){
      txt=String(txt).replace(/^\uFEFF/,'');
      const lines=txt.split(/\r\n|\n|\r/).filter(l=>l.trim());
      const dl=[',',';','\t'].map(d=>[d,(lines[0]||'').split(d).length]).sort((a,b)=>b[1]-a[1])[0][0];
      const split=l=>{const o=[];let c='',q=false;for(const ch of l){if(ch==='"')q=!q;else if(ch===dl&&!q){o.push(c);c=''}else c+=ch}o.push(c);return o.map(x=>x.trim())};
      let hi=-1;for(let i=0;i<Math.min(lines.length,40);i++){const h=split(lines[i]).map(x=>x.toLowerCase());if(h.includes('profit')&&(h.includes('type')||h.includes('direction')||h.includes('side'))){hi=i;break}}
      if(hi<0)return{err:'No header row found. The file needs Type, Volume, Price, Time and Profit columns.'};
      const H=split(lines[hi]).map(x=>x.toLowerCase()),ix={};H.forEach((h,i)=>{(ix[h]=ix[h]||[]).push(i)});
      const pick=(names,nth)=>{for(const n of names)if(ix[n])return ix[n][0];return nth!=null&&ix[nth[0]]&&ix[nth[0]][nth[1]]!=null?ix[nth[0]][nth[1]]:-1};
      const C={ty:pick(['type','direction','side','action']),vol:pick(['volume','lots','lot','size','quantity']),sym:pick(['symbol','instrument','item']),
        ot:pick(['open time','opening time','time open','open date'],['time',0]),ct:pick(['close time','closing time','time close','close date'],['time',1]),
        op:pick(['open price','entry price','entry','price open'],['price',0]),cp:pick(['close price','exit price','exit','price close'],['price',1]),
        cm:pick(['commission']),sw:pick(['swap']),pr:pick(['profit']),pos:pick(['position','ticket'])};
      const miss=['ty','ot','op','pr'].filter(k=>C[k]<0);
      if(miss.length)return{err:'Missing column(s): '+miss.map(k=>({ty:'Type',ot:'Open time',op:'Open price',pr:'Profit'}[k])).join(', ')+'.'};
      const num=v=>{let x=String(v==null?'':v).replace(/\s/g,'');if(dl===';'&&x.includes(',')&&!x.includes('.'))x=x.replace(',','.');else x=x.replace(/,/g,'');const f=parseFloat(x);return isNaN(f)?null:f};
      const dt=v=>{const m=/(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(v||'');if(!m)return null;const z=x=>String(x).padStart(2,'0');return{d:m[1]+'-'+z(m[2])+'-'+z(m[3]),t:z(m[4])+':'+m[5]+':'+z(m[6]||0),ms:Date.UTC(+m[1],m[2]-1,+m[3],+m[4],+m[5],+(m[6]||0))}};
      const closed=[],open=[];
      for(let i=hi+1;i<lines.length;i++){
        const r=split(lines[i]);if(r.some(x=>x.toLowerCase()==='profit')||r.filter(x=>x).length===1)break; /* next report section starts (header row or a one-cell section title such as Orders / Deals) */
        const ty=(r[C.ty]||'').toLowerCase(),side=ty.startsWith('buy')?'BUY':ty.startsWith('sell')?'SELL':null;if(!side)continue;
        const o=dt(r[C.ot]),en=num(r[C.op]);if(!o||en==null)continue;
        const c=C.ct>=0?dt(r[C.ct]):null,ex=C.cp>=0?num(r[C.cp]):null,h=+o.t.slice(0,2);
        const t={d:o.d,t:o.t,side,ses:h<8?'Asia':h<14?'London':'New York',en,ex:null,why:'',pnl:num(r[C.pr])||0,lot:C.vol>=0?(num(r[C.vol])||.01):.01,sl:null,tag:'',j:false,pos:C.pos>=0?String(r[C.pos]||'').replace(/\D/g,''):'',sym:(C.sym>=0&&r[C.sym])||'XAUUSD',hold:null,cost:(num(r[C.cm])||0)+(num(r[C.sw])||0)};
        if(ex!=null&&ex!==0){t.ex=ex;t.hold=c?Math.max(0,Math.round((c.ms-o.ms)/1000)):null;closed.push(t)}else open.push(t); /* open position = no exit price */
      }
      closed.sort((a,b)=>a.d+a.t<b.d+b.t?1:-1);
      if(!closed.length&&!open.length)return{err:'No buy or sell rows could be read from that file.'};
      return{closed,open};
    }
    /* Decode bytes: MT5 saves HTML reports as UTF-16, so honour a BOM (or many NULs) before falling back to UTF-8. */
    function decodeBytes(buf){
      const u=new Uint8Array(buf);
      if(u[0]===0xFF&&u[1]===0xFE) return new TextDecoder('utf-16le').decode(u);
      if(u[0]===0xFE&&u[1]===0xFF) return new TextDecoder('utf-16be').decode(u);
      const t=new TextDecoder('utf-8').decode(u);
      if(t.slice(0,400).split('\u0000').length>20) return new TextDecoder('utf-16le').decode(u);
      return t;
    }
    /* HTML report -> CSV text (one table row per line) so the same parser reads both formats. */
    function htmlToCsv(html){
      const doc=new DOMParser().parseFromString(html,'text/html'), out=[];
      doc.querySelectorAll('tr').forEach(tr=>{
        const cells=[...tr.children].filter(c=>/^t[dh]$/i.test(c.tagName)&&!c.classList.contains('hidden')).map(c=>(c.textContent||'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim());
        if(cells.some(x=>x)) out.push(cells.map(x=>'"'+x.replace(/"/g,'""')+'"').join(','));
      });
      return 'a,b,c\n'+out.join('\n'); /* dummy first line pins the comma delimiter */
    }
    function handleFile(file){
      if(!file) return;
      const isHtml=/\.html?$/i.test(file.name);
      if(!isHtml && !/\.csv$/i.test(file.name)){ showResult('Please choose a .csv or .html export from your broker or MT5.', 'err'); return; }
      const reader = new FileReader();
      reader.onload = ()=>{
        const txt = decodeBytes(reader.result);
        const R = parseTrades(isHtml ? htmlToCsv(txt) : txt);
        if(R.err){ showResult(R.err, 'err'); return; }
        let S; try{ S = window.jlSaveImport(R); }
        catch(e){ showResult('Could not save the import in this browser.', 'err'); return; }
        showResult('Imported '+S.total+' closed trade'+(S.total===1?'':'s')+' ('+S.added+' new'+(S.replaced?', '+S.replaced+' bridge trade'+(S.replaced===1?'':'s')+' replaced':'')+(S.removed?', '+S.removed+' unmatched bridge trade'+(S.removed===1?'':'s')+' removed':'')+(S.updated?', '+S.updated+' updated from the report':'')+(S.skipped?', '+S.skipped+' already present':'')+(S.relinked?', '+S.relinked+' journal'+(S.relinked===1?'':'s')+' re-linked':'')+') and '+R.open.length+' open position'+(R.open.length===1?'':'s')+' from '+file.name+'. Reloading…', 'ok');
        setTimeout(()=>location.reload(), (S.replaced||S.removed||S.updated)?6000:1200);
      };
      reader.onerror = ()=> showResult('Could not read that file. Try again.', 'err');
      reader.readAsArrayBuffer(file);
    }

    drop.addEventListener('click', ()=> fileInput.click());
    drop.addEventListener('keydown', e=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); fileInput.click(); } });
    fileInput.addEventListener('change', e=> handleFile(e.target.files[0]));
    ['dragenter','dragover'].forEach(ev=> drop.addEventListener(ev, e=>{ e.preventDefault(); drop.classList.add('drag'); }));
    ['dragleave','drop'].forEach(ev=> drop.addEventListener(ev, e=>{ e.preventDefault(); drop.classList.remove('drag'); }));
    drop.addEventListener('drop', e=>{ if(e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); });
  }

  window.__mountUploadData = mount;
})();
