import { useEffect, useState } from "react";
import { Download, Settings } from "lucide-react";
import { HelpTooltip } from "./HelpTooltip";
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
    <section className="preference-row"><strong>Aplicativo</strong>
      <HelpTooltip text="No iPhone: Compartilhar → Adicionar à Tela de Início. No Android ou computador: menu do navegador → Instalar aplicativo." />
      {installed ? <span>Instalado</span> : install ? <button className="button secondary" onClick={async () => { await install.prompt(); await install.userChoice; setInstall(null); }}><Download size={17} /> Instalar</button> : <span>Pelo navegador</span>}
    </section>
    <BrowserNotificationSettings demo={demo} />
    {person === "gui" && <section className="preference-row"><strong>Google Calendar</strong><HelpTooltip text="Quando conectado, sincroniza as tarefas agendadas do Guilherme. A ativação depende da configuração Google e do seu consentimento." />
      {demo ? <span>Requer login</span> : !servicesConfigured || calendar?.configured === false ? <span>Não conectado</span> : <div className="preference-actions"><button className="button secondary" onClick={connectCalendar} disabled={busy || !calendar}>{busy ? "Sincronizando…" : calendar?.connected ? "Sincronizar" : "Conectar"}</button>{calendar?.connected && <button className="button secondary" disabled={busy} onClick={async () => { setBusy(true); try { const { url } = await callService<{ url: string }>("calendarConnect"); if (new URL(url).origin === "https://accounts.google.com") window.location.assign(url); } catch { setMessage("Não foi possível reconectar."); } finally { setBusy(false); } }}>Reconectar</button>}</div>}
      {calendar?.connected && <button className="button secondary" disabled={busy} onClick={async () => { setBusy(true); try { await callService("calendarDisconnect"); setCalendar(await callService<CalendarStatus>("calendarStatus")); setMessage("Sincronização desativada. Os eventos já criados foram preservados."); } catch { setMessage("Não foi possível desconectar agora."); } finally { setBusy(false); } }}>Desconectar Calendar</button>}
      {calendar?.lastSync && <p>Última sincronização: {new Date(calendar.lastSync).toLocaleString("pt-BR")}</p>}
      {calendar?.error && <p role="alert">{calendar.error}</p>}
      {message && <p role="status">{message}</p>}
    </section>}
  </details>;
}
