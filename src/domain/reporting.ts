import type { AppState } from "./models";

export function weeklySnapshot(state: AppState, reference = new Date()) {
  const start = new Date(reference);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const inWeek = (value?: string) => !!value && new Date(value) >= start && new Date(value) < end;
  const events = state.events.filter((event) => inWeek(event.createdAt));
  const completed = state.tasks.filter((task) => task.status === "completed" && inWeek(task.completedAt));
  const partial = state.tasks.filter((task) =>
    ["active", "partial", "paused", "blocked", "in_review"].includes(task.status)
    && task.steps.some((step) => step.done)
    && events.some((event) => event.taskId === task.id && event.kind === "progress_recorded"));
  const management = events.filter((event) => event.actor === "pati" && ["task_created", "agenda_published", "estimate_changed", "priority_changed", "task_interrupted", "task_blocked", "task_completed"].includes(event.kind));
  return { start, end, completed, partial, management };
}
