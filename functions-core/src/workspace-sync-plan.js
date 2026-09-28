export function removedRequestIds(previousTasks, nextTasks) {
  const nextTaskIds = new Set(nextTasks.map(task => task.id));
  return previousTasks
    .filter(task => task.requester === 'atendimento' && !nextTaskIds.has(task.id))
    .map(task => task.id);
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
