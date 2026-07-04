// Service worker: cachea el shell de la app para que funcione 100% offline
// una vez instalada. La app ya es autocontenida (index.html trae todo su
// CSS/JS/datos embebidos), así que el cache es mínimo: el HTML, el manifest
// y el icono. Los datos del usuario viven en localStorage, fuera del SW.
//
// Estrategia: network-first para index.html (para que un deploy nuevo se
// vea al reconectar) con fallback a cache; cache-first para el resto.
// Subir CACHE_VERSION en cada release invalida el cache viejo.
const CACHE_VERSION = 'f76-build-planner-v1';
const ASSETS = ['./index.html', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isHTML = req.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/');

  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
  } else {
    event.respondWith(caches.match(req).then((cached) => cached || fetch(req)));
  }
});
