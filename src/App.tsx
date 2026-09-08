import { useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { AppNavigation, type AppView } from "./components/AppNavigation";
import { ManagerDashboard } from "./components/ManagerDashboard";
import { ExecutorFocus } from "./components/ExecutorFocus";
import { WeeklyReport } from "./components/WeeklyReport";
import { NotificationPanel } from "./components/NotificationPanel";
import { LoginScreen } from "./components/LoginScreen";
import type { ActivityEvent, AppNotification, AppState, Person, Task } from "./domain/models";
import { subscribeToWorkspace, saveWorkspace } from "./lib/cloudState";
import { auth, firebaseConfigured, personFromEmail } from "./lib/firebase";
import { loadState, resetState, saveState } from "./lib/storage";

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
    if (!user) return;

    setCloudReady(false);
    setSyncLabel("Sincronizando…");
    return subscribeToWorkspace(
      (remoteState) => {
        const serialized = JSON.stringify(remoteState);
        lastCloudState.current = serialized;
        setState((current) => JSON.stringify(current) === serialized ? current : remoteState);
        setCloudReady(true);
        setSyncLabel("Sincronizado");
      },
      () => setSyncLabel("Falha de sincronização"),
    );
  }, [demoMode, user]);

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
    const nextTask: Task = { ...task, id: id("task"), createdAt: now, updatedAt: now };
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
          title: "Nova demanda registrada",
          message: `${nextTask.title} entrou na fila sem alterar sua tarefa atual.`,
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
      tasks: current.tasks.map((task) => task.id === taskId ? { ...task, status: "completed", completedAt: now, updatedAt: now } : task),
      events: [appendEvent({ actor: "pati", kind: "task_completed", taskId, description: "Entrega conferida e concluída." }), ...current.events],
      notifications: [appendNotification({ recipient: "gui", level: "quiet", title: "Entrega aprovada", message: "A tarefa foi conferida e concluída." }), ...current.notifications],
    }));
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
            onUpdateTask={updateTask}
          />
        )}
        {person === "pati" && view === "report" && <WeeklyReport state={state} />}
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
