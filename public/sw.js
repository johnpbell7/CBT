/* App-shell cache. Everything except server transcription works offline.

   The base path is derived from where this file is served, so the same
   worker works at the origin root and under a subpath like /CBT/. */

const CACHE = "worry-time-v1";
const BASE = new URL("./", self.location).pathname; // "/" or "/CBT/"
const SHELL = [BASE, `${BASE}manifest.webmanifest`, `${BASE}icons/icon-192.png`, `${BASE}icons/apple-touch-icon.png`];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // One miss shouldn't sink the whole install.
      .then((c) => Promise.all(SHELL.map((url) => c.add(url).catch(() => undefined))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(BASE)) return;
  // Transcription is online-only by definition; never cache audio uploads.
  if (url.pathname.startsWith(`${BASE}api/`)) return;

  // Navigations: fresh when possible, the cached shell when not.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(BASE, copy)).catch(() => undefined);
          return res;
        })
        .catch(() => caches.match(BASE).then((hit) => hit || Response.error())),
    );
    return;
  }

  // Static assets: cache first, fill in behind.
  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req)
        .then((res) => {
          if (res.ok && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => undefined);
          }
          return res;
        })
        .catch(() => hit || Response.error());
    }),
  );
});
