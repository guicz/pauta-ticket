import { useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { AppNavigation, type AppView } from "./components/AppNavigation";
import { ManagerDashboard } from "./components/ManagerDashboard";
import { ExecutorFocus } from "./components/ExecutorFocus";
import { WeeklyReport } from "./components/WeeklyReport";
import { NotificationPanel } from "./components/NotificationPanel";
import { LoginScreen } from "./components/LoginScreen";
import { AttendanceRequest } from "./components/AttendanceRequest";
import type { ActivityEvent, AppNotification, AppState, Person, Task } from "./domain/models";
import { subscribeToWorkspace, saveWorkspace, submitDemandRequest, subscribeToDemandRequests, updateDemandRequest } from "./lib/cloudState";
import { auth, firebaseConfigured, personFromEmail } from "./lib/firebase";
import { loadState, resetState, saveState } from "./lib/storage";
import { nextOccurrence } from "./domain/recurrence";

const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [demoPerson, setDemoPerson] = useState<Person>("pati");
  const [view, setView] = useState<AppView>("overview");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(!firebaseConfigured);
  const [demoMode, setDemoMode] = useState(!firebaseConfigured);
  const [cloudReady, setCloudReady] = useState(false);
  const [syncLabel, setSyncLabel] = useState("Conectando…");
  const lastCloudState = useRef("");
  const demandRequestsRef = useRef<Task[]>([]);

  const person = demoMode ? demoPerson : personFromEmail(user?.email ?? null);

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
  }, []);

  useEffect(() => {
    if (demoMode) {
      setCloudReady(false);
      setSyncLabel("Demonstração local");
      return;
    }
    if (!user || person === "atendimento") {
      setCloudReady(false);
      setSyncLabel(person === "atendimento" ? "Solicitações" : "Aguardando login");
      return;
    }

    setCloudReady(false);
    setSyncLabel("Sincronizando…");
    const workspaceUnsubscribe = subscribeToWorkspace(
      (remoteState) => {
        const known = new Set(remoteState.tasks.map((task) => task.id));
        const mergedState = { ...remoteState, tasks: [...remoteState.tasks, ...demandRequestsRef.current.filter((task) => !known.has(task.id))] };
        const serialized = JSON.stringify(mergedState);
        lastCloudState.current = serialized;
        setState((current) => JSON.stringify(current) === serialized ? current : mergedState);
        setCloudReady(true);
        setSyncLabel("Sincronizado");
      },
      () => setSyncLabel("Falha de sincronização"),
    );
    const requestsUnsubscribe = person === "pati"
      ? subscribeToDemandRequests((requests) => {
          demandRequestsRef.current = requests;
          setState((current) => {
            const known = new Set(current.tasks.map((task) => task.id));
            const newRequests = requests.filter((task) => !known.has(task.id));
            return newRequests.length ? { ...current, tasks: [...current.tasks, ...newRequests] } : current;
          });
        }, () => setSyncLabel("Falha ao carregar solicitações"))
      : () => undefined;
    return () => { workspaceUnsubscribe(); requestsUnsubscribe(); };
  }, [demoMode, person, user]);

  useEffect(() => {
    if (demoMode) {
      saveState(state);
      return;
    }
    if (!user || !cloudReady) return;

    const serialized = JSON.stringify(state);
    if (serialized === lastCloudState.current) return;

    const timeout = window.setTimeout(() => {
      lastCloudState.current = serialized;
      setSyncLabel("Salvando…");
      void saveWorkspace(state)
        .then(() => setSyncLabel("Sincronizado"))
        .catch(() => {
          lastCloudState.current = "";
          setSyncLabel("Falha de sincronização");
        });
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [cloudReady, demoMode, state, user]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [person, view]);

  const notifications = useMemo(
    () => state.notifications.filter((notification) => notification.recipient === person),
    [person, state.notifications],
  );

  function appendEvent(event: Omit<ActivityEvent, "id" | "createdAt">): ActivityEvent {
    return { ...event, id: id("event"), createdAt: new Date().toISOString() };
  }

  function appendNotification(
    notification: Omit<AppNotification, "id" | "createdAt" | "read">,
  ): AppNotification {
    return { ...notification, id: id("notification"), createdAt: new Date().toISOString(), read: false };
  }

  function createTask(task: Omit<Task, "id" | "createdAt" | "updatedAt">) {
    const now = new Date().toISOString();
    const nextTask: Task = { ...task, id: id("task"), assignee: person === "atendimento" ? "pati" : task.assignee, requester: person === "atendimento" ? "atendimento" : task.requester, status: person === "atendimento" ? "inbox" : task.status, createdAt: now, updatedAt: now };
    if (person === "atendimento" && !demoMode) void submitDemandRequest(nextTask);
    setState((current) => ({
      ...current,
      tasks: [...current.tasks, nextTask],
      events: [
        appendEvent({ actor: "pati", kind: "task_created", taskId: nextTask.id, description: `Demanda criada: ${nextTask.title}.` }),
        ...current.events,
      ],
      notifications: [
        appendNotification({
          recipient: nextTask.assignee,
          level: "quiet",
          title: nextTask.requester === "atendimento" ? "Nova solicitação de atendimento" : "Nova demanda registrada",
          message: nextTask.requester === "atendimento" ? `${nextTask.title} aguarda sua triagem.` : `${nextTask.title} entrou na fila sem alterar sua tarefa atual.`,
        }),
        ...current.notifications,
      ],
    }));
  }

  function updateTask(taskId: string, changes: Partial<Task>) {
    setState((current) => ({
      ...current,
      tasks: current.tasks.map((task) =>
        task.id === taskId ? { ...task, ...changes, updatedAt: new Date().toISOString() } : task,
      ),
    }));
  }

  function forwardTask(taskId: string) {
    const now = new Date().toISOString();
    setState((current) => {
      const target = current.tasks.find((task) => task.id === taskId);
      if (!target || target.status !== "inbox") return current;
      const forwarded = { ...target, assignee: "gui" as const, status: "ready" as const, updatedAt: now };
      if (!demoMode) void updateDemandRequest(forwarded);
      return {
        ...current,
        tasks: current.tasks.map((task) => task.id === taskId ? forwarded : task),
        events: [appendEvent({ actor: "pati", kind: "task_created", taskId, description: `Solicitação encaminhada ao Gui: ${target.title}.` }), ...current.events],
        notifications: [appendNotification({ recipient: "gui", level: "normal", title: "Nova tarefa na sua fila", message: `${target.title} foi organizada pela Pati e está pronta para entrar na pauta.` }), ...current.notifications],
      };
    });
  }

  function publishAgenda() {
    const now = new Date().toISOString();
    setState((current) => ({
      ...current,
      agendaPublishedAt: now,
      events: [
        appendEvent({ actor: "pati", kind: "agenda_published", description: "Pauta do dia revisada e publicada." }),
        ...current.events,
      ],
      notifications: [
        appendNotification({ recipient: "gui", level: "normal", title: "Sua pauta está pronta", message: "A primeira ação do dia já está disponível." }),
        ...current.notifications,
      ],
    }));
  }

  function requestEstimate(taskId: string, minutes: number, reason: string) {
    setState((current) => ({
      ...current,
      tasks: current.tasks.map((task) =>
        task.id === taskId ? { ...task, executorEstimateMinutes: minutes, updatedAt: new Date().toISOString() } : task,
      ),
      events: [
        appendEvent({ actor: "gui", kind: "estimate_changed", taskId, description: `Estimativa ajustada para ${minutes} minutos. ${reason}` }),
        ...current.events,
      ],
      notifications: [
        appendNotification({ recipient: "pati", level: "quiet", title: "Estimativa ajustada", message: `Gui informou uma nova previsão: ${minutes} minutos.` }),
        ...current.notifications,
      ],
    }));
  }

  function toggleStep(taskId: string, stepId: string) {
    setState((current) => ({
      ...current,
      tasks: current.tasks.map((task) => {
        if (task.id !== taskId) return task;
        const steps = task.steps.map((step) => step.id === stepId ? { ...step, done: !step.done } : step);
        const nextStep = steps.find((step) => !step.done);
        const lastCompleted = [...steps].reverse().find((step) => step.done);
        const returnPoint = nextStep
          ? `${lastCompleted ? `Você concluiu “${lastCompleted.label}”. ` : ""}Retome em “${nextStep.label}”.`
          : "Etapas concluídas. Anexe a prova e envie para validação.";
        return { ...task, steps, returnPoint, status: task.status === "ready" ? "partial" : task.status, updatedAt: new Date().toISOString() };
      }),
      events: [
        appendEvent({ actor: "gui", kind: "progress_recorded", taskId, description: "Progresso da tarefa atualizado." }),
        ...current.events,
      ],
    }));
  }

  function captureMemory(taskId: string, text: string) {
    const now = new Date().toISOString();
    setState((current) => ({
      ...current,
      tasks: current.tasks.map((task) => task.id === taskId
        ? {
            ...task,
            memoryNotes: [{ id: id("memory"), text, createdAt: now }, ...(task.memoryNotes ?? [])],
            updatedAt: now,
          }
        : task),
      events: [
        appendEvent({ actor: "gui", kind: "memory_captured", taskId, description: "Lembrete guardado sem interromper a tarefa." }),
        ...current.events,
      ],
    }));
  }

  function updateReturnPoint(taskId: string, returnPoint: string) {
    setState((current) => ({
      ...current,
      tasks: current.tasks.map((task) => task.id === taskId
        ? { ...task, returnPoint, updatedAt: new Date().toISOString() }
        : task),
      events: [
        appendEvent({ actor: "gui", kind: "progress_recorded", taskId, description: "Ponto de retomada atualizado." }),
        ...current.events,
      ],
    }));
  }

  function saveEvidence(taskId: string, evidence: string) {
    setState((current) => ({
      ...current,
      tasks: current.tasks.map((task) => task.id === taskId
        ? { ...task, evidence, updatedAt: new Date().toISOString() }
        : task),
      events: [
        appendEvent({ actor: "gui", kind: "progress_recorded", taskId, description: "Evidência preparada para envio." }),
        ...current.events,
      ],
    }));
  }

  function startTask(taskId: string) {
    setState((current) => {
      if (current.tasks.some((task) => task.assignee === "gui" && task.status === "active" && task.id !== taskId)) return current;
      return {
        ...current,
        tasks: current.tasks.map((task) => task.id === taskId ? { ...task, status: "active", updatedAt: new Date().toISOString() } : task),
        events: [appendEvent({ actor: "gui", kind: "task_started", taskId, description: "Tarefa iniciada." }), ...current.events],
      };
    });
  }

  function blockTask(taskId: string, reason: string) {
    setState((current) => ({
      ...current,
      tasks: current.tasks.map((task) => task.id === taskId ? { ...task, status: "blocked", blocker: reason, updatedAt: new Date().toISOString() } : task),
      events: [appendEvent({ actor: "gui", kind: "task_blocked", taskId, description: `Tarefa bloqueada: ${reason}.` }), ...current.events],
      notifications: [appendNotification({ recipient: "pati", level: "normal", title: "Tarefa bloqueada", message: reason }), ...current.notifications],
    }));
  }

  function submitForReview(taskId: string, evidence: string) {
    setState((current) => ({
      ...current,
      tasks: current.tasks.map((task) => task.id === taskId ? { ...task, status: "in_review", evidence, updatedAt: new Date().toISOString() } : task),
      events: [appendEvent({ actor: "gui", kind: "sent_to_review", taskId, description: "Tarefa enviada para validação." }), ...current.events],
      notifications: [appendNotification({ recipient: "pati", level: "normal", title: "Entrega para validar", message: "Gui enviou uma tarefa com evidência." }), ...current.notifications],
    }));
  }

  function approveTask(taskId: string) {
    const now = new Date().toISOString();
    setState((current) => ({
      ...current,
      tasks: (() => {
        const target = current.tasks.find((task) => task.id === taskId);
        const next = target?.status === "in_review" ? nextOccurrence(target, current.tasks, new Date(now)) : null;
        const updated = current.tasks.map((task) => task.id === taskId ? { ...task, status: "completed" as const, completedAt: now, updatedAt: now } : task);
        return next ? [...updated, next] : updated;
      })(),
      events: [appendEvent({ actor: "pati", kind: "task_completed", taskId, description: "Entrega conferida e concluída." }), ...current.events],
      notifications: [appendNotification({ recipient: "gui", level: "quiet", title: "Entrega aprovada", message: "A tarefa foi conferida e concluída." }), ...current.notifications],
    }));
  }

  function returnTask(taskId: string, reason: string) {
    const now = new Date().toISOString();
    setState((current) => {
      const target = current.tasks.find((task) => task.id === taskId);
      if (!target || !["in_review", "completed"].includes(target.status) || !reason.trim()) return current;
      return {
        ...current,
        tasks: current.tasks.map((task) => {
          if (task.id !== taskId) return task;
          const { completedAt, ...rest } = task;
          return { ...rest, status: "ready" as const, scheduledDate: task.scheduledDate || now.slice(0, 10), returnPoint: `Ajuste solicitado pela Pati: ${reason}`, updatedAt: now, steps: [...task.steps, { id: id("adjustment"), label: `Ajustar: ${reason}`, done: false }] };
        }),
        events: [appendEvent({ actor: "pati", kind: "task_interrupted", taskId, description: `Demanda devolvida para ajustes: ${reason}` }), ...current.events],
        notifications: [appendNotification({ recipient: target.assignee, level: "normal", title: "Demanda devolvida para ajustes", message: `${target.title}: ${reason}` }), ...current.notifications],
      };
    });
  }

  function markNotificationsRead() {
    setState((current) => ({
      ...current,
      notifications: current.notifications.map((notification) => notification.recipient === person ? { ...notification, read: true } : notification),
    }));
  }

  function changePerson(nextPerson: Person) {
    if (!demoMode) return;
    setDemoPerson(nextPerson);
    setView(nextPerson === "pati" ? "overview" : "focus");
    setNotificationsOpen(false);
  }

  if (!authReady) {
    return <main className="login-page"><div className="login-loader">Preparando seu espaço…</div></main>;
  }

  if (!user && !demoMode) {
    return <LoginScreen onDemo={() => setDemoMode(true)} />;
  }

  return (
    <div className="app-frame">
      <AppNavigation
        person={person}
        view={view}
        notifications={notifications}
        onChangePerson={changePerson}
        onChangeView={setView}
        onOpenNotifications={() => setNotificationsOpen(true)}
        allowPersonSwitch={demoMode}
        syncLabel={syncLabel}
        onSignOut={() => auth && void signOut(auth)}
      />
      <main className="app-main">
        {person === "pati" && view !== "report" && (
          <ManagerDashboard
            state={state}
            queueOnly={view === "queue"}
            onCreateTask={createTask}
            onPublishAgenda={publishAgenda}
            onApproveTask={approveTask}
            onReturnTask={returnTask}
            onForwardTask={forwardTask}
            onUpdateTask={updateTask}
          />
        )}
        {person === "pati" && view === "report" && <WeeklyReport state={state} />}
        {person === "atendimento" && <AttendanceRequest onCreate={createTask} />}
        {person === "gui" && (
          <ExecutorFocus
            state={state}
            notifications={notifications}
            onStartTask={startTask}
            onToggleStep={toggleStep}
            onCaptureMemory={captureMemory}
            onUpdateReturnPoint={updateReturnPoint}
            onSaveEvidence={saveEvidence}
            onRequestEstimate={requestEstimate}
            onBlockTask={blockTask}
            onSubmitForReview={submitForReview}
            onOpenNotifications={() => setNotificationsOpen(true)}
          />
        )}
      </main>

      {notificationsOpen && (
        <NotificationPanel
          notifications={notifications}
          onClose={() => setNotificationsOpen(false)}
          onMarkAllRead={markNotificationsRead}
        />
      )}

      {demoMode && (
        <div className="demo-controls">
          {firebaseConfigured && <button className="demo-reset" onClick={() => setDemoMode(false)}>Entrar na conta</button>}
          <button
            className="demo-reset"
            onClick={() => {
              setState(resetState());
              setView(person === "pati" ? "overview" : "focus");
            }}
          >
            Restaurar demonstração
          </button>
        </div>
      )}
    </div>
  );
}
