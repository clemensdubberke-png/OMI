// Service Worker for Ameisen Simulator
// Enables offline functionality

const CACHE_PREFIX = 'ameisen-sim-';
const CACHE_NAME = CACHE_PREFIX + 'v3';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './game.js',
    './manifest.json',
    './assets/images/grass.png',
    './assets/images/ant_queen.png',
    './assets/icons/icon-192.png',
    './assets/icons/icon-512.png'
];

// Install: cache all core assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS_TO_CACHE).catch(err => {
                // Cache what we can, skip missing files
                console.warn('Some assets could not be cached:', err);
                return Promise.allSettled(
                    ASSETS_TO_CACHE.map(url =>
                        cache.add(url).catch(() => console.warn('Skip caching:', url))
                    )
                );
            });
        })
    );
    self.skipWaiting();
});

// Activate: clean up only OUR old caches (not other apps' caches)
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME)
                    .map(k => caches.delete(k))
            )
        )
    );
    self.clients.claim();
});

// Fetch: serve from OUR cache only, fall back to network
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.open(CACHE_NAME).then(cache =>
            cache.match(event.request).then(cached => {
                if (cached) return cached;
                return fetch(event.request).then(response => {
                    if (response.ok) {
                        cache.put(event.request, response.clone());
                    }
                    return response;
                }).catch(() => {
                    if (event.request.headers.get('accept').includes('text/html')) {
                        return cache.match('./index.html');
                    }
                });
            })
        )
    );
});
