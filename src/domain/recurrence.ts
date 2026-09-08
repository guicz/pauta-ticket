import type { Task } from "./models";

export function nextOccurrence(task: Task, tasks: Task[], now = new Date()): Task | null {
  if (!task.recurrence || task.recurrence === "none" || tasks.some((item) => item.recurrenceParentId === task.id)) return null;
  const date = new Date(now);
  if (task.recurrence === "monthly") {
    const day = date.getDate();
    date.setDate(1);
    date.setMonth(date.getMonth() + 1);
    const last = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    date.setDate(Math.min(day, last));
  } else date.setDate(date.getDate() + (task.recurrence === "weekly" ? 7 : 1));
  const scheduledDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return {
    id: `${task.id}-next`, recurrenceParentId: task.id, recurrence: task.recurrence,
    title: task.title, client: task.client, project: task.project,
    expectedResult: task.expectedResult, doneCondition: task.doneCondition,
    assignee: task.assignee, requester: task.requester, priority: task.priority,
    estimatedMinutes: task.estimatedMinutes, status: "ready", shift: task.shift,
    scheduledDate, steps: task.steps.map((step) => ({ ...step, done: false })),
    createdAt: now.toISOString(), updatedAt: now.toISOString(),
  };
}
