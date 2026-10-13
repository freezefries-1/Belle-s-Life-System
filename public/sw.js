/*
 * belle's life system — service worker.
 *
 * Deliberately conservative:
 * - Caches only the app's own static files: the build's fingerprinted
 *   scripts/styles/fonts (/_next/static/, which never change once built),
 *   app icons, and a small offline page.
 * - Never caches pages, your data, sign-in, or anything from another origin
 *   (Supabase requests aren't touched at all), so nothing private ends up in
 *   a cache and a new deployment is picked up straight away.
 * - When a page can't load because there's no connection, the offline page
 *   is shown instead. There is no offline mode beyond that.
 */
const VERSION = "v1";
const STATIC_CACHE = `belle-static-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png"];
/** Old builds' files are dropped once the cache holds more than this. */
const MAX_ENTRIES = 300;

async function trim(cache) {
  const keys = await cache.keys();
  const keep = new Set(PRECACHE.map((p) => new URL(p, self.location.origin).href));
  const removable = keys.filter((k) => !keep.has(k.url));
  for (const k of removable.slice(0, Math.max(0, keys.length - MAX_ENTRIES))) await cache.delete(k);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("belle-") && k !== STATIC_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/** Files whose content never changes for a given URL. */
function isImmutableStatic(url) {
  return url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // Other origins (Supabase, fonts CDNs…) are left entirely to the browser.
  if (url.origin !== self.location.origin) return;

  // Page loads: always from the network; the offline page only if that fails.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Fingerprinted static files: cache first, then network (and remember it).
  if (isImmutableStatic(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok && response.type === "basic") {
          await cache.put(request, response.clone());
          trim(cache);
        }
        return response;
      }),
    );
  }
  // Everything else (data, route payloads, auth) goes straight to the network.
});
