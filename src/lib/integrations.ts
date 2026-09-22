import { getFunctions, httpsCallable } from "firebase/functions";
import { collection, getDocs, onSnapshot, writeBatch } from "firebase/firestore";
import { auth, db } from "./firebase";
import type { AppNotification } from "../domain/models";
import { registerPwa, setNotificationAccount } from "./pwa";

export const servicesConfigured = import.meta.env.VITE_SERVICES_ENABLED === "true";

export async function callService<T>(name: string, data: unknown = {}): Promise<T> {
  if (!servicesConfigured || !auth) throw new Error("Este serviço ainda não foi ativado. Os avisos do app continuam disponíveis.");
  return (await httpsCallable<unknown, T>(getFunctions(auth.app, "us-central1"), name)(data)).data;
}

export async function subscribePush() {
  if (!auth?.currentUser) throw new Error("Entre na sua conta para receber seus avisos.");
  const uid = auth.currentUser.uid;
  if (!servicesConfigured) throw new Error("O envio com o app fechado ainda não foi ativado.");
  if (!("PushManager" in window)) throw new Error("Este navegador não suporta push. No iPhone, instale na Tela de Início.");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Permita notificações nas configurações do navegador.");
  const { publicKey } = await callService<{ publicKey: string }>("notificationConfig");
  await registerPwa();
  const registration = await navigator.serviceWorker.ready;
  const bytes = Uint8Array.from(atob(publicKey.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
  const subscription = await registration.pushManager.getSubscription() ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes });
  if (auth.currentUser?.uid !== uid) throw new Error("A conta mudou. Ative as notificações novamente.");
  await setNotificationAccount(uid);
  await callService("registerPush", { subscription: subscription.toJSON() });
}

export async function disconnectPush() {
  if (!("serviceWorker" in navigator)) return;
  try { await setNotificationAccount(null); } catch { /* Still unsubscribe if worker messaging failed. */ }
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager?.getSubscription();
  if (!subscription) return;
  try { if (servicesConfigured && auth?.currentUser) await callService("unregisterPush", { endpoint: subscription.endpoint }); }
  finally { await subscription.unsubscribe(); }
}

export function subscribeInbox(uid: string, onItems: (items: AppNotification[]) => void, onError: () => void) {
  if (!db || !servicesConfigured) return () => undefined;
  return onSnapshot(collection(db, "userInboxes", uid, "items"), snapshot => {
    onItems(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as AppNotification).sort((a,b) => b.createdAt.localeCompare(a.createdAt)));
  }, onError);
}

export async function markInboxRead(uid: string) {
  if (!db || !servicesConfigured) return;
  const docs = (await getDocs(collection(db, "userInboxes", uid, "items"))).docs.filter(doc => !doc.data().read);
  for (let index = 0; index < docs.length; index += 400) {
    const batch = writeBatch(db);
    docs.slice(index, index + 400).forEach(doc => batch.update(doc.ref, { read: true }));
    await batch.commit();
  }
}
