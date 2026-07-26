const CACHE = 'F1-manager-3.5 -v36';

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
  '/F1-manager-3.5/js/immersion.js',
  '/F1-manager-3.5/js/feeder.js',
  '/F1-manager-3.5/css/immersive-theme.css',
  '/F1-manager-3.5/css/design-system.css',
  '/F1-manager-3.5/js/icons.js',
  '/F1-manager-3.5/preseason.html',
  '/F1-manager-3.5/team-intro.html',
  '/F1-manager-3.5/fp-live.html',
  '/F1-manager-3.5/sprint.html',
  '/F1-manager-3.5/academy.html',
];

function isMutableAsset(url) {
  return url.pathname.includes('/F1-manager-3.5/')
    && (/\.(js|html|css)$/.test(url.pathname));
}

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

// Fetch : réseau d'abord pour JS/HTML/CSS (mises à jour), cache pour le reste
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (!isMutableAsset(url)) {
    event.respondWith(
      caches.match(event.request)
        .then(cached => cached || fetch(event.request))
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
