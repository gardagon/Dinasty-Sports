/* Service worker: la app funciona sin conexión y, con conexión, no se queda con una versión vieja.
 * - Navegación (index.html): red primero **saltándose la caché HTTP** (`no-cache`: GitHub Pages sirve con `max-age=600` y, sin esto, `fetch` devolvía una copia de hasta 10 minutos);
 *   la copia guardada es solo el respaldo sin conexión.
 * - `assets/` (JS y CSS de Vite, con el hash en el nombre: un archivo nunca cambia): copia guardada primero.
 * - `version.json`: nunca se guarda ni se sirve de la copia (la app lo usa para saber si hay una versión nueva).
 * - Lo demás del mismo origen (catálogo y paquetes de `deportes/`, manifiesto, iconos): red primero sin caché HTTP, con la copia como respaldo. Antes iba «copia primero y refresco después»,
 *   y el catálogo de deportes enseñaba el de la visita anterior.
 * Sube VERSION para forzar que se limpie la caché al cambiar la estrategia. */
const VERSION = 'v2';
const CACHE = `dinasty-sports-${VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './manifest.webmanifest'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/** Red primero (sin la caché HTTP); si falla, la copia guardada. Lo que llega bien se guarda como respaldo. */
const redPrimero = (req, clave) =>
  fetch(req, { cache: 'no-cache' })
    .then((res) => {
      if (res.ok) {
        const copia = res.clone();
        caches.open(CACHE).then((c) => c.put(clave ?? req, copia));
      }
      return res;
    })
    .catch(() => caches.match(clave ?? req).then((g) => g || Response.error()));

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/version.json')) return; // directo a la red, sin pasar por la caché del worker

  if (req.mode === 'navigate') {
    event.respondWith(redPrimero(req, './'));
    return;
  }

  if (url.pathname.includes('/assets/')) {
    event.respondWith(
      caches.match(req).then(
        (guardada) =>
          guardada ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copia = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copia));
            }
            return res;
          }),
      ),
    );
    return;
  }

  event.respondWith(redPrimero(req));
});
