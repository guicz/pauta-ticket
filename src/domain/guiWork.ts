import type { Task } from "./models";

export function guiWork(tasks: Task[], date = new Date()) {
  const priority = { urgent: 0, high: 1, normal: 2, low: 3 };
  const today = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const queue = tasks.filter(task => task.assignee === "gui" && !["completed", "in_review", "inbox"].includes(task.status))
    .sort((a, b) => priority[a.priority] - priority[b.priority]);
  const running = queue.find(task => task.status === "active");
  const current = running ?? queue.find(task => task.scheduledDate && task.scheduledDate <= today && ["ready", "partial", "paused"].includes(task.status));
  const next = queue.find(task => task.id !== current?.id && ["ready", "partial", "paused"].includes(task.status));
  return { running, current, next };
}

export function reassignTask(task: Task, assignee: "pati" | "gui", now: string): Task {
  if (task.assignee === assignee || task.status === "completed") return task;
  return { ...task, assignee, status: ["active", "inbox"].includes(task.status) ? "ready" : task.status, updatedAt: now };
}
