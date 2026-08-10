const CACHE_NAME = 'journall-android-pwa-v146';
const APP_SHELL = [
  './manifest.webmanifest',
  './assets/icon-192.png',
  './assets/icon-512.png'
];
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
  // Never serve a stale index.html: the main page is fetched fresh every
  // time so code updates are never blocked by the service worker cache.
  const url = event.request.url.split('?')[0].split('#')[0];
  const isIndexHtml = url.endsWith('/index.html') ||
    url.endsWith('/Trading-Journal/') || url.endsWith('/Trading-Journal');
  if (isIndexHtml) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(response => {
          if (response && response.status === 200) {
            const c = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, c));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }
});
