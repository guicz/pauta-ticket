import { useEffect, useRef, useState, type ClipboardEvent } from "react";
import {
  AlertCircle,
  ArrowRight,
  Bell,
  Brain,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ExternalLink,
  FileCheck2,
  FileText,
  FolderKanban,
  Inbox,
  ImagePlus,
  Lightbulb,
  Link2,
  ListChecks,
  MoreHorizontal,
  Network,
  NotebookPen,
  Pause,
  PauseCircle,
  Play,
  Plus,
  RadioTower,
  RotateCcw,
  Save,
  Send,
  Search,
  Sparkles,
  Sun,
  Target,
  Trash2,
  X,
} from "lucide-react";
import type { AppNotification, AppState, EvidenceAttachment, Task } from "../domain/models";
import { guiWork } from "../domain/guiWork";
import { formatLongDate, formatMinutes, priorityLabel } from "../lib/format";

interface ExecutorFocusProps {
  state: AppState;
  notifications: AppNotification[];
  onStartTask: (taskId: string) => void;
  onToggleStep: (taskId: string, stepId: string) => void;
  onCaptureMemory: (taskId: string, text: string) => void;
  onUpdateReturnPoint: (taskId: string, text: string) => void;
  onSaveEvidence: (taskId: string, text: string, attachment?: EvidenceAttachment) => void;
  onRequestEstimate: (taskId: string, minutes: number, reason: string) => void;
  onBlockTask: (taskId: string, reason: string) => void;
  onSubmitForReview: (taskId: string, evidence: string, attachment?: EvidenceAttachment) => void;
  onOpenNotifications: () => void;
  theme?: "default" | "dark-premium";
  onToggleTheme?: () => void;
}

