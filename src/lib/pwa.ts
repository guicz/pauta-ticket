export async function registerPwa() {
  if (!("serviceWorker" in navigator) || !window.isSecureContext) return null;
  return navigator.serviceWorker.register("/notifications-sw.js", { updateViaCache: "none" });
}

export async function setNotificationAccount(uid: string | null) {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration() ?? await registerPwa();
  if (!registration) return;
  const ready = await navigator.serviceWorker.ready;
  await new Promise<void>((resolve, reject) => {
    const channel = new MessageChannel();
    const timeout = window.setTimeout(() => reject(new Error("Não foi possível atualizar este dispositivo.")), 5000);
    channel.port1.onmessage = () => { window.clearTimeout(timeout); channel.port1.close(); resolve(); };
    ready.active?.postMessage({ type: "account", uid }, [channel.port2]);
  });
}
