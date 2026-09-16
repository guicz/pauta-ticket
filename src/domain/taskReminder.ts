import type { ActivityEvent, Task } from "./models";

// Agenda da agência: America/Sao_Paulo (UTC-03).
export function expectedTaskEnd(task: Task, events: ActivityEvent[]): number | null {
  if (task.status !== "active") return null;
  const started = events.filter(event => event.taskId === task.id && event.kind === "task_started")
    .map(event => Date.parse(event.createdAt)).filter(Number.isFinite).sort((a, b) => b - a)[0];
  if (task.scheduledDate && task.scheduledEnd) {
    const end = Date.parse(`${task.scheduledDate}T${task.scheduledEnd}:00-03:00`);
    const start = task.scheduledStart ? Date.parse(`${task.scheduledDate}T${task.scheduledStart}:00-03:00`) : null;
    if (Number.isFinite(end) && (start === null || (Number.isFinite(start) && end > start)) && (started === undefined || end > started)) return end;
  }
  const minutes = task.executorEstimateMinutes ?? task.estimatedMinutes;
  return started !== undefined && minutes > 0 ? started + minutes * 60_000 : null;
}

export function taskReminder(task: Task, events: ActivityEvent[], now: number) {
  const end = expectedTaskEnd(task, events);
  if (end === null || end <= now || end - now > 10 * 60_000) return null;
  return { id: `ending:${task.id}:${end}`, end, minutes: Math.ceil((end - now) / 60_000) };
}

export function overdueTask(task: Task, events: ActivityEvent[], now: number) {
  if (["completed", "in_review", "inbox"].includes(task.status)) return null;
  let end: number | null = null;
  if (task.scheduledDate && task.scheduledEnd) {
    const scheduled = Date.parse(`${task.scheduledDate}T${task.scheduledEnd}:00-03:00`);
    const start = task.scheduledStart ? Date.parse(`${task.scheduledDate}T${task.scheduledStart}:00-03:00`) : null;
    if (Number.isFinite(scheduled) && (start === null || scheduled > start)) end = scheduled;
  }
  end ??= expectedTaskEnd(task, events);
  if (end === null || now <= end) return null;
  return { id: `overdue:${task.id}:${end}`, end };
}
