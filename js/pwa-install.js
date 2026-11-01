(function(){
  let deferredInstallPrompt = null;
  const installBtn = document.getElementById('androidInstallBtn');
  /* Register the offline app-shell worker (service-worker.js). Network-first for pages, so pushed updates show up on next open. */
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js').catch(() => {});
    });
  }
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    if (installBtn) installBtn.hidden = false;
  });
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredInstallPrompt) return;
      installBtn.hidden = true;
      deferredInstallPrompt.prompt();
      try { await deferredInstallPrompt.userChoice; } catch (_) {}
      deferredInstallPrompt = null;
    });
  }
  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    if (installBtn) installBtn.hidden = true;
  });
})();

window.currentUser = null;
window.splashHoldActive = true;
window.journalAlreadyOpened = false;

/* First login rule: if no account size is saved, open the design's Account Settings tab (and its setup panel) once.
   Waits for the first cloud snapshot (max 4 s) so a returning user on a new device is not sent to setup by mistake. */
window.jlAfterOpen = function(){
  if (window.__jlAfterOpenDone) return;
  window.__jlAfterOpenDone = true;
  const t0 = Date.now();
  (function wait(){
    if (window.__jlCloudSynced || Date.now() - t0 > 4000) {
      if (window.__jlNeedsAccountSetup) {
        const nav = document.querySelector('.nav[data-view="settings"]');
        if (nav) nav.click();
        const panel = document.getElementById('ggSetup');
        if (panel && !panel.classList.contains('open') && typeof window.ggToggleSetup === 'function') window.ggToggleSetup();
      }
      return;
    }
    setTimeout(wait, 200);
  })();
};

// Artificial delay of 1 second for the splash intro
setTimeout(function() {
  window.splashHoldActive = false;
  if (window.currentUser && window.setGateVisible && !window.journalAlreadyOpened) {
    window.journalAlreadyOpened = true;
    window.setGateVisible(false);
  }
}, 1000);

window.openSignedInJournal = function(message){
  window.setAuthStatus(message || 'Journal opened on this device.');
  const uName = typeof window.getActiveUserName === 'function' ? window.getActiveUserName() : 'trader';
  window.setAuthStatus(`Signed in as ${uName}`);
  if (window.splashHoldActive) return;   // the splash timer above opens it
  window.journalAlreadyOpened = true;
  window.setGateVisible(false);
};

window.setGateVisible = function(visible){
  const showGate = Boolean(visible);
  const authGate = document.getElementById('firebaseAuthGate');
  const authBar = document.getElementById('firebaseAuthBar');
  const app = document.getElementById('jlDesign');
  if(authGate){
    authGate.classList.toggle('show', showGate);
    authGate.hidden = !showGate;
    authGate.style.display = showGate ? 'grid' : 'none';
    authGate.setAttribute('aria-hidden', showGate ? 'false' : 'true');
  }
  if(authBar){
    authBar.hidden = !showGate;
    authBar.style.display = showGate ? 'flex' : 'none';
    authBar.setAttribute('aria-hidden', showGate ? 'false' : 'true');
  }
  if(app){
    app.hidden = showGate;
    app.setAttribute('aria-hidden', showGate ? 'true' : 'false');
  }
  document.documentElement.classList.toggle('firebase-auth-required', showGate);
  document.body.classList.toggle('firebase-auth-required', showGate);
  if(!showGate){
    if (typeof refreshSignedInProfile === 'function') setTimeout(refreshSignedInProfile, 0);
    if (typeof window.jlAfterOpen === 'function') window.jlAfterOpen();
  }
};

window.setAuthStatus = function(text){
  const authStatus = document.getElementById('firebaseAuthStatus');
  const gateMessage = document.getElementById('firebaseGateMessage');
  if(authStatus) authStatus.textContent = text;
  if(gateMessage) gateMessage.textContent = text;
};

window.setAuthLoading = function(loading){
  const isLoading = Boolean(loading);
  const authLoading = document.getElementById('firebaseAuthLoading');
  const signInCard = document.querySelector('.journall-signin-card');
  if(authLoading){
    authLoading.hidden = !isLoading;
    authLoading.style.display = isLoading ? 'flex' : 'none';
  }
  if(signInCard){
    signInCard.hidden = isLoading;
    signInCard.style.display = isLoading ? 'none' : 'grid';
  }
};

window.triggerJournalSignOut = function(){
  window.setGateVisible(true);
  window.setAuthLoading(true);
  window.setAuthStatus('Logging out securely...');
  window.currentUser = null;
  const btn = document.getElementById('firebaseSignOutBtn');
  if(btn) {
    try {
      btn.click();
      return; // Hand over to the async signout handler
    } catch(e) {}
  }
  setTimeout(() => { location.reload(); }, 500);
};
