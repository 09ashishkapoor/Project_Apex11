const CACHE_NAME = 'mantrini-site-__SITE_VERSION__';
const PRECACHE = __PRECACHE__;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  // IndexedDB/OPFS history and legacy offline caches are never removed by this migration.
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    // Only the two real entry points have an offline fallback. Unknown URLs retain their 404.
    const fallback = ['/', '/index.html'].includes(url.pathname) ? '/index.html'
      : ['/app', '/app/', '/app/index.html'].includes(url.pathname) ? '/app/index.html' : null;
    if (fallback) event.respondWith(navigate(request, fallback));
    return;
  }
  if (PRECACHE.includes(url.pathname)) event.respondWith(asset(request, url.pathname));
});

async function navigate(request, fallback) {
  try {
    const response = await fetch(request);
    if (response.ok) await (await caches.open(CACHE_NAME)).put(fallback, response.clone());
    return response;
  } catch (error) {
    const cached = await (await caches.open(CACHE_NAME)).match(fallback);
    if (cached) return cached;
    throw error;
  }
}

async function asset(request, pathname) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(pathname);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(pathname, response.clone());
  return response;
}
