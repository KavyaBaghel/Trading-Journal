/* Journall: Firebase sign-in + cloud sync (ES module).
   Moved verbatim out of index.html; the only change is the firebase-config import path, now relative to js/.
   Runs after all classic scripts (module scripts are deferred). See docs/ARCHITECTURE.md. */
import { firebaseConfig, aiProxyConfig } from '../firebase-config.js?v=20260719-cloudflare-ai';

const authBar = document.getElementById('firebaseAuthBar');
const authGate = document.getElementById('firebaseAuthGate');
const journallApp = document.getElementById('journallApp');
const mobileAppbar = document.querySelector('.mobile-appbar');
const authStatus = document.getElementById('firebaseAuthStatus');
const gateMessage = document.getElementById('firebaseGateMessage');
const signInBtn = document.getElementById('firebaseSignInBtn');
const gateSignInBtn = document.getElementById('firebaseGateSignInBtn');
const authLoading = document.getElementById('firebaseAuthLoading');
const authLoadingText = document.getElementById('firebaseAuthLoadingText');
const authRetryBtn = document.getElementById('firebaseAuthRetryBtn');
const signInCard = document.querySelector('.journall-signin-card');
const signOutBtn = document.getElementById('firebaseSignOutBtn');
const hasFirebaseConfig = Boolean(firebaseConfig?.apiKey && firebaseConfig?.authDomain && firebaseConfig?.projectId);
const firebaseSdkVersion = '10.12.5';
const syncPrefixes = ['viz', 'viztrade', 'krishna', 'journall'];
const syncExactKeys = ['theme', 'selectedDate'];
let firestoreDb = null;
let cloudReady = false;
let syncTimer = null;
let unsubscribeCloudSync = null;
let cloudSaveInFlight = false;
let cloudSaveQueuedAgain = false;
window.journallGetFirebaseIdToken = async () => window.currentUser?.getIdToken ? window.currentUser.getIdToken() : null;
window.journallAiProxyUrl = aiProxyConfig?.url || '';
if(authRetryBtn) authRetryBtn.addEventListener('click', () => location.reload());

function shouldSyncKey(key){
  if (key === 'krishna_journal_form_draft' || key === 'krishna_psychology_form_draft') return false;
  return syncExactKeys.includes(key) || syncPrefixes.some(prefix=>key === prefix || key.startsWith(prefix));
}

function collectLocalState(){
  const storage = {};
  for(let i=0;i<localStorage.length;i++){
    const key = localStorage.key(i);
    if(key && shouldSyncKey(key)) storage[key] = localStorage.getItem(key);
  }
  return storage;
}

/* size in bytes of what the cloud save would hold (optionally with one key set to a new value) - used by the profile photo/banner to stay under Firestore's 1 MB document limit */
window.jlSyncedStateBytes = function(key, value){
  try{ const s = collectLocalState(); if(key) s[key] = value; return new Blob([JSON.stringify(s)]).size; }catch(err){ return Infinity; }
};

function parseSyncValue(value){
  if(typeof value !== 'string' || !value.trim()) return null;
  try{
    return JSON.parse(value);
  }catch{
    return null;
  }
}

function syncStorageValueKey(entry){
  if(!entry || typeof entry !== 'object') return '';
  return String(
    entry.tradeKey ||
    entry.id ||
    entry.updatedAt ||
    entry.createdAt ||
    [
      entry.date || '',
      entry.title || '',
      entry.body || ''
    ].join('|')
  ).trim();
}

