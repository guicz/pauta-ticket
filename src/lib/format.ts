export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h${String(remainder).padStart(2, "0")}` : `${hours}h`;
}

export function formatShortDate(value?: string): string {
  if (!value) return "Sem prazo";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

export function formatLongDate(value = new Date()): string {
  const text = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(value);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function currentWeekRange(): string {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 6);
  const formatter = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" });
  return `${formatter.format(monday)} — ${formatter.format(friday)}`;
}

export function priorityLabel(priority: string): string {
  return { urgent: "Urgente", high: "Alta", normal: "Normal", low: "Baixa" }[priority] ?? priority;
}

export function statusLabel(status: string): string {
  return {
    inbox: "Entrada",
    ready: "Liberada",
    active: "Agora",
    partial: "Em andamento",
    paused: "Pausada",
    blocked: "Bloqueada",
    in_review: "Em validação",
    completed: "Concluída",
  }[status] ?? status;
}
