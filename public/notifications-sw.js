self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil((async () => {
    const taskId = typeof event.notification.data?.taskId === "string" ? event.notification.data.taskId : undefined;
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = windows.find(client => new URL(client.url).origin === self.location.origin);
    if (existing) {
      await existing.focus();
      existing.postMessage({ type: "open-notifications", taskId });
    } else await self.clients.openWindow(taskId ? `/?task=${encodeURIComponent(taskId)}` : "/?notifications=1");
  })());
});