function mergeJournalEntriesForSync(existingEntries, incomingEntries){
  const merged = new Map();
  (Array.isArray(existingEntries) ? existingEntries : []).forEach(entry => {
    const key = syncStorageValueKey(entry);
    if(!key) return;
    merged.set(key, {...entry});
  });
  (Array.isArray(incomingEntries) ? incomingEntries : []).forEach(entry => {
    const key = syncStorageValueKey(entry);
    if(!key) return;
    if(merged.has(key)){
      merged.set(key, {...merged.get(key), ...entry, id: merged.get(key).id ?? entry.id});
    } else {
      merged.set(key, {...entry});
    }
  });
  return [...merged.values()].sort((a,b) => {
    const aDate = String(a.date || a.updatedAt || a.createdAt || '');
    const bDate = String(b.date || b.updatedAt || b.createdAt || '');
    return aDate.localeCompare(bDate);
  });
}

function mergeImportedTrades(existingTrades, incomingTrades){
  /* Union by trade id (fallback key: date|time|symbol|side|entry|pnl). Never throws. Local/incoming wins field-by-field, but user journal fields already on the stored copy are kept. */
  const keyOf = t => {
    if(!t || typeof t !== 'object') return '';
    if(t.id != null && t.id !== '') return 'id:' + t.id;
    return 'k:' + [t.date, t.time, t.symbol, t.side, t.entry != null ? t.entry : t.openPrice, t.pnl].join('|');
  };
  const merged = new Map();
  (Array.isArray(existingTrades) ? existingTrades : []).forEach(t => { const k = keyOf(t); if(k) merged.set(k, t); });
  (Array.isArray(incomingTrades) ? incomingTrades : []).forEach(t => {
    const k = keyOf(t); if(!k) return;
    const prev = merged.get(k);
    if(!prev){ merged.set(k, t); return; }
    const out = {...prev, ...t};
    if(prev.notes && !t.notes) out.notes = prev.notes;
    if(Array.isArray(prev.mistakes) && prev.mistakes.length && !(Array.isArray(t.mistakes) && t.mistakes.length)) out.mistakes = prev.mistakes;
    if(prev.setup && !t.setup) out.setup = prev.setup;
    if(prev.journaled || t.journaled) out.journaled = true;
    merged.set(k, out);
  });
  return [...merged.values()].sort((a,b) => `${a.date || ''} ${a.time || ''}`.localeCompare(`${b.date || ''} ${b.time || ''}`));
}

const JOURNAL_TOMB_KEY = 'journall_deleted_journals';
const JOURNAL_LIST_KEY = 'krishna_journal_page_entries';
const TRADE_TOMB_KEY = 'journall_deleted_trades';

