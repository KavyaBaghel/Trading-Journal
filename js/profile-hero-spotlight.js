/* profile hero: cursor-following spotlight (sets --mx/--my, CSS does the rest) */
(function(){
if(!window.matchMedia||!matchMedia('(hover:hover)').matches)return;
let raf=0,hero=null,x=0,y=0;
document.addEventListener('pointermove',function(e){
  if(e.pointerType!=='mouse')return;
  const h=e.target.closest?e.target.closest('.up-hero'):null;
  if(!h)return;
  hero=h;const r=h.getBoundingClientRect();x=e.clientX-r.left;y=e.clientY-r.top;
  if(!raf)raf=requestAnimationFrame(function(){raf=0;hero.style.setProperty('--mx',x+'px');hero.style.setProperty('--my',y+'px')});
},{passive:true});
})();
