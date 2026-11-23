(function(){const A=window.__A,m=v=>(v<0?'-$':'+$')+Math.abs(v).toFixed(2),set=(id,h)=>{const e=document.getElementById(id);if(e)e.textContent=h};
const rv=(window.__trades||[]).filter(t=>t.rev).length;
set('psyYr',A.n?jlN(A.n,'trade')+' logged, '+A.wr.toFixed(0)+'% win rate, '+jlN(rv,'revenge trade')+' flagged, '+A.mt+' tagged with a mistake.':'No trades logged in this dataset yet.');
set('psyMeta',A.n?jlN(A.n,'trade')+' tracked \u00b7 '+A.wr.toFixed(0)+'% win rate \u00b7 '+m(A.net)+' net':'No trades tracked');})();
