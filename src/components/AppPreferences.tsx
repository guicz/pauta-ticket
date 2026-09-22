import { useEffect, useState } from "react";
import { Download, Settings } from "lucide-react";
import type { Person } from "../domain/models";
import { BrowserNotificationSettings } from "./BrowserNotificationSettings";
import { callService, servicesConfigured } from "../lib/integrations";

interface InstallPrompt extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }>; }
interface CalendarStatus { configured: boolean; connected: boolean; lastSync: string | null; error: string | null; }

export function AppPreferences({ person, demo }: { person: Person; demo: boolean }) {
  const [install, setInstall] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(() => window.matchMedia("(display-mode: standalone)").matches);
  const [calendar, setCalendar] = useState<CalendarStatus | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const capture = (event: Event) => { event.preventDefault(); setInstall(event as InstallPrompt); };
    const complete = () => { setInstalled(true); setInstall(null); };
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", complete);
    return () => { window.removeEventListener("beforeinstallprompt", capture); window.removeEventListener("appinstalled", complete); };
  }, []);
  useEffect(() => {
    if (person !== "gui" || demo || !servicesConfigured) return;
    let cancelled = false;
    void callService<CalendarStatus>("calendarStatus").then(value => { if (!cancelled) setCalendar(value); }).catch(() => { if (!cancelled) setMessage("Conexão com o Calendar indisponível agora."); });
    return () => { cancelled = true; };
  }, [person, demo]);
  async function connectCalendar() {
    setBusy(true); setMessage("");
    try {
      if (calendar?.connected) {
        await callService("syncGoogleCalendar");
        setCalendar(await callService<CalendarStatus>("calendarStatus"));
        setMessage("Tarefas sincronizadas.");
      } else {
        const { url } = await callService<{ url: string }>("calendarConnect");
        const target = new URL(url);
        if (target.origin !== "https://accounts.google.com") throw new Error("Endereço Google inválido.");
        window.location.assign(url);
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível conectar."); }
    finally { setBusy(false); }
  }
  return <details className="app-preferences">
    <summary><Settings size={18} /> Aplicativo e integrações</summary>
    <section><strong>Instalar Pauta Fluxo</strong>
      <p>{installed ? "O aplicativo está instalado neste dispositivo." : "Tenha um atalho na tela inicial e abra em uma janela própria."}</p>
      {!installed && (install ? <button className="button secondary" onClick={async () => { await install.prompt(); await install.userChoice; setInstall(null); }}><Download size={17} /> Instalar aplicativo</button> : <p>No iPhone: Compartilhar → Adicionar à Tela de Início. No Android ou computador: menu do navegador → Instalar aplicativo.</p>)}
    </section>
    <BrowserNotificationSettings demo={demo} />
    {person === "gui" && <section><strong>Google Calendar</strong><p>Suas tarefas agendadas aparecem na agenda Pauta Fluxo da conta Guilherme. Datas, horários e conclusão são atualizados automaticamente.</p>
      {demo ? <p>Entre na sua conta para conectar o Google Calendar.</p> : !servicesConfigured || calendar?.configured === false ? <p>A integração está preparada e aguarda ativação do serviço e configuração da conexão Google.</p> : <div className="preference-actions"><button className="button secondary" onClick={connectCalendar} disabled={busy || !calendar}>{busy ? "Sincronizando…" : calendar?.connected ? "Sincronizar agora" : "Conectar Google Calendar"}</button>{calendar?.connected && <button className="button secondary" disabled={busy} onClick={async () => { setBusy(true); try { const { url } = await callService<{ url: string }>("calendarConnect"); if (new URL(url).origin === "https://accounts.google.com") window.location.assign(url); } catch { setMessage("Não foi possível reconectar."); } finally { setBusy(false); } }}>Reconectar conta</button>}</div>}
      {calendar?.connected && <button className="button secondary" disabled={busy} onClick={async () => { setBusy(true); try { await callService("calendarDisconnect"); setCalendar(await callService<CalendarStatus>("calendarStatus")); setMessage("Sincronização desativada. Os eventos já criados foram preservados."); } catch { setMessage("Não foi possível desconectar agora."); } finally { setBusy(false); } }}>Desconectar Calendar</button>}
      {calendar?.lastSync && <p>Última sincronização: {new Date(calendar.lastSync).toLocaleString("pt-BR")}</p>}
      {calendar?.error && <p role="alert">{calendar.error}</p>}
      {message && <p role="status">{message}</p>}
    </section>}
  </details>;
}
