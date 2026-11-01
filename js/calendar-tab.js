(function(){
const $=id=>document.getElementById(id);
$('dateStrC').textContent=new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
const money=v=>(v<0?'-$':'+$')+Math.abs(v).toFixed(2);
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const TL=()=>Number(window.jlMaxTradesPerDay)||0, LL=()=>Number(window.jlDailyLossLimit)||0;

// Day stats are computed from real trades (window.__trades — the same array the Trades
// and Journal tabs use), not a separate hand-authored dataset. This is intentionally
// sparse: only Sept 17/18/21 2026 have real trades right now, so most days will show
// empty until a fuller history syncs in from MT5. Cached per (year, 1-indexed month)
// since window.__trades doesn't change after initial load in this session.
const FILL_CACHE={};
function fill(y,m){
  const mk=y+'-'+(m+1);
  if(FILL_CACHE[mk]) return FILL_CACHE[mk];
  const out={};
  (window.__trades||[]).forEach(t=>{
    if(!t.d) return;
    const parts=t.d.split('-').map(Number), ty=parts[0], tm=parts[1], td=parts[2];
    if(ty!==y||tm!==(m+1)) return;
    const o=out[td]||(out[td]={t:0,w:0,l:0,be:0,pnl:0});
    o.t++; o.pnl+=t.pnl;
    const kd=window.jlKind(t.pnl); // same win/loss/be rule as every other tab
    if(kd==='win')o.w++; else if(kd==='loss')o.l++; else o.be++;
  });
  FILL_CACHE[mk]=out;
  return out;
}
// Year rollup — computed from window.__trades with the shared win/loss/break-even rule, so sums match Analytics exactly
const YEARS=(function(){const Y={},MNm=['January','February','March','April','May','June','July','August','September','October','November','December'];
  (window.__trades||[]).slice().sort((a,b)=>a.d+a.t<b.d+b.t?-1:1).forEach(t=>{const y=+t.d.slice(0,4),mi=+t.d.slice(5,7)-1;
    const Q=Y[y]=Y[y]||{net:0,trades:0,wins:0,losses:0,be:0,gp:0,gl:0,dd:0,pf:0,exp:0,months:[],_c:0,_pk:0,_mm:{}};
    const M=Q._mm[mi]=Q._mm[mi]||{i:mi,m:MNm[mi],net:0,gp:0,gl:0,trades:0,w:0,be:0,l:0};
    const k={win:'w',loss:'l',be:'be'}[window.jlKind(t.pnl)];M.trades++;Q.trades++;M.net+=t.pnl;Q.net+=t.pnl;
    if(k==='w'){M.w++;Q.wins++;M.gp+=t.pnl;Q.gp+=t.pnl}else if(k==='l'){M.l++;Q.losses++;M.gl-=t.pnl;Q.gl-=t.pnl}else{M.be++;Q.be++}
    Q._c+=t.pnl;Q._pk=Math.max(Q._pk,Q._c);Q.dd=Math.min(Q.dd,Q._c-Q._pk)});
  Object.values(Y).forEach(Q=>{Q.pf=Q.gl?Q.gp/Q.gl:0;Q.exp=Q.trades?Q.net/Q.trades:0;Q.months=Object.values(Q._mm).sort((a,b)=>a.i-b.i);delete Q._mm;delete Q._c;delete Q._pk});
  return Y})();

const today=new Date();
// Default view = the latest month that has trades (falls back to today's month when there is no data)
const LATEST=(function(){let m='';(window.__trades||[]).forEach(t=>{if(t&&t.d&&t.d>m)m=t.d});const a=/^(\d{4})-(\d{2})/.exec(m);return a?{y:+a[1],m:+a[2]-1}:{y:today.getFullYear(),m:today.getMonth()}})();
let vy=LATEST.y, vm=LATEST.m; // vm is 0-indexed
let cy=vy;

function monthPath(y,mi){const d=fill(y,mi),days=Object.keys(d).map(Number).sort((a,b)=>a-b);let v=0;const arr=[0];days.forEach(k=>{v+=d[k].pnl;arr.push(v)});if(arr.length<2)arr.push(0);return arr} // real cumulative P&L by active day
function spark(vals,w,h,c){const mn=Math.min(0,...vals),mx=Math.max(0,...vals),sp=(mx-mn)||1,pl=2,pr=2,pt=6,pb=6;
  const x=i=>pl+i*(w-pl-pr)/(vals.length-1), y=v=>pt+(mx-v)/sp*(h-pt-pb);
  const pts=vals.map((v,i)=>x(i)+','+y(v)).join(' ');
  return '<svg viewBox="0 0 '+w+' '+h+'" width="100%" height="100%" preserveAspectRatio="none">'+
    '<line x1="'+pl+'" x2="'+(w-pr)+'" y1="'+y(0)+'" y2="'+y(0)+'" stroke="rgba(255,255,255,.08)" stroke-dasharray="2,3"/>'+
    '<polyline points="'+pts+'" fill="none" stroke="'+c+'" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'}
let sgid=0;
function sparkFill(vals,w,h,c){const mn=Math.min(0,...vals),mx=Math.max(0,...vals),sp=(mx-mn)||1,pl=2,pr=2,pt=7,pb=7;
  const x=i=>pl+i*(w-pl-pr)/(vals.length-1), y=v=>pt+(mx-v)/sp*(h-pt-pb);
  const pts=vals.map((v,i)=>[x(i),y(v)]);
  const line=pts.map(p=>p.join(',')).join(' ');
  const area='M'+pts.map(p=>p.join(',')).join(' L')+' L'+x(vals.length-1)+','+y(mn)+' L'+x(0)+','+y(mn)+' Z';
  const gid='sg'+(sgid++);
  return '<svg viewBox="0 0 '+w+' '+h+'" width="100%" height="100%" preserveAspectRatio="none">'+
    '<defs><linearGradient id="'+gid+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="'+c+'" stop-opacity=".32"/><stop offset="100%" stop-color="'+c+'" stop-opacity="0"/></linearGradient></defs>'+
    '<line x1="'+pl+'" x2="'+(w-pr)+'" y1="'+y(0)+'" y2="'+y(0)+'" stroke="rgba(255,255,255,.08)" stroke-dasharray="2,3"/>'+
    '<path d="'+area+'" fill="url(#'+gid+')"/>'+
    '<polyline points="'+line+'" fill="none" stroke="'+c+'" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'}

// smoothed, gridded, hoverable equity curve for the yearly overview (nicer than the plain sparkline)
function yearEquityChart(monthsArr,w,h,c){
  const labels=['Start',...monthsArr.map(m=>m.m.slice(0,3))];
  let run=0; const vals=[0,...monthsArr.map(m=>{run+=m.net;return run})];
  const n=vals.length, mn=Math.min(0,...vals), mx=Math.max(0,...vals), sp=(mx-mn)||1;
  const pl=2,pr=2,pt=14,pb=14;
  const xw=i=>pl+i*(w-pl-pr)/(n-1), yh=v=>pt+(mx-v)/sp*(h-pt-pb);
  const xPct=i=>(i/(n-1))*100, yPct=v=>(yh(v)/h)*100;
  const pts=vals.map((v,i)=>[xw(i),yh(v)]);

  function smoothPath(p){
    if(p.length<3) return 'M'+p.map(q=>q.join(',')).join(' L');
    let d='M'+p[0][0]+','+p[0][1];
    for(let i=0;i<p.length-1;i++){
      const p0=p[i-1]||p[i], p1=p[i], p2=p[i+1], p3=p[i+2]||p2;
      const c1x=p1[0]+(p2[0]-p0[0])/6, c1y=p1[1]+(p2[1]-p0[1])/6;
      const c2x=p2[0]-(p3[0]-p1[0])/6, c2y=p2[1]-(p3[1]-p1[1])/6;
      d+=' C'+c1x+','+c1y+' '+c2x+','+c2y+' '+p2[0]+','+p2[1];
    }
    return d;
  }
  const linePath=smoothPath(pts);
  const areaPath=linePath+' L'+pts[n-1][0]+','+yh(mn)+' L'+pts[0][0]+','+yh(mn)+' Z';
  const gid='yeg'+(sgid++);

  const gridLines=[0,.5,1].map(fr=>{const gv=mn+sp*fr;return '<line x1="0" x2="'+w+'" y1="'+yh(gv)+'" y2="'+yh(gv)+'" stroke="rgba(255,255,255,.07)" stroke-dasharray="2,4"/>'}).join('');
  const zeroLine=(mn<0&&mx>0)?('<line x1="0" x2="'+w+'" y1="'+yh(0)+'" y2="'+yh(0)+'" stroke="rgba(255,255,255,.16)"/>'):'';

  const svg='<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none">'+
    '<defs><linearGradient id="'+gid+'" x1="0" y1="0" x2="0" y2="1">'+
      '<stop offset="0%" stop-color="'+c+'" stop-opacity=".38"/>'+
      '<stop offset="65%" stop-color="'+c+'" stop-opacity=".08"/>'+
      '<stop offset="100%" stop-color="'+c+'" stop-opacity="0"/></linearGradient></defs>'+
    gridLines+zeroLine+
    '<path d="'+areaPath+'" fill="url(#'+gid+')"/>'+
    '<path d="'+linePath+'" fill="none" stroke="'+c+'" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="filter:drop-shadow(0 0 5px '+c+'70)"/>'+
    '</svg>';

  let dots='';
  vals.forEach((v,i)=>{
    if(i===0) return;
    const isLast=i===n-1;
    dots+='<span class="yeq-dot'+(isLast?' end':'')+'" style="left:'+xPct(i)+'%;top:'+yPct(v)+'%;--dc:'+c+'" title="'+labels[i]+': '+money(v)+'"></span>';
  });

  const showEvery=n>9?2:1;
  let ticks='';
  labels.forEach((lab,i)=>{
    if(i===0) return;
    if(i%showEvery!==0 && i!==n-1) return;
    ticks+='<span class="yeq-tick" style="left:'+xPct(i)+'%">'+lab+'</span>';
  });

  return '<div class="yeq-wrap"><div class="yeq-plot">'+svg+'<div class="yeq-dots">'+dots+'</div></div>'+
    '<div class="yeq-axis">'+ticks+'</div></div>';
}

function monthDays(y,m){ // returns array of week-rows, each 5 cells (Mon..Fri) with {date|null}
  const first=new Date(y,m,1), dow=(first.getDay()+6)%7, last=new Date(y,m+1,0).getDate();
  const rows=[];let row=new Array(5).fill(null),col=dow<5?dow:null,d=1;
  if(dow>=5){ /* month starts on weekend: nothing before day1 */ }
  while(d<=last){
    const wd=(new Date(y,m,d).getDay()+6)%7;
    if(wd<5){ if(col==null&&row.every(c=>c===null))col=wd; row[wd]=d; if(wd===4){rows.push(row);row=new Array(5).fill(null)} }
    d++;
  }
  if(row.some(c=>c!==null))rows.push(row);
  return rows;
}

function renderGrid(){
  const lgEl=document.getElementById('calLegLim'); if(lgEl) lgEl.textContent=TL()>0?'Over the '+TL()+'-trade limit':'Over the trade limit';
  const dm=fill(vy,vm), rows=monthDays(vy,vm);
  const active=Object.keys(dm).map(Number), vals=active.map(k=>dm[k]);
  const trades=vals.reduce((s,v)=>s+v.t,0), net=vals.reduce((s,v)=>s+v.pnl,0);
  const wins=vals.reduce((s,v)=>s+v.w,0);
  const best=vals.length?active.reduce((a,b)=>dm[b].pnl>dm[a].pnl?b:a):null;
  const worst=vals.length?active.reduce((a,b)=>dm[b].pnl<dm[a].pnl?b:a):null;
  const isTodayMonth=today.getFullYear()===vy&&today.getMonth()===vm;
  const maxAbs=Math.max(50,...vals.map(v=>Math.abs(v.pnl)));
  $('cBarScale').textContent='Full bar = $'+(Number.isInteger(maxAbs)?maxAbs:maxAbs.toFixed(2))+' move'; // real scale for the month in view

  const mgp=vals.reduce((s,v)=>s+(v.pnl>0?v.pnl:0),0), mgl=vals.reduce((s,v)=>s+(v.pnl<0?-v.pnl:0),0);
  const mpf=mgl?mgp/mgl:(mgp?Infinity:0);
  const winDays=vals.filter(v=>v.pnl>0).length, lossDays=vals.filter(v=>v.pnl<0).length;
  const avgWinDay=winDays?mgp/winDays:0, avgLossDay=lossDays?mgl/lossDays:0;

  const winPct = trades?Math.round(wins/trades*100):0;
  const winColor = winPct>=50?'var(--green)':'var(--red)';
  const pfColor = mpf<1?'var(--red)':'var(--green)';
  const pfPct = active.length?Math.min(100,(mpf===Infinity?100:mpf*50)):0;
  const daysPct = rows.length*5?Math.round(active.length/(rows.length*5)*100):0;
  const wlTotal = avgWinDay+avgLossDay;
  const wlWinPct = wlTotal?Math.round(avgWinDay/wlTotal*100):50;
  const ringOff = 126-126*(winPct/100);

  $('cKP').innerHTML=[
    '<div><span>Month P&amp;L</span><b'+(net<0?' style="color:var(--red)"':' style="color:var(--green)"')+'>'+money(net)+'</b><small></small></div>',
    '<div><span>Trades</span><b>'+trades+'</b><small>'+active.length+' active days</small></div>',
    '<div class="kpi-acc" style="--acc:'+winColor+'"><span><i class="kpi-dot" style="background:'+winColor+'"></i>Win rate</span>'+
      '<div class="kpi-ring-row"><svg width="44" height="44" viewBox="0 0 44 44">'+
        '<circle class="kpi-ring-track" cx="22" cy="22" r="20"/>'+
        '<circle class="kpi-ring-val" cx="22" cy="22" r="20" stroke="'+winColor+'" style="--off:'+ringOff+'"/></svg>'+
      '<div><b style="color:'+winColor+'">'+(trades?winPct+'%':'—')+'</b><small>'+jlN(wins,'win')+'</small></div></div></div>',
    '<div class="kpi-acc" style="--acc:'+pfColor+'"><span><i class="kpi-dot" style="background:'+pfColor+'"></i>Profit factor</span>'+
      '<b style="color:'+pfColor+'">'+(active.length?(mpf===Infinity?'∞':mpf.toFixed(2)):'—')+'</b><small>Gross profit ÷ gross loss</small>'+
      '<div class="kpi-bar"><i data-w="'+pfPct+'%" style="background:'+pfColor+';color:'+pfColor+'"></i></div></div>',
    '<div class="kpi-acc" style="--acc:var(--accent-2)"><span>Active days</span><b>'+active.length+'</b><small>of '+rows.length*5+' trading days</small>'+
      '<div class="kpi-bar"><i data-w="'+daysPct+'%" style="background:var(--accent-2);color:var(--accent-2)"></i></div></div>',
    '<div class="kpi-acc" style="--acc:var(--green)"><span>Avg win / loss day</span>'+
      '<b>'+(active.length?'<span style="color:var(--green)">+'+avgWinDay.toFixed(0)+'</span> / <span style="color:var(--red)">-'+avgLossDay.toFixed(0)+'</span>':'—')+'</b>'+
      '<small>per winning / losing day</small>'+
      '<div class="kpi-bar split"><i data-w="'+wlWinPct+'%" style="background:var(--green);color:var(--green)"></i><i data-w="'+(100-wlWinPct)+'%" style="background:var(--red);color:var(--red)"></i></div></div>',
    '<div><span>Best day</span><b'+(best?' style="color:var(--green)"':'')+'>'+(best?money(dm[best].pnl):'—')+'</b><small>'+(best?MONTHS[vm].slice(0,3)+' '+best:'')+'</small></div>',
    '<div><span>Worst day</span><b'+(worst?' style="color:var(--red)"':'')+'>'+(worst?money(dm[worst].pnl):'—')+'</b><small>'+(worst?MONTHS[vm].slice(0,3)+' '+worst:'')+'</small></div>'
  ].join('');

  requestAnimationFrame(()=>{
    document.querySelectorAll('#cKP .kpi-bar i[data-w]').forEach((el,i)=>{
      setTimeout(()=>{ el.style.width = el.dataset.w; }, i*80);
    });
  });

  // month equity curve (cumulative daily pnl across the calendar, in date order)
  const dayNums=active.slice().sort((a,b)=>a-b);
  let run=0; const eqVals=[0,...dayNums.map(d=>{run+=dm[d].pnl;return run})];
  $('cEqV').innerHTML='<span style="color:'+(net<0?'var(--red)':'var(--green)')+'">'+money(net)+'</span>';
  $('cEqChart').innerHTML=eqVals.length>1?sparkFill(eqVals,760,56,net<0?'var(--red)':'var(--green)'):'<div class="cal-empty" style="margin:18px 0">No trades yet this month</div>';

  // day-of-week performance (Mon..Fri) for the viewed month
  const DOW=['MON','TUE','WED','THU','FRI'];
  const dowAgg=DOW.map(()=>({pnl:0,t:0,n:0}));
  active.forEach(d=>{const wd=(new Date(vy,vm,d).getDay()+6)%7; if(wd<5){dowAgg[wd].pnl+=dm[d].pnl;dowAgg[wd].t+=dm[d].t;dowAgg[wd].n++}});
  const dowMax=Math.max(1,...dowAgg.map(x=>Math.abs(x.pnl)));
  const dowBest=dowAgg.reduce((a,b,i)=>b.n&&(!dowAgg[a].n||b.pnl>dowAgg[a].pnl)?i:a,0);
  const dowWorst=dowAgg.reduce((a,b,i)=>b.n&&(!dowAgg[a].n||b.pnl<dowAgg[a].pnl)?i:a,0);
  $('cDow').innerHTML=dowAgg.map((x,i)=>{
    const cls=!x.n?'empty':i===dowBest&&x.pnl>0?'best':i===dowWorst&&x.pnl<0?'worst':'';
    return '<div class="cal-dow-cell '+cls+'"><div class="d">'+DOW[i]+'</div>'+
      '<div class="p" style="color:'+(!x.n?'var(--faint)':x.pnl>=0?'var(--green)':'var(--red)')+'">'+(x.n?money(x.pnl):'—')+'</div>'+
      '<div class="track">'+(x.n?'<i style="width:'+Math.min(100,Math.abs(x.pnl)/dowMax*100)+'%;background:'+(x.pnl>=0?'var(--green)':'var(--red)')+'"></i>':'')+'</div>'+
      '<div class="n">'+(x.n?jlN(x.t,'trade')+' · '+x.n+'d':'no data')+'</div></div>'
  }).join('');

  const DOWS=['MON','TUE','WED','THU','FRI'];
  const lastDom=new Date(vy,vm+1,0).getDate(), todayMid=new Date(today.getFullYear(),today.getMonth(),today.getDate());
  $('cGrid').innerHTML=rows.map((r,wi)=>{
    const ds=r.filter(d=>d!=null), wt=ds.reduce((s,d)=>s+(dm[d]?dm[d].t:0),0), wp=ds.reduce((s,d)=>s+(dm[d]?dm[d].pnl:0),0);
    const monD=ds.length?ds[0]-r.indexOf(ds[0]):null; // date-of-month of this week's Monday (may be <1 on the first row)
    const wkCell=(off)=>{ // off: 5 = Saturday, 6 = Sunday
      if(monD==null)return '<div class="ldg-pad"></div>';
      const d=monD+off; if(d<1||d>lastDom)return '<div class="ldg-pad"></div>';
      const over=new Date(vy,vm,monD+5)<=todayMid, isToday=isTodayMonth&&d===today.getDate();
      const cls=over&&wt?(wp>0?' pos':wp<0?' neg':''):'';
      const col=wp>0?'var(--green)':wp<0?'var(--red)':'var(--faint)';
      const res=!over?'Upcoming':wt?money(wp):'No trades';
      const gd=r.filter(dn=>dn!=null&&dm[dn]&&dm[dn].pnl>0).length, ad=r.filter(dn=>dn!=null&&dm[dn]).length;
      const meta=over?(wt?jlN(wt,'trade')+' &middot; '+gd+'/'+ad+' green':''):'Result after Fri';
      const vals=r.map(dn=>(dn!=null&&dm[dn])?dm[dn].pnl:null), mx=Math.max(1e-9,...vals.filter(v=>v!=null).map(v=>Math.abs(v)));
      const NM=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
      const spark='<div class="ldg-wk-spark" aria-hidden="true">'+vals.map((v,k)=>v==null?'<i class="e"></i>':'<i title="'+NM[k]+' '+money(v)+'" style="height:'+Math.max(14,Math.abs(v)/mx*100)+'%;color:'+(v>0?'var(--green)':v<0?'var(--red)':'var(--faint)')+';animation-delay:'+(k*60)+'ms"></i>').join('')+'</div>';
      const daysRow='<div class="ldg-wk-days" aria-hidden="true">'+['M','T','W','T','F','S','S'].map(x=>'<span>'+x+'</span>').join('')+'</div>';
      return '<div class="ldg-row ldg-wk'+(isToday?' today':'')+cls+(over?'':' upcoming')+'" data-wk="'+wi+'" role="button" tabindex="0" aria-label="Weekly review, week '+(wi+1)+'">'+
        '<div class="ldg-d"><b>'+d+'</b><small>'+(off===5?'SAT':'SUN')+'</small><span class="ldg-wk-pill">W'+(wi+1)+'</span></div>'+
        spark+daysRow+
        '<div class="ldg-pnl"'+(over&&wt?' style="color:'+col+'"':'')+'>'+res+'</div>'+
        (meta?'<div class="ldg-meta">'+meta+'</div>':'')+'</div>';
    };
    const dayRows=r.map((d,i)=>{
      if(d==null)return '<div class="ldg-pad"></div>';
      const v=dm[d], isToday=isTodayMonth&&d===today.getDate();
      if(!v)return '<div class="ldg-row'+(isToday?' today':'')+'"><div class="ldg-d"><b>'+d+'</b><small>'+DOWS[i]+'</small></div><div class="ldg-empty">No trades</div></div>';
      const over=TL()>0&&v.t>TL(), brk=LL()>0&&v.pnl<=-LL();
      const pct=Math.min(50,Math.abs(v.pnl)/maxAbs*50);
      const bar='<div class="ldg-bar-track"><div class="ldg-bar" style="'+(v.pnl>=0?'left:50%':'right:50%')+';width:'+pct+'%;color:'+(v.pnl>0?'var(--green)':v.pnl<0?'var(--red)':'var(--faint)')+'"></div></div>';
      const flags=(over?'<span class="ldg-badge ot" title="Over the '+TL()+'-trade limit">OT</span>':'')+(brk?'<span class="ldg-badge rb" title="Breached the $'+LL()+' daily loss limit">RB</span>':'')+(d===best&&v.pnl>0?'<span class="ldg-badge best">Best</span>':d===worst&&v.pnl<0?'<span class="ldg-badge worst">Worst</span>':'');
      const pnlCls=v.pnl>0?' pos':v.pnl<0?' neg':'';
      return '<div class="ldg-row'+(isToday?' today':'')+pnlCls+'" data-d="'+d+'"><div class="ldg-d"><b>'+d+'</b><small>'+DOWS[i]+'</small></div>'+bar+
        '<div class="ldg-meta">'+v.t+' tr &middot; '+v.w+'W/'+v.l+'L/'+v.be+'BE'+flags+'</div>'+
        '<div class="ldg-pnl" style="color:'+(v.pnl>0?'var(--green)':v.pnl<0?'var(--red)':'var(--faint)')+'">'+money(v.pnl)+'</div></div>';
    }).join('')+wkCell(5)+wkCell(6); /* Weekly review cell on both Saturday and Sunday */
    const sub=ds.length?'<div class="ldg-sub" data-week="'+wi+'"><div>WEEK '+(wi+1)+'</div><i>subtotal</i><b>'+jlN(wt,'trade')+'</b><span class="m-pnl" style="color:'+(wp>0?'var(--green)':wp<0?'var(--red)':'var(--faint)')+'">'+(wt?money(wp):'—')+'</span></div>':'';
    return dayRows+sub;
  }).join('');

  // insights
  const ins=[];
  const overDays=active.filter(k=>TL()>0&&dm[k].t>TL());
  const brkDays=active.filter(k=>LL()>0&&dm[k].pnl<=-LL());
  if(overDays.length)ins.push(['var(--amber)','<b>Overtrading:</b> '+overDays.length+' of '+active.length+' active days went over the '+TL()+'-trade limit.<span>'+MONTHS[vm]+' '+overDays.reduce((a,b)=>dm[b].t>dm[a].t?b:a)+' was the heaviest, with '+dm[overDays.reduce((a,b)=>dm[b].t>dm[a].t?b:a)].t+' trades.</span>']);
  if(brkDays.length)ins.push(['var(--red)','<b>Loss limit:</b> '+brkDays.length+' day'+(brkDays.length>1?'s':'')+' breached the $'+LL()+' daily loss limit ('+brkDays.map(d=>MONTHS[vm].slice(0,3)+' '+d).join(', ')+'), costing '+money(brkDays.reduce((s,d)=>s+dm[d].pnl,0))+' between them.<span>The month\'s net result is '+money(net)+'.</span>']);
  if(best)ins.push(['var(--green)','<b>Best day:</b> '+MONTHS[vm]+' '+best+' ('+money(dm[best].pnl)+') on '+jlN(dm[best].t,'trade')+', '+jlN(dm[best].l,'loss','losses')+'.<span>Whatever changed that day is worth repeating.</span>']);
  let streak=0,maxStreak=0,streakEnd=null;
  active.slice().sort((a,b)=>a-b).forEach(d=>{ if(dm[d].pnl<0){streak++; if(streak>maxStreak){maxStreak=streak;streakEnd=d} } else streak=0 });
  if(maxStreak>=2)ins.push(['var(--red)','<b>Losing streak:</b> '+maxStreak+' active trading days in a row ending '+MONTHS[vm]+' '+streakEnd+'.<span>Consider a mandatory break after two straight red days.</span>']);
  if(!ins.length)ins.push(['var(--green)','<b>Clean month so far.</b> No rule breaks logged yet.<span>Keep the size and pacing that got you here.</span>']);
  $('cIns').innerHTML=ins.map(x=>'<li style="--c:'+x[0]+'">'+x[1]+'</li>').join('');

  $('cMonSel').value=String(vm);$('cYrSel').value=String(vy);
}

function renderYear(){
  cy=Math.max(YR_MIN,Math.min(YR_MAX,cy));
  $('cPrevY').disabled=cy<=YR_MIN;$('cNextY').disabled=cy>=YR_MAX;
  const y=YEARS[cy];$('cYrH').textContent=cy;
  if(!y){$('cYKP').innerHTML='';$('cYrBadges').innerHTML='';$('cYEqV').innerHTML='';$('cYEqChart').innerHTML='';$('cMonths').innerHTML='<div class="cal-empty-yr">No trading data recorded for '+cy+' yet.</div>';return}

  const avgTradesPerDay=(y.trades/(y.months.length*21)).toFixed(1); // ~21 trading days/month estimate
  const bestM=y.months.reduce((a,b)=>b.net>a.net?b:a,y.months[0]);
  const worstM=y.months.reduce((a,b)=>b.net<a.net?b:a,y.months[0]);

  $('cYKP').innerHTML=[
    ['Net P&amp;L',money(y.net),y.net<0?'var(--red)':'var(--green)',jlN(y.trades,'trade')],
    ['Win rate',Math.round(y.wins/y.trades*100)+'%','',y.wins+'W / '+y.losses+'L / '+y.be+'BE'],
    ['Profit factor',y.pf.toFixed(2),y.pf<1?'var(--red)':'var(--green)','Gross profit ÷ gross loss'],
    ['Max drawdown',money(y.dd),'var(--red)','Peak to trough'],
    ['Expectancy / trade',money(y.exp),y.exp<0?'var(--red)':'var(--green)','Net P&amp;L ÷ trades'],
    ['Avg trades / day',avgTradesPerDay,'','across active months']
  ].map(c=>'<div><span>'+c[0]+'</span><b'+(c[2]?' style="color:'+c[2]+'"':'')+'>'+c[1]+'</b><small>'+c[3]+'</small></div>').join('');

  $('cYrBadges').innerHTML=
    '<span class="cal-yr-badge '+(bestM.net>=0?'pos':'gold')+'">Best month · '+bestM.m+' <b>'+money(bestM.net)+'</b></span>'+
    '<span class="cal-yr-badge '+(worstM.net<0?'neg':'')+'">Worst month · '+worstM.m+' <b>'+money(worstM.net)+'</b></span>';

  // yearly cumulative equity curve, built from real month net values
  $('cYEqV').innerHTML='<span style="color:'+(y.net<0?'var(--red)':'var(--green)')+'">'+money(y.net)+'</span>';
  $('cYEqChart').innerHTML=yearEquityChart(y.months,900,148,y.net<0?'var(--red)':'var(--green)');

  $('cMonths').innerHTML=y.months.map((m,i)=>{
    const vals=monthPath(cy,m.i);
    const pf=m.gl?(m.gp/m.gl):(m.gp?Infinity:0);
    const tag=m===bestM&&y.months.length>1?' <span style="color:var(--silver)">· best</span>':m===worstM&&y.months.length>1?' <span style="color:var(--red)">· worst</span>':'';
    const rowCls=m===bestM&&y.months.length>1?' best':m===worstM&&y.months.length>1?' worst':'';
    return '<div class="ldg-mrow'+rowCls+'" data-my="'+cy+'-'+m.i+'"><div class="m-name">'+m.m+'<small>'+jlN(m.trades,'trade')+tag+'</small></div>'+
    '<div class="ldg-mspark">'+sparkFill(vals,300,28,m.net<0?'var(--red)':'var(--green)')+'</div>'+
    '<div class="m-pnl" style="color:'+(m.net<0?'var(--red)':'var(--green)')+'">'+money(m.net)+'</div>'+
    '<div class="m-meta">PF <b>'+(pf===Infinity?'∞':pf.toFixed(2))+'</b><br>'+m.w+'W / '+m.l+'L / '+m.be+'BE</div></div>'
  }).join('');
}

$('cMonths').addEventListener('click',e=>{const c=e.target.closest('.ldg-mrow');if(!c)return;const[y,m]=c.dataset.my.split('-').map(Number);openMonthPanel(y,m)});
/* Month / year custom comboboxes: hidden #cMonSel / #cYrSel keep .value get/set working for renderGrid */
let calOpenCb=null;
function calCombo(key,opts,onPick){
  const $c=s=>$('c'+key+s),cb=$c('Cb'),btn=$c('Btn'),pop=$c('Pop'),list=$c('List'),lbl=$c('Lbl'),h=$c('Sel'),api={open:false};let v=String(opts[0][0]);
  const fill=()=>{list.innerHTML=opts.map(o=>'<div class="j-cb-opt" role="option" tabindex="-1" data-v="'+o[0]+'" aria-selected="'+(String(o[0])===v)+'"><span class="j-cb-main"><span class="j-cb-t1">'+o[1]+'</span></span><svg class="j-cb-ck" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg></div>').join('')};
  const set=(open,focusBtn)=>{if(open&&calOpenCb&&calOpenCb!==api)calOpenCb.set(false);api.open=open;cb.dataset.open=open?'1':'0';pop.hidden=!open;btn.setAttribute('aria-expanded',open);calOpenCb=open?api:(calOpenCb===api?null:calOpenCb);
    if(open){fill();const o=list.querySelector('[aria-selected="true"]');if(o)o.focus()}else if(focusBtn)btn.focus()};
  api.set=set;
  Object.defineProperty(h,'value',{get(){return v},set(x){const o=opts.find(o=>String(o[0])===String(x));if(!o)return;v=String(o[0]);lbl.textContent=o[1];if(api.open)fill()}});
  const pick=o=>{h.value=o.dataset.v;set(false,true);onPick(+o.dataset.v)};
  lbl.textContent=opts[0][1];
  btn.addEventListener('click',e=>{e.stopPropagation();set(!api.open)});
  btn.addEventListener('keydown',e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();set(true)}});
  list.addEventListener('click',e=>{const o=e.target.closest('.j-cb-opt');if(o)pick(o)});
  list.addEventListener('keydown',e=>{const o=e.target.closest('.j-cb-opt');if(!o)return;
    if(e.key==='Enter'||e.key===' '){e.preventDefault();pick(o)}
    else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const os=[...list.querySelectorAll('.j-cb-opt')],i=os.indexOf(o)+(e.key==='ArrowDown'?1:-1);(os[i]||o).focus()}});
  document.addEventListener('click',e=>{if(api.open&&!cb.contains(e.target))set(false)});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&api.open)set(false,true)});
}
calCombo('Mon',MONTHS.map((m,i)=>[i,m]),n=>{vm=n;renderGrid()});
const YR_MIN=(function(){const ys=Object.keys(YEARS).map(Number);return Math.min(today.getFullYear(),...ys)})(),YR_MAX=(function(){const ys=Object.keys(YEARS).map(Number);return Math.max(today.getFullYear(),...ys)})();
const YR_LIST=[];for(let y=YR_MIN;y<=YR_MAX;y++)YR_LIST.push([y,String(y)]);
calCombo('Yr',YR_LIST,n=>{vy=n;renderGrid()});
$('cPrevM').addEventListener('click',()=>{vm--;if(vm<0){if(vy<=YR_MIN){vm=0;return}vm=11;vy--}renderGrid()});
$('cNextM').addEventListener('click',()=>{vm++;if(vm>11){if(vy>=YR_MAX){vm=11;return}vm=0;vy++}renderGrid()});
$('cNowM').addEventListener('click',()=>{vy=LATEST.y;vm=LATEST.m;renderGrid()});
$('cPrevY').addEventListener('click',()=>{if(cy<=YR_MIN)return;cy--;renderYear()});
$('cNextY').addEventListener('click',()=>{if(cy>=YR_MAX)return;cy++;renderYear()});
$('cNowY').addEventListener('click',()=>{cy=LATEST.y;renderYear()});
const FLAME_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2c1 3-2 4-2 7a3 3 0 0 0 6 0c1 1 1.5 2.5 1.5 4a5.5 5.5 0 1 1-11 0C6.5 8 9 6 12 2z"/></svg>';
const WARN_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>';
renderGrid();renderYear();

