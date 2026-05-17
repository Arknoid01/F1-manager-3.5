const CACHE = 'f1manager-v22';

// Seulement les fichiers essentiels qui existent avec certitude
const ASSETS = [
  '/F1-manager-3.5/',
  '/F1-manager-3.5/index.html',
  '/F1-manager-3.5/manifest.json',
  '/F1-manager-3.5/icon-192.png',
  '/F1-manager-3.5/icon-512.png',
  '/F1-manager-3.5/js/data.js',
  '/F1-manager-3.5/js/save.js',
  '/F1-manager-3.5/js/career.js',
  '/F1-manager-3.5/js/engine.js',
  '/F1-manager-3.5/js/events.js',
  '/F1-manager-3.5/css/immersive-theme.css',
];

// Installation : on ignore les erreurs individuelles
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.allSettled(ASSETS.map(url => cache.add(url)))
    ).then(() => self.skipWaiting())
  );
});

// Activation : supprime les anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch : cache first, sinon réseau
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request))
  );
});
