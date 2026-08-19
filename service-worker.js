const CACHE = 'sau-v104';
const CORE = [
  './', './index.html', './styles.css', './manifest.webmanifest', './assets/favicon.svg',
  './js/app.js', './js/unit-system.js', './js/homepage.js', './js/site-components.js', './js/engineering-system.js', './js/data.js', './js/calculators.js', './js/pcb-accelerometers-data.js', './js/extra-calculators.js',
  './js/extra-data.js', './js/charts.js', './js/demos.js', './js/demo-takeaways.js', './js/engineering-results.js',
  './js/honeycomb-paper.js', './js/sea-coupling.js', './js/acs519-data.js',
  './js/acs519-physics.js', './js/acs519-calculators.js', './js/acs519-demos.js',
  './js/workflow-expansion-physics.js', './js/workflow-expansion-calculators.js',
  './js/workflow-expansion-data.js', './js/workflow-expansion-demos.js',
  './js/program-expansion-physics.js', './js/program-expansion-calculators.js',
  './js/program-expansion-data.js', './js/program-expansion-demos.js',
  './js/sea-parameters-physics.js', './js/sea-parameters-calculators.js',
  './js/sea-parameters-data.js', './js/sea-parameters-demos.js',
  './js/launch-sea-capstone.js', './js/workbench-runtime.js', './js/engineering-workbenches.js',
  './js/sorbothane-data.js', './js/parker-lord-isolators.js', './js/sorbothane-analysis.js', './js/nastran-isolation-export.js', './js/sorbothane-isolation.js'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response.ok && new URL(event.request.url).origin === self.location.origin) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html')))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok && new URL(event.request.url).origin === self.location.origin) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => {
        if (event.request.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      });
    })
  );
});
