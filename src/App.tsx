import { useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { AppNavigation, type AppView } from "./components/AppNavigation";
import { ManagerDashboard } from "./components/ManagerDashboard";
import { ExecutorFocus } from "./components/ExecutorFocus";
import { WeeklyReport } from "./components/WeeklyReport";
import { DailyReport } from "./components/DailyReport";
import { NotificationPanel } from "./components/NotificationPanel";
import { NotificationTaskDialog } from "./components/NotificationTaskDialog";
import { notificationTaskId } from "./domain/notificationTarget";
import { LoginScreen } from "./components/LoginScreen";
import { AttendanceRequest } from "./components/AttendanceRequest";
import type { ActivityEvent, AppNotification, AppState, EvidenceAttachment, Person, Task } from "./domain/models";
import { subscribeToWorkspace, saveWorkspace, submitDemandRequest, subscribeToDemandRequests, subscribeToOwnRequests, updateDemandRequest } from "./lib/cloudState";
import { AppPreferences } from "./components/AppPreferences";
import { disconnectPush, markInboxRead, servicesConfigured, subscribeInbox, subscribePush } from "./lib/integrations";
import { setNotificationAccount } from "./lib/pwa";
import { auth, firebaseConfigured, personFromEmail } from "./lib/firebase";
import { loadState, resetState, saveState } from "./lib/storage";
import { nextOccurrence } from "./domain/recurrence";
import { reassignTask } from "./domain/guiWork";
import { useTaskNotifications } from "./lib/useTaskNotifications";

const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
type GuiTheme = "default" | "dark-premium";
const GUI_THEME_STORAGE_KEY = "pauta-theme-v2";

function viewForPerson(person: Person, view: AppView): AppView {
  if (person === "gui") return "focus";
  if (person === "atendimento") return "request";
  return ["overview", "queue", "report", "daily"].includes(view) ? view : "overview";
}

export function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [demoPerson, setDemoPerson] = useState<Person>("pati");
  const [view, setView] = useState<AppView>("overview");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationDemand, setNotificationDemand] = useState<string | null>(() => new URLSearchParams(window.location.search).get("task"));
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(!firebaseConfigured);
  const [demoMode, setDemoMode] = useState(!firebaseConfigured);
  const [cloudReady, setCloudReady] = useState(false);
  const [syncLabel, setSyncLabel] = useState("Conectando…");
  const [inbox, setInbox] = useState<{ uid: string; items: AppNotification[] } | null>(null);
  const [serviceMessage, setServiceMessage] = useState("");
  const [online, setOnline] = useState(navigator.onLine);
  const [ownRequests, setOwnRequests] = useState<Task[]>([]);
  const [themes, setThemes] = useState<Record<string, GuiTheme>>(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(GUI_THEME_STORAGE_KEY) ?? "{}");
      return saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
    } catch {
      return {};
    }
  });
  const themeAccount = demoMode ? `demo:${demoPerson}` : user?.uid ?? "signed-out";
  const guiTheme: GuiTheme = themes[themeAccount] === "dark-premium" ? "dark-premium" : "default";
  const setGuiTheme = (update: (current: GuiTheme) => GuiTheme) => setThemes(current => ({ ...current, [themeAccount]: update(guiTheme) }));
  const lastCloudState = useRef("");
  const demandRequestsRef = useRef<Task[]>([]);

  const person = demoMode ? demoPerson : personFromEmail(user?.email ?? null);
  const visibleView = viewForPerson(person, view);
  const { reminders, currentReminder, markRemindersRead } = useTaskNotifications(state, person, demoMode ? `demo:${person}` : user?.uid ?? "signed-out", demoMode || Boolean(user && cloudReady && person !== "atendimento" && !servicesConfigured));

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update); window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);

  useEffect(() => {
    const uid = !demoMode ? user?.uid : undefined;
    void setNotificationAccount(uid ?? null).catch(() => undefined);
    if (!uid) return;
    const stop = subscribeInbox(uid, items => setInbox({ uid, items }), () => setServiceMessage("Não foi possível carregar seus avisos. Tente novamente ao reconectar."));
    // Rebind an existing permission after account changes without opening a permission prompt.
    if (servicesConfigured && typeof Notification !== "undefined" && Notification.permission === "granted") void subscribePush().catch(() => setServiceMessage("Reative as notificações em Aplicativo e integrações."));
    return stop;
  }, [user?.uid, demoMode]);

  useEffect(() => {
    setOwnRequests([]);
    if (demoMode || person !== "atendimento" || !user || !servicesConfigured) return;
    return subscribeToOwnRequests(user.uid, setOwnRequests);
  }, [user?.uid, person, demoMode]);

  useEffect(() => {
    const activeTheme = guiTheme;
    document.documentElement.dataset.uiTheme = activeTheme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", guiTheme === "default" ? "#f4f6f8" : "#07111b");
    try {
      window.localStorage.setItem(GUI_THEME_STORAGE_KEY, JSON.stringify(themes));
    } catch {
      // A blocked storage only means the visual preference is session-local.
    }
    return () => {
      delete document.documentElement.dataset.uiTheme;
    };
  }, [guiTheme, themes]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("notifications") === "1") setNotificationsOpen(true);
    if (!("serviceWorker" in navigator)) return;
    const receive = (event: MessageEvent) => {
      if (event.data?.type !== "open-notifications") return;
      if (typeof event.data.taskId === "string") { setNotificationDemand(event.data.taskId); setNotificationsOpen(false); }
      else setNotificationsOpen(true);
    };
    navigator.serviceWorker.addEventListener("message", receive);
    return () => navigator.serviceWorker.removeEventListener("message", receive);
  }, []);

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

  useEffect(() => {
    if (view !== visibleView) setView(visibleView);
  }, [view, visibleView]);

  const notifications = useMemo(
    () => !demoMode && servicesConfigured ? inbox?.uid === user?.uid ? inbox?.items ?? [] : [] : [...reminders, ...state.notifications].filter((notification) => notification.recipient === person),
    [person, state.notifications, reminders, demoMode, inbox, user?.uid],
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
    const fallbackRequesterName = person === "gui" ? "Guilherme" : person === "atendimento" ? "Atendimento" : "Pati";
    const nextTask: Task = { ...task, id: id("task"), requesterName: task.requesterName ?? user?.displayName ?? fallbackRequesterName, requesterEmail: task.requesterEmail ?? user?.email ?? undefined, requesterUid: user?.uid, assignee: person === "atendimento" ? "pati" : task.assignee, requester: person === "atendimento" ? "atendimento" : task.requester, status: person === "atendimento" ? "inbox" : task.status, createdAt: now, updatedAt: now };
    if (person === "atendimento" && !demoMode) return submitDemandRequest(nextTask);
    setState((current) => ({
      ...current,
      tasks: [...current.tasks, nextTask],
      events: [
        appendEvent({ actor: "pati", kind: "task_created", taskId: nextTask.id, description: `Demanda criada: ${nextTask.title}.` }),
        ...current.events,
      ],
      notifications: [
        appendNotification({
          taskId: nextTask.id,
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
        notifications: [appendNotification({ taskId, recipient: "gui", level: "normal", title: "Nova tarefa na sua fila", message: `${target.title} foi organizada pela Pati e está pronta para entrar na pauta.` }), ...current.notifications],
      };
    });
  }

  function changeAssignee(taskId: string, assignee: "pati" | "gui") {
    if (person !== "pati") return;
    setState(current => {
      const target = current.tasks.find(task => task.id === taskId);
      if (!target) return current;
      const updated = reassignTask(target, assignee, new Date().toISOString());
      if (updated === target) return current;
      return {
        ...current,
        tasks: current.tasks.map(task => task.id === taskId ? updated : task),
        events: [appendEvent({ actor: "pati", kind: "task_reassigned", taskId, description: `Responsável alterado de ${target.assignee === "gui" ? "Gui" : "Pati"} para ${assignee === "gui" ? "Gui" : "Pati"}. Progresso preservado.` }), ...current.events],
        notifications: [appendNotification({ taskId, recipient: "gui", level: "normal", title: "Responsável atualizado", message: assignee === "pati" ? `Pati assumiu a demanda “${target.title}”.` : `A demanda “${target.title}” entrou na sua fila.` }), ...current.notifications],
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
        appendNotification({ taskId, recipient: "pati", level: "quiet", title: "Estimativa ajustada", message: `Gui informou uma nova previsão: ${minutes} minutos.` }),
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

  function saveEvidence(taskId: string, evidence: string, evidenceAttachment?: EvidenceAttachment) {
    setState((current) => ({
      ...current,
      tasks: current.tasks.map((task) => task.id === taskId
        ? { ...task, evidence, ...(evidenceAttachment ? { evidenceAttachment } : {}), updatedAt: new Date().toISOString() }
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
      notifications: [appendNotification({ taskId, recipient: "pati", level: "normal", title: "Tarefa bloqueada", message: reason }), ...current.notifications],
    }));
  }

  function submitForReview(taskId: string, evidence: string, evidenceAttachment?: EvidenceAttachment) {
    setState((current) => ({
      ...current,
      tasks: current.tasks.map((task) => task.id === taskId ? { ...task, status: "in_review", evidence, ...(evidenceAttachment ? { evidenceAttachment } : {}), updatedAt: new Date().toISOString() } : task),
      events: [appendEvent({ actor: "gui", kind: "sent_to_review", taskId, description: "Tarefa enviada para validação." }), ...current.events],
      notifications: [appendNotification({ taskId, recipient: "pati", level: "normal", title: "Entrega para validar", message: "Gui enviou uma tarefa com evidência." }), ...current.notifications],
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
      events: [appendEvent({ actor: "pati", assignee: current.tasks.find(task => task.id === taskId)?.assignee, kind: "task_completed", taskId, description: "Entrega conferida e concluída." }), ...current.events],
      notifications: [appendNotification({ taskId, recipient: "gui", level: "quiet", title: "Entrega aprovada", message: "A tarefa foi conferida e concluída." }), ...current.notifications],
    }));
  }

  function finalizeTask(taskId: string) {
    const now = new Date().toISOString();
    setState((current) => {
      const target = current.tasks.find((task) => task.id === taskId);
      if (!target || !["ready", "active", "partial", "paused"].includes(target.status)) return current;
      const next = nextOccurrence(target, current.tasks, new Date(now));
      const updated = current.tasks.map((task) => task.id === taskId ? { ...task, status: "completed" as const, completedAt: now, updatedAt: now } : task);
      return {
        ...current,
        tasks: next ? [...updated, next] : updated,
        events: [appendEvent({ actor: "pati", assignee: target.assignee, kind: "task_completed", taskId, description: "Demanda finalizada pela Pati." }), ...current.events],
        notifications: target.assignee === "gui"
          ? [appendNotification({ taskId, recipient: "gui", level: "quiet", title: "Demanda finalizada", message: `A demanda “${target.title}” foi encerrada pela Pati.` }), ...current.notifications]
          : current.notifications,
      };
    });
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
        notifications: [appendNotification({ taskId, recipient: target.assignee, level: "normal", title: "Demanda devolvida para ajustes", message: `${target.title}: ${reason}` }), ...current.notifications],
      };
    });
  }

  function markNotificationsRead() {
    if (!demoMode && servicesConfigured && user) {
      void markInboxRead(user.uid).catch(() => setServiceMessage("Não foi possível marcar seus avisos como lidos."));
      return;
    }
    markRemindersRead();
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
    setNotificationDemand(null);
  }

  async function leaveAccount() {
    try { await disconnectPush(); } catch { /* The worker identity is cleared before removing the subscription. */ }
    setNotificationsOpen(false); setNotificationDemand(null); setInbox(null);
    if (auth) await signOut(auth);
  }

  if (!authReady) {
    return <main className="login-page"><div className="login-loader">Preparando seu espaço…</div></main>;
  }

  if (!user && !demoMode) {
    return <LoginScreen onDemo={() => setDemoMode(true)} />;
  }

  return (
    <div className="app-frame" data-ui-theme={guiTheme}>
      <AppNavigation
        person={person}
        view={visibleView}
        notifications={notifications}
        onChangePerson={changePerson}
        onChangeView={(nextView) => setView(viewForPerson(person, nextView))}
        onOpenNotifications={() => setNotificationsOpen(true)}
        allowPersonSwitch={demoMode}
        syncLabel={syncLabel}
        onSignOut={() => void leaveAccount()}
        theme={guiTheme}
        onToggleTheme={() => setGuiTheme(current => current === "dark-premium" ? "default" : "dark-premium")}
      />
      <main className="app-main">
        {!online && <p role="status" className="connection-banner">Sem conexão. Reconecte-se antes de alterar sua pauta.</p>}
        {serviceMessage && <p role="status" className="connection-banner">{serviceMessage}</p>}
        <div className="workspace-content" inert={!online || undefined}>
        {currentReminder && <div role="status"><button className="task-time-alert" onClick={() => { const taskId = notificationTaskId(currentReminder); if (taskId) setNotificationDemand(taskId); else setNotificationsOpen(true); }}>{currentReminder.message} <strong>Abrir demanda</strong></button></div>}
        {person === "pati" && visibleView !== "report" && visibleView !== "daily" && (
          <ManagerDashboard
            state={state}
            queueOnly={visibleView === "queue"}
            onCreateTask={createTask}
            onPublishAgenda={publishAgenda}
            onApproveTask={approveTask}
            onFinalizeTask={finalizeTask}
            onReturnTask={returnTask}
            onForwardTask={forwardTask}
            onUpdateTask={updateTask}
            onChangeAssignee={changeAssignee}
          />
        )}
        {person === "pati" && visibleView === "report" && <WeeklyReport state={state} />}
        {person === "pati" && visibleView === "daily" && <DailyReport state={state} />}
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
            theme={guiTheme}
            onToggleTheme={() => setGuiTheme(current => current === "dark-premium" ? "default" : "dark-premium")}
          />
        )}
        </div>
        <AppPreferences key={demoMode ? `demo:${person}` : user?.uid} person={person} demo={demoMode} />
      </main>

      {notificationsOpen && (
        <NotificationPanel
          demo={demoMode}
          notifications={notifications}
          onClose={() => setNotificationsOpen(false)}
          onMarkAllRead={markNotificationsRead}
          onOpenTask={taskId => { setNotificationDemand(taskId); setNotificationsOpen(false); }}
        />
      )}

      {notificationDemand && <NotificationTaskDialog task={person === "atendimento" ? ownRequests.find(task => task.id === notificationDemand) : (demoMode || cloudReady) ? state.tasks.find(task => task.id === notificationDemand && (person === "pati" || (person === "gui" && task.assignee === "gui"))) : undefined} loading={!demoMode && !cloudReady && person !== "atendimento"} onClose={() => { setNotificationDemand(null); const url = new URL(window.location.href); url.searchParams.delete("task"); window.history.replaceState(null, "", url); }} />}

      {demoMode && (
        <div className="demo-controls">
          <select aria-label="Perfil da demonstração" value={demoPerson} onChange={event => changePerson(event.target.value as Person)}><option value="pati">Demo Pati</option><option value="gui">Demo Guilherme</option><option value="atendimento">Demo Atendimento</option></select>
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