// ---------- day detail slide-in panel ----------
let dpOpen=false;
const dpEsc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Same key shape as the Journal tab's key() — kept local rather than exposed cross-script
// since it's a trivial pure function of trade fields, not stateful data.
const dpKey=t=>t.d+' '+t.t+' '+t.side+' '+t.en+' '+t.pnl;
function dayDateStr(y,m,d){return y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0')}
function dayTrades(y,m,d){const ds=dayDateStr(y,m,d);return (window.__trades||[]).map((t,i)=>({t,i})).filter(x=>x.t.d===ds).sort((a,b)=>a.t.t<b.t.t?-1:1)}
function openDayPanel(d){
  const v=fill(vy,vm)[d]; if(!v)return;
  const label=new Date(vy,vm,d).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
  $('dpDate').textContent=label;
  $('dpPnl').innerHTML='<span style="color:'+(v.pnl>0?'var(--green)':v.pnl<0?'var(--red)':'var(--faint)')+'">'+money(v.pnl)+'</span>';
  $('dpStats').innerHTML=[['Trades',v.t,'var(--text)'],['Wins',v.w,'var(--green)'],['Losses',v.l,'var(--red)'],['B/E',v.be,'var(--faint)']]
    .map(x=>'<div><span>'+x[0]+'</span><b style="color:'+x[2]+'">'+x[1]+'</b></div>').join('');
  const pairs=dayTrades(vy,vm,d);
  const journals=window.__getJournals?window.__getJournals():[];
  $('dpList').innerHTML=pairs.length?pairs.map((x,ri)=>{
    const tr=x.t,c=tr.pnl>0?'var(--green)':tr.pnl<0?'var(--red)':'var(--faint)';
    const je=journals.find(e=>e.key===dpKey(tr));
    const detailLines=[];
    if(je){
      if(je.mistake)detailLines.push('<b>Mistake</b> '+dpEsc(je.mistake));
      if(je.emotion)detailLines.push('<b>Feeling</b> '+dpEsc(je.emotion));
      if(je.before)detailLines.push('<b>Before</b> '+dpEsc(je.before));
      if(je.after)detailLines.push('<b>After</b> '+dpEsc(je.after));
    }
    const detailHtml=detailLines.length?'<div class="dp-trade-detail">'+detailLines.map(l=>'<p>'+l+'</p>').join('')+'</div>':'<div class="dp-trade-detail dp-trade-detail-empty">No journal entry yet for this trade.</div>';
    return '<div class="dp-trade-wrap">'+
      '<button type="button" class="dp-trade" style="animation-delay:'+(ri*35)+'ms" data-i="'+x.i+'">'+
      '<span class="dp-t-time mono">'+tr.t.slice(0,5)+'</span>'+
      '<span class="dp-t-side '+(tr.side==='BUY'?'long':'short')+'">'+tr.side+'</span>'+
      '<span class="dp-t-ses">'+tr.ses+'</span>'+
      '<span class="dp-t-pnl mono" style="color:'+c+'">'+money(tr.pnl)+'</span>'+
      '<svg class="dp-t-arrow" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button>'+
      detailHtml+'</div>';
  }).join(''):'<div class="cal-empty">No individual trades logged for this day.</div>';
  document.body.classList.add('dp-open'); $('dayPanel').setAttribute('aria-hidden','false'); dpOpen=true;
}
function closeDayPanel(){document.body.classList.remove('dp-open');$('dayPanel').setAttribute('aria-hidden','true');dpOpen=false}
$('cGrid').addEventListener('click',e=>{const row=e.target.closest('.ldg-row[data-d]');if(!row)return;if(window.__openDayRecap){window.__openDayRecap(vy+'-'+String(vm+1).padStart(2,'0')+'-'+String(+row.dataset.d).padStart(2,'0'))}else{openDayPanel(+row.dataset.d)}});
function jumpToWeek(el){const sub=document.querySelector('#cGrid .ldg-sub[data-week="'+el.dataset.wk+'"]');if(!sub)return;sub.scrollIntoView({behavior:'smooth',block:'center'});sub.classList.add('flash');setTimeout(()=>sub.classList.remove('flash'),1400)}
$('cGrid').addEventListener('click',e=>{const wk=e.target.closest('.ldg-wk[data-wk]');if(wk)jumpToWeek(wk)});
$('cGrid').addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;const wk=e.target.closest('.ldg-wk[data-wk]');if(wk){e.preventDefault();jumpToWeek(wk)}});
$('dpClose').addEventListener('click',closeDayPanel);
$('dayPanelScrim').addEventListener('click',closeDayPanel);
$('dpList').addEventListener('click',e=>{
  const b=e.target.closest('.dp-trade');if(!b)return;
  const idx=+b.dataset.i;
  closeDayPanel();
  if(window.__route)window.__route('journal');
  try{history.replaceState(null,'','#journal')}catch(_){console.debug('[journall] ignored error in calendar-tab.js:', _);}
  if(window.__jPick)window.__jPick(idx);
});

