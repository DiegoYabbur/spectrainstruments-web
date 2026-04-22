// ============================================================
//  SPECTRA INSTRUMENTS — SERVICE WORKER v1.0
//  Estrategia: Cache-First para assets, Network-First para API
// ============================================================

const CACHE_VERSION = 'spectra-v1';
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;

// Archivos que se pre-cachean al instalar el SW
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/catalogo.html',
  '/spectracloud.html',
  '/soporte.html',
  '/contacto.html',
  '/spectralog-blackbox.html',
  '/dashboard.html',
  '/nodos.html',
  '/exportar.html',
  '/style.css',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  // Google Fonts se cachean dinámicamente
];

// Rutas de API que NUNCA deben servirse desde caché
const NETWORK_ONLY_PATTERNS = [
  '/api/',
];

// ── INSTALL ─────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Spectra Service Worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Pre-cacheando assets estáticos...');
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  // Activa el nuevo SW inmediatamente sin esperar que se cierren las pestañas
  self.skipWaiting();
});

// ── ACTIVATE ─────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando nueva versión del SW...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('spectra-') && name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
          .map((name) => {
            console.log('[SW] Eliminando caché antigua:', name);
            return caches.delete(name);
          })
      );
    })
  );
  // Toma el control de las páginas abiertas inmediatamente
  self.clients.claim();
});

// ── FETCH ─────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Ignorar peticiones que no sean GET
  if (request.method !== 'GET') return;

  // 2. Network-Only para endpoints de API (datos en vivo de sensores)
  const isApiCall = NETWORK_ONLY_PATTERNS.some(p => url.pathname.startsWith(p));
  if (isApiCall) {
    event.respondWith(fetch(request));
    return;
  }

  // 3. Cache-First para assets estáticos conocidos (HTML, CSS, iconos)
  if (PRECACHE_ASSETS.some(asset => url.pathname === asset || url.pathname === '/')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        // Si no está en caché (no debería pasar), lo descarga y lo guarda
        return fetchAndCache(request, STATIC_CACHE);
      })
    );
    return;
  }

  // 4. Stale-While-Revalidate para fuentes de Google y otros recursos externos
  if (url.origin !== self.location.origin) {
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
    return;
  }

  // 5. Network-First para el resto (páginas nuevas que no están pre-cacheadas)
  event.respondWith(networkFirst(request));
});

// ── HELPERS ───────────────────────────────────────────────────

async function fetchAndCache(request, cacheName) {
  const response = await fetch(request);
  if (response && response.status === 200) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  try {
    return await fetchAndCache(request, DYNAMIC_CACHE);
  } catch (error) {
    // Sin red → intentar desde caché
    const cachedResponse = await caches.match(request);
    if (cachedResponse) return cachedResponse;
    // Página de fallback offline
    return caches.match('/index.html');
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => null);

  return cachedResponse || await fetchPromise;
}

// ── BACKGROUND SYNC (opcional, para el formulario de contacto) ─
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-contact-form') {
    console.log('[SW] Background sync: Reintentando envío de formulario...');
    // Aquí podrías recuperar datos de IndexedDB y reenviar el formulario
  }
});