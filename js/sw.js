const CACHE = 'f1manager-v5';
const ASSETS = [
  '/F1-Manager-/',
  '/F1-Manager-/index.html',
  '/F1-Manager-/race.html',
  '/F1-Manager-/weekend.html',
  '/F1-Manager-/fp-briefing.html',
  '/F1-Manager-/quali-briefing.html',
  '/F1-Manager-/race-briefing.html',
  '/F1-Manager-/immersion.html',
  '/F1-Manager-/podium.html',
  '/F1-Manager-/gp-journal.html',
  '/F1-Manager-/news.html',
  '/F1-Manager-/standings.html',
  '/F1-Manager-/drivers.html',
  '/F1-Manager-/profile.html',
  '/F1-Manager-/board.html',
  '/F1-Manager-/rd.html',
  '/F1-Manager-/sponsors.html',
  '/F1-Manager-/staff.html',
  '/F1-Manager-/contracts.html',
  '/F1-Manager-/season-review.html',
  '/F1-Manager-/js/data.js',
  '/F1-Manager-/js/save.js',
  '/F1-Manager-/js/engine.js',
  '/F1-Manager-/js/race.js',
  '/F1-Manager-/js/career.js',
  '/F1-Manager-/js/events.js',
  '/F1-Manager-/js/weekend.js',
  '/F1-Manager-/js/immersion.js',
  '/F1-Manager-/js/theme.js',
  '/F1-Manager-/js/weather.js',
  '/F1-Manager-/js/sponsors.js',
  '/F1-Manager-/js/profiles.js',
  '/F1-Manager-/css/immersive-theme.css',
  '/F1-Manager-/img/f1.png',
  '/F1-Manager-/img/teams/mclaren.png',
  '/F1-Manager-/img/teams/ferrari.png',
  '/F1-Manager-/img/teams/redbull.png',
  '/F1-Manager-/img/teams/mercedes.png',
  '/F1-Manager-/img/teams/aston.png',
  '/F1-Manager-/img/teams/alpine.png',
  '/F1-Manager-/img/teams/williams.png',
  '/F1-Manager-/img/teams/haas.png',
  '/F1-Manager-/img/teams/sauber.png',
  '/F1-Manager-/img/teams/racingbulls.png',
  '/F1-Manager-/img/teams/cadillac.png',
];

// Installation — mise en cache de tous les assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// Activation — suppression des anciens caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — cache first, fallback réseau
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
