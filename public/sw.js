const CACHE_NAME = 'nextus-v7';

const SHELL_ASSETS = [
  '/manifest.json',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

// Install: cache shell assets (NOT '/' — HTML is network-first, see fetch)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches. Bumping CACHE_NAME to v7 purges the v6 cache
// that was poisoned by the previous cache-first strategy (stale HTML served
// for hashed JS URLs after deploys — the mobile white-screen bug).
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Never cache a response unless it's a real 200 AND its content type matches
// what was asked for. This is the guard against the poison case: a request
// for a missing hashed asset that the SPA rewrite answers with index.html
// (status 200). Caching that HTML under the JS URL bricks the app until the
// cache is cleared.
function safeCachePut(request, response) {
  if (!response || response.status !== 200 || response.type === 'opaque') return;
  const dest = request.destination; // 'script', 'style', 'document', 'image', ...
  const ctype = (response.headers.get('content-type') || '').toLowerCase();
  if ((dest === 'script' || dest === 'style') && ctype.includes('text/html')) return;
  const clone = response.clone();
  caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
}

// Fetch strategy:
//   API / auth / third-party  → network only (untouched)
//   Navigations (HTML)        → NETWORK-FIRST, cache fallback for offline
//   /assets/ (hashed, immutable) → cache-first (safe: filenames change per build)
//   Other same-origin GETs    → stale-while-revalidate
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/') ||
    url.hostname.includes('supabase') ||
    url.hostname.includes('anthropic') ||
    url.hostname.includes('stripe')
  ) {
    return; // fall through to network
  }

  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;

  // ── Navigations: network-first ──────────────────────────────
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          safeCachePut(event.request, response);
          return response;
        })
        .catch(() => caches.match(event.request).then((c) => c || caches.match('/')))
    );
    return;
  }

  // ── Hashed build assets: cache-first (immutable per deploy) ─
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          safeCachePut(event.request, response);
          return response;
        });
      })
    );
    return;
  }

  // ── Everything else same-origin: stale-while-revalidate ─────
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request).then((response) => {
        safeCachePut(event.request, response);
        return response;
      });
      return cached || networkFetch;
    })
  );
});

// ── Push: the beacon's reminders and nudges ──────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch (_) { data = { body: event.data ? event.data.text() : '' }; }
  const title = data.title || 'The beacon';
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/favicon-mark.png',
    tag: data.tag || 'beacon',
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if ('focus' in c) { try { c.navigate(target); } catch (_) {} return c.focus(); }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
