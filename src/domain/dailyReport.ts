import type { AppState } from "./models";

export function agencyDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function dailyReport(state: AppState, date: string) {
  const start = Date.parse(`${date}T00:00:00-03:00`);
  const inDay = (value?: string) => !!value && Date.parse(value) >= start && Date.parse(value) < start + 86_400_000;
  const events = state.events.filter(event => inDay(event.createdAt)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const taskLabel = (id?: string) => {
    const task = state.tasks.find(item => item.id === id);
    return task ? `${task.title} (${task.client})` : "Demanda não disponível";
  };
  const person = (value: string) => value === "gui" ? "Gui" : value === "pati" ? "Pati" : "Atendimento";
  const section = (title: string, lines: string[]) => `${title}\n${lines.length ? lines.map(line => `• ${line}`).join("\n") : "• Nenhum registro."}`;
  const completedIds = new Set(events.filter(event => event.kind === "task_completed").map(event => event.taskId));
  const deliveries = [
    ...events.filter(event => event.kind === "task_completed").map(event => `${taskLabel(event.taskId)} — ${event.description}`),
    ...state.tasks.filter(task => inDay(task.completedAt) && !completedIds.has(task.id)).map(task => `${task.title} (${task.client}) — conclusão registrada.`),
  ];
  const updates = events.filter(event => ["task_started", "progress_recorded", "memory_captured", "estimate_changed"].includes(event.kind))
    .map(event => `${person(event.actor)} · ${taskLabel(event.taskId)} — ${event.description}`);
  const review = events.filter(event => event.kind === "sent_to_review").map(event => `${taskLabel(event.taskId)} — enviada para avaliação, sem contar como conclusão.`);
  const blockers = events.filter(event => ["task_blocked", "task_interrupted"].includes(event.kind)).map(event => `${taskLabel(event.taskId)} — ${event.description}`);
  const management = events.filter(event => event.actor === "pati" && ["task_created", "task_reassigned", "agenda_published", "priority_changed"].includes(event.kind)).map(event => event.description);
  const pending = state.tasks.filter(task => !["completed", "inbox"].includes(task.status) && (!task.scheduledDate || task.scheduledDate <= date))
    .map(task => `${person(task.assignee)} · ${task.title} — ${task.status === "in_review" ? "aguarda avaliação" : task.status === "blocked" ? `bloqueada: ${task.blocker || "sem motivo registrado"}` : `próximo passo: ${task.steps.find(step => !step.done)?.label || task.returnPoint || "definir próximo passo"}`}`);
  return [
    `DAILY — ${date.split("-").reverse().join("/")}`,
    section("ENTREGAS REGISTRADAS NO DIA", deliveries),
    section("AVANÇOS REGISTRADOS (NÃO SÃO ENTREGAS FINAIS)", [...new Set(updates)]),
    section("ENVIOS PARA AVALIAÇÃO NO DIA", review),
    section("BLOQUEIOS E DEVOLUÇÕES REGISTRADOS NO DIA", blockers),
    section("GESTÃO DA PATI NO DIA", management),
    section("PENDÊNCIAS ATUAIS PARA CONTINUIDADE", pending),
    "Observação: atividades filtradas pelo dia escolhido. Pendências, responsáveis e títulos refletem o cadastro atual; não representam uma fotografia histórica. Só entram avanços registrados no sistema.",
  ].join("\n\n");
}
