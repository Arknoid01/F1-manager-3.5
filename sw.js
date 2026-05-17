const CACHE = 'f1manager-v20';

const ASSETS = [
  '/F1-manager-3.5/',
  '/F1-manager-3.5/index.html',
  '/F1-manager-3.5/race.html',
  '/F1-manager-3.5/weekend.html',
  '/F1-manager-3.5/fp-briefing.html',
  '/F1-manager-3.5/quali-briefing.html',
  '/F1-manager-3.5/race-briefing.html',
  '/F1-manager-3.5/immersion.html',
  '/F1-manager-3.5/podium.html',
  '/F1-manager-3.5/gp-journal.html',
  '/F1-manager-3.5/news.html',
  '/F1-manager-3.5/standings.html',
  '/F1-manager-3.5/drivers.html',
  '/F1-manager-3.5/profile.html',
  '/F1-manager-3.5/board.html',
  '/F1-manager-3.5/rd.html',
  '/F1-manager-3.5/sponsors.html',
  '/F1-manager-3.5/staff.html',
  '/F1-manager-3.5/contracts.html',
  '/F1-manager-3.5/season-review.html',

  '/F1-manager-3.5/js/data.js',
  '/F1-manager-3.5/js/save.js',
  '/F1-manager-3.5/js/engine.js',
  '/F1-manager-3.5/js/race.js',
  '/F1-manager-3.5/js/career.js',
  '/F1-manager-3.5/js/events.js',
  '/F1-manager-3.5/js/weekend.js',
  '/F1-manager-3.5/js/immersion.js',
  '/F1-manager-3.5/js/theme.js',
  '/F1-manager-3.5/js/weather.js',
  '/F1-manager-3.5/js/sponsors.js',
  '/F1-manager-3.5/js/profiles.js',

  '/F1-manager-3.5/css/immersive-theme.css',

  '/F1-manager-3.5/img/f1.png',
  '/F1-manager-3.5/img/teams/mclaren.png',
  '/F1-manager-3.5/img/teams/ferrari.png',
  '/F1-manager-3.5/img/teams/redbull.png',
  '/F1-manager-3.5/img/teams/mercedes.png',
  '/F1-manager-3.5/img/teams/aston.png',
  '/F1-manager-3.5/img/teams/alpine.png',
  '/F1-manager-3.5/img/teams/williams.png',
  '/F1-manager-3.5/img/teams/haas.png',
  '/F1-manager-3.5/img/teams/sauber.png',
  '/F1-manager-3.5/img/teams/racingbulls.png',
  '/F1-manager-3.5/img/teams/cadillac.png',

  '/F1-manager-3.5/manifest.json',
  '/F1-manager-3.5/icon-192.png',
  '/F1-manager-3.5/icon-512.png'
];

// Installation
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache =>
        Promise.allSettled(
          ASSETS.map(asset => cache.add(asset))
        )
      )
      .then(() => self.skipWaiting())
  );
});

// Activation
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request))
  );
}); 
