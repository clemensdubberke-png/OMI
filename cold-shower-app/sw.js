const CACHE_NAME = 'cold-shower-v31';
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
    './Folge dem Fluss deines atems ohne Pause dazwischen.mp3',
    './Gleichbleibender Strom.mp3',
    './Floating Breath.mp3',
    './Silent River Breath.mp3',
    './Silent River Mind.mp3',
    './Tiefer als die Welle.mp3',
    './Nebel über meinem Kopf Version 1.mp3',
    './Atem wie ein leiser Fluss.mp3',
    './Mystic Drums.mp3',
    './lass deine Gedanken los.mp3',
    './kehre zurück zu deinem Atem.mp3',
    './spüre deinen Atem.mp3',
    './Bleibe bei deinem Atem.mp3',
    './halte deinen Atem so lange wie möglich an.mp3',
    './wenn Hände und füße Kribbeln oder körpertemperatur ändert, ist das normal.mp3',
    './sei einfach in diesem Moment.mp3',
    './spüre deinen Herzschlag.mp3',
    './eine Minute.mp3',
    './zwei Minuten.mp3',
    './drei Minuten.mp3',
    './vier Minuten.mp3',
    './fünf Minuten.mp3',
    './Atem Trance .mp3',
    './Atme tief ein und halte deinen Atem an.mp3',
    './Ausatmen in 10 Sekunden.mp3',
    './Jetzt.mp3',
    './1.mp3',
    './2.mp3',
    './3.mp3',
    './4.mp3',
    './5.mp3'
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
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(response => {
                if (response && response.status === 200 && response.type === 'basic') {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            });
        })
    );
});
