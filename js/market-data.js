/* Step 4: Market data comes from the Worker /market route. The Finnhub key lives only in the Worker (FINNHUB_KEY secret). */
(function(){
  window.jlMarketFetch=async function(o){
    /* On page load this can run before the Firebase module has set the backend URL / finished sign-in, so wait up to 12 s instead of failing at once. */
    var sleep=function(ms){return new Promise(function(r){setTimeout(r,ms)})},t0=Date.now(),ep='',tok=null;
    while(Date.now()-t0<12000){
      ep=String(window.journallAiProxyUrl||'').trim();
      if(ep&&window.journallGetFirebaseIdToken){ try{tok=await window.journallGetFirebaseIdToken()}catch(e){tok=null} if(tok)break; }
      await sleep(300);
    }
    if(!ep||ep.indexOf('YOUR_WORKERS_SUBDOMAIN')>=0)throw new Error('Market backend is not configured.');
    if(!tok)throw new Error('Sign in again to load market data.');
    var ac=new AbortController(),to=setTimeout(function(){ac.abort()},15000),r;
    try{r=await fetch(ep.replace(/\/+$/,'')+'/market',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+tok},body:JSON.stringify({from:o.from,to:o.to}),signal:ac.signal})}
    catch(e){throw new Error(e&&e.name==='AbortError'?'Market data timed out after 15 seconds.':'Could not reach the market backend.')}
    finally{clearTimeout(to)}
    var j=await r.json().catch(function(){return null});
    if(!r.ok)throw new Error((j&&j.error)||('Market backend returned '+r.status+'.'));
    if(j&&j.service&&!j.calendar)throw new Error('The Worker has no /market route yet. Deploy the updated Worker.');
    if(!j||!j.calendar||!j.news)throw new Error('Market backend returned an unreadable response.');
    return j;
  };
})();
