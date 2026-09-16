import { useEffect, useMemo, useState } from "react";
import { overdueTask } from "../domain/taskReminder";
import {
  ArrowRight,
  CalendarDays,
  CalendarClock,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Inbox,
  Plus,
  Save,
  Send,
  X,
} from "lucide-react";
import type { AppState, Priority, Shift, Task } from "../domain/models";
import { formatLongDate, formatMinutes, priorityLabel, statusLabel } from "../lib/format";
import { CreateTaskDialog } from "./CreateTaskDialog";
import { guiWork } from "../domain/guiWork";

interface ManagerDashboardProps {
  state: AppState;
  queueOnly: boolean;
  onCreateTask: (task: Omit<Task, "id" | "createdAt" | "updatedAt">) => void;
  onPublishAgenda: () => void;
  onApproveTask: (taskId: string) => void;
  onFinalizeTask: (taskId: string) => void;
  onReturnTask: (taskId: string, reason: string) => void;
  onForwardTask: (taskId: string) => void;
  onUpdateTask: (taskId: string, changes: Partial<Task>) => void;
  onChangeAssignee: (taskId: string, assignee: "pati" | "gui") => void;
}

const today = new Date().toISOString().slice(0, 10);

export function ManagerDashboard({ state, queueOnly, onCreateTask, onPublishAgenda, onApproveTask, onFinalizeTask, onReturnTask, onForwardTask, onUpdateTask, onChangeAssignee }: ManagerDashboardProps) {
  const [creating, setCreating] = useState(false);
  const [clock, setClock] = useState(Date.now);
  useEffect(() => {
    const tick = () => setClock(Date.now());
    const timer = window.setInterval(tick, 15_000);
    window.addEventListener("focus", tick);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", tick); };
  }, []);
  const [filter, setFilter] = useState("all");
  const [returning, setReturning] = useState<Task | null>(null);
  const [scheduling, setScheduling] = useState<Task | null>(null);
  const [selectedSnapshot, setSelectedTask] = useState<Task | null>(null);
  const selectedTask = state.tasks.find(task => task.id === selectedSnapshot?.id) ?? null;
  const work = guiWork(state.tasks);
  const started = work.running && state.events.find(event => event.taskId === work.running?.id && event.kind === "task_started");
  const [reason, setReason] = useState("");
  const visibleTasks = state.tasks.filter((task) => filter === "all" || (filter === "open" ? task.status !== "completed" : task.status === filter));
  const openTasks = state.tasks.filter((task) => task.status !== "completed");
  const reviews = state.tasks.filter((task) => task.status === "in_review");
  const completed = state.tasks.filter((task) => task.status === "completed");
  const blocked = state.tasks.filter((task) => task.status === "blocked");
  const weekday = formatLongDate().split(",")[0].toUpperCase();

  const todayByShift = useMemo(() => ({
    morning: state.tasks.filter((task) => task.scheduledDate === today && task.shift === "morning" && task.status !== "completed"),
    afternoon: state.tasks.filter((task) => task.scheduledDate === today && task.shift === "afternoon" && task.status !== "completed"),
  }), [state.tasks]);

  return (
    <div className="page manager-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">{queueOnly ? "OPERAÇÃO" : weekday}</span>
          <h1>{queueOnly ? "Fila de demandas" : "Bom dia, Pati"}</h1>
          <p>{queueOnly ? "Priorize, atribua e acompanhe cada demanda." : formatLongDate()}</p>
        </div>
        <div className="header-actions">
          {!queueOnly && <button className="button secondary" onClick={onPublishAgenda}><Send size={17} /> Publicar pauta</button>}
          <button className="button primary" onClick={() => setCreating(true)}><Plus size={18} /> Nova demanda</button>
        </div>
      </header>

      <section className="gui-monitor" aria-label="Acompanhamento do Gui">
        <div className="section-heading"><div><span className="eyebrow">ACOMPANHAMENTO DO GUI</span><h2>{work.running ? "Tarefa iniciada pelo Gui" : "Nenhuma tarefa iniciada no sistema"}</h2></div><span className="count-pill">{work.running ? "Em execução" : "Aguardando início"}</span></div>
        <div className="gui-monitor-grid">
          <article>
            <span className="eyebrow">{work.running ? "AGORA" : "PRÉVIA DA TELA DO GUI"}</span>
            {work.current ? <><button className="task-open" onClick={() => setSelectedTask(work.current!)}><h3>{work.current.title}</h3><span className={`detail-priority priority-${work.current.priority}`}>{priorityLabel(work.current.priority)}</span></button>
              <p>{work.current.steps.find(step => !step.done)?.label ?? "Etapas concluídas; envio para validação pendente."}</p>
              <p>{work.current.steps.filter(step => step.done).length}/{work.current.steps.length} etapas · Estimativa: {formatMinutes(work.current.executorEstimateMinutes ?? work.current.estimatedMinutes)}</p>
              {started && <p>Iniciada em {new Date(started.createdAt).toLocaleString("pt-BR")}</p>}
              <button className="button secondary compact" onClick={() => setSelectedTask(work.current!)}>Ver tarefa e progresso <ArrowRight size={16} /></button>
            </> : <p>Nenhuma tarefa disponível na tela do Gui.</p>}
          </article>
          <article><span className="eyebrow">PRÓXIMA PREVISTA NA FILA</span>{work.next ? <><button className="task-open" onClick={() => setSelectedTask(work.next!)}><h3>{work.next.title}</h3><span className={`detail-priority priority-${work.next.priority}`}>{priorityLabel(work.next.priority)}</span></button><p>{scheduleTimeLabel(work.next)} · {scheduleMetaLabel(work.next)}</p><p>{formatMinutes(work.next.executorEstimateMinutes ?? work.next.estimatedMinutes)} estimados</p></> : <p>Nenhuma próxima demanda.</p>}
          <span className="count-pill" title="A prévia segue a mesma seleção da tela do Gui. O início depende da ação dele no sistema; uma urgência não interrompe automaticamente uma tarefa iniciada.">Previsão da pauta ⓘ</span></article>
        </div>
      </section>

      {!queueOnly && (
        <>
          <section className="metric-grid" aria-label="Resumo operacional">
            <Metric icon={CheckCircle2} label="Entregas na semana" value={completed.length} tone="green" />
            <Metric icon={Clock3} label="Em andamento" value={openTasks.filter((task) => ["active", "partial"].includes(task.status)).length} tone="blue" />
            <Metric icon={Inbox} label="Para validar" value={reviews.length} tone="amber" />
            <Metric icon={CircleAlert} label="Bloqueios" value={blocked.length} tone="rose" />
          </section>

          <section className="planner-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">PAUTA DE HOJE</span>
                <h2>Trabalho que cabe no dia</h2>
              </div>
              <div className="published-state"><Check size={15} /> Publicada {state.agendaPublishedAt ? "hoje" : "ainda não"}</div>
            </div>
            <div className="shift-grid">
              <ShiftColumn title="Manhã" subtitle="Início às 8h" tasks={todayByShift.morning} capacity={state.morningCapacity} buffer={state.bufferMinutes} onApprove={onApproveTask} />
              <ShiftColumn title="Tarde" subtitle="Revisão antes do início" tasks={todayByShift.afternoon} capacity={state.afternoonCapacity} buffer={state.bufferMinutes} onApprove={onApproveTask} />
            </div>
          </section>
        </>
      )}

      <section className={`queue-section ${queueOnly ? "queue-full" : ""}`}>
        <div className="section-heading">
          <div>
            <span className="eyebrow">FILA PROTEGIDA</span>
            <h2>Todas as demandas</h2>
          </div>
          <span className="count-pill">{openTasks.length} abertas</span>
        </div>
        <label className="field">Mostrar demandas
          <select value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">Todas, incluindo concluídas</option>
            <option value="open">Abertas</option>
            <option value="in_review">Para validar</option>
            <option value="completed">Concluídas</option>
          </select>
        </label>
        <div className="table-scroll">
          <table className="task-table">
            <thead><tr><th>Demanda</th><th>Responsável</th><th>Estimativa</th><th>Quando</th><th>Prioridade</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {visibleTasks.map((task) => (
                <tr key={task.id} className={`demand-priority-${task.priority}`}>
                  <td><button className="task-open" onClick={() => setSelectedTask(task)} aria-label={`Abrir detalhes de ${task.title}`}><strong>{task.title}</strong><small>{task.client} · {task.project}</small><small className="requester-line">Solicitado por: {requesterLabel(task)}</small>{task.evidence && <small>Prova: {task.evidence}</small>}{task.evidenceAttachment && <span className="evidence-thumb"><img src={task.evidenceAttachment.dataUrl} alt="Miniatura da prova" /><span>Print anexado · abrir detalhes</span></span>}<span className="task-open-hint">Abrir detalhes <ArrowRight size={15} /></span></button></td>
                  <td><select className="inline-select" aria-label={`Responsável por ${task.title}`} value={task.assignee} disabled={task.status === "completed"} onChange={event => onChangeAssignee(task.id, event.target.value as "pati" | "gui")}><option value="gui">Gui</option><option value="pati">Pati (eu)</option></select></td>
                  <td><strong>{formatMinutes(task.executorEstimateMinutes ?? task.estimatedMinutes)}</strong>{task.executorEstimateMinutes && <small>ajustada pelo Gui</small>}</td>
                  <td className="planning-cell"><button className={`schedule-trigger ${task.scheduledStart || task.shift ? "has-schedule" : ""}`} onClick={() => setScheduling(task)} aria-label={`Editar horário de ${task.title}`}><CalendarClock size={18} /><span><strong>{scheduleTimeLabel(task)}</strong><small>{scheduleMetaLabel(task)}</small></span><span className="schedule-edit">Editar</span></button><select className="inline-select recurrence-select" aria-label={`Repetição de ${task.title}`} value={task.recurrence ?? "none"} onChange={(event) => onUpdateTask(task.id, { recurrence: event.target.value as Task["recurrence"] })}><option value="none">Não repetir</option><option value="daily">Diária</option><option value="weekly">Semanal</option><option value="monthly">Mensal</option></select></td>
                  <td>
                    <select aria-label={`Prioridade de ${task.title}`} value={task.priority} onChange={(event) => onUpdateTask(task.id, { priority: event.target.value as Priority })} className={`inline-select priority-${task.priority}`}>
                      <option value="urgent">Urgente</option><option value="high">Alta</option><option value="normal">Normal</option><option value="low">Baixa</option>
                    </select>
                  </td>
                  <td><span className={`status status-${task.status}`}>{statusLabel(task.status)}</span>{overdueTask(task, state.events, clock) && <span className="overdue-badge" title="O horário previsto terminou e a demanda ainda não foi enviada para avaliação ou concluída.">Atrasada</span>}</td>
                  <td>{task.status === "inbox" && <button className="button compact" onClick={() => onForwardTask(task.id)}>Encaminhar ao Gui</button>}{task.status === "in_review" && <button className="button compact" onClick={() => onApproveTask(task.id)}>Aprovar entrega</button>}{["ready", "active", "partial", "paused"].includes(task.status) && <button className="button primary compact" onClick={() => onFinalizeTask(task.id)}><CheckCircle2 size={15} /> Finalizar demanda</button>}{["in_review", "completed"].includes(task.status) && <button className="button secondary compact" onClick={() => { setReturning(task); setReason(""); }}>{task.status === "completed" ? "Reabrir demanda" : "Devolver para ajustes"}</button>}</td>
                </tr>
              ))}
              {visibleTasks.length === 0 && <tr><td colSpan={7} className="empty-cell">Nenhuma demanda neste filtro.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {creating && <CreateTaskDialog onClose={() => setCreating(false)} onCreate={onCreateTask} />}
      {scheduling && <ScheduleDialog task={scheduling} onClose={() => setScheduling(null)} onSave={(changes) => { onUpdateTask(scheduling.id, changes); setScheduling(null); }} />}
      {selectedTask && <TaskDetailsDialog task={selectedTask} onChangeAssignee={assignee => onChangeAssignee(selectedTask.id, assignee)} onClose={() => setSelectedTask(null)} onApprove={() => { onApproveTask(selectedTask.id); setSelectedTask(null); }} onFinalize={() => { onFinalizeTask(selectedTask.id); setSelectedTask(null); }} onReturn={() => { setReturning(selectedTask); setReason(""); setSelectedTask(null); }} onForward={() => { onForwardTask(selectedTask.id); setSelectedTask(null); }} />}
      {returning && <div className="dialog-backdrop"><dialog open className="small-dialog" aria-labelledby="return-title"><header><h2 id="return-title">Devolver para ajustes</h2><button className="text-close" onClick={() => setReturning(null)}>Cancelar</button></header><form className="small-dialog-body" onSubmit={(event) => { event.preventDefault(); if (!reason.trim()) return; onReturnTask(returning.id, reason.trim()); setReturning(null); }}><p>{returning.title}</p><label className="field">O que precisa ser corrigido?<textarea autoFocus required value={reason} onChange={(event) => setReason(event.target.value)} rows={4} /></label><p>O progresso e a prova serão preservados. O ajuste entrará como uma nova etapa.</p><button className="button primary" disabled={!reason.trim()}>Devolver demanda</button></form></dialog></div>}
    </div>
  );
}

function scheduleTimeLabel(task: Task) {
  if (task.scheduledStart) return `${task.scheduledStart}${task.scheduledEnd ? `–${task.scheduledEnd}` : ""}`;
  if (task.shift === "morning") return "Manhã";
  if (task.shift === "afternoon") return "Tarde";
  return "Adicionar horário";
}

function scheduleMetaLabel(task: Task) {
  if (task.scheduledDate) return task.scheduledDate.split("-").reverse().join("/");
  return task.shift ? "Turno definido · clique para ajustar" : "Data e turno pendentes";
}

function requesterLabel(task: Task) {
  if (task.requesterName) return task.requesterName;
  return task.requester === "gui" ? "Guilherme" : task.requester === "atendimento" ? "Atendimento" : "Pati";
}

function ScheduleDialog({ task, onClose, onSave }: { task: Task; onClose: () => void; onSave: (changes: Partial<Task>) => void }) {
  const [date, setDate] = useState(task.scheduledDate ?? today);
  const [shift, setShift] = useState<Shift>(task.shift);
  const [start, setStart] = useState(task.scheduledStart ?? "");
  const [end, setEnd] = useState(task.scheduledEnd ?? "");

  function applyPreset(nextShift: Exclude<Shift, null>, nextStart: string, nextEnd: string) {
    setShift(nextShift);
    setStart(nextStart);
    setEnd(nextEnd);
  }

  function save() {
    onSave({ scheduledDate: date || undefined, shift, scheduledStart: start || undefined, scheduledEnd: end || undefined });
  }

  function clear() {
    onSave({ scheduledDate: undefined, shift: null, scheduledStart: undefined, scheduledEnd: undefined });
  }

  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><dialog open className="schedule-dialog" aria-labelledby="schedule-title">
    <header><div><span className="eyebrow">PLANEJAR DEMANDA</span><h2 id="schedule-title">Quando executar?</h2><p>{task.title}</p></div><button className="text-close" onClick={onClose} aria-label="Fechar"><X size={20} /></button></header>
    <div className="schedule-dialog-body">
      <div className="schedule-presets"><span>Atalhos de horário</span><div><button type="button" onClick={() => applyPreset("morning", "08:00", "09:30")}><CalendarClock size={16} /> Manhã · 08:00–09:30</button><button type="button" onClick={() => applyPreset("afternoon", "13:30", "15:00")}><CalendarClock size={16} /> Tarde · 13:30–15:00</button></div></div>
      <div className="schedule-form-grid">
        <label className="field"><span>Data</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <label className="field"><span>Turno</span><select value={shift ?? ""} onChange={(event) => setShift((event.target.value || null) as Shift)}><option value="">Sem turno</option><option value="morning">Manhã</option><option value="afternoon">Tarde</option></select></label>
        <label className="field"><span>Começa às</span><input type="time" value={start} onChange={(event) => setStart(event.target.value)} /></label>
        <label className="field"><span>Termina às</span><input type="time" value={end} min={start} onChange={(event) => setEnd(event.target.value)} /></label>
      </div>
      <p className="schedule-help">Use o horário exato quando a pauta já estiver definida. Se ainda não souber, deixe apenas o turno.</p>
      <div className="schedule-dialog-actions"><button className="button secondary" onClick={clear}>Limpar horário</button><div><button className="button secondary" onClick={onClose}>Cancelar</button><button className="button primary" onClick={save}><Save size={17} /> Salvar horário</button></div></div>
    </div>
  </dialog></div>;
}

function TaskDetailsDialog({ task, onClose, onApprove, onFinalize, onReturn, onForward, onChangeAssignee }: { task: Task; onClose: () => void; onApprove: () => void; onFinalize: () => void; onReturn: () => void; onForward: () => void; onChangeAssignee: (assignee: "pati" | "gui") => void }) {
  const completedSteps = task.steps.filter((step) => step.done).length;
  const hasProof = Boolean(task.evidence || task.evidenceAttachment);
  const canFinalize = ["ready", "active", "partial", "paused"].includes(task.status);
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><dialog open className="task-details-dialog" aria-labelledby="task-details-title">
    <header className="task-details-header"><div><span className="eyebrow">DETALHES DA DEMANDA</span><h2 id="task-details-title">{task.title}</h2><p>{task.client} · {task.project}</p></div><div className="task-details-header-actions"><span className={`status status-${task.status}`}>{statusLabel(task.status)}</span><button className="text-close" onClick={onClose} aria-label="Fechar"><X size={20} /></button></div></header>
    <div className="task-details-body">
      {task.status !== "completed" && <label className="field">Alterar responsável<select value={task.assignee} onChange={event => onChangeAssignee(event.target.value as "pati" | "gui")}><option value="pati">Pati (eu)</option><option value="gui">Gui</option></select></label>}
      <div className="task-details-meta"><div><span>Solicitado por</span><strong>{requesterLabel(task)}</strong>{task.requesterEmail && <small>{task.requesterEmail}</small>}</div><div><span>Responsável</span><strong>{task.assignee === "gui" ? "Gui" : "Pati"}</strong></div><div><span>Prioridade</span><strong className={`detail-priority priority-${task.priority}`}>{priorityLabel(task.priority)}</strong></div><div><span>Estimativa</span><strong>{formatMinutes(task.executorEstimateMinutes ?? task.estimatedMinutes)}</strong></div><div><span>Agenda</span><strong>{scheduleTimeLabel(task)} · {scheduleMetaLabel(task)}</strong></div></div>
      <section className="task-details-section"><div className="task-details-section-title"><h3>O que precisa ser entregue</h3><span>{completedSteps} de {task.steps.length} etapas</span></div><p>{task.expectedResult}</p><div className="task-details-condition"><span>CRITÉRIO DE PRONTO</span><strong>{task.doneCondition}</strong></div></section>
      {task.steps.length > 0 && <section className="task-details-section"><h3>Etapas realizadas</h3><div className="detail-step-list">{task.steps.map((step) => <div key={step.id} className={step.done ? "done" : ""}><span>{step.done ? "✓" : "·"}</span><p>{step.label}</p></div>)}</div></section>}
      <section className={`task-details-section proof-section ${hasProof ? "has-proof" : "missing-proof"}`}><div className="task-details-section-title"><h3>Prova da entrega</h3><span>{hasProof ? "Disponível" : "Ainda não enviada"}</span></div>{task.evidence && <p className="proof-copy">{task.evidence}</p>}{task.evidenceAttachment ? <a className="proof-image-link" href={task.evidenceAttachment.dataUrl} target="_blank" rel="noreferrer"><img src={task.evidenceAttachment.dataUrl} alt={`Print de prova da demanda ${task.title}`} /><span>Abrir print em tamanho maior</span></a> : <p className="proof-empty">Quando o Gui enviar um print ou descrição, a prova aparecerá aqui para você conferir antes de aprovar.</p>}</section>
      <div className="task-details-actions">{task.status === "inbox" && <button className="button primary" onClick={onForward}>Encaminhar ao Gui</button>}{task.status === "in_review" && <><button className="button secondary" onClick={onReturn}>Devolver para ajustes</button><button className="button primary" onClick={onApprove}><CheckCircle2 size={17} /> Aprovar entrega</button></>}{canFinalize && <button className="button primary" onClick={onFinalize}><CheckCircle2 size={17} /> Finalizar demanda</button>}{task.status === "completed" && <button className="button secondary" onClick={onReturn}>Reabrir demanda</button>}</div>
    </div>
  </dialog></div>;
}

function Metric({ icon: Icon, label, value, tone }: { icon: typeof CalendarDays; label: string; value: number; tone: string }) {
  return <article className="metric-card"><span className={`metric-icon ${tone}`}><Icon size={19} /></span><div><strong>{value}</strong><span>{label}</span></div></article>;
}

function ShiftColumn({ title, subtitle, tasks, capacity, buffer, onApprove }: { title: string; subtitle: string; tasks: Task[]; capacity: number; buffer: number; onApprove: (taskId: string) => void }) {
  const planned = tasks.reduce((sum, task) => sum + (task.executorEstimateMinutes ?? task.estimatedMinutes), 0);
  const effective = Math.max(1, capacity - buffer);
  const percent = Math.min(100, Math.round((planned / effective) * 100));
  const overCapacity = planned > effective;
  return (
    <article className="shift-column">
      <header><div><h3>{title}</h3><p>{subtitle}</p></div><span>{formatMinutes(planned)} / {formatMinutes(effective)}</span></header>
      <div className={`capacity-track ${overCapacity ? "over" : ""}`} aria-label={`${percent}% da capacidade planejada`}><span style={{ width: `${percent}%` }} /></div>
      {overCapacity && <div className="capacity-warning"><CircleAlert size={14} /> A pauta excede a capacidade em {formatMinutes(planned - effective)}. Revise antes de publicar.</div>}
      <div className="shift-tasks">
        {tasks.map((task, index) => (
          <div className={`mini-task demand-priority-${task.priority} ${task.status === "active" ? "current" : ""}`} key={task.id} aria-label={`${task.title}, prioridade ${priorityLabel(task.priority)}`}>
            <span className="task-order">{task.status === "active" ? "AGORA" : String(index + 1).padStart(2, "0")}</span>
            <div><strong>{task.title}</strong><small>{task.client} · {formatMinutes(task.executorEstimateMinutes ?? task.estimatedMinutes)}{task.scheduledStart && ` · ${task.scheduledStart}${task.scheduledEnd ? `–${task.scheduledEnd}` : ""}`}</small></div>
            {task.status === "in_review" ? <button className="mini-action" onClick={() => onApprove(task.id)}>Validar</button> : <ArrowRight size={17} />}
          </div>
        ))}
        {tasks.length === 0 && <div className="empty-shift">Nenhuma tarefa colocada neste período.</div>}
      </div>
      <footer><span>Margem protegida</span><strong>{formatMinutes(buffer)}</strong></footer>
    </article>
  );
}
