// Service worker di SubbuteoBoard.
//
// Strategie:
// - Pagina (navigazione / HTML) e file JSON: prima la rete, con timeout;
//   se la rete non risponde si usa la copia in cache. Ogni risposta valida
//   aggiorna la cache, quindi un deploy arriva all'iPad al primo avvio
//   online senza dover cambiare CACHE_NAME.
// - Immagini e altri file statici: prima la cache.
// - Le richieste con query string (es. rose-index.json?t=123) sono messe in
//   cache senza query, così il fallback offline le trova.
//
// CACHE_NAME va cambiato solo se cambia l'elenco PRECACHE o la logica qui sotto.
var CACHE_NAME = 'subtimer-v17';
var PRECACHE = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/logo_hd.png'
];
var NETWORK_TIMEOUT_MS = 3000;

// Mette in cache anche l'indice delle rose e i file delle rose, così il
// primo avvio offline può comunque importarle. Non bloccante.
function precacheRosters(cache) {
  return fetch('/rose-index.json', { cache: 'no-store' })
    .then(function(r) { return r.ok ? r.clone().json().then(function(idx) { return [r, idx]; }) : null; })
    .then(function(pair) {
      if (!pair) return;
      var files = [];
      (pair[1].schemi || []).forEach(function(s) {
        (s.rose || []).forEach(function(f) { files.push('/' + f.replace(/^\//, '')); });
      });
      return cache.put('/rose-index.json', pair[0]).then(function() {
        return cache.addAll(files);
      });
    })
    .catch(function() {});
}

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(PRECACHE).then(function() { return precacheRosters(cache); });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

function cacheKey(url) {
  return url.origin + url.pathname;
}

function fromCache(key, isNavigation) {
  return caches.match(key, { ignoreSearch: true }).then(function(res) {
    if (res || !isNavigation) return res;
    return caches.match('/');
  });
}

function networkFirst(request, url) {
  var key = cacheKey(url);
  var isNavigation = request.mode === 'navigate';
  return new Promise(function(resolve) {
    var settled = false;
    function done(res) {
      if (settled) return;
      settled = true;
      resolve(res || Response.error());
    }
    // Rete lenta: dopo il timeout si usa la cache, se c'è
    var timer = setTimeout(function() {
      fromCache(key, isNavigation).then(function(res) { if (res) done(res); });
    }, NETWORK_TIMEOUT_MS);

    fetch(request).then(function(res) {
      clearTimeout(timer);
      if (res && res.ok && res.type === 'basic' && !res.redirected) {
        var copy = res.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(key, copy); });
      }
      done(res);
    }).catch(function() {
      clearTimeout(timer);
      fromCache(key, isNavigation).then(done);
    });
  });
}

function cacheFirst(request, url) {
  return caches.match(cacheKey(url), { ignoreSearch: true }).then(function(cached) {
    if (cached) return cached;
    return fetch(request).then(function(res) {
      if (res && res.ok && res.type === 'basic') {
        var copy = res.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(cacheKey(url), copy); });
      }
      return res;
    });
  });
}

self.addEventListener('fetch', function(event) {
  var request = event.request;
  if (request.method !== 'GET') return;
  var url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  var path = url.pathname;
  var isPage = request.mode === 'navigate' || path === '/' || path.endsWith('.html');
  if (isPage || path.endsWith('.json')) {
    event.respondWith(networkFirst(request, url));
  } else {
    event.respondWith(cacheFirst(request, url));
  }
});
