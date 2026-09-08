import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Bell,
  Brain,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ExternalLink,
  FileCheck2,
  FileText,
  FolderKanban,
  Inbox,
  Lightbulb,
  Link2,
  ListChecks,
  Network,
  NotebookPen,
  Pause,
  PauseCircle,
  Play,
  RadioTower,
  RotateCcw,
  Save,
  Send,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import type { AppNotification, AppState, Task } from "../domain/models";
import { formatLongDate, formatMinutes, priorityLabel } from "../lib/format";

interface ExecutorFocusProps {
  state: AppState;
  notifications: AppNotification[];
  onStartTask: (taskId: string) => void;
  onToggleStep: (taskId: string, stepId: string) => void;
  onCaptureMemory: (taskId: string, text: string) => void;
  onUpdateReturnPoint: (taskId: string, text: string) => void;
  onSaveEvidence: (taskId: string, text: string) => void;
  onRequestEstimate: (taskId: string, minutes: number, reason: string) => void;
  onBlockTask: (taskId: string, reason: string) => void;
  onSubmitForReview: (taskId: string, evidence: string) => void;
  onOpenNotifications: () => void;
}

export function ExecutorFocus({ state, notifications, onStartTask, onToggleStep, onCaptureMemory, onUpdateReturnPoint, onSaveEvidence, onRequestEstimate, onBlockTask, onSubmitForReview, onOpenNotifications }: ExecutorFocusProps) {
  const [estimateOpen, setEstimateOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [memoryDraft, setMemoryDraft] = useState("");
  const [memorySaved, setMemorySaved] = useState(false);
  const unread = notifications.filter((notification) => !notification.read).length;
  const tasks = state.tasks.filter((task) => task.assignee === "gui" && !["completed", "in_review"].includes(task.status));
  const date = new Date();
  const today = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const active = tasks.find((task) => task.status === "active") ?? tasks.find((task) => task.scheduledDate && task.scheduledDate <= today && ["ready", "partial", "paused"].includes(task.status));
  const next = tasks.find((task) => task.id !== active?.id && ["ready", "partial", "paused"].includes(task.status));

  if (!active) {
    return (
      <div className="page focus-page">
        <FocusHeader unread={unread} onOpenNotifications={onOpenNotifications} />
        <div className="focus-empty"><CheckCircle2 size={38} /><h1>Nenhuma ação liberada</h1><p>Sua fila está protegida. Uma nova tarefa aparecerá aqui quando a pauta for publicada.</p></div>
      </div>
    );
  }

  const completedSteps = active.steps.filter((step) => step.done).length;
  const progress = active.steps.length ? Math.round((completedSteps / active.steps.length) * 100) : 0;
  const canSubmit = active.steps.length === 0 || completedSteps > 0;
  const nextStep = active.steps.find((step) => !step.done);
  const lastCompleted = [...active.steps].reverse().find((step) => step.done);
  const activeTaskId = active.id;
  const returnPoint = active.returnPoint ?? (nextStep
    ? `${lastCompleted ? `Você concluiu “${lastCompleted.label}”. ` : ""}Retome em “${nextStep.label}”.`
    : "Etapas concluídas. Anexe a prova e envie para validação.");

  function saveMemory() {
    const text = memoryDraft.trim();
    if (!text) return;
    onCaptureMemory(activeTaskId, text);
    setMemoryDraft("");
    setMemorySaved(true);
    window.setTimeout(() => setMemorySaved(false), 2400);
  }

  return (
    <div className="page focus-page">
      <FocusHeader unread={unread} onOpenNotifications={onOpenNotifications} />

      <div className="focus-layout">
        <section className={`now-card demand-priority-${active.priority}`}>
          <header className="now-header">
            <div><span className="now-pulse" /><span className="eyebrow">AGORA</span></div>
            <span className="priority-badge">Prioridade {priorityLabel(active.priority)}</span>
            <span className="client-chip">{active.client}</span>
            {active.scheduledStart && <span className="client-chip">{active.scheduledStart}{active.scheduledEnd ? `–${active.scheduledEnd}` : ""}</span>}
          </header>

          <div className="now-title">
            <p>{active.project}</p>
            <h1>{active.title}</h1>
          </div>

          <section className="next-action-card" aria-label="Próxima ação">
            <span className="eyebrow">{completedSteps ? "CONTINUE DAQUI" : "COMECE POR AQUI"}</span>
            <h2>{nextStep?.label ?? "Prepare a prova da entrega"}</h2>
            <p>{nextStep ? "Concentre-se apenas neste passo. O restante pode esperar." : active.doneCondition}</p>
            {active.status === "active" && nextStep && <button className="button primary" onClick={() => onToggleStep(active.id, nextStep.id)}><Check size={17} /> Concluí este passo</button>}
            {active.status === "active" && !nextStep && <button className="button primary" onClick={() => setReviewOpen(true)}><Send size={17} /> Preparar envio</button>}
          </section>

          {active.status !== "active" ? (
            <div className="start-state">
              <p>Esta é a primeira ação liberada na sua pauta.</p>
              <button className="button primary large" onClick={() => onStartTask(active.id)}><Play size={19} /> Iniciar tarefa</button>
            </div>
          ) : (
            <>
              <div className="reason-box">
                <Sparkles size={18} />
                <div><strong>Por que agora</strong><p>{active.consequence || active.expectedResult}</p></div>
              </div>

              <div className="done-condition"><span>PRONTO QUANDO</span><p>{active.doneCondition}</p></div>

              {active.steps.length > 0 && (
                <div className="checklist">
                  <div className="checklist-head"><strong>Etapas</strong><span>{completedSteps} de {active.steps.length}</span></div>
                  {active.steps.map((step) => (
                    <label key={step.id} className={`check-row ${step.done ? "done" : ""}`}>
                      <input type="checkbox" checked={step.done} onChange={() => onToggleStep(active.id, step.id)} />
                      <span className="custom-check">{step.done && <Check size={14} />}</span>
                      <span>{step.label}</span>
                    </label>
                  ))}
                  <div className="progress-track" aria-label={`${progress}% concluído`}><span style={{ width: `${progress}%` }} /></div>
                </div>
              )}

              <div className="time-strip">
                <Clock3 size={19} />
                <div><span>Estimativa atual</span><strong>{formatMinutes(active.executorEstimateMinutes ?? active.estimatedMinutes)}</strong></div>
                <button onClick={() => setEstimateOpen(true)}>Preciso de mais tempo</button>
              </div>

              <div className="focus-actions">
                <button className="button secondary" onClick={() => setBlockOpen(true)}><PauseCircle size={18} /> Estou bloqueado</button>
                <button className="button primary" disabled={!canSubmit} onClick={() => setReviewOpen(true)}><Send size={18} /> Enviar para validação</button>
              </div>
            </>
          )}
        </section>

        <aside className="focus-side">
          {unread > 0 && (
            <button className="quiet-notice" onClick={onOpenNotifications}><Bell size={18} /><div><strong>{unread} atualizações aguardando</strong><span>Sua tarefa atual não mudou.</span></div><ChevronRight size={18} /></button>
          )}
          <section className="brain-card" aria-labelledby="brain-title">
            <header className="brain-head">
              <span className="brain-icon"><Brain size={19} /></span>
              <div><span className="eyebrow">SEGUNDO CÉREBRO</span><h2 id="brain-title">Memória desta tarefa</h2></div>
              <span className="memory-live"><i /> ativa</span>
            </header>

            <div className="brain-return">
              <RotateCcw size={17} />
              <div><span>ONDE VOCÊ PAROU</span><p>{returnPoint}</p></div>
            </div>

            <button className="brain-map-trigger" onClick={() => setMapOpen(true)}>
              <Network size={17} />
              <span><strong>Ver mapa desta tarefa</strong><small>Memórias e relações em uma visão</small></span>
              <ChevronRight size={17} />
            </button>

            <details className="brain-context">
              <summary><Lightbulb size={16} /><span>Contexto que não pode escapar</span><ChevronRight size={16} /></summary>
              <div className="context-list">
                <p><strong>Objetivo</strong>{active.expectedResult}</p>
                <p><strong>Critério de pronto</strong>{active.doneCondition}</p>
                {active.consequence && <p><strong>Impacto</strong>{active.consequence}</p>}
              </div>
            </details>

            <div className="brain-capture">
              <label htmlFor="memory-capture"><Inbox size={16} /><span>Surgiu outra coisa?</span></label>
              <p>Guarde aqui. Sua tarefa atual continua a mesma.</p>
              <div className="capture-row">
                <input
                  id="memory-capture"
                  value={memoryDraft}
                  onChange={(event) => { setMemoryDraft(event.target.value); setMemorySaved(false); }}
                  onKeyDown={(event) => event.key === "Enter" && saveMemory()}
                  placeholder="Ex.: pedir a foto nova depois"
                />
                <button onClick={saveMemory} disabled={!memoryDraft.trim()} aria-label="Guardar para depois"><ArrowRight size={17} /></button>
              </div>
              {memorySaved && <span className="capture-success"><Check size={14} /> Guardado para depois, sem mudar seu foco.</span>}
            </div>

            {(active.memoryNotes?.length ?? 0) > 0 && (
              <div className="memory-notes">
                <span>LEMBRETES GUARDADOS</span>
                {active.memoryNotes?.slice(0, 2).map((note) => <p key={note.id}>{note.text}</p>)}
              </div>
            )}
          </section>
          <div className={`next-card ${next ? `demand-priority-${next.priority}` : ""}`}>
            <span className="eyebrow">DEPOIS</span>
            {next && <span className="priority-badge">Prioridade {priorityLabel(next.priority)}</span>}
            {next ? <><h2>{next.title}</h2><p>{next.client} · {formatMinutes(next.executorEstimateMinutes ?? next.estimatedMinutes)}</p><small>A ordem pode mudar após a revisão da pauta.</small></> : <p>Nenhuma tarefa na sequência.</p>}
          </div>
          <div className="focus-rule"><AlertCircle size={17} /><p>Novas demandas entram na fila sem substituir esta tarefa.</p></div>
        </aside>
      </div>

      {estimateOpen && <EstimateDialog task={active} onClose={() => setEstimateOpen(false)} onSubmit={(minutes, reason) => { onRequestEstimate(active.id, minutes, reason); setEstimateOpen(false); }} />}
      {blockOpen && <TextDialog title="O que está bloqueando?" label="Motivo do bloqueio" placeholder="Ex.: Falta acesso à conta do cliente" action="Registrar bloqueio" onClose={() => setBlockOpen(false)} onSubmit={(value) => { onBlockTask(active.id, value); setBlockOpen(false); }} />}
      {reviewOpen && <TextDialog title="Envie a prova da entrega" label="Link, arquivo ou descrição verificável" placeholder="Cole o link ou descreva onde está o resultado" action="Enviar para validação" onClose={() => setReviewOpen(false)} onSubmit={(value) => { onSubmitForReview(active.id, value); setReviewOpen(false); }} />}
      {mapOpen && <BrainMapDialog task={active} returnPoint={returnPoint} onToggleStep={onToggleStep} onCaptureMemory={onCaptureMemory} onUpdateReturnPoint={onUpdateReturnPoint} onSaveEvidence={onSaveEvidence} onClose={() => setMapOpen(false)} />}
    </div>
  );
}

type MapNodeId = "memory" | "goal" | "project" | "routine" | "evidence" | "captures";

const demoResources = [
  { id: "briefing", name: "Briefing da campanha", kind: "Documento", updated: "Hoje, 8h12", description: "Objetivo: gerar pedidos de orçamento na região de Santa Maria. Público principal: pessoas de 28 a 55 anos." },
  { id: "references", name: "Referências aprovadas", kind: "Pasta", updated: "Ontem, 17h40", description: "Três anúncios aprovados pela cliente, paleta verde e fotos da unidade Centro." },
  { id: "history", name: "Decisões do cliente", kind: "Memória", updated: "2 dias atrás", description: "Evitar desconto na chamada. Priorizar avaliação inicial e atendimento individual." },
];

interface BrainMapDialogProps {
  task: Task;
  returnPoint: string;
  onToggleStep: (taskId: string, stepId: string) => void;
  onCaptureMemory: (taskId: string, text: string) => void;
  onUpdateReturnPoint: (taskId: string, text: string) => void;
  onSaveEvidence: (taskId: string, text: string) => void;
  onClose: () => void;
}

function BrainMapDialog({ task, returnPoint, onToggleStep, onCaptureMemory, onUpdateReturnPoint, onSaveEvidence, onClose }: BrainMapDialogProps) {
  const [selectedId, setSelectedId] = useState<MapNodeId>("memory");
  const [motionPaused, setMotionPaused] = useState(false);
  const [returnDraft, setReturnDraft] = useState(returnPoint);
  const [evidenceDraft, setEvidenceDraft] = useState(task.evidence ?? "Captura da campanha salva em /Viva Serra/Revisão");
  const [captureDraft, setCaptureDraft] = useState("Confirmar orçamento diário com a Pati");
  const [goalExpanded, setGoalExpanded] = useState(false);
  const [selectedResourceId, setSelectedResourceId] = useState(demoResources[0].id);
  const [feedback, setFeedback] = useState("");
  const completedSteps = task.steps.filter((step) => step.done).length;
  const nextStep = task.steps.find((step) => !step.done);
  const notes = task.memoryNotes?.length ? task.memoryNotes : [
    { id: "demo-note-1", text: "Usar a segmentação de 15 km aprovada na última reunião.", createdAt: new Date().toISOString() },
    { id: "demo-note-2", text: "Conferir se o botão leva para o WhatsApp correto.", createdAt: new Date().toISOString() },
  ];
  const selectedResource = demoResources.find((resource) => resource.id === selectedResourceId) ?? demoResources[0];
  const nodes: Array<{ id: MapNodeId; label: string; title: string; detail: string; icon: React.ReactNode }> = [
    { id: "memory", label: "Memória", title: "Ponto de retomada", detail: returnPoint, icon: <RotateCcw size={17} /> },
    { id: "goal", label: "Objetivo", title: "Resultado esperado", detail: task.expectedResult, icon: <Target size={17} /> },
    { id: "project", label: "Projeto", title: task.project, detail: `${task.client} · ${task.priority === "urgent" ? "Prioridade urgente" : task.priority === "high" ? "Prioridade alta" : "Prioridade normal"}`, icon: <FolderKanban size={17} /> },
    { id: "routine", label: "Rotina", title: `${completedSteps} de ${task.steps.length} etapas`, detail: nextStep ? `Próxima ação: ${nextStep.label}` : "Etapas concluídas. Envie a prova para validação.", icon: <ListChecks size={17} /> },
    { id: "evidence", label: "Evidência", title: task.evidence ? "Prova registrada" : "Prova ainda pendente", detail: task.evidence ?? task.doneCondition, icon: <FileCheck2 size={17} /> },
    { id: "captures", label: "Capturas", title: `${notes.length} ${notes.length === 1 ? "lembrete guardado" : "lembretes guardados"}`, detail: notes[0]?.text ?? "Nenhum pensamento capturado nesta tarefa.", icon: <NotebookPen size={17} /> },
  ];
  const selected = nodes.find((node) => node.id === selectedId) ?? nodes[0];

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function showFeedback(message: string) {
    setFeedback(message);
    window.setTimeout(() => setFeedback(""), 2400);
  }

  function saveReturnPoint() {
    const value = returnDraft.trim();
    if (!value) return;
    onUpdateReturnPoint(task.id, value);
    showFeedback("Ponto de retomada salvo.");
  }

  function saveEvidence() {
    const value = evidenceDraft.trim();
    if (!value) return;
    onSaveEvidence(task.id, value);
    showFeedback("Evidência guardada na tarefa.");
  }

  function saveCapture() {
    const value = captureDraft.trim();
    if (!value) return;
    onCaptureMemory(task.id, value);
    setCaptureDraft("");
    showFeedback("Lembrete capturado sem trocar a tarefa.");
  }

  return (
    <div className="brain-map-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <dialog open className="brain-map-dialog" aria-labelledby="map-title">
        <header className="map-dialog-head">
          <div><span className="eyebrow">VISÃO ADICIONAL</span><h2 id="map-title">Mapa da tarefa</h2><p>Uma leitura visual do que sustenta seu trabalho agora.</p></div>
          <div className="map-head-actions">
            <button className="motion-toggle" onClick={() => setMotionPaused((paused) => !paused)} aria-label={motionPaused ? "Retomar movimento" : "Pausar movimento"}>{motionPaused ? <Play size={17} /> : <Pause size={17} />}<span>{motionPaused ? "Animar" : "Pausar"}</span></button>
            <button className="map-close" onClick={onClose} aria-label="Fechar mapa"><X size={20} /></button>
          </div>
        </header>

        <div className="brain-map-body">
          <section className={`map-stage ${motionPaused ? "motion-paused" : ""}`} aria-label="Relações da tarefa atual">
            <div className="map-aura map-aura-one" />
            <div className="map-aura map-aura-two" />
            <div className="map-live-status"><RadioTower size={14} /><span>{motionPaused ? "Movimento pausado" : "Mapa vivo"}</span></div>
            <div className="map-particles" aria-hidden="true">{Array.from({ length: 14 }, (_, index) => <i key={index} style={{ "--particle-angle": `${index * 25.7}deg`, "--particle-radius": `${8 + index * .35}rem`, "--particle-duration": `${19 + index * .7}s`, "--particle-delay": `${index * -1.1}s` } as React.CSSProperties} />)}</div>
            <svg className="map-links" viewBox="0 0 600 520" preserveAspectRatio="none" aria-hidden="true">
              <circle cx="300" cy="260" r="111" />
              <circle cx="300" cy="260" r="205" />
              <line x1="300" y1="260" x2="300" y2="55" />
              <line x1="300" y1="260" x2="492" y2="130" />
              <line x1="300" y1="260" x2="492" y2="370" />
              <line x1="300" y1="260" x2="300" y2="465" />
              <line x1="300" y1="260" x2="108" y2="370" />
              <line x1="300" y1="260" x2="108" y2="130" />
            </svg>

            <button className="map-center" onClick={() => setSelectedId("routine")} aria-label="Abrir rotina da tarefa atual">
              <span><Brain size={25} /></span>
              <small>TAREFA ATUAL</small>
              <strong>{task.title}</strong>
              <em>{completedSteps}/{task.steps.length || 1} etapas</em>
              <b>Abrir rotina</b>
            </button>

            {nodes.map((node, index) => (
              <button key={node.id} style={{ "--node-duration": `${5.5 + index * .55}s`, "--node-delay": `${index * -.8}s` } as React.CSSProperties} className={`map-node map-node-${node.id} ${selectedId === node.id ? "selected" : ""}`} onClick={() => setSelectedId(node.id)}>
                <span>{node.icon}</span>
                <strong>{node.label}</strong>
              </button>
            ))}
          </section>

          <aside className="map-inspector" aria-live="polite">
            <span className="map-inspector-icon">{selected.icon}</span>
            <small>{selected.label}</small>
            <h3>{selected.title}</h3>
            <p>{selected.detail}</p>

            {selected.id === "memory" && (
              <div className="map-action-panel">
                <label htmlFor="return-point-map">Editar ponto de retomada</label>
                <textarea id="return-point-map" rows={3} value={returnDraft} onChange={(event) => setReturnDraft(event.target.value)} />
                <button onClick={saveReturnPoint} disabled={!returnDraft.trim()}><Save size={15} /> Salvar retomada</button>
              </div>
            )}

            {selected.id === "goal" && (
              <div className="map-action-panel">
                <div className="goal-meter"><span><i style={{ width: `${task.steps.length ? Math.round((completedSteps / task.steps.length) * 100) : 0}%` }} /></span><small>{completedSteps} de {task.steps.length} etapas concluídas</small></div>
                <button className="map-secondary-action" onClick={() => setGoalExpanded((expanded) => !expanded)}><Target size={15} /> {goalExpanded ? "Ocultar critério" : "Ver critério de pronto"}</button>
                {goalExpanded && <p className="map-expanded-copy">{task.doneCondition}</p>}
              </div>
            )}

            {selected.id === "project" && (
              <div className="map-action-panel map-resource-panel">
                <span className="demo-data-label">DADOS DE DEMONSTRAÇÃO</span>
                <div className="resource-list">{demoResources.map((resource) => (
                  <button key={resource.id} className={selectedResourceId === resource.id ? "active" : ""} onClick={() => setSelectedResourceId(resource.id)}>
                    {resource.kind === "Documento" ? <FileText size={15} /> : resource.kind === "Pasta" ? <FolderKanban size={15} /> : <Brain size={15} />}
                    <span><strong>{resource.name}</strong><small>{resource.updated}</small></span>
                    <ChevronRight size={14} />
                  </button>
                ))}</div>
                <div className="resource-preview"><span>{selectedResource.kind}</span><p>{selectedResource.description}</p><button onClick={() => showFeedback(`${selectedResource.name} aberto na prévia.`)}><ExternalLink size={14} /> Abrir prévia</button></div>
              </div>
            )}

            {selected.id === "routine" && (
              <div className="map-action-panel map-step-list">
                <span className="demo-data-label">ETAPAS DA TAREFA</span>
                {task.steps.map((step) => (
                  <label key={step.id} className={step.done ? "done" : ""}>
                    <input type="checkbox" checked={step.done} onChange={() => onToggleStep(task.id, step.id)} />
                    <span>{step.done && <Check size={12} />}</span>
                    <p>{step.label}</p>
                  </label>
                ))}
              </div>
            )}

            {selected.id === "evidence" && (
              <div className="map-action-panel">
                <span className="demo-data-label">EXEMPLO PREENCHIDO</span>
                <label htmlFor="evidence-map">Link ou localização da prova</label>
                <div className="map-inline-input"><Link2 size={15} /><input id="evidence-map" value={evidenceDraft} onChange={(event) => setEvidenceDraft(event.target.value)} /></div>
                <button onClick={saveEvidence} disabled={!evidenceDraft.trim()}><FileCheck2 size={15} /> Guardar evidência</button>
              </div>
            )}

            {selected.id === "captures" && (
              <div className="map-action-panel">
                <span className="demo-data-label">LEMBRETES DA TAREFA</span>
                <div className="inspector-notes">{notes.slice(0, 3).map((note) => <span key={note.id}>{note.text}</span>)}</div>
                <label htmlFor="capture-map">Novo lembrete</label>
                <div className="map-inline-input"><NotebookPen size={15} /><input id="capture-map" value={captureDraft} onChange={(event) => setCaptureDraft(event.target.value)} placeholder="Guardar para depois" /></div>
                <button onClick={saveCapture} disabled={!captureDraft.trim()}><Inbox size={15} /> Capturar sem interromper</button>
              </div>
            )}

            {feedback && <div className="map-feedback" role="status"><CheckCircle2 size={15} />{feedback}</div>}
            <div className="map-safety"><CheckCircle2 size={16} /><span>Explorar o mapa não troca a tarefa atual. Alterações ficam registradas nela.</span></div>
          </aside>
        </div>
      </dialog>
    </div>
  );
}

function FocusHeader({ unread, onOpenNotifications }: { unread: number; onOpenNotifications: () => void }) {
  return <header className="focus-top"><div><span className="eyebrow">MEU TRABALHO</span><p>{formatLongDate()}</p></div><button className="bell-button" onClick={onOpenNotifications} aria-label={`${unread} notificações não lidas`}><Bell size={20} />{unread > 0 && <strong>{unread}</strong>}</button></header>;
}

function EstimateDialog({ task, onClose, onSubmit }: { task: Task; onClose: () => void; onSubmit: (minutes: number, reason: string) => void }) {
  const [minutes, setMinutes] = useState(task.executorEstimateMinutes ?? task.estimatedMinutes);
  const [reason, setReason] = useState("");
  return <TextModal title="Ajustar estimativa" onClose={onClose}><label className="field"><span>Nova previsão</span><select value={minutes} onChange={(event) => setMinutes(Number(event.target.value))}><option value={25}>25 minutos</option><option value={45}>45 minutos</option><option value={60}>1 hora</option><option value={90}>1h30</option><option value={120}>2 horas</option><option value={180}>3 horas</option><option value={240}>4 horas</option></select></label><label className="field"><span>O que mudou?</span><textarea required value={reason} onChange={(event) => setReason(event.target.value)} rows={3} placeholder="A tarefa tem mais etapas do que parecia..." /></label><p className="dialog-note">A solicitação não bloqueia a execução.</p><button className="button primary full" disabled={!reason.trim()} onClick={() => onSubmit(minutes, reason)}>Salvar nova estimativa</button></TextModal>;
}

function TextDialog({ title, label, placeholder, action, onClose, onSubmit }: { title: string; label: string; placeholder: string; action: string; onClose: () => void; onSubmit: (value: string) => void }) {
  const [value, setValue] = useState("");
  return <TextModal title={title} onClose={onClose}><label className="field"><span>{label}</span><textarea autoFocus required value={value} onChange={(event) => setValue(event.target.value)} rows={4} placeholder={placeholder} /></label><button className="button primary full" disabled={!value.trim()} onClick={() => onSubmit(value)}>{action}</button></TextModal>;
}

function TextModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><dialog open className="small-dialog"><header><h2>{title}</h2><button className="text-close" onClick={onClose}>Cancelar</button></header><div className="small-dialog-body">{children}</div></dialog></div>;
}
