(function(){
  if(document.getElementById('jlTop')) return;
  var b=document.createElement('button'); b.id='jlTop'; b.type='button'; b.title='Back to top'; b.tabIndex=-1;
  b.setAttribute('aria-label','Back to top');
  b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
  document.body.appendChild(b);
  var on=false, ticking=false;
  function update(){
    ticking=false;
    var y=window.scrollY||document.documentElement.scrollTop||0, want=y>500;
    if(want!==on){ on=want; b.classList.toggle('show',on); b.tabIndex=on?0:-1; }
  }
  window.addEventListener('scroll',function(){ if(!ticking){ ticking=true; requestAnimationFrame(update); } },{passive:true});
  b.addEventListener('click',function(){
    var rm=document.body.classList.contains('rm')||(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    window.scrollTo({top:0,behavior:rm?'auto':'smooth'});
  });
  update();
})();
