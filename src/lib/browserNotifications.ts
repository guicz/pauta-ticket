export function browserNotificationPermission(): NotificationPermission | "unsupported" {
  return typeof Notification === "undefined" || !window.isSecureContext || !("serviceWorker" in navigator) ? "unsupported" : Notification.permission;
}

export async function enableBrowserNotifications() {
  if (browserNotificationPermission() === "unsupported") throw new Error("Este navegador não oferece notificações nesta página.");
  const permission = await Notification.requestPermission();
  if (permission === "granted") await navigator.serviceWorker.register("/notifications-sw.js", { updateViaCache: "none" });
  return permission;
}

export async function showBrowserNotification(title: string, body: string, tag: string, taskId?: string) {
  if (browserNotificationPermission() !== "granted") return false;
  await navigator.serviceWorker.register("/notifications-sw.js", { updateViaCache: "none" });
  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification(title, { body, tag, lang: "pt-BR", data: { taskId } });
  return true;
}
