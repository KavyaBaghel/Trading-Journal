(function(){
  var lastToday=[];
  function host(){
    var h=document.getElementById('jlExtraRules'); if(h) return h;
    var a=document.getElementById('ruleAlert'); if(!a||!a.parentNode) return null;
    h=document.createElement('div'); h.id='jlExtraRules'; a.parentNode.insertBefore(h,a); return h;
  }
  function line(color,title,msg){
    var d=document.createElement('div');
    d.style.cssText='border:1px solid '+color+';border-radius:10px;padding:10px 12px;margin:0 0 10px;font-size:13px;line-height:1.4;background:rgba(255,255,255,.04)';
    var b=document.createElement('b'); b.style.color=color; b.textContent=title;
    var s=document.createElement('div'); s.style.opacity='.85'; s.textContent=msg;
    d.appendChild(b); d.appendChild(s); return d;
  }
  function lotBreaks(L){
    var g={}, order=[];
    lastToday.forEach(function(t){
      var lot=Number(t&&t.lot); if(!t||!(lot>0)) return;
      var k=t.d+'|'+t.t+'|'+t.sym+'|'+t.side;
      if(!g[k]){ g[k]={t:t.t,side:t.side,lot:0}; order.push(k); }
      g[k].lot+=lot;
    });
    var bad=[];
    order.forEach(function(k){ var tot=Math.round(g[k].lot*100)/100; if(tot!==L) bad.push({t:String(g[k].t).slice(0,5),side:g[k].side,lot:tot}); });
    return bad;
  }
  function paint(){
    var h=host(); if(!h) return;
    while(h.firstChild) h.removeChild(h.firstChild);
    var L=Math.round((Number(window.jlLotSize)||0)*100)/100;
    if(L>0){
      var bad=lotBreaks(L);
      if(bad.length){
        h.appendChild(line('var(--red)','Lot size rule broken',
          bad.length+' position'+(bad.length>1?'s':'')+' not at '+L.toFixed(2)+' lot: '+
          bad.slice(0,3).map(function(b){return b.t+' '+b.side+' '+b.lot.toFixed(2)}).join(', ')+(bad.length>3?' ...':'')));
      }
    }
    var nw=(typeof window.jlNewsWarning==='function')?window.jlNewsWarning():null;
    if(nw) h.appendChild(line('var(--amber)','No trading: news in '+nw.mins+' min',(nw.ccy?nw.ccy+' ':'')+nw.event+'. Stay out until it passes.'));
  }
  window.__jlExtraRules=function(rows){ if(rows) lastToday=rows; paint(); };
  setInterval(paint,30000); setTimeout(paint,2000);
})();
