// MatchBatch Service Worker — offline shell + push notifications
const CACHE_NAME = "matchbatch-v1";
const OFFLINE_URL = "/offline";

const PRECACHE = [
  "/",
  "/dashboard",
  "/offline",
];

// ── Install: precache shell ─────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ──────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: network-first, offline fallback ──────────────────
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (event.request.url.includes("/api/")) return; // never cache API calls

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful navigation responses
        if (response.ok && event.request.mode === "navigate") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline: return cached version or offline page
        return caches.match(event.request).then(
          (cached) => cached ?? caches.match(OFFLINE_URL)
        );
      })
  );
});

// ── Push notifications ──────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload = { title: "MatchBatch", body: "You have a new notification.", icon: "/icon-192.png", url: "/dashboard" };
  try { payload = { ...payload, ...event.data.json() }; } catch {}

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body:    payload.body,
      icon:    payload.icon,
      badge:   "/icon-192.png",
      vibrate: [200, 100, 200],
      data:    { url: payload.url },
      actions: [{ action: "open", title: "Open MatchBatch" }],
    })
  );
});

// ── Notification click ──────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/dashboard";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const existing = list.find((c) => c.url.includes(self.location.origin) && "focus" in c);
      if (existing) return existing.focus().then((c) => c.navigate(url));
      return clients.openWindow(url);
    })
  );
});