function mergeJournalTombstones(a, b){
  /* {journalId: {t: timestamp, d: 1 deleted | 0 restored}} - the newest decision per id wins */
  const out = {};
  [parseSyncValue(a), parseSyncValue(b)].forEach(obj => {
    if(!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
    Object.entries(obj).forEach(([id, v]) => {
      if(!v || typeof v !== 'object' || !Number.isFinite(Number(v.t))) return;
      const prevT = out[id];
      if(!prevT || Number(v.t) >= Number(prevT.t)) out[id] = {t: Number(v.t), d: v.d === 1 ? 1 : 0};
    });
  });
  return out;
}

function mergeSyncedStorageMaps(remoteStorage = {}, localStorageSnapshot = {}){
  const merged = {...remoteStorage};
  const tombs = mergeJournalTombstones(remoteStorage?.[JOURNAL_TOMB_KEY], localStorageSnapshot?.[JOURNAL_TOMB_KEY]);
  const tombsT = mergeJournalTombstones(remoteStorage?.[TRADE_TOMB_KEY], localStorageSnapshot?.[TRADE_TOMB_KEY]);
  const keys = new Set([...Object.keys(remoteStorage || {}), ...Object.keys(localStorageSnapshot || {})]);
  keys.forEach(key => {
    if(!shouldSyncKey(key)) return;
    if(key === JOURNAL_TOMB_KEY){
      if(Object.keys(tombs).length) merged[key] = JSON.stringify(tombs);
      return;
    }
    if(key === TRADE_TOMB_KEY){
      if(Object.keys(tombsT).length) merged[key] = JSON.stringify(tombsT);
      return;
    }
    const remoteVal = remoteStorage?.[key];
    const localVal = localStorageSnapshot?.[key];

    if(localVal == null || localVal === ''){
      if(remoteVal != null) merged[key] = remoteVal;
      return;
    }
    if(remoteVal == null || remoteVal === ''){
      merged[key] = localVal;
      return;
    }

    if(key === 'viztrade_trades' || key === 'viztrade_trading_page_trades'){
      const remoteArr = parseSyncValue(remoteVal);
      const localArr = parseSyncValue(localVal);
      if(Array.isArray(remoteArr) && Array.isArray(localArr)){
        merged[key] = JSON.stringify(mergeImportedTrades(remoteArr, localArr));
        return;
      }
    }

    if(key === 'krishna_journal_page_entries'){
      const remoteArr = parseSyncValue(remoteVal);
      const localArr = parseSyncValue(localVal);
      if(Array.isArray(remoteArr) && Array.isArray(localArr)){
        merged[key] = JSON.stringify(mergeJournalEntriesForSync(remoteArr, localArr));
        return;
      }
    }

    const remoteObj = parseSyncValue(remoteVal);
    const localObj = parseSyncValue(localVal);
    if(remoteObj && localObj && typeof remoteObj === 'object' && typeof localObj === 'object' && !Array.isArray(remoteObj) && !Array.isArray(localObj)){
      merged[key] = JSON.stringify({...remoteObj, ...localObj});
      return;
    }

    merged[key] = localVal;
  });
  /* drop Quick Log trades that were deleted on any device, whichever side still holds them (trade lists merge as a union, so without this a deleted trade comes back) */
  if(Object.keys(tombsT).length){
    ['viztrade_trades', 'viztrade_trading_page_trades'].forEach(k => {
      if(typeof merged[k] !== 'string') return;
      const l = parseSyncValue(merged[k]);
      if(!Array.isArray(l)) return;
      const kept = l.filter(t => !(t && t.id != null && tombsT[String(t.id)] && tombsT[String(t.id)].d === 1));
      if(kept.length !== l.length) merged[k] = JSON.stringify(kept);
    });
  }
  /* drop journals that were deleted on any device, whichever side still holds them */
  if(typeof merged[JOURNAL_LIST_KEY] === 'string'){
    let list = parseSyncValue(merged[JOURNAL_LIST_KEY]);
    if(Array.isArray(list) && typeof window.__jlUniqIds === 'function'){
      const uniq = window.__jlUniqIds(list);
      if(uniq !== list){ list = uniq; merged[JOURNAL_LIST_KEY] = JSON.stringify(list); }
    }
    if(Array.isArray(list)){
      const kept = list.filter(e => !(e && e.id != null && tombs[String(e.id)] && tombs[String(e.id)].d === 1));
      if(kept.length !== list.length) merged[JOURNAL_LIST_KEY] = JSON.stringify(kept);
    }
  }
  return merged;
}

function syncedStorageMapsEqual(a = {}, b = {}){
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  for(const key of keys){
    if(String(a?.[key] ?? '') !== String(b?.[key] ?? '')) return false;
  }
  return true;
}

window.journallReloadDataFromStorage = function() {
  /* Called after cloud sync changed local data. The new design reads its data once at load, so reload ONCE if the synced data
     differs from what this page rendered. Loop guard: at most one reload per 20 s per tab; if storage is unavailable, never reload. */
  try {
    if (typeof window.jlRefreshName === 'function') window.jlRefreshName();
    if (typeof window.jlDataSig !== 'function' || window.jlDataSig() === window.__jlSig) return;
    var now = Date.now(), last = Number(sessionStorage.getItem('jl_reload_at') || 0);
    if (now - last < 20000) { console.warn('[Journall] reload suppressed by loop guard'); return; }
    sessionStorage.setItem('jl_reload_at', String(now));
    location.reload();
  } catch (e) { console.error('[Journall] reload after sync failed', e); }
};

function applyCloudState(storage){
  if(!storage || typeof storage !== 'object'){
    return { changed: false, mergedStorage: collectLocalState() };
  }
  const localSnapshot = collectLocalState();
  const mergedStorage = mergeSyncedStorageMaps(storage, localSnapshot);
  let changed = false;
  window.__journallBlockCloudSave = true;
  try {
    Object.entries(mergedStorage).forEach(([key,value])=>{
      if(shouldSyncKey(key) && typeof value === 'string'){
        if(localStorage.getItem(key) !== value){
          localStorage.setItem(key, value);
          changed = true;
        }
      }
    });
  } finally {
    window.__journallBlockCloudSave = false;
  }
  return { changed, mergedStorage };
}

function hasMeaningfulLocalState(){
  return Object.keys(collectLocalState()).length > 0;
}

function patchLocalStorageForCloud(){
  if(window.__journallStoragePatched) return;
  window.__journallStoragePatched = true;
  const originalSetItem = localStorage.setItem.bind(localStorage);
  const originalRemoveItem = localStorage.removeItem.bind(localStorage);
  const originalClear = localStorage.clear.bind(localStorage);

  localStorage.setItem = (key,value)=>{
    originalSetItem(key,value);
    if(shouldSyncKey(String(key)) && !window.__journallBlockCloudSave) scheduleCloudSave();
  };
  localStorage.removeItem = key=>{
    originalRemoveItem(key);
    if(shouldSyncKey(String(key)) && !window.__journallBlockCloudSave) scheduleCloudSave();
  };
  localStorage.clear = ()=>{
    originalClear();
    scheduleCloudSave();
  };
}

function scheduleCloudSave(){
  if(!cloudReady || !window.currentUser || window.currentUser.uid === 'local_user' || !firestoreDb) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(saveCloudState, 900);
}

async function saveCloudState(){
  if(cloudSaveInFlight){
    cloudSaveQueuedAgain = true;
    return;
  }
  cloudSaveInFlight = true;
  try{
  if(!cloudReady || !window.currentUser || window.currentUser.uid === 'local_user' || !firestoreDb) return;
  const { doc, getDoc, setDoc, serverTimestamp } = await import(`https://www.gstatic.com/firebasejs/${firebaseSdkVersion}/firebase-firestore.js`);
  const ref = doc(firestoreDb, 'users', window.currentUser.uid, 'journallState', 'main');
  const snap = await getDoc(ref);
  // Always merge BOTH directions - never let one side's values replace the
  // other's. This protects trade lists when a fresh/empty device signs in:
  // mergeSyncedStorageMaps unions arrays by position id instead of picking
  // the last writer's copy.
  const mergedStorage = mergeSyncedStorageMaps(snap.exists() ? (snap.data()?.storage || {}) : {}, collectLocalState());
  const stamp = serverTimestamp();
  await setDoc(ref, {
    createdAt: snap.exists() ? (snap.data()?.createdAt || stamp) : stamp,
    updatedAt: stamp,
    storage: mergedStorage
  }, { merge: true });
  const uName = localStorage.getItem('journall_custom_username') || window.currentUser.displayName || window.currentUser.email || 'trader';
  setAuthStatus(`Signed in as ${uName} - synced`);
  } finally {
    cloudSaveInFlight = false;
    if(cloudSaveQueuedAgain){
      cloudSaveQueuedAgain = false;
      scheduleCloudSave();
    }
  }
}

window.checkAndPromptUsername = function checkAndPromptUsername(callback) {
  const savedUsername = localStorage.getItem('journall_custom_username') || localStorage.getItem('journall_onboarding_completed');
  if (savedUsername) {
    if (callback) callback();
    return;
  }

  const modal = document.createElement('div');
  modal.id = 'journallUsernamePromptModal';
  modal.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    background: rgba(0, 0, 0, 0.85) !important;
    backdrop-filter: blur(10px) !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    z-index: 99999 !important;
    animation: fadeIn 300ms ease !important;
  `;

  const card = document.createElement('div');
  card.style.cssText = `
    background: #16181a !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    border-radius: 20px !important;
    padding: 32px !important;
    width: 90% !important;
    max-width: 400px !important;
    box-shadow: 0 20px 40px rgba(0,0,0,0.5) !important;
    text-align: center !important;
    animation: scaleUp 300ms cubic-bezier(0.34, 1.56, 0.64, 1) !important;
  `;

  const title = document.createElement('h3');
  title.innerText = 'Welcome to Journall';
  title.style.cssText = `
    color: #fff !important;
    font-size: 22px !important;
    font-weight: 700 !important;
    margin: 0 0 8px 0 !important;
    font-family: var(--sans) !important;
  `;

  const desc = document.createElement('p');
  desc.innerText = 'Please choose a trading username for this account. You can work with this name across all your devices.';
  desc.style.cssText = `
    color: rgba(255, 255, 255, 0.6) !important;
    font-size: 13px !important;
    line-height: 1.5 !important;
    margin: 0 0 24px 0 !important;
    font-family: var(--sans) !important;
  `;

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Enter trading username...';
  input.value = window.currentUser?.displayName || '';
  input.style.cssText = `
    width: 100% !important;
    background: #101012 !important;
    border: 1px solid rgba(255, 255, 255, 0.12) !important;
    border-radius: 12px !important;
    padding: 12px 16px !important;
    color: #fff !important;
    font-size: 15px !important;
    text-align: center !important;
    margin-bottom: 20px !important;
    outline: none !important;
    transition: border-color 0.2s !important;
  `;

  const btn = document.createElement('button');
  btn.innerText = 'Save Username';
  btn.style.cssText = `
    width: 100% !important;
    background: #494fdf !important;
    border: none !important;
    border-radius: 12px !important;
    padding: 12px !important;
    color: #fff !important;
    font-size: 15px !important;
    font-weight: 600 !important;
    cursor: pointer !important;
    transition: opacity 0.2s !important;
  `;

  btn.addEventListener('click', () => {
    const val = input.value.trim();
    if (!val) {
      alert('Please enter a username.');
      return;
    }
    localStorage.setItem('journall_custom_username', val);
    localStorage.setItem('journall_user_name', val);
    if (window.currentUser?.email && window.currentUser.email !== 'local@journall.app') {
      localStorage.setItem('journall_user_email', window.currentUser.email.trim());
    }
    if (window.currentUser?.photoURL) {
      localStorage.setItem('journall_user_photo', window.currentUser.photoURL);
    }
    if (typeof renderUserProfile === 'function') renderUserProfile();
    if (typeof scheduleCloudSave === 'function') scheduleCloudSave();

    modal.style.opacity = '0';
    modal.style.transition = 'opacity 200ms ease';
    setTimeout(() => {
      modal.remove();
      if (window.currentUser) {
        setAuthStatus(`Signed in as ${val} - synced`);
      }
      if (callback) callback();
    }, 200);
  });

  card.appendChild(title);
  card.appendChild(desc);
  card.appendChild(input);
  card.appendChild(btn);
  modal.appendChild(card);
  document.body.appendChild(modal);
}

async function loadCloudState(){
  if(!window.currentUser || window.currentUser.uid === 'local_user' || !firestoreDb){
    cloudReady = true;
    return;
  }
  const { doc, getDoc, setDoc, onSnapshot, serverTimestamp } = await import(`https://www.gstatic.com/firebasejs/${firebaseSdkVersion}/firebase-firestore.js`);
  const ref = doc(firestoreDb, 'users', window.currentUser.uid, 'journallState', 'main');

  // Verify document existence initially, create if missing and local state exists
  const snap = await getDoc(ref);
  const remoteStorage = snap.exists() && snap.data()?.storage ? snap.data().storage : {};
  const localStorageSnapshot = collectLocalState();
  // Merge BOTH directions on sign-in so a fresh empty device inherits the
  // cloud copy and the cloud never loses trades held on the local device.
  const mergedStorage = mergeSyncedStorageMaps(remoteStorage, localStorageSnapshot);
  if(!syncedStorageMapsEqual(remoteStorage, mergedStorage) || (!snap.exists() && hasMeaningfulLocalState())){
    const stamp = serverTimestamp();
    await setDoc(ref, {
      createdAt: snap.exists() ? (snap.data()?.createdAt || stamp) : stamp,
      updatedAt: stamp,
      storage: mergedStorage
    }, { merge: true });
  }

  // Unsubscribe old listener if applicable
  if (typeof unsubscribeCloudSync === 'function') {
    try { unsubscribeCloudSync(); } catch(e) {}
  }

  // Connect real-time Firestore synchronization listener
  unsubscribeCloudSync = onSnapshot(ref, (docSnap) => {
    window.__jlCloudSynced = true;
    if (docSnap.exists() && docSnap.data()?.storage) {
      const { changed, mergedStorage: reconciledStorage } = applyCloudState(docSnap.data().storage);
      rememberFirebaseUserProfile(window.currentUser);
      renderUserProfile();
      if (!syncedStorageMapsEqual(docSnap.data().storage || {}, reconciledStorage) && hasMeaningfulLocalState()) {
        scheduleCloudSave();
      }
      if (changed && typeof window.journallReloadDataFromStorage === 'function') {
        window.journallReloadDataFromStorage();
        const uName = localStorage.getItem('journall_custom_username') || window.currentUser.displayName || window.currentUser.email || 'trader';
        setAuthStatus(`Signed in as ${uName} - synced`);
      }
    }
  }, (err) => {
    console.error("Firestore onSnapshot sync error:", err);
    window.__jlCloudSynced = true;
  });

  cloudReady = true;
  patchLocalStorageForCloud();

  const finalizeSignIn = () => {
    const uName = localStorage.getItem('journall_custom_username') || window.currentUser?.displayName || window.currentUser?.email || 'trader';
    if (window.splashHoldActive) {
      window.setAuthStatus(`Signed in as ${uName}`);
      if(typeof window.renderAll === 'function') window.renderAll();
      return;
    }
    window.journalAlreadyOpened = true;
    window.setGateVisible(false);
    window.setAuthStatus(`Signed in as ${uName}`);
    if(!window.__journallPostGateRenderDone){ window.__journallPostGateRenderDone = true; if(typeof window.renderAll === 'function') window.renderAll(); }
  };

  finalizeSignIn();
}

async function initFirebaseAuth(){
  window.setGateVisible(true);
  window.setAuthLoading(true);
  const initTimeout = setTimeout(()=>{
    window.setAuthLoading(false);
    window.setAuthStatus('Taking longer than usual - check your connection. Refresh to retry.');
  }, 20000);

  if(!hasFirebaseConfig){
    clearTimeout(initTimeout);
    setAuthLoading(false);
    setAuthStatus('Sign-in is temporarily unavailable. Please try again later.');
    console.error('Firebase config is missing or incomplete.');
    if(signInBtn) signInBtn.disabled = true;
    if(gateSignInBtn) gateSignInBtn.disabled = true;
    return;
  }

  console.time('journall:sdk-imports'); const appModulePromise = import(`https://www.gstatic.com/firebasejs/${firebaseSdkVersion}/firebase-app.js`);
  const authModulePromise = import(`https://www.gstatic.com/firebasejs/${firebaseSdkVersion}/firebase-auth.js`);
  const firestoreModulePromise = import(`https://www.gstatic.com/firebasejs/${firebaseSdkVersion}/firebase-firestore.js`); const [appModule, authModule, firestoreModule] = await Promise.all([appModulePromise, authModulePromise, firestoreModulePromise]); console.timeEnd('journall:sdk-imports'); console.time('journall:imports-to-authstate');
  const app = appModule.initializeApp(firebaseConfig);
  const auth = authModule.getAuth(app);
  firestoreDb = firestoreModule.getFirestore(app);
  const provider = new authModule.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try{
    await authModule.setPersistence(auth, authModule.browserLocalPersistence);
  }catch(error){
    console.warn('Firebase persistence setup failed:', error);
  }

  const isMobileAuthDevice = () => /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent);

  const handleAuthError = error => {
    const code = error?.code || '';
    if(code === 'auth/unauthorized-domain'){
      window.setAuthStatus(`Google sign-in blocked. Add ${location.hostname} in Firebase Authentication > Settings > Authorized domains.`);
      return;
    }
    if(code === 'auth/api-key-not-valid'){
      window.setAuthStatus('Firebase API key is not valid. Recheck firebase-config.js from Firebase Project settings > Web app.');
      return;
    }
    if(code === 'auth/configuration-not-found'){
      window.setAuthStatus('Firebase Authentication is not enabled yet. In Firebase, open Authentication > Sign-in method, enable Google, then add kavyabaghel.github.io in Authorized domains.');
      return;
    }
    window.setAuthStatus(`Sign-in failed: ${error?.message || error}`);
  };

  const handleAuthResult = result => {
    if(result?.user){
      window.currentUser = result.user;
      window.openSignedInJournal('Google sign-in complete. Opening your journal...');
    }
  };

  try{
    const redirectResult = await authModule.getRedirectResult(auth);
    if(redirectResult?.user) handleAuthResult(redirectResult);
  }catch(error){
    console.error('Redirect error:', error);
    handleAuthError(error);
  }

  // Google sign-in via Google Identity Services (token client) -> Firebase signInWithCredential.
  // This bypasses the firebaseapp.com auth handler, which fails on github.io with "missing initial state"
  // because browsers partition storage between the two origins.
  const GOOGLE_WEB_CLIENT_ID = '528928704139-vubuu87vqldno183c5ah3o5ubmlan8uq.apps.googleusercontent.com';
  const googleBtnDefault = document.getElementById('googleBtnContent')?.innerHTML || '';
  let gisPromise = null;
  const loadGis = () => {
    if(window.google?.accounts?.oauth2) return Promise.resolve();
    if(gisPromise) return gisPromise;
    gisPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => { gisPromise = null; reject(new Error('Google sign-in script failed to load')); };
      document.head.appendChild(s);
    });
    return gisPromise;
  };
  loadGis().catch(err => console.warn('Google Identity Services preload failed:', err));

  const requestGoogleAccessToken = () => new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_WEB_CLIENT_ID,
      scope: 'openid email profile',
      prompt: 'select_account',
      callback: resp => {
        if(resp?.error){
          reject(Object.assign(new Error(resp.error_description || resp.error), { gisCode: resp.error }));
        }else{
          resolve(resp.access_token);
        }
      },
      error_callback: err => reject(Object.assign(new Error(err?.message || err?.type || 'Google popup error'), { gisCode: err?.type || 'popup_error' }))
    });
    client.requestAccessToken();
  });

  const signIn = async () => {
    const btn = document.getElementById('firebaseGateSignInBtn');
    const content = document.getElementById('googleBtnContent');
    if(btn && content){
      btn.disabled = true;
      content.innerHTML = `<div class="spinner-mini" style="margin-right:10px;"></div><span>Signing in...</span>`;
    }
    window.setAuthStatus('Opening Google sign-in...');
    try{
      let gisReady = true;
      try{ await loadGis(); }catch(loadErr){ gisReady = false; console.warn(loadErr); }
      let result;
      if(gisReady){
        const accessToken = await requestGoogleAccessToken();
        const credential = authModule.GoogleAuthProvider.credential(null, accessToken);
        result = await authModule.signInWithCredential(auth, credential);
      }else{
        window.setAuthStatus('Google sign-in script is blocked. Trying the fallback sign-in...');
        result = await authModule.signInWithPopup(auth, provider);
      }
      handleAuthResult(result);
    }catch(error){
      if(btn) btn.disabled = false;
      if(content && googleBtnDefault) content.innerHTML = googleBtnDefault;
      const code = error?.code || error?.gisCode || '';
      if(code === 'popup_failed_to_open' || code === 'auth/popup-blocked'){
        window.setAuthStatus('Your browser blocked the Google sign-in popup. Allow popups for this site, then try again.');
        return;
      }
      if(code === 'popup_closed' || code === 'access_denied' || code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request'){
        window.setAuthStatus('Sign-in cancelled. Click Continue with Google to try again.');
        return;
      }
      console.error(error);
      handleAuthError(error);
    }
  };
  if(signInBtn) signInBtn.addEventListener('click', signIn);
  if(gateSignInBtn) gateSignInBtn.addEventListener('click', signIn);
  if(signOutBtn) {
    signOutBtn.addEventListener('click', async () => {
      // Show "Logging out..." spinner immediately
      window.setGateVisible(true);
      window.setAuthLoading(true);
      window.setAuthStatus('Logging out securely...');

      if (typeof unsubscribeCloudSync === 'function') {
        try { unsubscribeCloudSync(); } catch(e) {}
        unsubscribeCloudSync = null;
      }
      window.currentUser = null;
      try {
        await authModule.signOut(auth);
      } catch (err) {
        console.error('Firebase signOut error:', err);
      }

      sessionStorage.clear();
      localStorage.removeItem('journall_user_email');
      localStorage.removeItem('journall_google_email');
      localStorage.removeItem('journall_custom_username');
      localStorage.removeItem('journall_user_name');
      localStorage.removeItem('journall_user_custom_avatar');
      localStorage.removeItem('journall_active_uid');

      // Delay slightly for smooth transition, then reload
      setTimeout(() => {
        location.reload();
      }, 800);
    });
  }

  if(isMobileAuthDevice() && sessionStorage.getItem('journall:mobile-redirect-started')){
    setTimeout(()=>{
      if(auth.currentUser){
        window.currentUser = auth.currentUser;
        window.openSignedInJournal('Mobile sign-in complete. Opening your journal...');
      }else{
        window.setAuthStatus('If Google returned here but it is stuck, tap Open journal on this device.');
      }
    }, 2500);
  }

  authModule.onAuthStateChanged(auth, async user=>{ console.timeEnd('journall:imports-to-authstate'); console.time('journall:authstate-to-loaded');
    clearTimeout(initTimeout);
    window.currentUser = user;
    rememberFirebaseUserProfile(user);
    renderUserProfile();
    cloudReady = false;
    if(!user){
      window.setAuthLoading(false);
      // Clear the initial "Checking website sign-in..." placeholder once auth has resolved to signed-out
      const gateMsgEl = document.getElementById('firebaseGateMessage');
      if(gateMsgEl && /^Checking website sign-in/i.test(gateMsgEl.textContent || '')) window.setAuthStatus('');
      sessionStorage.removeItem('journall:cloud-loaded');
      window.setGateVisible(true);
      return;
    }
    window.openSignedInJournal('Signed in. Opening your journal...'); console.timeEnd('journall:authstate-to-loaded');
    try{
      await loadCloudState();
    }catch(err){
      console.error('Cloud load failed:', err);
      window.setGateVisible(false);
      window.setAuthStatus(`Signed in. Journal opened locally; cloud sync needs Firebase setup: ${err?.message || err}`);
    }
  });
}

initFirebaseAuth().catch(err=>{
  console.error('Firebase failed to start:', err);
  setGateVisible(true);
  setAuthLoading(false);
  setAuthStatus('Network error - try again.');
});
