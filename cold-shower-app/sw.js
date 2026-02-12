const CACHE_NAME = 'cold-shower-v19';
const ASSETS = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './manifest.json',
    './kaelte.jpg',
    './geist.jpg',
    './atem.jpg',
    './eisdusche.jpg',
    './eisbaden.jpg',
    './gesicht.jpg',
    './hand.jpg',
    './fuss.jpg',
    './meditation.jpg',
    './meditations-atmung.jpg',
    './liegestuetze.jpg',
    './Klick.mp3',
    './Gong.mp3',
    './Einatmung.mp3',
    './Ausatmung.mp3',
    './atme ein.mp3',
    './ausatmen.mp3',
    './Einatmen.mp3',
    './ein.mp3',
    './aus.mp3',
    './und aus.mp3',
    './Folge dem Fluss deines atems ohne Widerstand.mp3',
    './Gleichbleibender Strom.mp3',
    './Floating Breath.mp3',
    './Silent River Breath.mp3',
    './Silent River Mind.mp3',
    './Tiefer als die Welle.mp3',
    './Nebel über meinem Kopf Version 1.mp3',
    './Atem wie ein leiser Fluss.mp3',
    './Mystic Drums.mp3'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});
