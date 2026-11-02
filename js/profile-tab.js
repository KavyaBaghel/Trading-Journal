(function(){
  const $ = id => document.getElementById(id);
  let mounted = false;

  function countUp(el, to, opts){
    opts = opts || {};
    const dur = 900, t0 = performance.now();
    function tick(t){
      const p = Math.min(1, (t-t0)/dur);
      const e = 1 - Math.pow(1-p, 3);
      const val = to*e;
      el.textContent = (opts.prefix||'') + (opts.decimals!=null ? Math.abs(val).toFixed(opts.decimals) : Math.round(val)) + (opts.suffix||'');
      if(p<1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ---------- real lifetime stats, computed from window.__trades ----------
  // Same "real data + real logic, no fake numbers" rule as every other rebuilt tab.
  // Revenge flags (t.rev) come from window.jlRecomputeRevenge, already run once the
  // trades array is set up near the top of the page — read here, not re-derived.
  function computeProfileStats(){
    const trades = window.__trades || [];
    const n = trades.length;
    let wins=0, losses=0, gp=0, gl=0, net=0;
    trades.forEach(t=>{
      net += t.pnl;
      if(t.pnl>0) gp+=t.pnl; else if(t.pnl<0) gl+=Math.abs(t.pnl);
      const k = window.jlKind(t.pnl); if(k==='win') wins++; else if(k==='loss') losses++;
    });
    const winRate = n ? (wins/n*100) : 0;
    const pf = gl>0 ? (gp/gl) : (gp>0 ? Infinity : 0);
    // Max drawdown from the real trade-by-trade equity path, oldest to newest.
    const sorted = trades.slice().sort((a,b)=> (a.d+a.t) < (b.d+b.t) ? -1 : 1);
    let eq=0, peak=0, maxDD=0;
    sorted.forEach(t=>{ eq+=t.pnl; if(eq>peak) peak=eq; const dd=peak-eq; if(dd>maxDD) maxDD=dd; });
    return {n, wins, losses, winRate, net, pf, maxDD};
  }

  function computeSessionRecord(){
    const trades = window.__trades || [];
    const bySession = {};
    trades.forEach(t=>{ bySession[t.ses] = (bySession[t.ses]||0) + t.pnl; });
    const entries = Object.entries(bySession).sort((a,b)=> b[1]-a[1]);
    return entries; // [[session, net], ...] best to worst, real sessions only
  }

  function renderSessionRecord(){
    const host = $('upSessRows'); if(!host) return;
    const entries = computeSessionRecord();
    if(!entries.length){ host.innerHTML = '<div class="up-sess"><span>Not tracked yet</span><b>—</b></div>'; return; }
    if(entries.length===1){
      const [ses,net] = entries[0];
      host.innerHTML = '<div class="up-sess"><span>Only session so far</span><b class="'+(net>=0?'pos':'neg')+'">'+ses+' · '+(net>=0?'+$':'−$')+Math.abs(net).toFixed(2)+'</b></div>';
      return;
    }
    const [bestSes,bestNet] = entries[0], [worstSes,worstNet] = entries[entries.length-1];
    host.innerHTML =
      '<div class="up-sess"><span>Best</span><b class="'+(bestNet>=0?'pos':'neg')+'">'+bestSes+' · '+(bestNet>=0?'+$':'−$')+Math.abs(bestNet).toFixed(2)+'</b></div>'+
      '<div class="up-sess"><span>Worst</span><b class="'+(worstNet>=0?'pos':'neg')+'">'+worstSes+' · '+(worstNet>=0?'+$':'−$')+Math.abs(worstNet).toFixed(2)+'</b></div>';
  }

  // Last 6 months that have trades (real months only, oldest to newest).
  function computeMonthlyTrend(){
    const trades = window.__trades || [], by = {}, MN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    trades.forEach(t=>{ if(!t || !t.d) return; const k = t.d.slice(0,7); by[k] = (by[k]||0) + t.pnl; });
    return Object.keys(by).sort().slice(-6).map(k=>({m:MN[parseInt(k.slice(5,7),10)-1], y:k.slice(0,4), net:by[k], has:true}));
  }

  function buildChart(){
    const host = $('upChart'); if(!host) return;
    const months = computeMonthlyTrend();
    const head = host.parentElement && host.parentElement.querySelector('.up-card-head');
    if(head){ const ys = [...new Set(months.map(m=>m.y))]; head.textContent = 'Monthly trend \u2014 ' + (ys.length===1 ? ys[0] : 'last '+months.length+' months'); }
    const max = Math.max(1, ...months.map(m=> m.has ? Math.abs(m.net) : 0));
    host.innerHTML = months.map(m=>{
      if(!m.has) return '<div class="up-chart-col" style="opacity:.4"><div class="up-chart-bar" data-target="4" style="background:rgba(255,255,255,.14)"></div><span class="n">No trades</span><span class="m">'+m.m+'</span></div>';
      const pct = Math.round(Math.abs(m.net)/max*100);
      const bg = m.net>=0 ? 'linear-gradient(180deg,#7fe0a8,var(--green))' : 'linear-gradient(180deg,#e8888c,var(--red))';
      return '<div class="up-chart-col"><div class="up-chart-bar" data-target="'+pct+'" style="background:'+bg+'"></div><span class="n">'+(m.net>=0?'+$':'−$')+Math.abs(m.net).toFixed(2)+'</span><span class="m">'+m.m+'</span></div>';
    }).join('');
    requestAnimationFrame(()=>{
      host.querySelectorAll('.up-chart-bar').forEach(b=> b.style.height = b.dataset.target+'%');
    });
    return months;
  }

  // Consecutive-day journal streak from real journal entries (window.__getJournals),
  // ending on the most recent journaled date — not today's date, so a stale streak
  // doesn't silently keep counting.
  function computeJournalStreak(){
    const journals = window.__getJournals ? (window.__getJournals()||[]) : [];
    const dates = [...new Set(journals.map(e=>e.date).filter(Boolean))].sort();
    if(!dates.length) return {streak:0, entries:0};
    let streak=1, best=1;
    for(let i=1;i<dates.length;i++){
      const prev = new Date(dates[i-1]+'T00:00:00'), cur = new Date(dates[i]+'T00:00:00');
      const gap = Math.round((cur-prev)/86400000);
      if(gap===1) streak++; else streak=1;
      if(streak>best) best=streak;
    }
    return {streak:best, entries:dates.length};
  }

  // Distinct trading days (from window.__trades) since the last day that had a
  // revenge-flagged trade — trading days, not calendar days, since that's the unit
  // the rest of the app already uses for activity.
  function computeRevengeFreeStreak(){
    const trades = (window.__trades||[]);
    const tradingDays = [...new Set(trades.map(t=>t.d))].sort();
    if(!tradingDays.length) return {days:0, hasRevenge:false};
    const revengeDays = new Set(trades.filter(t=>t.rev).map(t=>t.d));
    let lastRevengeIdx = -1;
    tradingDays.forEach((d,i)=>{ if(revengeDays.has(d)) lastRevengeIdx = i; });
    const days = lastRevengeIdx===-1 ? tradingDays.length : (tradingDays.length-1-lastRevengeIdx);
    return {days: Math.max(0,days), hasRevenge: lastRevengeIdx!==-1};
  }

  const UP_ICO={lock:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',ok:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>'};

  function renderBadges(months){
    const stats = computeProfileStats();

    // 700+ trades logged
    const tradesTarget = 700;
    const tOn = stats.n >= tradesTarget;
    $('upBadgeTrades').classList.toggle('on', tOn);
    $('upBadgeTradesIcon').innerHTML = tOn ? UP_ICO.ok : UP_ICO.lock;
    $('upBadgeTradesSub').textContent = tOn ? 'Consistency milestone, unlocked' : (stats.n+' / '+tradesTarget+' trades logged');

    // 30-day journal streak
    const js = computeJournalStreak();
    const jTarget = 30, jOn = js.streak >= jTarget;
    $('upBadgeStreak').classList.toggle('on', jOn);
    $('upBadgeStreakIcon').innerHTML = jOn ? UP_ICO.ok : UP_ICO.lock;
    $('upBadgeStreakSub').textContent = js.entries===0 ? 'No journal entries yet' : (js.streak+' / '+jTarget+' days');
    const streakBar = document.querySelector('#upBadgeStreak .up-badge-bar i');
    if(streakBar){ streakBar.dataset.target = String(Math.min(100, Math.round(js.streak/jTarget*100))); requestAnimationFrame(()=> streakBar.style.width = streakBar.dataset.target+'%'); }

    // First green month
    const tracked = months.filter(m=>m.has);
    const green = tracked.find(m=>m.net>0);
    const gOn = !!green;
    $('upBadgeGreenMonth').classList.toggle('on', gOn);
    $('upBadgeGreenMonthIcon').innerHTML = gOn ? UP_ICO.ok : UP_ICO.lock;
    if(gOn){
      $('upBadgeGreenMonthSub').textContent = 'Unlocked — '+green.m+', +$'+green.net.toFixed(2);
    } else if(tracked.length){
      const best = tracked.slice().sort((a,b)=>b.net-a.net)[0];
      $('upBadgeGreenMonthSub').textContent = 'Not yet — best so far: '+best.m+', '+(best.net>=0?'+$':'−$')+Math.abs(best.net).toFixed(2);
    } else {
      $('upBadgeGreenMonthSub').textContent = 'Not tracked yet';
    }

    // Zero revenge trades, 7 (trading) days
    const rv = computeRevengeFreeStreak();
    const rTarget = 7;
    $('upBadgeRevenge').classList.toggle('on', rv.days>=rTarget);
    $('upBadgeRevengeIcon').innerHTML = rv.days>=rTarget ? UP_ICO.ok : UP_ICO.lock;
    if(rv.days===0 && !rv.hasRevenge){
      $('upBadgeRevengeSub').textContent = 'Not tracked yet';
    } else if(!rv.hasRevenge){
      $('upBadgeRevengeSub').textContent = rv.days+' / '+rTarget+' trading days tracked, no revenge trades yet';
    } else {
      $('upBadgeRevengeSub').textContent = rv.days+' / '+rTarget+' trading days since last revenge trade';
    }
  }

  // ---------- one profile name, read by every page header ----------
  const loadName = ()=> (window.jlResolveUserName ? window.jlResolveUserName() : 'Trader');
  const applyName = (name)=>{
    document.querySelectorAll('[data-user-name]').forEach(el=>{ if(el !== document.activeElement) el.textContent = name; });
    const av = $('upAvatar'); if(av && !av.style.backgroundImage) av.textContent = (name.trim().charAt(0) || '?').toUpperCase();
  };
  window.jlUserName = loadName;
  window.jlRefreshName = ()=>{ applyName(loadName()); if(window.jlPaintProfileImgs) window.jlPaintProfileImgs(); };
  applyName(loadName());

  // ---------- profile photo / banner: shrink, show, keep, and sync across devices ----------
  // Stored under journall_* keys so the existing cloud sync carries them. Images are shrunk hard, and if the
  // synced data would get too close to Firestore's 1 MB document limit they stay on this device instead.
  const SYNC_KEY = {avatar:JL_KEYS.keys.JOURNALL_PROFILE_AVATAR_IMG, cover:JL_KEYS.keys.JOURNALL_PROFILE_COVER_IMG};
  const DEV_KEY = {avatar:JL_KEYS.keys.JLIMG_PROFILE_AVATAR_DEV, cover:JL_KEYS.keys.JLIMG_PROFILE_COVER_DEV};
  const LEGACY_KEY = {avatar:JL_KEYS.keys.JLIMG_PROFILE_AVATAR_V1, cover:JL_KEYS.keys.JLIMG_PROFILE_COVER_V1};
  const SYNC_BUDGET = 800000;
  const IMG_OK = /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+\/=]+$/;
  const storedImg = (kind)=>{
    try{ for(const k of [DEV_KEY[kind], SYNC_KEY[kind], LEGACY_KEY[kind]]){ const u = localStorage.getItem(k); if(u && IMG_OK.test(u)) return u; } }catch(err){console.debug('[journall] ignored error in profile-tab.js:', err);}
    return '';
  };
  const paintProfileImg = (kind, url)=>{
    if(kind==='avatar' && url){
      document.querySelectorAll('.who .dot').forEach(d=>{
        d.style.backgroundImage = 'url("' + url + '")';
        d.style.backgroundSize = 'cover';
        d.style.backgroundPosition = 'center';
        d.style.backgroundRepeat = 'no-repeat';
      });
    }
    const el = document.querySelector(kind==='avatar' ? '.up-avatar' : '.up-cover');
    if(!el || !url || el.__jlImg === url) return;
    el.__jlImg = url;
    el.style.backgroundImage = 'url("' + url + '")';
    el.style.backgroundSize = 'cover';
    el.style.backgroundPosition = 'center';
    el.style.backgroundRepeat = 'no-repeat';
    if(kind==='avatar') el.textContent = '';
  };
  window.jlPaintProfileImgs = ()=>{ ['avatar','cover'].forEach(k=>{ const u = storedImg(k); if(u) paintProfileImg(k, u); }); };
  const loadImg = (src)=> new Promise((res, rej)=>{
    const img = new Image();
    img.onload = ()=>res(img);
    img.onerror = ()=>rej(new Error('decode'));
    img.src = src;
  });
  const encodeImg = (img, kind)=>{
    const maxSide = kind==='avatar' ? 320 : 1100, cap = kind==='avatar' ? 45000 : 130000;
    const tries = [[1,0.85],[1,0.7],[0.8,0.65],[0.65,0.6],[0.5,0.55]];
    let out = '';
    for(const [sc, q] of tries){
      const k = Math.min(1, maxSide * sc / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * k)), h = Math.max(1, Math.round(img.naturalHeight * k));
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d'); g.fillStyle = '#0b0b12'; g.fillRect(0, 0, w, h); g.drawImage(img, 0, 0, w, h);
      out = c.toDataURL('image/jpeg', q);
      if(out.length <= cap) break;
    }
    return out;
  };
  // returns 'cloud' (syncs to other devices), 'device' (this browser only) or 'none'
  const commitImg = (kind, url)=>{
    let where = 'none';
    const bytes = window.jlSyncedStateBytes ? window.jlSyncedStateBytes(SYNC_KEY[kind], url) : Infinity;
    if(bytes <= SYNC_BUDGET){
      try{ localStorage.setItem(SYNC_KEY[kind], url); localStorage.removeItem(DEV_KEY[kind]); where = 'cloud'; }catch(err){console.debug('[journall] ignored error in profile-tab.js:', err);}
    }
    if(where === 'none'){
      try{ localStorage.setItem(DEV_KEY[kind], url); where = 'device'; }catch(err){console.debug('[journall] ignored error in profile-tab.js:', err);}
    }
    paintProfileImg(kind, url);
    return where;
  };
  window.jlProfileImgFromFile = (file, kind)=>{
    const toast = (o)=>{ try{ if(window.jlToast) window.jlToast(o); }catch(err){console.debug('[journall] ignored error in profile-tab.js:', err);} };
    const u = URL.createObjectURL(file);
    return loadImg(u).then(img=>{
      const where = commitImg(kind, encodeImg(img, kind));
      const what = kind==='avatar' ? 'Profile photo updated' : 'Banner updated';
      if(where === 'cloud') toast({text: what, sub: 'Synced to your other devices.', duration: 3500});
      else if(where === 'device') toast({text: what, sub: 'Saved on this device only, cloud storage is nearly full.', duration: 5000});
      else toast({text: 'Shown for now, but not saved', sub: 'Browser storage is full on this device.', icon: 'trash', duration: 5000});
    }).catch(()=>{
      toast({text: 'Could not use that image', sub: 'Try a JPG or PNG file.', icon: 'trash', duration: 4000});
    }).finally(()=>URL.revokeObjectURL(u));
  };
  window.jlPaintProfileImgs();
  // one-time upgrade of images saved by the earlier device-only version: shrink them and move them to the synced key
  const migrateLegacyImgs = ()=>{
    ['avatar','cover'].forEach(kind=>{
      try{
        const old = localStorage.getItem(LEGACY_KEY[kind]);
        if(!old) return;
        if(localStorage.getItem(SYNC_KEY[kind]) || localStorage.getItem(DEV_KEY[kind]) || !IMG_OK.test(old)){ localStorage.removeItem(LEGACY_KEY[kind]); return; }
        loadImg(old).then(img=>{
          if(commitImg(kind, encodeImg(img, kind)) !== 'none') localStorage.removeItem(LEGACY_KEY[kind]);
        }).catch(()=>{});
      }catch(err){console.debug('[journall] ignored error in profile-tab.js:', err);}
    });
  };
  if(document.readyState === 'complete') setTimeout(migrateLegacyImgs, 0);
  else window.addEventListener('load', ()=>setTimeout(migrateLegacyImgs, 0));

  const nameEl = $('upName');
  if(nameEl){
    nameEl.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); nameEl.blur(); } });
    nameEl.addEventListener('input', ()=>{ const t = nameEl.textContent.replace(/\s+/g,' ').slice(0,40); const live = t.trim(); if(live) applyName(live); });
    nameEl.addEventListener('blur', ()=>{
      const v = nameEl.textContent.replace(/\s+/g,' ').trim().slice(0,40) || loadName();
      try{ if(window.jlSaveUserName) window.jlSaveUserName(v); }catch(e){console.debug('[journall] ignored error in profile-tab.js:', e);}
      nameEl.textContent = v; applyName(v);
    });
  }


  function mount(){
    if(mounted) return; mounted = true;

    const dEl = $('dateStrU');
    if(dEl) dEl.textContent = new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});

    const stats = computeProfileStats();
    countUp($('upN1'), stats.n);
    countUp($('upN2'), stats.winRate, {suffix:'%'});
    countUp($('upN3'), Math.abs(stats.net), {prefix: stats.net>=0?'+$':'−$', decimals:2});
    $('upN3').closest('.up-stat').classList.toggle('neg', stats.net<0);
    countUp($('upN4'), stats.pf===Infinity ? 0 : stats.pf, {decimals:2});
    countUp($('upN5'), stats.maxDD, {prefix:'−$', decimals:2});

    renderSessionRecord();
    const months = buildChart();
    renderBadges(months);

    const js = computeJournalStreak();
    const streakChip = $('upJournalStreakChip');
    if(streakChip) streakChip.textContent = js.entries===0 ? 'No journal entries yet' : (js.streak+'-day journal streak');

    // ---------- editable bio (click straight into the text) ----------
    const bio = $('upBio');
    if(bio){
      bio.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); bio.blur(); } });
    }

    // ---------- profile photo / banner settings menu ----------
    const settingsBtn = $('upSettingsBtn'), settingsMenu = $('upSettingsMenu');
    const avatarInput = $('upAvatarInput'), coverInput = $('upCoverInput');
    if(settingsBtn && settingsMenu){
      const closeMenu = ()=>{ settingsMenu.classList.remove('open'); settingsBtn.setAttribute('aria-expanded','false'); };
      settingsBtn.addEventListener('click', e=>{
        e.stopPropagation();
        const open = settingsMenu.classList.toggle('open');
        settingsBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      settingsMenu.addEventListener('click', e=> e.stopPropagation());
      document.addEventListener('click', closeMenu);
      document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeMenu(); });

      const readAsImage = (input, kind)=>{
        input.addEventListener('change', e=>{
          const file = e.target.files && e.target.files[0];
          input.value = '';
          if(file) window.jlProfileImgFromFile(file, kind);
        });
      };

      settingsMenu.querySelector('[data-act="avatar"]').addEventListener('click', ()=>{ closeMenu(); avatarInput.click(); });
      settingsMenu.querySelector('[data-act="cover"]').addEventListener('click', ()=>{ closeMenu(); coverInput.click(); });

      readAsImage(avatarInput, 'avatar');
      readAsImage(coverInput, 'cover');
    }

    // ---------- trading identity tags ----------
    const tagsHost = $('upTags'), tagAdd = $('upTagAdd');
    if(tagsHost && tagAdd){
      tagsHost.addEventListener('click', e=>{
        const tag = e.target.closest('.up-tag'); if(!tag || tag === tagAdd) return;
        tag.classList.add('removing');
        setTimeout(()=> tag.remove(), 200);
      });
      tagAdd.addEventListener('click', ()=>{
        window.jlPrompt({title:'Add a trading tag',body:'A short label for a setup, rule or style. It shows on your profile.',
          input:{placeholder:'e.g. London breakout',maxLength:40},confirmText:'Add tag',opener:tagAdd}).then(label=>{
          if(!label) return;
          const span = document.createElement('span');
          span.className = 'up-tag'; span.textContent = label.trim().slice(0,40);
          tagsHost.insertBefore(span, tagAdd);
        });
      });
    }

    // ---------- preference switches ----------
    document.querySelectorAll('.up-switch').forEach(sw=>{
      const pk = sw.dataset.k, saved = (pk==='reminders'||pk==='risk');
      if(saved && window.jlPref) sw.classList.toggle('on', window.jlPref(pk, true));
      sw.addEventListener('click', ()=>{
        sw.classList.toggle('on');
        if(saved && window.jlSetPref) window.jlSetPref(pk, sw.classList.contains('on'));
        if(sw.dataset.k === 'motion') document.body.classList.toggle('rm', sw.classList.contains('on'));
      });
    });
  }

  // ---- live profile: no hardcoded identity or risk numbers ----
  (function(){
    const PK=JL_KEYS.keys.JOURNALL_PROFILE_V1, CK=JL_KEYS.keys.JOURNALL_ACCOUNT_CONFIG_V1;
    const rd=()=>{try{const v=JSON.parse(localStorage.getItem(PK)||'{}');return v&&typeof v==='object'?v:{}}catch(e){return {}}};
    const wr=o=>{try{localStorage.setItem(PK,JSON.stringify(o))}catch(e){console.debug('[journall] ignored error in profile-tab.js:', e);}};
    const st=document.createElement('style'); st.textContent='.up-bio:empty::before{content:attr(data-ph);color:var(--faint)}'; document.head.appendChild(st);
    const bio=$('upBio'), host=$('upTags'), add=$('upTagAdd'), saved=rd();
    if(bio){ bio.dataset.ph='Add a short bio'; bio.textContent=saved.bio||'';
      bio.addEventListener('blur',()=>{const o=rd(); o.bio=bio.textContent.replace(/\s+/g,' ').trim().slice(0,200); bio.textContent=o.bio; wr(o);}); }
    if(host&&add){
      (Array.isArray(saved.tags)?saved.tags:[]).forEach(t=>{const s=document.createElement('span'); s.className='up-tag'; s.textContent=String(t).slice(0,40); host.insertBefore(s,add);});
      new MutationObserver(()=>{const o=rd(); o.tags=[...host.querySelectorAll('.up-tag:not(.add):not(.removing)')].map(x=>x.textContent); wr(o);}).observe(host,{childList:true});
    }
    const cfgUSD=(c,k)=>{const v=Number(c&&c[k]); if(!(v>0)) return 0; return (c[k+'Type']==='percent') ? (Number(c.accountSize)>0 ? Number(c.accountSize)*v/100 : 0) : v;};
    const cfg=()=>{try{return JSON.parse(localStorage.getItem(CK)||'null')}catch(e){return null}};
    function refreshProfile(){
      const c=cfg(), ok=!!c && !window.__jlNeedsAccountSetup, set=(id,v)=>{const el=$(id); if(el) el.textContent=v;};
      const loss=ok?cfgUSD(c,'maxDailyLoss'):0, tr=ok?Number(c.maxTradesPerDay):0, rr=ok?Number(c.minRr):0;
      set('upRiskLoss', loss>0?'$'+loss.toFixed(2):'Not set');
      set('upRiskTrades', tr>0?String(tr):'Not set');
      set('upRiskRR', rr>0?rr+':1':'Not set');
      const chip=$('upMemberChip'), ds=(window.__trades||[]).map(t=>t.d).filter(Boolean).sort();
      if(chip){ if(ds.length){ chip.textContent='\uD83D\uDCC5 First trade '+new Date(ds[0]+'T00:00:00').toLocaleDateString('en-US',{month:'short',year:'numeric'}); chip.hidden=false; } else chip.hidden=true; }
    }
    function prefillPlanner(){
      const c=cfg(); if(!c||window.__jlNeedsAccountSetup) return;
      [['lmLim',cfgUSD(c,'maxDailyLoss')],['lmTgt',cfgUSD(c,'profitTarget')]].forEach(([id,v])=>{const el=$(id); if(el&&el.value===''&&v>0){ el.value=String(+v.toFixed(2)); el.dispatchEvent(new Event('input',{bubbles:true})); }});
    }
    window.jlRefreshProfile=refreshProfile;
    document.addEventListener('click',e=>{ if(e.target.closest&&e.target.closest('.nav[data-view="profile"]')) setTimeout(refreshProfile,0); });
    const go=()=>{refreshProfile(); prefillPlanner();};
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',go); else go();
  })();

  window.__mountUserProfile = mount;
})();
