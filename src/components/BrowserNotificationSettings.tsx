import { useState } from "react";
import { browserNotificationPermission, enableBrowserNotifications, showBrowserNotification } from "../lib/browserNotifications";

export function BrowserNotificationSettings() {
  const [permission, setPermission] = useState(browserNotificationPermission);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function enable() {
    setBusy(true);
    try {
      const result = await enableBrowserNotifications();
      setPermission(result);
      setMessage(result === "granted" ? "Notificações ativadas neste navegador." : result === "denied" ? "Permita notificações nas configurações deste site no navegador." : "Permissão não concedida. Você pode tentar novamente.");
    } catch { setMessage("Não foi possível ativar. Confira as permissões do navegador."); }
    finally { setBusy(false); }
  }
  async function test() {
    try { const sent = await showBrowserNotification("Pauta Fluxo", "Tudo pronto para receber os avisos de demandas e de tempo.", "pauta-test"); setMessage(sent ? "Teste enviado. Se não aparecer, confira o modo Não Perturbe do sistema." : "Ative a permissão de notificações primeiro."); }
    catch { setMessage("Não foi possível enviar o teste. Confira as permissões do navegador."); }
  }
  return <section className="browser-notification-settings"><strong>Avisos do navegador</strong><p>Mantenha o app aberto, mesmo em outra aba, para receber os avisos.</p>
    {permission === "unsupported" ? <p>Notificações indisponíveis neste navegador. Os avisos continuam dentro do app.</p> : <button className="button secondary compact" disabled={busy} onClick={permission === "granted" ? test : enable}>{permission === "granted" ? "Testar notificação" : busy ? "Ativando…" : "Ativar notificações"}</button>}
    {message && <p role="status">{message}</p>}
  </section>;
}