export function ExecutorFocus({ state, notifications, onStartTask, onToggleStep, onCaptureMemory, onUpdateReturnPoint, onSaveEvidence, onRequestEstimate, onBlockTask, onSubmitForReview, onOpenNotifications, theme = "default", onToggleTheme }: ExecutorFocusProps) {
  const [estimateOpen, setEstimateOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [memoryDraft, setMemoryDraft] = useState("");
  const [memorySaved, setMemorySaved] = useState(false);
  const unread = notifications.filter((notification) => !notification.read).length;
  const { current: active, next } = guiWork(state.tasks);

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
  const priorityRank = { urgent: 0, high: 1, normal: 2, low: 3 };
  const highlighted = next && priorityRank[next.priority] < priorityRank[active.priority] ? next : active;
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

    return <>
      <GuiPremiumFocus
        state={state}
        active={active}
        highlighted={highlighted}
        next={next}
        unread={unread}
        completedSteps={completedSteps}
        progress={progress}
        nextStep={nextStep}
        canSubmit={canSubmit}
        returnPoint={returnPoint}
        memoryDraft={memoryDraft}
        memorySaved={memorySaved}
        onStartTask={onStartTask}
        onToggleStep={onToggleStep}
        onRequestMoreTime={() => setEstimateOpen(true)}
        onBlock={() => setBlockOpen(true)}
        onReview={() => setReviewOpen(true)}
        onOpenMap={() => setMapOpen(true)}
        onSaveMemory={saveMemory}
        onMemoryDraftChange={(value) => { setMemoryDraft(value); setMemorySaved(false); }}
        onToggleTheme={undefined}
      />
      {estimateOpen && <EstimateDialog task={active} onClose={() => setEstimateOpen(false)} onSubmit={(minutes, reason) => { onRequestEstimate(active.id, minutes, reason); setEstimateOpen(false); }} />}
      {blockOpen && <TextDialog title="O que está bloqueando?" label="Motivo do bloqueio" placeholder="Ex.: Falta acesso à conta do cliente" action="Registrar bloqueio" onClose={() => setBlockOpen(false)} onSubmit={(value) => { onBlockTask(active.id, value); setBlockOpen(false); }} />}
      {reviewOpen && <EvidenceDialog onClose={() => setReviewOpen(false)} onSubmit={(value, attachment) => { onSubmitForReview(active.id, value, attachment); setReviewOpen(false); }} />}
      {mapOpen && <BrainMapDialog task={active} returnPoint={returnPoint} onToggleStep={onToggleStep} onCaptureMemory={onCaptureMemory} onUpdateReturnPoint={onUpdateReturnPoint} onSaveEvidence={onSaveEvidence} onClose={() => setMapOpen(false)} />}
    </>;
}

interface GuiPremiumFocusProps {
  state: AppState;
  active: Task;
  highlighted: Task;
  next?: Task;
  unread: number;
  completedSteps: number;
  progress: number;
  nextStep?: Task["steps"][number];
  canSubmit: boolean;
  returnPoint: string;
  memoryDraft: string;
  memorySaved: boolean;
  onStartTask: (taskId: string) => void;
  onToggleStep: (taskId: string, stepId: string) => void;
  onRequestMoreTime: () => void;
  onBlock: () => void;
  onReview: () => void;
  onOpenMap: () => void;
  onSaveMemory: () => void;
  onMemoryDraftChange: (value: string) => void;
  onToggleTheme?: () => void;
}

function GuiPremiumFocus({ state, active, highlighted, next, unread, completedSteps, progress, nextStep, canSubmit, returnPoint, memoryDraft, memorySaved, onStartTask, onToggleStep, onRequestMoreTime, onBlock, onReview, onOpenMap, onSaveMemory, onMemoryDraftChange, onToggleTheme }: GuiPremiumFocusProps) {
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
  const todayTasks = state.tasks
    .filter((task) => task.assignee === "gui" && task.scheduledDate === today && task.status !== "completed" && task.status !== "inbox")
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  const fallbackTasks = [active, ...(next ? [next] : []), ...state.tasks.filter((task) => task.assignee === "gui" && task.id !== active.id && task.id !== next?.id && task.status !== "completed" && task.status !== "inbox")];
  const availableRows = (showAll || !todayTasks.length ? fallbackTasks : todayTasks).filter(task => `${task.title} ${task.client} ${task.project}`.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")));
  const taskRows = showAll || search ? availableRows : availableRows.slice(0, 6);
  const displayDate = (value?: string) => value ? value.split("-").reverse().join("/") : "Sem data";
  const displayTime = (task: Task) => task.scheduledStart ? `${task.scheduledStart}${task.scheduledEnd ? `–${task.scheduledEnd}` : ""}` : "Sem horário";
  const heroDate = displayDate(highlighted.scheduledDate);
  const doneDate = displayDate(active.deadline ?? active.scheduledDate);

  return (
    <div className="page pauta-premium-page">
      <header className="pauta-premium-topbar">
        <label className="pauta-premium-search"><Search size={20} aria-hidden="true" /><input aria-label="Buscar minhas tarefas" placeholder="Buscar minhas tarefas..." value={search} onChange={event => setSearch(event.target.value)} /></label>
        <div className="pauta-premium-top-actions">
          {onToggleTheme && <button className="pauta-premium-icon-button" type="button" onClick={onToggleTheme} aria-label="Ativar modo claro" title="Ativar modo claro"><Sun size={21} /></button>}
          <span className="pauta-premium-avatar" aria-hidden="true">G</span>
        </div>
      </header>

      <section className="pauta-premium-welcome">
        <div>
          <p className="pauta-premium-date">{formatLongDate()}</p>
          <h1>Bom dia, Guilherme<span>.</span></h1>
          <p>Foco, execução e resultados.</p>
        </div>
        <div className="pauta-premium-welcome-actions">
          <p>“Grandes resultados<br />são a soma de pequenas<br />ações bem executadas.”</p>
        </div>
      </section>

      <section className="pauta-premium-hero" aria-label="Demanda prioritária">
        <div>
          <span className="pauta-premium-eyebrow">SEU FOCO PRIORITÁRIO</span>
          <h2>{highlighted.title}</h2>
          <div className="pauta-premium-hero-meta"><span>{highlighted.client} · {formatMinutes(highlighted.executorEstimateMinutes ?? highlighted.estimatedMinutes)} · {heroDate}</span><span className="pauta-premium-hero-badge">Prioridade {priorityLabel(highlighted.priority)}</span></div>
        </div>
        <span className="pauta-premium-target" aria-hidden="true"><Target size={54} strokeWidth={1.8} /></span>
      </section>

      <section className="pauta-premium-now" aria-label="Tarefa atual">
        <header className="pauta-premium-now-head">
          <div className="pauta-premium-now-label"><i /> <span>AGORA</span></div>
          <div className="pauta-premium-now-meta"><span className={`pauta-premium-priority pauta-premium-priority-${active.priority}`}>Prioridade {priorityLabel(active.priority)}</span><span className="pauta-premium-chip">{active.client}</span>{active.scheduledStart && <span className="pauta-premium-chip pauta-premium-time-chip">{displayTime(active)}</span>}<span className="pauta-premium-more" aria-hidden="true"><MoreHorizontal size={20} /></span></div>
        </header>
        <div className="pauta-premium-now-body">
          <p className="pauta-premium-project">{active.project}</p>
          <h2>{active.title}</h2>
          <p className="pauta-premium-next-copy">{nextStep?.label ?? "Prepare a prova da entrega"}</p>
          <div className="pauta-premium-progress"><progress aria-label="Progresso da tarefa" max={100} value={progress} /><b>{progress}%</b></div>
          <div className="pauta-premium-now-actions">
            {active.status === "active" && nextStep ? <button className="pauta-premium-button pauta-premium-button-primary" onClick={() => onToggleStep(active.id, nextStep.id)}><Check size={18} /> Concluí este passo</button> : active.status === "active" ? <button className="pauta-premium-button pauta-premium-button-primary" onClick={onReview}><Check size={18} /> Preparar envio</button> : <button className="pauta-premium-button pauta-premium-button-primary" onClick={() => onStartTask(active.id)}><Play size={18} /> Começar agora</button>}
            <button className="pauta-premium-button pauta-premium-button-secondary" onClick={onOpenMap}><ListChecks size={18} /> Detalhes</button>
          </div>
        </div>
      </section>

      <section className="pauta-premium-done-strip" aria-label="Condição de conclusão">
        <div className="pauta-premium-done-date"><span className="pauta-premium-eyebrow">PRONTO QUANDO</span><p>{active.doneCondition}</p><strong><CalendarDays size={18} /> {doneDate}</strong></div>
        <div className="pauta-premium-estimate"><span>Estimativa atual</span><strong>{formatMinutes(active.executorEstimateMinutes ?? active.estimatedMinutes)}</strong></div>
        <button className="pauta-premium-more-time" onClick={onRequestMoreTime}>Preciso de mais tempo</button>
        <div className="pauta-premium-done-actions"><button className="pauta-premium-button pauta-premium-button-secondary" onClick={onBlock}>◉ Estou bloqueado</button><button className="pauta-premium-button pauta-premium-button-primary" disabled={!canSubmit} onClick={onReview}><Check size={18} /> Enviar para validação</button></div>
      </section>

      <section className="pauta-premium-today" aria-labelledby="pauta-premium-today-title">
        <header><div><span className="pauta-premium-eyebrow" id="pauta-premium-today-title">{showAll || !todayTasks.length ? "MINHAS TAREFAS" : "MINHAS TAREFAS DE HOJE"}</span><strong>{availableRows.length}</strong></div><button className="pauta-premium-view-all" onClick={() => setShowAll(value => !value)}>{showAll ? "Ver hoje" : "Ver todas"} <ArrowRight size={17} /></button></header>
        <div className="pauta-premium-task-list">
          {taskRows.length === 0 && <p>Nenhuma tarefa encontrada.</p>}
          {taskRows.map((task) => <div className={`pauta-premium-task-row ${task.id === active.id ? "is-active" : ""}`} key={task.id}>
            <span className={`pauta-premium-task-check ${task.status === "active" ? "is-active" : ""}`} aria-hidden="true">{task.status === "active" ? "•" : ""}</span>
            <div className="pauta-premium-task-copy"><strong>{task.title}</strong><small>{task.project}</small></div>
            <span className="pauta-premium-task-project">{task.client}</span>
            <span className="pauta-premium-task-time">{displayTime(task)}</span>
            <span className={`pauta-premium-row-priority pauta-premium-row-${task.priority}`}>{priorityLabel(task.priority)}</span>
            <MoreHorizontal size={18} aria-hidden="true" />
          </div>)}
        </div>
      </section>

      <details className="pauta-premium-support">
        <summary>Contexto e memória desta tarefa <ChevronRight size={17} /></summary>
        <div className="pauta-premium-support-body">
          <p><strong>Onde você parou</strong>{returnPoint}</p>
          <p><strong>Pronto quando</strong>{active.doneCondition}</p>
          <button className="pauta-premium-button pauta-premium-button-secondary" onClick={onOpenMap}>Ver mapa desta tarefa</button>
          <label><Inbox size={16} /> Surgiu outra coisa?</label>
          <div className="pauta-premium-memory-input"><input value={memoryDraft} onChange={(event) => onMemoryDraftChange(event.target.value)} onKeyDown={(event) => event.key === "Enter" && onSaveMemory()} placeholder="Anote algo para depois..." /><button onClick={onSaveMemory} disabled={!memoryDraft.trim()} aria-label="Guardar para depois"><ArrowRight size={17} /></button></div>
          {memorySaved && <span className="pauta-premium-memory-saved"><Check size={14} /> Guardado sem trocar a tarefa.</span>}
        </div>
      </details>
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
  onSaveEvidence: (taskId: string, text: string, attachment?: EvidenceAttachment) => void;
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

function EvidenceDialog({ onClose, onSubmit }: { onClose: () => void; onSubmit: (value: string, attachment?: EvidenceAttachment) => void }) {
  const [value, setValue] = useState("");
  const [attachment, setAttachment] = useState<EvidenceAttachment>();
  const imageRequest = useRef(0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Envie um print em PNG, JPG ou WebP.");
      return;
    }
    setError("");
    const request = ++imageRequest.current;
    setProcessing(true);
    try {
      const prepared = await compressEvidenceImage(file);
      if (request === imageRequest.current) setAttachment(prepared);
    } catch {
      if (request === imageRequest.current) setError("Não foi possível preparar esse print. Tente outra imagem.");
    } finally {
      if (request === imageRequest.current) setProcessing(false);
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const images = Array.from(event.clipboardData.items).filter(item => item.kind === "file" && item.type.startsWith("image/"));
    if (!images.length) return;
    event.preventDefault();
    if (images.length > 1) {
      setError("Cole um print por vez. Cada entrega permite um print; colar outro substitui o anterior.");
      return;
    }
    const file = images[0].getAsFile();
    if (!file) {
      setError("Não foi possível ler a imagem copiada. Copie o print novamente.");
      return;
    }
    const text = event.clipboardData.getData("text/plain");
    if (text) {
      const { selectionStart, selectionEnd } = event.currentTarget;
      setValue(current => current.slice(0, selectionStart) + text + current.slice(selectionEnd));
    }
    void handleFile(file);
  }

  const canSubmit = Boolean(value.trim() || attachment) && !processing;
  return <TextModal title="Envie a prova da entrega" onClose={onClose}>
    <div className="evidence-composer">
    <label className="field"><span>Justificativa ou prova da entrega <small title="Aceita texto, links e um print. Colar outro print substitui o anterior.">ⓘ</small></span><textarea autoFocus value={value} onChange={(event) => setValue(event.target.value)} onPaste={handlePaste} rows={4} placeholder="Escreva aqui ou cole um print com Ctrl+V (⌘V no Mac)" /></label>
    {processing && <p role="status">Preparando o print…</p>}
    {attachment && <div className="evidence-preview"><img src={attachment.dataUrl} alt="Prévia do print de prova" /><div><strong>{attachment.name}</strong><small role="status">Print pronto para enviar.</small></div><button type="button" onClick={() => { imageRequest.current++; setAttachment(undefined); setProcessing(false); setError(""); }} aria-label="Remover print"><Trash2 size={16} /></button></div>}
    </div>
    <label className="evidence-upload">
      <ImagePlus size={21} />
      <span><strong>{processing ? "Preparando o print…" : attachment ? "Trocar print" : "Anexar print de prova"}</strong><small>PNG, JPG ou WebP. A imagem será reduzida automaticamente.</small></span>
      <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { void handleFile(event.target.files?.[0]); event.currentTarget.value = ""; }} />
    </label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <p className="dialog-note">A prova ajuda a Pati a validar o que foi entregue sem interromper seu fluxo.</p>
    <button className="button primary full" disabled={!canSubmit} onClick={() => onSubmit(value.trim(), attachment)}>{processing ? "Preparando…" : "Enviar para validação"}</button>
  </TextModal>;
}

function compressEvidenceImage(file: File): Promise<EvidenceAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read-error"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("image-error"));
      image.onload = () => {
        const maxDimension = 1280;
        const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve({ name: file.name, type: "image/jpeg", dataUrl: canvas.toDataURL("image/jpeg", 0.78) });
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function TextModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><dialog open className="small-dialog"><header><h2>{title}</h2><button className="text-close" onClick={onClose}>Cancelar</button></header><div className="small-dialog-body">{children}</div></dialog></div>;
}
