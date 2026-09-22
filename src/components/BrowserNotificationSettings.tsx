import { useState } from "react";
import { browserNotificationPermission, enableBrowserNotifications, showBrowserNotification } from "../lib/browserNotifications";
import { servicesConfigured, subscribePush } from "../lib/integrations";

export function BrowserNotificationSettings({ demo = false }: { demo?: boolean }) {
  const [permission, setPermission] = useState(browserNotificationPermission);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function enable() {
    setBusy(true);
    try {
      if (servicesConfigured && !demo) await subscribePush();
      const result = await enableBrowserNotifications();
      setPermission(result);
      setMessage(result === "granted" ? servicesConfigured && !demo ? "Dispositivo vinculado à sua conta para receber seus avisos." : "Avisos ativados enquanto o app estiver aberto." : result === "denied" ? "Permita notificações nas configurações deste site no navegador." : "Permissão não concedida. Você pode tentar novamente.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível ativar. Confira as permissões do navegador."); }
    finally { setBusy(false); }
  }
  async function test() {
    try { const sent = await showBrowserNotification("Pauta Fluxo", "Tudo pronto para receber os avisos de demandas e de tempo.", "pauta-test"); setMessage(sent ? "Teste enviado. Se não aparecer, confira o modo Não Perturbe do sistema." : "Ative a permissão de notificações primeiro."); }
    catch { setMessage("Não foi possível enviar o teste. Confira as permissões do navegador."); }
  }
  return <section className="browser-notification-settings"><strong>Suas notificações</strong><p>{servicesConfigured && !demo ? "Receba os avisos da sua conta mesmo com o app fechado. No iPhone, instale o app antes de ativar." : "Avisos disponíveis com o app aberto. O envio com o app fechado aguarda ativação do servidor."}</p>
    {permission === "unsupported" ? <p>Notificações indisponíveis neste navegador. Os avisos continuam dentro do app.</p> : <div className="preference-actions"><button className="button secondary compact" disabled={busy} onClick={enable}>{busy ? "Ativando…" : "Ativar notificações nesta conta"}</button>{permission === "granted" && <button className="button secondary compact" onClick={test}>Testar notificação</button>}</div>}
    {message && <p role="status">{message}</p>}
  </section>;
}
