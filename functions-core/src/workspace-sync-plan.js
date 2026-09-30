export function removedRequestIds(previousTasks, nextTasks) {
  const nextTaskIds = new Set(nextTasks.map(task => task.id));
  return previousTasks
    .filter(task => task.requester === 'atendimento' && !nextTaskIds.has(task.id))
    .map(task => task.id);
}

export function protectCompletedTasks(previousState, nextState, role) {
  const previousTasks = Array.isArray(previousState?.tasks) ? previousState.tasks : [];
  const incomingTasks = Array.isArray(nextState?.tasks) ? [...nextState.tasks] : [];
  const incomingEvents = Array.isArray(nextState?.events) ? nextState.events : [];
  const incomingById = new Map(incomingTasks.map((task, index) => [task.id, index]));

  for (const completed of previousTasks.filter(task => task.status === 'completed')) {
    const index = incomingById.get(completed.id);
    const archivedByPati = incomingEvents.some(event =>
      event.taskId === completed.id && event.actor === 'pati' && event.kind === 'task_archived');
    const eventIsNewerThanCompletion = kind => incomingEvents.some(event =>
      event.taskId === completed.id && event.actor === 'pati' && event.kind === kind
      && Number.isFinite(Date.parse(event.createdAt))
      && Date.parse(event.createdAt) > Date.parse(completed.completedAt ?? completed.updatedAt ?? ''));

    if (index === undefined) {
      if (role === 'pati' && archivedByPati) continue;
      incomingById.set(completed.id, incomingTasks.length);
      incomingTasks.push(completed);
      continue;
    }

    const incoming = incomingTasks[index];
    const explicitlyReopened = role === 'pati' && incoming.status !== 'completed'
      && eventIsNewerThanCompletion('task_interrupted');
    if (explicitlyReopened) continue;

    if (incoming.status !== 'completed') {
      incomingTasks[index] = {
        ...incoming,
        status: 'completed',
        ...(completed.completedAt ? { completedAt: completed.completedAt } : {}),
        ...(completed.updatedAt ? { updatedAt: completed.updatedAt } : {}),
      };
    } else if (!incoming.completedAt && completed.completedAt) {
      incomingTasks[index] = { ...incoming, completedAt: completed.completedAt };
    }
  }

  const mergeById = (current, incoming) => [...new Map([
    ...(Array.isArray(current) ? current : []),
    ...(Array.isArray(incoming) ? incoming : []),
  ].filter(item => typeof item?.id === 'string').map(item => [item.id, item])).values()];

  return {
    ...nextState,
    tasks: incomingTasks,
    events: mergeById(previousState?.events, incomingEvents),
    notifications: mergeById(previousState?.notifications, nextState?.notifications),
  };
}

const requestIdentityFields = new Set([
  'requester', 'requesterName', 'requesterEmail', 'requesterUid',
  'history', 'activity', 'archivedAt', 'archivedStatus', 'archivedBy', 'syncedAt',
]);
const taskStatuses = new Set(['inbox', 'ready', 'active', 'partial', 'paused', 'blocked', 'in_review', 'completed']);
const priorities = new Set(['urgent', 'high', 'normal', 'low']);
const activityKinds = new Set(['task_created', 'task_reassigned', 'agenda_published', 'estimate_changed', 'priority_changed', 'task_started', 'progress_recorded', 'memory_captured', 'task_interrupted', 'task_blocked', 'task_unblocked', 'sent_to_review', 'task_completed', 'task_archived']);

export function planRequestMirror({ previous, task, events, role, at }) {
  if (!task) {
    if (previous.archivedAt) return { snapshot: {}, deleteFields: [], historyEntries: [], activityEntries: [], archive: null };
    return {
      snapshot: {},
      deleteFields: [],
      historyEntries: [],
      activityEntries: [{
        id: `archived:${previous.id}`,
        taskId: previous.id,
        actor: role,
        kind: 'task_archived',
        description: 'Demanda retirada da pauta pela Pati; registro mantido no histórico.',
        createdAt: at,
      }],
      archive: { archivedAt: at, archivedStatus: previous.status, archivedBy: role, updatedAt: at },
    };
  }

  const snapshot = Object.fromEntries(Object.entries(task).filter(([key, value]) =>
    !requestIdentityFields.has(key) && JSON.stringify(previous[key]) !== JSON.stringify(value)));
  const deleteFields = Object.keys(previous).filter(key =>
    !requestIdentityFields.has(key) && !Object.hasOwn(task, key));
  const historyEntries = taskStatuses.has(task.status) && priorities.has(task.priority)
    && (previous.status !== task.status || previous.priority !== task.priority)
    ? [{ status: task.status, priority: task.priority, actor: role, at }]
    : [];
  const existingActivityIds = new Set((Array.isArray(previous.activity) ? previous.activity : []).map(event => event.id));
  const activityEntries = (events ?? [])
    .filter(event => event.taskId === task.id && event.actor === role && typeof event.id === 'string'
      && typeof event.description === 'string' && typeof event.createdAt === 'string'
      && activityKinds.has(event.kind) && !existingActivityIds.has(event.id))
    .map(({ id, taskId, actor, kind, description, createdAt }) => ({ id, taskId, actor, kind, description, createdAt }));

  return { snapshot, deleteFields, historyEntries, activityEntries, archive: null };
}
