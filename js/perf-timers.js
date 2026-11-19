(function(){
/* Pause interval callbacks while the tab is hidden; run each skipped one once on return. */
var si=window.setInterval,ci=window.clearInterval,reg={},held={};
window.setInterval=function(fn,ms){
  if(typeof fn!=='function')return si.apply(window,arguments);
  var extra=Array.prototype.slice.call(arguments,2),id;
  id=si.call(window,function(){
    if(document.hidden){held[id]=1;return}
    fn.apply(window,extra)
  },ms);
  reg[id]={fn:fn,args:extra};
  return id
};
window.clearInterval=function(id){delete reg[id];delete held[id];return ci.call(window,id)};
document.addEventListener('visibilitychange',function(){
  if(document.hidden)return;
  var ids=Object.keys(held);held={};
  ids.forEach(function(id){var r=reg[id];if(r){try{r.fn.apply(window,r.args)}catch(e){console.debug('[journall] ignored error in perf-timers.js:', e);}}})
})
})();
