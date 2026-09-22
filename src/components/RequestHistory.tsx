import { useState } from "react";
import type { Task, ActivityEvent, Priority } from "../domain/models";
import { HelpTooltip } from "./HelpTooltip";

const priorities: Record<Priority, string> = { urgent: "Urgente", high: "Alta", normal: "Normal", low: "Baixa" };
const statuses: Record<Task["status"], string> = { inbox: "Em triagem", ready: "Na fila", active: "Em andamento", partial: "Parcial", paused: "Pausado", blocked: "Bloqueado", in_review: "Em validação", completed: "Concluído" };

export function RequestHistory({ tasks, events, manager, onPriority }: { tasks: Task[]; events: ActivityEvent[]; manager: boolean; onPriority: (id: string, priority: Priority) => void }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const visible = tasks.filter(task => (!status || task.status === status) && `${task.title} ${task.client} ${task.requesterName ?? ""} ${task.requesterEmail ?? ""}`.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"))).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  return <details className="request-history app-preferences"><summary>Histórico de pedidos ({tasks.length})</summary>
    <div className="history-filters"><input aria-label="Buscar no histórico" placeholder={manager ? "Pedido, cliente ou solicitante" : "Pedido ou cliente"} value={search} onChange={event => setSearch(event.target.value)} />
      <select aria-label="Filtrar histórico por status" value={status} onChange={event => setStatus(event.target.value)}><option value="">Todos os status</option>{Object.entries(statuses).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select>
      <HelpTooltip text={manager ? "Pedidos de todos os usuários. Apenas Pati altera prioridades." : "Seus pedidos, incluindo os concluídos. A prioridade é definida pela Pati."} /></div>
    {!visible.length && <p role="status">Nenhum pedido encontrado.</p>}
    {visible.map(task => <article className="history-item" key={task.id}><div><strong>{task.title}</strong><small>{task.client} · {task.requesterName || task.requesterEmail || task.requester}</small><small>{new Date(task.createdAt).toLocaleString("pt-BR")}</small></div>
      <span>{statuses[task.status]}</span>
      {manager ? <select aria-label={`Prioridade de ${task.title} no histórico`} value={task.priority} onChange={event => onPriority(task.id, event.target.value as Priority)}>{Object.entries(priorities).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select> : <span>{priorities[task.priority]}</span>}
      <details><summary>Atividade</summary><ul><li>{new Date(task.createdAt).toLocaleString("pt-BR")} · Pedido criado</li>{events.filter(event => event.taskId === task.id).sort((a,b) => a.createdAt.localeCompare(b.createdAt)).map(event => <li key={event.id}>{new Date(event.createdAt).toLocaleString("pt-BR")} · {event.description}</li>)}{task.history?.map((entry,index) => <li key={index}>{new Date(entry.at).toLocaleString("pt-BR")} · {statuses[entry.status]} · {priorities[entry.priority]}</li>)}<li>{new Date(task.updatedAt).toLocaleString("pt-BR")} · {statuses[task.status]}</li></ul></details>
    </article>)}
  </details>;
}
