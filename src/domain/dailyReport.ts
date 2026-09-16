import type { ActivityEvent, AppState } from "./models";
import { overdueTask } from "./taskReminder";

export function agencyDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function dailyReport(state: AppState, date: string, reference = new Date()) {
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
  const owner = (event: ActivityEvent) => event.assignee ?? state.tasks.find(task => task.id === event.taskId)?.assignee;
  const deliveries = [
    ...events.filter(event => event.kind === "task_completed" && owner(event) === "pati").map(event => `${taskLabel(event.taskId)} — executada por Pati; ${event.description}`),
    ...state.tasks.filter(task => task.assignee === "pati" && inDay(task.completedAt) && !completedIds.has(task.id)).map(task => `${task.title} (${task.client}) — executada por Pati; conclusão registrada.`),
  ];
  const updates = events.filter(event => event.actor === "pati" && owner(event) === "pati" && ["task_started", "progress_recorded", "memory_captured"].includes(event.kind))
    .map(event => `${person(event.actor)} · ${taskLabel(event.taskId)} — ${event.description}`);
  const review = events.filter(event => event.kind === "sent_to_review" && event.actor === "gui").map(event => `${taskLabel(event.taskId)} — executada e enviada por Gui para avaliação; não significa aprovação da Pati.`);
  const blockers = events.filter(event => ["task_blocked", "task_interrupted"].includes(event.kind)).map(event => `${taskLabel(event.taskId)} — ${event.description}`);
  const management = events.filter(event => event.actor === "pati" && (["task_created", "task_reassigned", "agenda_published", "priority_changed", "estimate_changed", "task_interrupted"].includes(event.kind) || (event.kind === "task_completed" && owner(event) !== "pati")))
    .map(event => `${event.taskId ? `${taskLabel(event.taskId)} — ` : ""}${event.kind === "task_completed" ? "Conferência/encerramento pela Pati (não é execução da tarefa)." : event.description}`);
  const cutoff = Math.min(reference.getTime(), start + 86_400_000 - 1);
  const history = state.events.filter(event => Date.parse(event.createdAt) <= cutoff);
  const late = state.tasks.flatMap(task => {
    if (["completed", "in_review", "inbox"].includes(task.status) || Date.parse(task.createdAt) > cutoff) return [];
    const overdue = overdueTask(task, history, cutoff);
    // A date without an exact time expires only after that calendar day ends.
    const dateOnlyEnd = task.scheduledDate && !task.scheduledEnd ? Date.parse(`${task.scheduledDate}T23:59:59.999-03:00`) : NaN;
    const end = overdue?.end ?? (dateOnlyEnd < cutoff ? dateOnlyEnd : null);
    if (end === null) return [];
    const managed = history.filter(event => event.taskId === task.id && event.actor === "pati" && ["task_created", "task_reassigned", "priority_changed", "task_interrupted", "estimate_changed"].includes(event.kind))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    const deadline = new Date(end).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", ...(overdue ? { hour: "2-digit", minute: "2-digit" } as const : {}) });
    return [`${task.title} (${task.client}) — responsável pela entrega: ${person(task.assignee)}; prazo vencido: ${deadline}; entrega pendente.${managed ? ` Gestão da Pati em ${agencyDate(new Date(managed.createdAt)).split("-").reverse().join("/")}: ${managed.description}` : " Demanda liberada na pauta; sem ação detalhada de gestão registrada."}${task.blocker ? ` Bloqueio: ${task.blocker}` : ""}`];
  });
  const pending = state.tasks.filter(task => !["completed", "inbox"].includes(task.status) && (!task.scheduledDate || task.scheduledDate <= date))
    .map(task => `${person(task.assignee)} · ${task.title} — ${task.status === "in_review" ? "aguarda avaliação" : task.status === "blocked" ? `bloqueada: ${task.blocker || "sem motivo registrado"}` : `próximo passo: ${task.steps.find(step => !step.done)?.label || task.returnPoint || "definir próximo passo"}`}`);
  return [
    `DAILY — ${date.split("-").reverse().join("/")}`,
    "DEMANDAS PATI",
    section("TAREFAS EXECUTADAS POR PATI — ENTREGAS NO DIA", deliveries),
    section("AVANÇOS DA PATI (NÃO SÃO ENTREGAS FINAIS)", [...new Set(updates)]),
    section("GESTÃO E ORGANIZAÇÃO DA PAUTA — PATI", management),
    "DEMANDAS GUI",
    section("TAREFAS EXECUTADAS E ENVIADAS POR GUI NO DIA", review),
    "ACOMPANHAMENTO — NÃO CONTABILIZADO COMO ENTREGA",
    section("DEMANDAS ATRASADAS SEM ENTREGA — ACOMPANHAMENTO DA GESTÃO", late),
    section("BLOQUEIOS E DEVOLUÇÕES REGISTRADOS NO DIA", blockers),
    section("PENDÊNCIAS ATUAIS PARA CONTINUIDADE", pending),
    "Observação: atividades filtradas pelo dia escolhido. Atrasos considerados até o horário da consulta ou o fim do dia selecionado. Pendências, responsáveis, prazos e títulos refletem o cadastro atual; não representam uma fotografia histórica. Gestão realizada não significa entrega concluída. Só entram avanços registrados no sistema.",
  ].join("\n\n");
}