// ---------- month detail slide-in panel ----------
let mpOpen=false;
function monthWeeksData(y,mIdx,mObj){
  const rows=monthDays(y,mIdx), dm=fill(y,mIdx), hasReal=Object.keys(dm).length>0, n=rows.length;
  if(hasReal){
    return rows.map((r,wi)=>{
      const ds=r.filter(d=>d!=null);
      const wt=ds.reduce((s,d)=>s+(dm[d]?dm[d].t:0),0), wp=ds.reduce((s,d)=>s+(dm[d]?dm[d].pnl:0),0);
      const first=ds[0], last=ds[ds.length-1];
      return {wi,trades:wt,net:wp,range:(first&&last)?MONTHS[mIdx].slice(0,3)+' '+first+'–'+last:''};
    });
  }
  // No real per-day data for this month: show empty weeks (the panel draws a dash) instead of made-up numbers.
  return rows.map((r,wi)=>{
    const ds=r.filter(d=>d!=null), first=ds[0], last=ds[ds.length-1];
    return {wi,trades:0,net:0,range:(first&&last)?MONTHS[mIdx].slice(0,3)+' '+first+'\u2013'+last:''};
  });
}
function gotoMonth(y,mIdx){vy=y;vm=mIdx;renderGrid();window.scrollTo({top:0,behavior:'smooth'})}
function gotoMonthWeek(y,mIdx,wi){
  vy=y;vm=mIdx;renderGrid();
  const el=document.querySelector('#cGrid .ldg-sub[data-week="'+wi+'"]');
  if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.classList.add('flash');setTimeout(()=>el.classList.remove('flash'),1400)}
  else window.scrollTo({top:0,behavior:'smooth'});
}
function openMonthPanel(y,mIdx){
  const yr=YEARS[y]; if(!yr)return;
  const m=yr.months.find(mm=>mm.i===mIdx); if(!m)return;
  const pf=m.gl?(m.gp/m.gl):(m.gp?Infinity:0);
  $('mpTitle').textContent=m.m+' '+y;
  $('mpPnl').innerHTML='<span style="color:'+(m.net<0?'var(--red)':'var(--green)')+'">'+money(m.net)+'</span>';
  $('mpStats').innerHTML=[['Trades',m.trades,'var(--text)'],['Win rate',m.trades?Math.round(m.w/m.trades*100)+'%':'\u2014','var(--text)'],
    ['Profit factor',pf===Infinity?'∞':pf.toFixed(2),pf<1?'var(--red)':'var(--green)'],['B/E',m.be,'var(--faint)']]
    .map(x=>'<div><span>'+x[0]+'</span><b style="color:'+x[2]+'">'+x[1]+'</b></div>').join('');
  $('mpViewFull').onclick=()=>{closeMonthPanel();gotoMonth(y,mIdx)};
  const weeks=monthWeeksData(y,mIdx,m);
  $('mpList').innerHTML=weeks.map((w,ri)=>{
    const c=w.net>0?'var(--green)':w.net<0?'var(--red)':'var(--faint)';
    return '<button type="button" class="dp-week" style="animation-delay:'+(ri*35)+'ms" data-wi="'+w.wi+'">'+
      '<span class="dp-w-label"><b>Week '+(w.wi+1)+'</b><small>'+w.range+'</small></span>'+
      '<span class="dp-w-meta">'+jlN(w.trades,'trade')+'</span>'+
      '<span class="dp-w-pnl mono" style="color:'+c+'">'+(w.trades?money(w.net):'—')+'</span>'+
      '<svg class="dp-t-arrow" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button>';
  }).join('');
  document.body.classList.add('mp-open'); $('monthPanel').setAttribute('aria-hidden','false'); mpOpen=true;
  $('monthPanel').dataset.y=y; $('monthPanel').dataset.m=mIdx;
}
function closeMonthPanel(){document.body.classList.remove('mp-open');$('monthPanel').setAttribute('aria-hidden','true');mpOpen=false}
$('mpClose').addEventListener('click',closeMonthPanel);
$('monthPanelScrim').addEventListener('click',closeMonthPanel);
$('mpList').addEventListener('click',e=>{
  const b=e.target.closest('.dp-week');if(!b)return;
  const y=+$('monthPanel').dataset.y, mIdx=+$('monthPanel').dataset.m, wi=+b.dataset.wi;
  closeMonthPanel();
  gotoMonthWeek(y,mIdx,wi);
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(mpOpen)closeMonthPanel();else if(dpOpen)closeDayPanel()}});
})();
