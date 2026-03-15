const CACHE_NAME = "prompt-vault-shell-v2";
const APP_SHELL = [
  "/",
  "/en",
  "/tr",
  "/en/app",
  "/tr/app",
  "/en/app/library",
  "/tr/app/library",
  "/manifest.webmanifest",
  "/icon",
  "/apple-icon"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }

          return Promise.resolve();
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") {
    return;
  }

  if (request.mode === "navigate") {
    const url = new URL(request.url);
    const localeFallback = url.pathname.startsWith("/tr") ? "/tr/app" : "/en/app";

    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then(
              (cached) =>
                cached || caches.match(localeFallback) || caches.match("/en/app") || caches.match("/tr/app")
            )
        )
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match("/icon"));
    })
  );
});
