(function(){
  if(!window.matchMedia||!matchMedia('(hover:hover)').matches)return;
  var raf=0,el=null,x=0,y=0;
  document.addEventListener('pointermove',function(e){
    if(e.pointerType!=='mouse')return;
    var c=e.target.closest?e.target.closest('#view-profile .up-card'):null;
    if(!c)return;
    el=c;var r=c.getBoundingClientRect();x=e.clientX-r.left;y=e.clientY-r.top;
    if(!raf)raf=requestAnimationFrame(function(){raf=0;el.style.setProperty('--mx',x+'px');el.style.setProperty('--my',y+'px')});
  },{passive:true});
})();
