const CACHE_NAME = "bimba-shell-v3";
const APP_SHELL = [
  "./", "./index.html", "./styles.css", "./app.js", "./sw.js",
  "./manifest.webmanifest", "./supabase-config.js",
  "./data/vocabulary/manifest.js",
  "./data/vocabulary/food.js", "./data/vocabulary/food-expanded.js",
  "./data/vocabulary/themes-expanded.js",
  "./data/vocabulary/home.js", "./data/vocabulary/people.js",
  "./data/vocabulary/work.js", "./data/vocabulary/travel.js",
  "./data/vocabulary/health.js", "./data/vocabulary/shopping.js",
  "./data/vocabulary/technology.js", "./data/vocabulary/nature.js",
  "./data/vocabulary/education.js", "./data/vocabulary/money.js",
  "./data/vocabulary/social.js",
  "./data/vocabulary/food-corpus.js", "./data/vocabulary/home-corpus.js",
  "./data/vocabulary/people-corpus.js", "./data/vocabulary/work-corpus.js",
  "./data/vocabulary/travel-corpus.js", "./data/vocabulary/health-corpus.js",
  "./data/vocabulary/shopping-corpus.js", "./data/vocabulary/technology-corpus.js",
  "./data/vocabulary/nature-corpus.js", "./data/vocabulary/education-corpus.js",
  "./data/vocabulary/money-corpus.js", "./data/vocabulary/social-corpus.js"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then(response => response || caches.match("./index.html")))
  );
});

self.addEventListener("push", event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) { data = { body: event.data?.text() || "Tu práctica de inglés te está esperando." }; }
  const title = data.title || "Bimba English";
  const options = {
    body: data.body || "Tu práctica de inglés te está esperando.",
    tag: data.tag || "bimba-reminder",
    data: { url: data.url || "./" },
    vibrate: [100, 50, 100]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(openWindows => {
    const target = new URL(event.notification.data?.url || "./", self.location.origin).href;
    const existing = openWindows.find(client => "focus" in client);
    return existing ? existing.focus() : clients.openWindow(target);
  }));
});
