const CACHE = "pauta-shell-v3";
const STATIC = ["/offline.html", "/manifest.webmanifest", "/icons/pauta-192.png", "/icons/pauta-512.png"];

function accountStore(mode, operation) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("pauta-device", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("account");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction("account", mode);
      const result = operation(transaction.objectStore("account"));
      transaction.oncomplete = () => { database.close(); resolve(result.result); };
      transaction.onerror = () => { database.close(); reject(transaction.error); };
    };
  });
}

self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(STATIC))));
self.addEventListener("activate", event => event.waitUntil((async () => {
  for (const name of await caches.keys()) if (name.startsWith("pauta-shell-") && name !== CACHE) await caches.delete(name);
  await self.clients.claim();
})()));
self.addEventListener("message", event => {
  if (event.data?.type !== "account") return;
  event.waitUntil((async () => {
    await accountStore("readwrite", store => store.put(event.data.uid ?? null, "uid"));
    for (const notification of await self.registration.getNotifications()) notification.close();
    event.ports[0]?.postMessage({ updated: true });
  })());
});
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  if (event.request.mode === "navigate") {
    // Never cache authenticated pages, tokens, task data or OAuth callbacks.
    event.respondWith(fetch(event.request).catch(() => caches.match("/offline.html")));
  } else if (STATIC.includes(url.pathname)) {
    event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
  }
});
self.addEventListener("push", event => event.waitUntil((async () => {
  let data;
  try { data = event.data.json(); } catch { return; }
  const uid = await accountStore("readonly", store => store.get("uid"));
  if (!uid || data.uid !== uid) return;
  await self.registration.showNotification(data.title || "Pauta Fluxo", {
    body: data.body, tag: data.tag, icon: "/icons/pauta-192.png", badge: "/icons/pauta-192.png", lang: "pt-BR",
    data: { taskId: data.taskId, uid },
  });
})()));
self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil((async () => {
    if (event.notification.data?.uid && event.notification.data.uid !== await accountStore("readonly", store => store.get("uid"))) return;
    const taskId = typeof event.notification.data?.taskId === "string" ? event.notification.data.taskId : undefined;
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = windows.find(client => new URL(client.url).origin === self.location.origin);
    if (existing) {
      await existing.focus();
      existing.postMessage({ type: "open-notifications", taskId });
    } else await self.clients.openWindow(taskId ? `/?task=${encodeURIComponent(taskId)}` : "/?notifications=1");
  })());
});
