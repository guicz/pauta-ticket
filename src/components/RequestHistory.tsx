import { useState } from "react";
import type { Task, ActivityEvent, Priority } from "../domain/models";
import { HelpTooltip } from "./HelpTooltip";

const priorities: Record<Priority, string> = { urgent: "Urgente", high: "Alta", normal: "Normal", low: "Baixa" };
const statuses: Record<Task["status"], string> = { inbox: "Em triagem", ready: "Na fila", active: "Em andamento", partial: "Parcial", paused: "Pausado", blocked: "Bloqueado", in_review: "Em validação", completed: "Concluído" };

export function RequestHistory({ tasks, events, manager, onPriority }: { tasks: Task[]; events: ActivityEvent[]; manager: boolean; onPriority: (id: string, priority: Priority) => void }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const visible = tasks.filter(task => {
    const matchesStatus = !status || (status === "archived" ? Boolean(task.archivedAt) : !task.archivedAt && task.status === status);
    const searchable = `${task.title} ${task.client} ${task.project} ${task.expectedResult} ${task.requesterName ?? ""} ${task.requesterEmail ?? ""}`;
    return matchesStatus && searchable.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"));
  }).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  return <details className="request-history app-preferences"><summary>Histórico de pedidos ({tasks.length})</summary>
    <div className="history-filters"><input aria-label="Buscar no histórico" placeholder={manager ? "Pedido, cliente ou solicitante" : "Pedido ou cliente"} value={search} onChange={event => setSearch(event.target.value)} />
      <select aria-label="Filtrar histórico por status" value={status} onChange={event => setStatus(event.target.value)}><option value="">Todos os status</option>{Object.entries(statuses).map(([key,label]) => <option key={key} value={key}>{label}</option>)}<option value="archived">Arquivadas</option></select>
      <HelpTooltip text={manager ? "Pedidos de todas as colegas, com descrição, status e retornos do Gui. Apenas Pati altera prioridades." : "Seus pedidos, inclusive concluídos e arquivados, com status e retornos do Gui."} /></div>
    {!visible.length && <p role="status">Nenhum pedido encontrado.</p>}
    {visible.map(task => {
      const activity = new Map<string, ActivityEvent>();
      for (const event of [...(task.activity ?? []), ...events.filter(item => item.taskId === task.id)]) activity.set(event.id, event);
      const timeline = [
        ...[...activity.values()].map(event => ({ id: event.id, at: event.createdAt, description: event.description })),
        ...(task.history ?? []).map((entry, index) => ({ id: `status-${task.id}-${index}-${entry.at}`, at: entry.at, description: `Status: ${statuses[entry.status]} · Prioridade: ${priorities[entry.priority]} · atualizado por ${entry.actor === "gui" ? "Gui" : entry.actor === "pati" ? "Pati" : "Atendimento"}.` })),
        ...(task.archivedAt ? [{ id: `archived-${task.id}`, at: task.archivedAt, description: `Demanda arquivada pela Pati. Status antes do arquivamento: ${statuses[task.archivedStatus ?? task.status]}.` }] : []),
      ].sort((a, b) => a.at.localeCompare(b.at));
      return <article className="history-item" key={task.id}><div><strong>{task.title}</strong><small>{task.client} · {task.project} · {task.requesterName || task.requesterEmail || task.requester}</small><small>{new Date(task.createdAt).toLocaleString("pt-BR")}</small></div>
        <span>{task.archivedAt ? `Arquivada · ${statuses[task.archivedStatus ?? task.status]}` : statuses[task.status]}</span>
        {manager && !task.archivedAt ? <select aria-label={`Prioridade de ${task.title} no histórico`} value={task.priority} onChange={event => onPriority(task.id, event.target.value as Priority)}>{Object.entries(priorities).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select> : <span>{priorities[task.priority]}</span>}
        <details><summary>Descrição e histórico</summary>
          <section className="request-history-description" aria-label={`Descrição completa de ${task.title}`}>
            <h3>Pedido original</h3><p><strong>Resultado esperado:</strong> {task.expectedResult}</p>
            <p><strong>Pronto quando:</strong> {task.doneCondition}</p>
            {task.steps.length > 0 && <><strong>Etapas</strong><ol>{task.steps.map(step => <li key={step.id}>{step.label}</li>)}</ol></>}
            {task.consequence && <p><strong>Consequência:</strong> {task.consequence}</p>}
          </section>
          <h3>Movimentações e retornos</h3>
          <ul><li>{new Date(task.createdAt).toLocaleString("pt-BR")} · Pedido recebido · {statuses.inbox}</li>
            {timeline.map(entry => <li key={entry.id}>{new Date(entry.at).toLocaleString("pt-BR")} · {entry.description}</li>)}
            {!timeline.length && <li>{new Date(task.updatedAt).toLocaleString("pt-BR")} · Status atual: {statuses[task.status]}</li>}
          </ul>
        </details>
      </article>;
    })}
  </details>;
}
