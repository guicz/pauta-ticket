import { X } from "lucide-react";
import type { Task } from "../domain/models";
import { priorityLabel, statusLabel } from "../lib/format";

export function NotificationTaskDialog({ task, loading, onClose }: { task?: Task; loading: boolean; onClose: () => void }) {
  return <div className="dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><dialog open className="task-details-dialog" aria-labelledby="notification-task-title" onKeyDown={event => { if (event.key === "Escape") onClose(); }}>
    <header><h2 id="notification-task-title">{task?.title ?? (loading ? "Carregando demanda…" : "Demanda indisponível")}</h2><button autoFocus className="icon-button" onClick={onClose} aria-label="Fechar demanda"><X size={20} /></button></header>
    <div className="task-details-body">{task ? <>
      <div className="task-details-meta"><div><span>Estado</span><strong>{statusLabel(task.status)}</strong></div><div><span>Prioridade</span><strong>{priorityLabel(task.priority)}</strong></div><div><span>Responsável</span><strong>{task.assignee === "gui" ? "Gui" : "Pati"}</strong></div></div>
      <section className="task-details-section"><h3>O que precisa ser entregue</h3><p>{task.expectedResult}</p><p>{task.doneCondition}</p></section>
      <section className="task-details-section"><h3>Etapas</h3><div className="detail-step-list">{task.steps.map(step => <div key={step.id} className={step.done ? "done" : ""}><span>{step.done ? "✓" : "·"}</span><p>{step.label}</p></div>)}</div></section>
      {task.blocker && <p>Bloqueio: {task.blocker}</p>}
      <section className="task-details-section"><h3>Prova da entrega</h3><p className="proof-copy">{task.evidence || "Sem descrição de prova."}</p>{task.evidenceAttachment && <a className="proof-image-link" href={task.evidenceAttachment.dataUrl} target="_blank" rel="noreferrer"><img src={task.evidenceAttachment.dataUrl} alt="Prova da entrega" /><span>Abrir print</span></a>}</section>
    </> : <p>{loading ? "Aguardando sincronização." : "Esta demanda não está disponível para sua conta."}</p>}</div>
  </dialog></div>;
}
