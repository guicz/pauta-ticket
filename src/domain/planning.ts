export type PlanningTaskStatus =
  | "ready"
  | "active"
  | "paused"
  | "in_progress"
  | "completed";

export interface PlanningTask {
  id: string;
  title: string;
  estimateMinutes: number;
  priority: number;
  status: PlanningTaskStatus;
  verified?: boolean;
  progress?: string[];
  returnPoint?: string;
}

export interface ManagementEvent {
  id: string;
  type:
    | "demand_created"
    | "priority_changed"
    | "estimate_changed"
    | "task_interrupted";
  description: string;
  occurredAt: string;
}

function makeEventId(prefix: string, occurredAt: string): string {
  return `${prefix}-${occurredAt.replace(/\D/g, "")}`;
}

export function planDay<T extends PlanningTask>({
  tasks,
  capacityMinutes,
  bufferMinutes,
  maxTasks,
}: {
  tasks: T[];
  capacityMinutes: number;
  bufferMinutes: number;
  maxTasks: number;
}) {
  const effectiveCapacityMinutes = Math.max(0, capacityMinutes - bufferMinutes);
  const activeTask = tasks.find((task) => task.status === "active");
  const candidates = tasks
    .filter((task) => task.status === "ready" && task.id !== activeTask?.id)
    .sort((left, right) => left.priority - right.priority);

  const scheduledTasks: T[] = [];
  let scheduledMinutes = 0;

  if (activeTask && maxTasks > 0) {
    scheduledTasks.push(activeTask);
    scheduledMinutes += activeTask.estimateMinutes;
  }

  for (const task of candidates) {
    if (scheduledTasks.length >= maxTasks) break;
    if (scheduledMinutes + task.estimateMinutes > effectiveCapacityMinutes) continue;
    scheduledTasks.push(task);
    scheduledMinutes += task.estimateMinutes;
  }

  return {
    activeTask,
    effectiveCapacityMinutes,
    scheduledTasks,
    scheduledMinutes,
  };
}

export function requestEstimateChange<T extends PlanningTask>({
  task,
  requestedEstimateMinutes,
  reason,
  requestedBy,
  requestedAt,
}: {
  task: T;
  requestedEstimateMinutes: number;
  reason: string;
  requestedBy: string;
  requestedAt: string;
}) {
  const updatedTask = {
    ...task,
    estimateMinutes: requestedEstimateMinutes,
  } as T;

  const managementEvent: ManagementEvent = {
    id: makeEventId("estimate", requestedAt),
    type: "estimate_changed",
    description: `${requestedBy} alterou a estimativa de ${task.estimateMinutes} para ${requestedEstimateMinutes} minutos. ${reason}`,
    occurredAt: requestedAt,
  };

  return {
    task: updatedTask,
    executionBlocked: false,
    managementEvent,
  };
}

export function interruptTask<T extends PlanningTask>({
  activeTask,
  interruptingTask,
  returnPoint,
  reason,
  authorizedBy,
  interruptedAt,
}: {
  activeTask: T;
  interruptingTask: T;
  returnPoint: string;
  reason: string;
  authorizedBy: string;
  interruptedAt: string;
}) {
  const interruptedTask = {
    ...activeTask,
    status: "paused",
    returnPoint,
  } as T;
  const nextActiveTask = {
    ...interruptingTask,
    status: "active",
  } as T;

  const managementEvent: ManagementEvent = {
    id: makeEventId("interruption", interruptedAt),
    type: "task_interrupted",
    description: `${authorizedBy} autorizou a interrupção: ${reason}`,
    occurredAt: interruptedAt,
  };

  return {
    interruptedTask,
    activeTask: nextActiveTask,
    managementEvent,
  };
}

export function buildWeeklyReport<T extends PlanningTask>({
  tasks,
  managementEvents,
}: {
  tasks: T[];
  managementEvents: ManagementEvent[];
}) {
  const deliveries = tasks.filter(
    (task) => task.status === "completed" && task.verified === true,
  );
  const partialProgress = tasks
    .filter((task) => task.status === "in_progress" && task.progress?.length)
    .map((task) => ({
      taskId: task.id,
      title: task.title,
      completedParts: task.progress ?? [],
    }));

  return {
    deliveryCount: deliveries.length,
    deliveries,
    partialProgress,
    managementActivity: managementEvents,
  };
}
