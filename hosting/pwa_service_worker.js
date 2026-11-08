// Retired service worker — self-destructing.
//
// The previous (Flutter) site registered a root-scope service worker at this
// exact URL. That worker precached the old landing page, so a returning visitor
// would keep seeing the Flutter-era site for a while after the migration.
//
// This stub replaces it: it clears the caches the old worker owned, unregisters
// itself, and reloads any open tab so the visitor lands on the new site. It
// deliberately does NOT clear the new app's caches — the app's Workbox precache
// and its audio/icon caches are left alone, or an installed devotee would have
// to re-download everything to open the app they already had.
//
// Safe to delete a few months after the migration, once pre-migration clients
// have drained.

const KEEP_PREFIXES = ['workbox-', 'mantrini-icons', 'mantrini-audio'];

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const names = await caches.keys();
        await Promise.all(
          names
            .filter((name) => !KEEP_PREFIXES.some((prefix) => name.startsWith(prefix)))
            .map((name) => caches.delete(name)),
        );
      } catch {
        /* cache storage can be unavailable; nothing else to do */
      }

      try {
        await self.registration.unregister();
      } catch {
        /* ignore */
      }

      try {
        const clients = await self.clients.matchAll({ type: 'window' });
        for (const client of clients) {
          // Reload only, never navigate: the visitor may be mid-page.
          client.postMessage({ type: 'mantrini-legacy-worker-retired' });
        }
      } catch {
        /* ignore */
      }
    })(),
  );
});
