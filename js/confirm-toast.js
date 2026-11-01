/* shared confirm dialog + undo toast: window.jlConfirm(opts) -> Promise<boolean>, window.jlToast(opts) */
(function(){
const P={
  trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
  undo:'<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  check:'<path d="M5 12l5 5 9-10"/>',
  tag:'<path d="M3 12V4h8l10 10-8 8L3 12z"/><circle cx="7.5" cy="8.5" r="1"/>'
};
const svg=k=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+P[k]+'</svg>';
let closeOpen=null;

window.jlConfirm=function(o){
  o=o||{};
  if(closeOpen)closeOpen(false);
  return new Promise(function(resolve){
    const prev=o.opener||document.activeElement,uid='jlDlg'+Date.now();
    const scrim=document.createElement('div');scrim.className='jl-dlg-scrim';
    const box=document.createElement('div');box.className='jl-dlg';
    box.setAttribute('role','alertdialog');box.setAttribute('aria-modal','true');
    box.setAttribute('aria-labelledby',uid+'t');box.setAttribute('aria-describedby',uid+'d');
    const ic=document.createElement('div');ic.className='jl-dlg-ic'+(o.icon&&o.icon!=='trash'?' accent':'');ic.innerHTML=svg(o.icon||'trash');
    const h=document.createElement('h3');h.id=uid+'t';h.textContent=o.title||'Are you sure?';
    const p=document.createElement('p');p.id=uid+'d';p.textContent=o.body||'';
    box.append(ic,h,p);
    let inp=null;
    if(o.input){
      const max=o.input.maxLength||60;
      inp=document.createElement('input');inp.type='text';inp.className='jl-dlg-in';inp.maxLength=max;
      inp.autocomplete='off';inp.spellcheck=false;inp.placeholder=o.input.placeholder||'';inp.value=o.input.value||'';
      inp.setAttribute('aria-labelledby',uid+'t');
      const ct=document.createElement('div');ct.className='jl-dlg-ct mono';
      const upd=function(){ct.textContent=inp.value.length+'/'+max};upd();inp.addEventListener('input',upd);
      box.append(inp,ct);
    }
    if(o.preview){
      const pv=document.createElement('div');pv.className='jl-dlg-pv';
      if(o.preview.color)pv.style.setProperty('--c',o.preview.color);
      const l=document.createElement('div'),b=document.createElement('b'),s=document.createElement('span');
      b.textContent=o.preview.title||'';s.textContent=o.preview.sub||'';l.append(b,s);pv.append(l);
      if(o.preview.value){const v=document.createElement('em');v.className='mono';v.textContent=o.preview.value;pv.append(v)}
      box.append(pv);
    }
    const act=document.createElement('div');act.className='jl-dlg-act';
    const no=document.createElement('button');no.type='button';no.className='btn-ghost';no.textContent=o.cancelText||'Cancel';
    const yes=document.createElement('button');yes.type='button';yes.className='btn-primary jl-dlg-yes'+(o.danger?' danger':'');
    yes.textContent=o.confirmText||'Confirm';
    act.append(no,yes);box.append(act);scrim.append(box);document.body.append(scrim);
    let done=false;
    function finish(v){
      if(done)return;done=true;closeOpen=null;
      document.removeEventListener('keydown',onKey,true);
      scrim.classList.add('out');setTimeout(function(){scrim.remove()},170);
      try{if(prev&&prev.isConnected)prev.focus({preventScroll:true})}catch(_){}
      resolve(v===false&&inp?null:v);
    }
    function submit(){
      if(!inp){finish(true);return}
      const v=inp.value.trim();
      if(!v){inp.classList.remove('shake');void inp.offsetWidth;inp.classList.add('shake');inp.focus();return}
      finish(v);
    }
    function onKey(e){
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();finish(false);return}
      if(e.key==='Enter'&&inp&&document.activeElement===inp){e.preventDefault();submit();return}
      if(e.key==='Tab'){
        const f=inp?[inp,no,yes]:[no,yes],i=f.indexOf(document.activeElement);
        e.preventDefault();f[(i+(e.shiftKey?-1:1)+f.length)%f.length].focus();
      }
    }
    document.addEventListener('keydown',onKey,true);
    scrim.addEventListener('mousedown',function(e){if(e.target===scrim)finish(false)});
    no.addEventListener('click',function(){finish(false)});
    yes.addEventListener('click',submit);
    closeOpen=finish;
    (inp||no).focus({preventScroll:true});
  });
};

/* text prompt: resolves to the trimmed string, or null if cancelled */
window.jlPrompt=function(o){
  o=o||{};
  return window.jlConfirm(Object.assign({icon:'tag',confirmText:'Add',cancelText:'Cancel'},o,{input:o.input||{}}));
};

window.jlToast=function(o){
  o=o||{};
  let host=document.getElementById('jlToasts');
  if(!host){
    host=document.createElement('div');host.id='jlToasts';
    host.setAttribute('role','region');host.setAttribute('aria-label','Notifications');host.setAttribute('aria-live','polite');
    document.body.append(host);
  }
  const dur=o.duration||5000,icon=o.icon||'check';
  const t=document.createElement('div');t.className='jl-toast';t.setAttribute('role','status');
  t.style.setProperty('--c',icon==='trash'?'var(--red)':'var(--green)');
  const ic=document.createElement('span');ic.className='jl-toast-ic';ic.innerHTML=svg(icon);
  const tx=document.createElement('div');tx.className='jl-toast-tx';tx.textContent=o.text||'';
  if(o.sub){const s=document.createElement('small');s.textContent=o.sub;tx.append(s)}
  t.append(ic,tx);
  let btn=null;
  if(o.actionText){
    btn=document.createElement('button');btn.type='button';btn.className='jl-toast-act';
    btn.innerHTML=svg('undo')+'<span></span>';btn.lastChild.textContent=o.actionText;t.append(btn);
  }
  if(o.progress!==false){
    const bar=document.createElement('div');bar.className='jl-toast-bar';
    var fill=document.createElement('i');fill.style.setProperty('--d',dur+'ms');bar.append(fill);t.append(bar);
  }
  host.append(t);
  while(host.children.length>3)host.firstElementChild.remove();
  let left=dur,start=0,timer=null,gone=false;
  function dismiss(){if(gone)return;gone=true;clearTimeout(timer);t.classList.add('out');setTimeout(function(){t.remove()},210)}
  function arm(){start=Date.now();timer=setTimeout(dismiss,left)}
  function hold(){if(gone||!timer)return;clearTimeout(timer);timer=null;left-=Date.now()-start;if(fill)fill.style.animationPlayState='paused'}
  function release(){if(gone||timer)return;if(fill)fill.style.animationPlayState='running';arm()}
  t.addEventListener('pointerenter',function(e){if(e.pointerType==='mouse')hold()});
  t.addEventListener('pointerleave',function(e){if(e.pointerType==='mouse')release()});
  t.addEventListener('focusin',hold);t.addEventListener('focusout',release);
  if(btn)btn.addEventListener('click',function(){
    if(gone)return;dismiss();
    try{if(o.onAction)o.onAction()}catch(_){}
  });
  arm();
  return {dismiss:dismiss};
};
})();
