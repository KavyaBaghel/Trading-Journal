/* App-level URLs that used to be hardcoded in feature scripts. Values are unchanged.
   The Cloudflare Worker URL lives in firebase-config.js (aiProxyConfig) and is not repeated here. */
(function () {
  window.JL_CONFIG = Object.freeze({
    /* local MT5 bridge started by local-server.ps1 (desktop launcher only) */
    localBridgeUrl: 'http://localhost:8787',
    /* public site, used for the "Open Journal" link */
    siteUrl: 'https://kavyabaghel.github.io/Trading-Journal'
  });
})();
