/* Weekend weekly review (Saturday and Sunday trading days), shown on Today's Summary and at the top of the Calendar tab (one panel, moved to whichever of the two is open). Trading day and week use the same 06:00 IST / Monday-Sunday rules as the rest of the app.
   Stats come from window.__trades; upcoming events come from the Worker /market route through window.jlMarketFetch. */
(function(){
  var root=document.getElementById('weeklyReview');
  if(!root) return;
  var DAY=864e5, IST=5.5*36e5;
  var CCY={US:'USD',EU:'EUR',GB:'GBP',UK:'GBP',JP:'JPY',CA:'CAD',AU:'AUD',CN:'CNY',CH:'CHF',NZ:'NZD',DE:'EUR',FR:'EUR',IT:'EUR',ES:'EUR'};
  var RULE_KEY='krishna_tomorrow_rule';
  function $(id){ return document.getElementById(id); }
  function esc(v){ return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
  function pad(n){ return n<10?'0'+n:''+n; }
  function parseKey(k){ var p=k.split('-'); return new Date(Date.UTC(+p[0],+p[1]-1,+p[2])); }
  function isoKey(dt){ return dt.getUTCFullYear()+'-'+pad(dt.getUTCMonth()+1)+'-'+pad(dt.getUTCDate()); }
  function addDays(k,n){ return isoKey(new Date(parseKey(k).getTime()+n*DAY)); }
  function fmtDay(k,o){ return parseKey(k).toLocaleDateString('en-US',Object.assign({timeZone:'UTC'},o)); }
  function money(v){ return (v<0?'-$':'+$')+Math.abs(v).toFixed(2); }
  /* Preview switch: open the app with ?weekendPreview=1 to see this panel on a weekday (as of the most recent Saturday, so it shows last week's real trades). ?weekendPreview=0 or the Exit preview button turns it off. */
  var PREV_KEY='jl_weekend_preview';
  try{ var pm=/[?&]weekendPreview=([^&#]*)/.exec(location.search||''); if(pm){ if(pm[1]==='1'||pm[1]==='on') localStorage.setItem(PREV_KEY,'1'); else if(pm[1]==='0'||pm[1]==='off') localStorage.removeItem(PREV_KEY); } }catch(e){console.debug('[journall] ignored error in weekly-review.js:', e);}
  function previewOn(){ try{ return localStorage.getItem(PREV_KEY)==='1'; }catch(e){ return false; } }
  function realToday(){ return typeof window.getTradingDayIST==='function' ? window.getTradingDayIST() : ''; }
  function realWeekend(){ var k=realToday(); if(!k) return false; var w=parseKey(k).getUTCDay(); return w===6||w===0; }
  function today(){ var k=realToday(); if(!k||!previewOn()||realWeekend()) return k; return addDays(k,-(parseKey(k).getUTCDay()+1)); }
  function isWeekend(){ var k=today(); if(!k) return false; var w=parseKey(k).getUTCDay(); return w===6||w===0; }
  function syncPreview(){
    var el=$('wrPreview'), on=previewOn()&&!!realToday()&&!realWeekend();
    if(!on){ if(el) el.parentNode.removeChild(el); return; }
    if(!el){
      el=document.createElement('div'); el.id='wrPreview'; el.className='wr-preview';
      var head=root.querySelector('.panel-head'); head.parentNode.insertBefore(el,head.nextSibling);
      el.addEventListener('click',function(e){ if(e.target.closest('button')){ try{ localStorage.removeItem(PREV_KEY); }catch(x){console.debug('[journall] ignored error in weekly-review.js:', x);} tick(); } });
    }
    el.innerHTML='<span>Preview mode. Showing the panel as it will look on '+esc(fmtDay(today(),{weekday:'long',month:'short',day:'numeric'}))+'. This is not live.</span><button type="button" class="btn-ghost wr-exit">Exit preview</button>';
  }
  function bounds(k){ var dow=(parseKey(k).getUTCDay()+6)%7, ws=addDays(k,-dow); return {ws:ws,we:addDays(ws,6),nm:addDays(ws,7)}; }
  function kind(p){ return typeof window.jlKind==='function' ? window.jlKind(p) : (p>0?'win':p<0?'loss':'be'); }
  function dayName(k){ return fmtDay(k,{weekday:'short'}); }

  /* ---------- deeper analytics (same win/loss/rule-break definitions as the tiles above) ---------- */
  function wkRows(ws){
    var we=addDays(ws,6);
    return (window.__trades||[]).filter(function(t){ return t&&t.d&&t.d>=ws&&t.d<=we&&isFinite(Number(t.pnl)); })
      .sort(function(a,c){ var x=a.d+' '+a.t, y=c.d+' '+c.t; return x<y?-1:x>y?1:0; });
  }
  function posKey(t){ return t.d+'|'+t.t+'|'+t.sym+'|'+t.side; }
  function metrics(rows){
    var lossLim=Number(window.jlDailyLossLimit)||0, tradeLim=Number(window.jlMaxTradesPerDay)||0;
    var m={net:0,gw:0,gl:0,W:0,L:0,BE:0,sw:0,sl:0,n:0,broken:0,maxW:0,maxL:0,cur:0}, seen={}, days={}, rw=0, rl=0;
    rows.forEach(function(t){
      var p=Number(t.pnl), c=kind(p), d=days[t.d]||(days[t.d]={net:0,loss:0,keys:{}});
      m.net+=p; d.net+=p; d.loss=Math.max(0,-d.net); if(p>0) m.gw+=p; else if(p<0){ m.gl-=p; }
      seen[posKey(t)]=1; d.keys[posKey(t)]=1;
      if(c==='win'){ m.W++; m.sw+=p; rw++; rl=0; m.maxW=Math.max(m.maxW,rw); m.cur=rw; }
      else if(c==='loss'){ m.L++; m.sl-=p; rl++; rw=0; m.maxL=Math.max(m.maxL,rl); m.cur=-rl; }
      else m.BE++;
    });
    m.rows=rows.length; m.n=Object.keys(seen).length;
    Object.keys(days).forEach(function(k){ var x=days[k]; if((lossLim>0&&x.loss>=lossLim)||(tradeLim>0&&Object.keys(x.keys).length>=tradeLim)) m.broken++; });
    m.dec=m.W+m.L; m.wr=m.dec?m.W/m.dec*100:null; m.pf=m.gl>0?m.gw/m.gl:null;
    m.avgW=m.W?m.sw/m.W:null; m.avgL=m.L?m.sl/m.L:null; m.exp=rows.length?m.net/rows.length:null;
    return m;
  }
  function tileHtml(l,v,s,col){ return '<div class="wr-tile"><div class="l">'+l+'</div><div class="v"'+(col?' style="color:'+col+'"':'')+'>'+v+'</div>'+(s?'<div class="s">'+s+'</div>':'')+'</div>'; }
  /* ---------- chart + heatmap cards: same plot language as the Analytics tab, each one in its own card ---------- */
  var CG='#2ee6a6', CR='#fb7185', charts={};
  var IC_EQ='<path d="M3 17l5-6 4 3 8-9"/>', IC_DD='<path d="M3 6h18M3 12c3 4 6-4 9 0s6 4 9 0"/>', IC_HM='<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>';
  function cardHead(ic,title,sub){ return '<div class="a-s-head"><div class="a-s-ttl"><span class="a-s-ic"><svg viewBox="0 0 24 24">'+ic+'</svg></span><h3>'+title+'</h3></div></div>'+(sub?'<div class="sub">'+sub+'</div>':''); }
  function axMoney(v,span){ var a=Math.abs(v); if(a<0.005) return '$0'; return (v<0?'-':'+')+'$'+a.toFixed(span>=40?0:1); }
  function sortedRows(rows){
    return rows.map(function(t,i){ return {t:t,i:i}; }).sort(function(a,c){ var x=a.t.d+' '+a.t.t, y=c.t.d+' '+c.t.t; return x<y?-1:x>y?1:a.i-c.i; }).map(function(o){ return o.t; });
  }
  /* Area chart with axis ticks, trade-number labels and a hover crosshair (hover is wired once, below, by event delegation). */
  function areaChart(id,arr,color,label,aria){
    var n=arr.length; if(!n) return '';
    var Wd=520, H=210, pl=48, pr=8, pt=10, pb=22;
    var hi=Math.max.apply(null,[0].concat(arr)), lo=Math.min.apply(null,[0].concat(arr)), span=hi-lo, up=hi>=-lo;
    function y(v){ return pt+(hi-v)/(span||1)*(H-pt-pb); }
    function X(i){ return pl+i*(Wd-pl-pr)/Math.max(1,n-1); }
    var pts=arr.map(function(v,i){ return X(i).toFixed(1)+','+y(v).toFixed(1); }).join(' ');
    var gid='wrg-'+id, ticks=span>0?[hi,(hi+lo)/2,lo]:[0], s='';
    var zr=Math.max(0,Math.min(1,(y(0)-pt)/(H-pt-pb))).toFixed(3), y1=pt, y2=H-pb;
    var GRAD='<linearGradient id="'+gid+'" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="'+y1+'" y2="'+y2+'">'
      +'<stop offset="0" stop-color="#2ee6a6" stop-opacity=".5"/><stop offset="'+zr+'" stop-color="#2ee6a6" stop-opacity=".04"/>'
      +'<stop offset="'+zr+'" stop-color="#fb7185" stop-opacity=".04"/><stop offset="1" stop-color="#e11d48" stop-opacity=".55"/></linearGradient>'
      +'<linearGradient id="'+gid+'s" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="'+y1+'" y2="'+y2+'">'
      +'<stop offset="0" stop-color="#7cf5c8"/><stop offset="'+zr+'" stop-color="#19c98b"/>'
      +'<stop offset="'+zr+'" stop-color="#fb7185"/><stop offset="1" stop-color="#e11d48"/></linearGradient>';
    s+='<svg class="a-cs wr-sc" data-c="'+id+'" viewBox="0 0 '+Wd+' '+H+'" role="img" aria-label="'+esc(aria)+'"><defs>'+GRAD+'</defs>';
    ticks.forEach(function(v){ s+='<line x1="'+pl+'" x2="'+(Wd-pr)+'" y1="'+y(v).toFixed(1)+'" y2="'+y(v).toFixed(1)+'" stroke="rgba(255,255,255,.06)"/><text class="ax" x="'+(pl-6)+'" y="'+(y(v)+3).toFixed(1)+'" text-anchor="end">'+axMoney(v,span)+'</text>'; });
    s+='<line x1="'+pl+'" x2="'+(Wd-pr)+'" y1="'+y(0).toFixed(1)+'" y2="'+y(0).toFixed(1)+'" stroke="rgba(255,255,255,.2)"/>'
      +'<polygon points="'+X(0).toFixed(1)+','+y(0).toFixed(1)+' '+pts+' '+X(n-1).toFixed(1)+','+y(0).toFixed(1)+'" fill="url(#'+gid+')"/>'
      +'<polyline points="'+pts+'" fill="none" stroke="url(#'+gid+'s)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>';
    for(var i=0;i<n;i+=Math.max(1,Math.round(n/7))) s+='<text class="ax" x="'+X(i).toFixed(1)+'" y="'+(H-6)+'" text-anchor="middle">#'+(i+1)+'</text>';
    s+='<line class="sc-x" y1="'+pt+'" y2="'+(H-pb)+'" stroke="rgba(255,255,255,.25)" style="opacity:0"/><circle class="sc-d" r="4" fill="'+color+'" stroke="#fff" stroke-width="1.5" style="opacity:0"/></svg>';
    charts[id]={arr:arr,Wd:Wd,pl:pl,pr:pr,X:X,y:y,label:label};
    return s;
  }
  function equityHtml(rows){
    var cum=[], dd=[], c=0, pk=0, mdd=0;
    rows.forEach(function(t){ c+=Number(t.pnl); cum.push(c); pk=Math.max(pk,c); dd.push(c-pk); mdd=Math.max(mdd,pk-c); });
    var end=cum.length?cum[cum.length-1]:0;
    var eq='<section class="a-s">'+cardHead(IC_EQ,'Equity curve','Cumulative P&amp;L, trade by trade')
      +'<div class="wr-big" style="color:'+(end<0?'var(--red)':end>0?'var(--green)':'var(--text)')+'">'+money(end)+'<small>week result</small></div>'
      +'<div class="a-plot">'+areaChart('eq',cum,end<0?CR:CG,'Equity','Equity curve for the week')+'</div>'
      +'<div class="a-read">Week ends at <b style="color:'+(end<0?'var(--red)':end>0?'var(--green)':'var(--text)')+'">'+money(end)+'</b>. Peak <b>'+money(pk)+'</b>.</div></section>';
    var dn='<section class="a-s">'+cardHead(IC_DD,'Drawdown','Distance below the weekly equity peak')
      +'<div class="wr-big" style="color:'+(mdd>0?'var(--red)':'var(--green)')+'">'+(mdd>0?'-$'+mdd.toFixed(2):'$0.00')+'<small>deepest point</small></div>'
      +'<div class="a-plot">'+areaChart('dd',dd,CR,'Below peak','Drawdown for the week')+'</div>'
      +'<div class="a-read">'+(mdd>0?'Deepest point: <b style="color:var(--red)">-$'+mdd.toFixed(2)+'</b> below the running peak.':'No drawdown this week. The account never fell below its running peak.')+'</div></section>';
    return '<div class="wr-cols">'+eq+dn+'</div>';
  }
  function kpiHtml(m){
    var st=m.cur>0?m.cur+' win'+(m.cur===1?'':'s'):m.cur<0?(-m.cur)+' loss'+(m.cur===-1?'':'es'):'none';
    return '<div class="wr-tiles">'
      +tileHtml('AVG WIN',m.avgW==null?'-':money(m.avgW),m.W+' winning trade'+(m.W===1?'':'s'),m.avgW==null?'':'var(--green)')
      +tileHtml('AVG LOSS',m.avgL==null?'-':'-$'+m.avgL.toFixed(2),m.L+' losing trade'+(m.L===1?'':'s'),m.avgL==null?'':'var(--red)')
      +tileHtml('EXPECTANCY',m.exp==null?'-':money(m.exp),'Average P&amp;L per trade',m.exp==null?'':m.exp<0?'var(--red)':'var(--green)')
            +tileHtml('WORST LOSS STREAK',String(m.maxL),'Breakeven trades skipped',m.maxL>=3?'var(--red)':'')
      +'</div>';
  }
  function cmpHtml(a,p){
    var has=p.rows>0;
    function sg(v,fmt){ return v==null?'-':fmt(v); }
    function dlt(x,y,fmt,goodUp){ if(!has||x==null||y==null) return ['-','']; var d=x-y; if(Math.abs(d)<1e-9) return ['0','']; return [(d>0?'+':'')+fmt(d), goodUp==null?'':((d>0)===goodUp?'var(--green)':'var(--red)')]; }
    function row(label,va,vb,d){ return '<tr><td class="ev">'+label+'</td><td>'+va+'</td><td>'+(has?vb:'-')+'</td><td><span class="wr-dl">'+d[0]+'</span></td></tr>'; }
    var f2=function(v){ return v.toFixed(2); }, f0=function(v){ return String(Math.round(v)); };
    var html='<div class="wr-block a-s">'+hd('THIS WEEK VS LAST WEEK')+'<div class="wr-scroll"><table class="wr-mini"><thead><tr><th>Metric</th><th>This week</th><th>Last week</th><th>Change</th></tr></thead><tbody>'
      +row('Net P&amp;L',money(a.net),money(p.net),dlt(a.net,p.net,function(v){ return (v<0?'-$':'$')+Math.abs(v).toFixed(2); },true))
      +row('Win rate',sg(a.wr,function(v){ return Math.round(v)+'%'; }),sg(p.wr,function(v){ return Math.round(v)+'%'; }),dlt(a.wr,p.wr,function(v){ return f0(v)+' pts'; },true))
      +row('Profit factor',sg(a.pf,f2),sg(p.pf,f2),dlt(a.pf,p.pf,f2,true))
      +row('Trades',String(a.n),String(p.n),dlt(a.n,p.n,f0,null))
      +row('Rule-break days',String(a.broken),String(p.broken),dlt(a.broken,p.broken,f0,false))
      +'</tbody></table></div>'+(has?'':'<div class="wr-cap">No trades were logged last week, so there is nothing to compare against.</div>')+'</div>';
    return html;
  }
  function groupHtml(title,rows,fn){
    var g={}, order=[];
    rows.forEach(function(t){
      var k=fn(t); if(!k) return;
      var x=g[k]; if(!x){ x=g[k]={net:0,W:0,L:0,seen:{}}; order.push(k); }
      var p=Number(t.pnl), c=kind(p); x.net+=p; if(c==='win') x.W++; else if(c==='loss') x.L++; x.seen[posKey(t)]=1;
    });
    var head=''+hd(title)+'';
    if(!order.length) return '<div>'+head+'<div class="wr-empty">Nothing recorded.</div></div>';
    order.sort(function(a,c){ return g[c].net-g[a].net; });
    var mx=0; order.forEach(function(k){ mx=Math.max(mx,Math.abs(g[k].net)); });
    var body=order.map(function(k){
      var x=g[k], d=x.W+x.L, col=x.net<0?'var(--red)':x.net>0?'var(--green)':'var(--sub)';
      return '<tr><td class="ev">'+esc(k)+'</td><td style="color:'+col+'">'+money(x.net)+'<span class="wr-mb"><i style="width:'+(mx?Math.max(4,Math.round(Math.abs(x.net)/mx*100)):0)+'%;background:'+col+'"></i></span></td><td>'+(d?Math.round(x.W/d*100)+'%':'-')+'</td><td>'+Object.keys(x.seen).length+'</td></tr>';
    }).join('');
    return '<div>'+head+'<table class="wr-mini"><thead><tr><th>Name</th><th>P&amp;L</th><th>Win rate</th><th>Trades</th></tr></thead><tbody>'+body+'</tbody></table></div>';
  }
  function heatHtml(rows,b){
    var cell={}, hMin=24, hMax=-1, maxAbs=0, dayHas={};
    rows.forEach(function(t){
      var h=parseInt(String(t.t||'').slice(0,2),10); if(!isFinite(h)||h<0||h>23) return;
      var k=t.d+'|'+h, x=cell[k]||(cell[k]={net:0,n:0}); x.net+=Number(t.pnl); x.n++; dayHas[t.d]=1;
      hMin=Math.min(hMin,h); hMax=Math.max(hMax,h);
    });
    Object.keys(cell).forEach(function(k){ maxAbs=Math.max(maxAbs,Math.abs(cell[k].net)); });
    var head=cardHead(IC_HM,'Trade heatmap','Weekday by hour (IST)');
    if(hMax<0) return '<section class="a-s wr-block">'+head+'<div class="wr-empty">No trades with a recorded time.</div></section>';
    var span=[0,1,2,3,4].concat(dayHas[addDays(b.ws,5)]?[5]:[],dayHas[addDays(b.ws,6)]?[6]:[]), hours=[], h;
    for(h=hMin;h<=hMax;h++) hours.push(h);
    var grid='<div class="wr-heat" style="grid-template-columns:36px repeat('+hours.length+',minmax(26px,1fr))"><span class="wr-hh"></span>'
      +hours.map(function(x){ return '<span class="wr-hh">'+x+'</span>'; }).join('');
    span.forEach(function(i){
      var d=addDays(b.ws,i);
      grid+='<span class="wr-hd">'+dayName(d)+'</span>';
      hours.forEach(function(x){
        var c=cell[d+'|'+x];
        if(!c){ grid+='<span class="wr-hc"></span>'; return; }
        var f=maxAbs?Math.min(1,Math.abs(c.net)/maxAbs):0, a=(.24+f*.62).toFixed(2), rgb=c.net<0?'242,84,125':c.net>0?'34,201,138':'139,144,163';
        var tip='<div class="th">'+dayName(d)+' '+pad(x)+':00</div><div class="tr"><span>Trades</span><b>'+c.n+'</b></div><div class="tr"><span>Net P&amp;L</span><b>'+money(c.net)+'</b></div>';
        grid+='<span class="wr-hc" data-t="'+esc(tip)+'" style="background:linear-gradient(155deg,rgba('+rgb+','+a+'),rgba('+rgb+','+(a*.5).toFixed(2)+'));box-shadow:inset 0 0 0 1px rgba('+rgb+',.38)">'+c.n+'</span>';
      });
    });
    var hxK=Object.keys(cell), hxBest=null, hxWorst=null, hxBusy=null;
    hxK.forEach(function(k){ var c=cell[k]; if(!hxBest||c.net>cell[hxBest].net) hxBest=k; if(!hxWorst||c.net<cell[hxWorst].net) hxWorst=k; if(!hxBusy||c.n>cell[hxBusy].n) hxBusy=k; });
    function hxLbl(k){ var p=k.split('|'); return dayName(p[0])+' '+pad(p[1])+':00'; }
    function hxc(cl,l,v){ return '<span class="wr-chip2 '+cl+'"><i></i><em>'+l+'</em><b>'+v+'</b></span>'; }
    var hxCh='<div class="wr-chips2 wr-hmchips">'
      +(hxBest&&cell[hxBest].net>0?hxc('g','Best hour',hxLbl(hxBest)+' &middot; '+money(cell[hxBest].net)):'')
      +(hxWorst&&cell[hxWorst].net<0?hxc('r','Worst hour',hxLbl(hxWorst)+' &middot; '+money(cell[hxWorst].net)):'')
      +(hxBusy?hxc('v','Busiest',hxLbl(hxBusy)+' &middot; '+cell[hxBusy].n+' trades'):'')+'</div>';
    return '<section class="a-s wr-block">'+head+hxCh+'<div class="a-plot wr-hm-wrap">'+grid+'</div></div>'
      +'<div class="a-read wr-legend"><span>Number is trades opened that hour.</span><span class="lg"><em>Loss</em><i class="lg-bar"></i><em>Profit</em></span><span>Brighter means a bigger P&amp;L swing.</span></div></section>';
  }
  function impactHtml(rows){
    var J=(window.__getJournals?window.__getJournals():[])||[], em={}, mt={}, eo={}, none=0;
    J.forEach(function(e){ if(e&&e.key&&e.emotion) em[e.key]=e.emotion; });
    rows.forEach(function(t){
      var p=Number(t.pnl), k=t.d+' '+t.t+' '+t.side+' '+t.en+' '+t.pnl, e=em[k];
      var tg=(t.tags||[]).filter(function(g){ return typeof g==='string'&&g; });
      if(!tg.length&&!e) none++;
      tg.forEach(function(g){ var x=mt[g]||(mt[g]={n:0,net:0}); x.n++; x.net+=p; });
      if(e){ var y=eo[e]||(eo[e]={n:0,net:0}); y.n++; y.net+=p; }
    });
    function list(title,o,empty){
      var ks=Object.keys(o).sort(function(a,c){ return o[a].net-o[c].net; }), mx=0;
      ks.forEach(function(k){ mx=Math.max(mx,Math.abs(o[k].net)); });
      if(!ks.length) return '<div class="wr-imp-col">'+hd(title)+'<div class="wr-empty2">'+empty+'</div></div>';
      return '<div class="wr-imp-col">'+hd(title)+'<div class="wr-imp-list">'+ks.map(function(k){
        var x=o[k], cl=x.net<0?'neg':x.net>0?'pos':'', w=mx?Math.max(6,Math.round(Math.abs(x.net)/mx*100)):0;
        return '<div class="wr-imp2"><div class="wr-imp2-t"><span class="nm">'+esc(k)+'</span><span class="ct">'+x.n+' trade'+(x.n===1?'':'s')+'</span><b class="'+cl+'">'+money(x.net)+'</b></div><div class="wr-imp2-bar"><i class="'+cl+'" style="width:'+w+'%"></i></div></div>';
      }).join('')+'</div></div>';
    }
    return '<div class="wr-block a-s"><div class="wr-cols">'
      +list('MISTAKE IMPACT ON P&amp;L',mt,'No mistake tags saved on this week\'s trades.')
      +list('EMOTION IMPACT ON P&amp;L',eo,'No emotion logged on this week\'s journal entries.')
      +'</div><div class="wr-cap">'+none+' of '+rows.length+' trade'+(rows.length===1?'':'s')+' have no mistake tag or emotion logged, so they are left out above. A trade with two tags counts under both, so totals can add up to more than net P&amp;L.</div></div>';
  }
  function hd(t){ var s=String(t||''), ttl=s.charAt(0)+s.slice(1).toLowerCase().replace(/\bist\b/g,'IST').replace(/p&amp;l/g,'P&amp;L'); var ic=/EQUITY/.test(s)?'<path d="M3 17l5-6 4 3 8-9"/>':/HEATMAP/.test(s)?'<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/>':/MISTAKE/.test(s)?'<path d="M12 4l9 16H3zM12 10v4M12 17h.01"/>':/EMOTION/.test(s)?'<circle cx="12" cy="12" r="9"/><path d="M8 14c1 1.5 2.5 2 4 2s3-.5 4-2M9 9.5h.01M15 9.5h.01"/>':'<path d="M4 19V9M11 19V4M18 19v-7"/>'; return '<div class="a-s-head"><div class="a-s-ttl"><span class="a-s-ic"><svg viewBox="0 0 24 24">'+ic+'</svg></span><h3>'+ttl+'</h3></div></div>'; }
  function safeBlock(label,fn){
    try{ return fn(); }catch(err){ return '<div class="wr-block a-s">'+hd(label)+'<div class="wr-empty">This section could not load ('+esc(err&&err.message||'error')+').</div></div>'; }
  }
  function analyticsHtml(rows,b){
    rows=sortedRows(rows);
    var cur=metrics(rows), prev=metrics(wkRows(addDays(b.ws,-7)));
    return '<div class="wr-an">'
      +'<div class="wr-sec">Performance</div>'
      +safeBlock('EQUITY CURVE AND DRAWDOWN',function(){ return equityHtml(rows); })
      +safeBlock('AVERAGES AND STREAKS',function(){ return kpiHtml(cur); })
      +safeBlock('THIS WEEK VS LAST WEEK',function(){ return cmpHtml(cur,prev); })
      +'<div class="wr-sec">Where it came from</div>'
      +safeBlock('SESSION AND PAIR BREAKDOWN',function(){ return '<div class="wr-block a-s"><div class="wr-cols">'+groupHtml('SESSION BREAKDOWN',rows,function(t){ return t.ses; })+groupHtml('PAIR BREAKDOWN',rows,function(t){ return t.sym; })+'</div></div>'; })
      +safeBlock('TIME-OF-DAY HEATMAP',function(){ return heatHtml(rows,b); })
      +'<div class="wr-sec">Behaviour</div>'
      +safeBlock('MISTAKE AND EMOTION IMPACT',function(){ return impactHtml(rows); })
      +'</div>';
  }

  /* ---------- week stats (real trades only) ---------- */
  function statsHtml(){
    var k=today(), b=bounds(k);
    var rows=(window.__trades||[]).filter(function(t){ return t&&t.d&&t.d>=b.ws&&t.d<=b.we&&isFinite(Number(t.pnl)); });
    $('wrRange').textContent=fmtDay(b.ws,{month:'short',day:'numeric'})+' to '+fmtDay(b.we,{month:'short',day:'numeric'})+' (IST)';
    if(!rows.length) return '<div class="wr-empty">No trades logged this week.</div>';
    var net=0,gw=0,gl=0,W=0,L=0,BE=0,seen={},days={},ses={},tags={},rev=0,nosl=0;
    rows.forEach(function(t){
      var p=Number(t.pnl); net+=p; if(p>0) gw+=p; else if(p<0) gl-=p;
      var c=kind(p); if(c==='win') W++; else if(c==='loss') L++; else BE++;
      var tk=t.d+'|'+t.t+'|'+t.sym+'|'+t.side, d=days[t.d]||(days[t.d]={net:0,loss:0,keys:{}});
      d.net+=p; d.loss=Math.max(0,-d.net); d.keys[tk]=1; seen[tk]=1;
      if(t.ses){ ses[t.ses]=(ses[t.ses]||0)+p; }
      (t.tags||[]).forEach(function(g){ if(typeof g==='string'&&g) tags[g]=(tags[g]||0)+1; });
      if(t.rev) rev++; if(t.sl==null) nosl++;
    });
    var n=Object.keys(seen).length, decided=W+L, wr=decided?Math.round(W/decided*100):0;
    var pf=gl>0?(gw/gl).toFixed(2):'-';
    var dk=Object.keys(days).sort(), best=null, worst=null;
    dk.forEach(function(d){ if(!best||days[d].net>days[best].net) best=d; if(!worst||days[d].net<days[worst].net) worst=d; });
    var lossLim=Number(window.jlDailyLossLimit)||0, tradeLim=Number(window.jlMaxTradesPerDay)||0, weekLim=Number(window.jlWeeklyLossLimit)||0;
    var broken=dk.filter(function(d){ var x=days[d], cnt=Object.keys(x.keys).length; return (lossLim>0&&x.loss>=lossLim)||(tradeLim>0&&cnt>=tradeLim); });
    /* hero: one calm result card (net result, trade tape, a few numbers) */
    var verdict=net>0?'Green week':net<0?'Red week':'Flat week';
    var ordered=sortedRows(rows), maxTick=0;
    ordered.forEach(function(t){ maxTick=Math.max(maxTick,Math.abs(Number(t.pnl))); });
    var tape=ordered.map(function(t,i){
      var p=Number(t.pnl), hh=maxTick?Math.max(6,Math.round(Math.abs(p)/maxTick*100)):6;
      return '<span class="tk '+(p>0?'w':p<0?'l':'b')+'" style="--i:'+Math.min(i,70)+';--h:'+hh+'" title="'+esc(dayName(t.d)+' '+String(t.t||'').slice(0,5)+'  '+money(p))+'"><i></i></span>';
    }).join('');
    function kc(l,v,s,extra){ return '<div class="wr-k"><div class="wr-lab">'+l+'</div><div class="wr-kv">'+v+'</div>'+(s?'<div class="wr-ss">'+s+'</div>':'')+(extra||'')+'</div>'; }
    var kp=kc('Win rate',decided?wr+'%':'-',W+'W / '+L+'L'+(BE?' / '+BE+'BE':''))
      +kc('Profit factor',pf,gl>0?'Wins divided by losses':'No losing trades')
      +kc('Best day',best?money(days[best].net):'-',best?dayName(best):'')
      +kc('Worst day',(worst&&worst!==best)?money(days[worst].net):'-',(worst&&worst!==best)?dayName(worst):'');
    if(weekLim>0){ var wl=Math.max(0,-net), wlr=wl/weekLim;
      kp+=kc('Week loss','$'+wl.toFixed(2),'of $'+weekLim.toFixed(0)+' limit','<div class="wr-prog"><i style="width:'+Math.min(100,Math.round(wlr*100))+'%"></i></div>'); }
        var hxPn=ordered.map(function(t){ return Number(t.pnl); });
    var hxBt=hxPn.length?Math.max.apply(null,hxPn):0, hxWt=hxPn.length?Math.min.apply(null,hxPn):0, hxAv=hxPn.length?net/hxPn.length:0;
    function hxChip(c,l,v){ return '<span class="wr-chip2 '+c+'"><i></i><em>'+l+'</em><b>'+v+'</b></span>'; }
    var hxChips='<div class="wr-chips2">'+hxChip('g','Best trade',money(hxBt))+hxChip('r','Worst trade',money(hxWt))+hxChip('v','Avg per trade',money(hxAv))+'</div>';
    var hxTot=W+L+BE, hxR=46, hxCF=2*Math.PI*hxR, hxRing='';
    if(hxTot){
      var hxSegs=[[W,'#22c98a'],[L,'#f2547d'],[BE,'#6b7090']], hxOff=0, hxArcs='';
      hxSegs.forEach(function(s){ if(!s[0]) return; var ln=s[0]/hxTot*hxCF, dl=Math.max(0.1,ln-4);
        hxArcs+='<circle cx="60" cy="60" r="'+hxR+'" fill="none" stroke="'+s[1]+'" stroke-width="10" stroke-linecap="round" stroke-dasharray="'+dl.toFixed(2)+' '+(hxCF-dl).toFixed(2)+'" stroke-dashoffset="'+(-hxOff-2).toFixed(2)+'" transform="rotate(-90 60 60)"/>'; hxOff+=ln; });
      hxRing='<div class="wr-ring" role="img" aria-label="Win rate '+(decided?wr+'%':'none')+'"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="'+hxR+'" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="10"/>'+hxArcs+'</svg><div class="wr-ring-c"><b>'+(decided?wr+'%':'-')+'</b><span>win rate</span></div></div>';
    }
    var hxStarts=[], hxLast=null;
    ordered.forEach(function(t,i){ if(t.d!==hxLast){ hxStarts.push([t.d,i]); hxLast=t.d; } });
    var hxDen=Math.max(1,ordered.length-1);
    var hxLab=hxStarts.map(function(x){ return '<span class="wr-dl2" style="left:'+(x[1]/hxDen*100).toFixed(2)+'%">'+dayName(x[0])+'</span>'; }).join('');
    var hxDv=hxStarts.slice(1).map(function(x){ return '<span class="wr-dv" style="left:'+((x[1]-.5)/hxDen*100).toFixed(2)+'%"></span>'; }).join('');
        var hero='<section class="wr-hero"><div class="wr-hero-main"><div class="wr-lab">Net P&amp;L</div>'
      +'<div class="wr-net"'+(net>0?' style="color:var(--green)"':net<0?' style="color:var(--red)"':'')+'>'+money(net)+'</div>'
      +'<div class="wr-net-sub">'+verdict+' &middot; '+n+' trade'+(n===1?'':'s')+' over '+dk.length+' trading day'+(dk.length===1?'':'s')+' &middot; after commission and swap</div>'
      +hxChips+hxRing
      +'<div class="wr-tape" role="img" aria-label="Every trade this week in order, wins above the line and losses below">'+hxDv+tape+'</div>'
      +'<div class="wr-daylabels">'+hxLab+'</div></div>'
      +'<div class="wr-kpis">'+kp+'</div></section>';

    /* daily bars: Mon-Fri always, Sat/Sun only if they have trades */
    var span=[0,1,2,3,4].concat(days[addDays(b.ws,5)]?[5]:[],days[addDays(b.ws,6)]?[6]:[]);
    var maxAbs=0; dk.forEach(function(d){ maxAbs=Math.max(maxAbs,Math.abs(days[d].net)); });
    var bars=span.map(function(i){
      var d=addDays(b.ws,i), x=days[d];
      if(!x) return '<div class="wr-day"><b>'+dayName(d)+'</b><div class="wr-track"></div><span class="val" style="color:var(--faint)">no trades</span></div>';
      var w=maxAbs?Math.max(3,Math.round(Math.abs(x.net)/maxAbs*100)):3;
      return '<div class="wr-day"><b>'+dayName(d)+'</b><div class="wr-track"><i class="'+(x.net<0?'wr-dn':'wr-up')+'" style="width:'+w+'%"></i></div><span class="val" style="color:'+(x.net<0?'var(--red)':x.net>0?'var(--green)':'var(--sub)')+'">'+money(x.net)+'</span></div>';
    }).join('');

    /* review points, all computed from the week's rows */
    var li=[];
    function item(col,txt){ li.push('<li style="--c:'+col+'">'+txt+'</li>'); }
    if(lossLim>0||tradeLim>0) item(broken.length?'var(--red)':'var(--green)', broken.length?broken.length+' day'+(broken.length===1?'':'s')+' broke a daily rule: '+broken.map(dayName).join(', ')+'.':'No day broke the daily loss or trade limit.');
    else item('var(--faint)','Set a daily loss or trade limit in Account Settings to track rule-break days.');
    item(rev?'var(--red)':'var(--green)', rev?(rev===1?'1 trade was flagged as a revenge trade.':rev+' trades were flagged as revenge trades.'):'No trades were flagged as revenge trades.');
    item(nosl?'var(--warn)':'var(--green)', nosl?nosl+' of '+rows.length+' trade'+(rows.length===1?'':'s')+' had no stop-loss recorded.':'Every trade had a recorded stop-loss.');
    var tg=Object.keys(tags).sort(function(a,c){ return tags[c]-tags[a]; }).slice(0,3);
    item(tg.length?'var(--warn)':'var(--faint)', tg.length?'Top mistake tags: '+tg.map(function(g){ return esc(g)+' x'+tags[g]; }).join(', ')+'.':'No mistake tags saved on this week\'s trades.');
    var sk=Object.keys(ses).sort(function(a,c){ return ses[c]-ses[a]; });
    if(sk.length){ var bs=sk[0], ws2=sk[sk.length-1];
      item('var(--accent-2)', 'Best session: '+esc(bs)+' ('+money(ses[bs])+')'+(ws2!==bs?'. Weakest: '+esc(ws2)+' ('+money(ses[ws2])+').':'.')); }
    var J=(window.__getJournals?window.__getJournals():[])||[], jd={};
    J.forEach(function(e){ if(e&&e.date&&e.date>=b.ws&&e.date<=b.we) jd[e.date]=1; });
    var jc=dk.filter(function(d){ return jd[d]; }).length;
    item(jc===dk.length?'var(--green)':'var(--warn)','Journaled '+jc+' of '+dk.length+' trading day'+(dk.length===1?'':'s')+'.');

    var IC1='<svg viewBox="0 0 24 24"><path d="M4 19V9M11 19V4M18 19v-7"/></svg>', IC2='<svg viewBox="0 0 24 24"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></svg>';
    var foot=(best?'<b>Best:</b> '+dayName(best)+' ('+money(days[best].net)+')':'')+((worst&&worst!==best)?' &middot; <b>Worst:</b> '+dayName(worst)+' ('+money(days[worst].net)+')':'')+(best?'.':'');
    return hero
      +'<div class="wr-cols"><section class="a-s"><div class="a-s-head"><div class="a-s-ttl"><span class="a-s-ic">'+IC1+'</span><h3>Daily P&amp;L</h3></div></div><div class="sub">Net result per trading day</div><div class="a-plot">'+bars+'</div>'+''+'</section>'
      +'<section class="a-s"><div class="a-s-head"><div class="a-s-ttl"><span class="a-s-ic">'+IC2+'</span><h3>What to review</h3></div></div><div class="sub">Computed from this week\'s trades</div><ul class="a-ins tight">'+li.join('')+'</ul></section></div>'
      +(function(){ try{ return analyticsHtml(rows,b); }catch(err){ return '<div class="wr-an"><div class="wr-block a-s"><div class="wr-empty">Analytics could not load ('+esc(err&&err.message||'error')+').</div></div></div>'; } })();
  }

  /* ---------- rule saved for Monday ---------- */
  function ruleHtml(){
    var t=today(), m={}, pend='';
    try{ var o=JSON.parse(localStorage.getItem(RULE_KEY)||'null'); if(o&&typeof o==='object'&&!Array.isArray(o)) m=o; }catch(e){console.debug('[journall] ignored error in weekly-review.js:', e);}
    function activeDay(d){ var dt=parseKey(d); do{ dt.setUTCDate(dt.getUTCDate()+1); }while(dt.getUTCDay()===0||dt.getUTCDay()===6); return isoKey(dt); }
    Object.keys(m).forEach(function(d){ if(typeof m[d]==='string'&&m[d]&&activeDay(d)>t&&d>pend) pend=d; });
    return '<div class="wr-rule"><div class="l">Your rule for Monday</div>'+(pend?'<div class="t">'+esc(m[pend])+'</div>':'<div class="t none">No rule saved yet. Add one in Tomorrow\'s rule below.</div>')+'</div>';
  }

  /* ---------- upcoming events ---------- */
  var ev={loaded:false,loading:false,list:[],msg:'',src:'',t:0,key:'',fails:0};
  function impLvl(s){ s=(s||'').toLowerCase(); return s.indexOf('high')>-1?3:s.indexOf('med')>-1?2:s.indexOf('low')>-1?1:0; }
  function impColor(l){ return l===3?'var(--red)':l===2?'var(--accent-2)':'var(--green)'; }
  function impact(){ var on=root.querySelector('#wrImpactChips .wr-chip.on'); return on?on.dataset.val:'high'; }
  function evTime(e){ var s=String(e.time||''); if(!s) return null; if(!/(Z|[+-][0-9]{2}:?[0-9]{2})$/.test(s)) s=s.replace(' ','T')+'Z'; var d=new Date(s); return isFinite(d.getTime())?d:null; }
  function istKey(d){ return isoKey(new Date(d.getTime()+IST)); }
  function istClock(d){ var x=new Date(d.getTime()+IST); return pad(x.getUTCHours())+':'+pad(x.getUTCMinutes()); }
  function renderEvents(){
    var k=today(); if(!k) return;
    var b=bounds(k), host=$('wrEvents'), note=$('wrNote');
    $('wrNextRange').textContent=fmtDay(b.nm,{month:'short',day:'numeric'})+' to '+fmtDay(addDays(b.nm,4),{month:'short',day:'numeric'})+' (IST)';
    if(ev.loading&&!ev.loaded){ host.innerHTML='<div class="wr-empty">Loading next week\'s events...</div>'; note.textContent=''; return; }
    var lo=Date.UTC.apply(null,[+b.nm.slice(0,4),+b.nm.slice(5,7)-1,+b.nm.slice(8,10)])-IST, hi=lo+5*DAY+6*36e5, want=impact();
    var rows=ev.list.map(function(e){ return {e:e,t:evTime(e),l:impLvl(e.impact)}; }).filter(function(x){
      if(!x.t||x.t.getTime()<lo||x.t.getTime()>=hi) return false;
      return want==='all'||(want==='medium'&&x.l>=2)||(want==='high'&&x.l===3);
    }).sort(function(a,c){ return a.t-c.t; });
    if(!rows.length){
      host.innerHTML='<div class="wr-empty">'+esc(ev.msg||('No '+(want==='high'?'high-impact':want==='medium'?'high or medium-impact':'')+' events found for next week.'))+'</div>';
    } else {
      var html='<div class="wr-evgrid">', last='', open=false;
      rows.forEach(function(x){
        var dk=istKey(x.t), e=x.e;
        if(dk!==last){ if(open) html+='</div></section>'; last=dk; open=true;
          html+='<section class="wr-evday"><div class="wr-evh"><b>'+esc(fmtDay(dk,{weekday:'long'}))+'</b><span>'+esc(fmtDay(dk,{month:'short',day:'numeric'}))+'</span></div><div class="wr-evl">'; }
        html+='<div class="wr-ev"><span class="tm">'+istClock(x.t)+'</span><span class="cc">'+esc(CCY[e.country]||e.country||'-')+'</span><span class="wr-imp" title="'+(x.l===3?'High':x.l===2?'Medium':'Low')+' impact">'
          +[1,2,3].map(function(n){ return '<i class="'+(n<=x.l?'on l'+x.l:'')+'"></i>'; }).join('')
          +'</span><span class="nm">'+esc(e.event||'-')+'</span><span class="fp"><em>Forecast</em>'+esc(e.estimate==null||e.estimate===''?'-':e.estimate)+'</span><span class="fp"><em>Previous</em>'+esc(e.prev==null||e.prev===''?'-':e.prev)+'</span></div>';
      });
      if(open) html+='</div></section>';
      host.innerHTML=html+'</div>';
    }
    note.textContent=ev.loading?'Refreshing...':(ev.loaded&&!ev.msg?(rows.length+' event'+(rows.length===1?'':'s')+' shown'+(ev.src==='forexfactory'?' via Forex Factory (forecast and previous only; updates hourly).':' via Finnhub. Free-tier data may lag or omit some releases.')):'');
  }
  function why(what,c){ return c===200?'':c===403?what+' is not included in the current Finnhub plan.':c===429?'Finnhub rate limit reached, try again in a minute.':c===0?'Finnhub could not be reached.':what+' failed (code '+c+').'; }
  function fetchEvents(force){
    var k=today(); if(!k||ev.loading) return;
    var b=bounds(k), age=Date.now()-ev.t;
    if(!force&&ev.key===b.nm&&ev.loaded&&age<(ev.list.length?30:(ev.msg&&ev.fails<4?0.3:5))*60000) return;
    if(typeof window.jlMarketFetch!=='function'){ ev.loaded=true; ev.list=[]; ev.msg='The market backend is not available.'; renderEvents(); return; }
    ev.loading=true; ev.key=b.nm; renderEvents();
    window.jlMarketFetch({from:addDays(b.nm,-1),to:addDays(b.nm,6)}).then(function(R){
      var cs=R.calendar.status;
      ev.list=cs===200?(R.calendar.events||[]):[]; ev.src=(R.calendar&&R.calendar.source)||''; ev.msg=why('The economic calendar',cs); ev.fails=ev.list.length?0:ev.fails+1;
    }).catch(function(err){ ev.list=[]; ev.fails++; ev.msg=(err&&err.message)||'Could not load the calendar.'; })
    .then(function(){ ev.loading=false; ev.loaded=true; ev.t=Date.now(); renderEvents(); });
  }

  /* hover tooltips for the chart and heatmap cards (same #ttip element and look as the Analytics tab) */
  var ttipEl=document.getElementById('ttip');
  function tipShow(e,html){
    if(!ttipEl) return;
    ttipEl.innerHTML=html; ttipEl.classList.add('show');
    var w=220, h=ttipEl.offsetHeight||70, left=e.clientX+14, top=e.clientY-h/2;
    if(left+w>window.innerWidth) left=e.clientX-w-14;
    if(top<8) top=8;
    if(top+h>window.innerHeight-8) top=window.innerHeight-h-8;
    ttipEl.style.left=left+'px'; ttipEl.style.top=top+'px';
  }
  function tipHide(){ if(ttipEl) ttipEl.classList.remove('show'); }
  function scrubClear(except){
    var all=root.querySelectorAll('svg.wr-sc'), i, l, d;
    for(i=0;i<all.length;i++){ if(all[i]===except) continue; l=all[i].querySelector('.sc-x'); d=all[i].querySelector('.sc-d'); if(l) l.style.opacity=0; if(d) d.style.opacity=0; }
  }
  root.addEventListener('mousemove',function(e){
    var t=e.target, svg=t&&t.closest?t.closest('svg.wr-sc'):null;
    if(svg){
      var c=charts[svg.getAttribute('data-c')]; scrubClear(svg);
      if(!c||!c.arr.length){ tipHide(); return; }
      var bx=svg.getBoundingClientRect(), n=c.arr.length;
      var i=Math.max(0,Math.min(n-1,Math.round(((e.clientX-bx.left)/bx.width*c.Wd-c.pl)/(c.Wd-c.pl-c.pr)*(n-1))));
      var l=svg.querySelector('.sc-x'), d=svg.querySelector('.sc-d');
      l.setAttribute('x1',c.X(i)); l.setAttribute('x2',c.X(i)); d.setAttribute('cx',c.X(i)); d.setAttribute('cy',c.y(c.arr[i]));
      l.style.opacity=1; d.style.opacity=1;
      tipShow(e,'<div class="th">Trade #'+(i+1)+'</div><div class="tr"><span>'+esc(c.label)+'</span><b>'+money(c.arr[i])+'</b></div>');
      return;
    }
    scrubClear(null);
    var cell=t&&t.closest?t.closest('[data-t]'):null;
    if(cell&&root.contains(cell)) tipShow(e,cell.getAttribute('data-t')); else tipHide();
  });
  root.addEventListener('mouseleave',function(){ scrubClear(null); tipHide(); });

  /* ---------- wiring ---------- */
  var lastStats='';
  /* one panel, two homes: Today's Summary (original spot) or the top of the Calendar tab, whichever view is open */
  var homeParent=root.parentNode, homeNext=root.nextElementSibling;
  function place(){
    /* The panel lives on Today's Summary only; it is no longer shown at the top of the Calendar tab. */
    if(homeParent&&(root.parentNode!==homeParent||root.nextElementSibling!==homeNext)){
      homeParent.insertBefore(root,homeNext&&homeNext.parentNode===homeParent?homeNext:null);
    }
  }
  /* Weekend: Today's Summary shows only this review. Everything after the panel is hidden with an inline !important style, so no other rule can bring it back; weekdays restore each element's own inline display. */
  function hideBelow(on){
    var sv=$('view-summary'); if(!sv) return;
    var ok=!!root.parentNode&&sv.contains(root.parentNode)&&on, targets=[], n, el, i, marked=sv.querySelectorAll('[data-wr-hid]');
    sv.classList.toggle('wr-weekend',ok);
    /* hide everything after the panel, at every level up to Today's Summary (some cards sit outside the panel's own wrapper) */
    if(ok){ for(n=root;n&&n!==sv;n=n.parentNode){ for(el=n.nextElementSibling;el;el=el.nextElementSibling){ if(el.tagName==='SCRIPT'||el.tagName==='STYLE') continue; targets.push(el); } } }
    for(i=0;i<marked.length;i++){ el=marked[i];
      if(targets.indexOf(el)<0){ var d=el.getAttribute('data-wr-d'); if(d) el.style.setProperty('display',d); else el.style.removeProperty('display'); el.removeAttribute('data-wr-hid'); el.removeAttribute('data-wr-d'); } }
    for(i=0;i<targets.length;i++){ el=targets[i];
      if(!el.hasAttribute('data-wr-hid')){ el.setAttribute('data-wr-d',el.style.getPropertyValue('display')||''); el.setAttribute('data-wr-hid','1'); }
      el.style.setProperty('display','none','important'); }
  }
  /* ---------- free-text note for Monday (kept per upcoming Monday, saved in this browser) ---------- */
  var MON_PFX='jl_monday_note_', monKey='', monTimer=0;
  function monCount(){ var ta=$('wrMonText'), c=$('wrMonCt'); if(ta&&c) c.textContent=ta.value.length+'/1000'; }
  function monSync(){
    var k=today(), ta=$('wrMonText'); if(!k||!ta) return;
    var key=MON_PFX+bounds(k).nm; if(key===monKey) return;
    monKey=key; var v=''; try{ v=localStorage.getItem(key)||''; }catch(e){console.debug('[journall] ignored error in weekly-review.js:', e);}
    if(document.activeElement!==ta) ta.value=v;
    monCount();
  }
  (function(){
    var ta=$('wrMonText'), st=$('wrMonSt'); if(!ta) return;
    ta.addEventListener('input',function(){
      monCount(); if(st) st.textContent='Saving...';
      clearTimeout(monTimer);
      monTimer=setTimeout(function(){
        try{ if(ta.value) localStorage.setItem(monKey,ta.value); else localStorage.removeItem(monKey); if(st) st.textContent='Saved on this device'; }
        catch(e){ if(st) st.textContent='Could not save (browser storage blocked)'; }
      },400);
    });
    ta.addEventListener('blur',function(){ clearTimeout(monTimer); try{ if(monKey){ if(ta.value) localStorage.setItem(monKey,ta.value); else localStorage.removeItem(monKey); if(st) st.textContent='Saved on this device'; } }catch(e){console.debug('[journall] ignored error in weekly-review.js:', e);} });
  })();
  function tick(){
    var wk=isWeekend();
    place();
    root.hidden=!wk;
    hideBelow(wk);
    syncPreview();
    if(!wk) return;
    try{
      var h=statsHtml(); if(h!==lastStats){ lastStats=h; $('wrStats').innerHTML=h; }
      $('wrRule').innerHTML=ruleHtml(); monSync();
    }catch(e){ $('wrStats').innerHTML='<div class="wr-empty">Could not build the weekly review.</div>'; }
    fetchEvents(false);
  }
  $('wrImpactChips').addEventListener('click',function(e){
    var btn=e.target.closest('.wr-chip'); if(!btn) return;
    this.querySelectorAll('.wr-chip').forEach(function(x){ var on=x===btn; x.classList.toggle('on',on); x.setAttribute('aria-pressed',on?'true':'false'); });
    renderEvents();
  });
  $('wrRefresh').addEventListener('click',function(){ ev.fails=0; fetchEvents(true); });
  document.addEventListener('visibilitychange',function(){ if(!document.hidden) tick(); });
  window.addEventListener('hashchange',tick);
  try{ var calView=$('view-calendar'); if(calView) new MutationObserver(function(){ tick(); }).observe(calView,{attributes:true,attributeFilter:['hidden']}); }catch(e){console.debug('[journall] ignored error in weekly-review.js:', e);}
  window.addEventListener('storage',function(e){ if(e.key===RULE_KEY) tick(); });
  setInterval(tick,30000); setTimeout(tick,1500); setTimeout(tick,5000); tick();
})();
