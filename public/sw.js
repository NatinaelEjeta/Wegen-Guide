/*
 * Wegen Guide service worker (no Workbox dependency — keeps the bundle tiny).
 *
 * Strategy:
 *  - Precache the app shell on install.
 *  - Runtime caching, network-first for all same-origin GETs (always fresh
 *    when online; cached copy used only when offline — safe in dev too).
 *  - Navigation requests fall back to the cached "/" shell when offline.
 *  - Old caches are cleaned on activate.
 */
const VERSION = "wegen-v1";
const CACHE = `wegen-cache-${VERSION}`;
const SHELL = ["/", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(SHELL).catch(() => undefined);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith("wegen-cache-") && k !== CACHE).map((k) => caches.delete(k))
      );
      await self.clients.claim();
      // Tell clients the content is saved for offline
      const clients = await self.clients.matchAll();
      for (const client of clients) {
        client.postMessage({ type: "WG_CONTENT_SAVED", at: Date.now() });
      }
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "WG_SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never cache Next.js internals in dev-ish patterns — network first anyway
  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(req);
        // Only cache basic/opaque-ok responses
        if (fresh && fresh.status === 200 && fresh.type === "basic") {
          const cache = await caches.open(CACHE);
          cache.put(req, fresh.clone()).catch(() => undefined);
        }
        return fresh;
      } catch (err) {
        const cached = await caches.match(req, { ignoreSearch: true });
        if (cached) return cached;
        if (req.mode === "navigate") {
          const shell = await caches.match("/");
          if (shell) return shell;
        }
        return new Response("", { status: 503, statusText: "offline" });
      }
    })()
  );
});
