/* ========================================
   Service Worker — Stark Bleiben PWA
   Offline-Caching für vollständige Nutzung
   ======================================== */

const CACHE_PREFIX = 'stark-bleiben-';
const CACHE_NAME = CACHE_PREFIX + 'v3';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Install: Alle Assets cachen
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: Nur EIGENE alte Caches entfernen (nicht die anderer Apps)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: Cache-first Strategie (nur EIGENEN Cache durchsuchen)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          cache.put(event.request, response.clone());
          return response;
        });
      }).catch(() => {
        if (event.request.destination === 'document') {
          return cache.match('./index.html');
        }
      })
    )
  );
});
