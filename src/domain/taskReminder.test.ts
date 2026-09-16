import { expect, it } from "vitest";
import { seedState } from "../data/seed";
import { expectedTaskEnd, overdueTask, taskReminder } from "./taskReminder";
import type { ActivityEvent, Task } from "./models";

const task: Task = { ...seedState.tasks[0], status: "active", scheduledDate: "2026-09-15", scheduledStart: "09:00", scheduledEnd: "10:00" };
const started: ActivityEvent = { id: "start", taskId: task.id, actor: "gui", kind: "task_started", createdAt: "2026-09-15T12:00:00Z", description: "Iniciada" };

it("flags released tasks after their scheduled end without requiring a start", () => {
  const released = { ...task, status: "ready" as const, scheduledEnd: "09:30" };
  expect(overdueTask(released, [], Date.parse("2026-09-15T12:30:00Z"))).toBeNull();
  expect(overdueTask(released, [], Date.parse("2026-09-15T12:30:01Z"))).not.toBeNull();
  expect(overdueTask(released, [], Date.parse("2026-09-16T12:30:00Z"))?.id).toBe(overdueTask(released, [], Date.parse("2026-09-15T12:30:01Z"))?.id);
});
it("clears lateness on delivery or rescheduling but keeps paused tasks overdue", () => {
  const now = Date.parse("2026-09-15T14:00:00Z");
  for (const status of ["in_review", "completed", "inbox"] as const) expect(overdueTask({ ...task, status }, [started], now)).toBeNull();
  expect(overdueTask({ ...task, status: "paused" }, [started], now)).not.toBeNull();
  expect(overdueTask({ ...task, scheduledEnd: "12:00" }, [started], now)).toBeNull();
  expect(overdueTask({ ...task, status: "ready", scheduledStart: "10:00", scheduledEnd: "09:30" }, [], now)).toBeNull();
});

it("warns inside the final ten minutes using Sao Paulo agenda time", () => {
  expect(taskReminder(task, [started], Date.parse("2026-09-15T12:49:59Z"))).toBeNull();
  expect(taskReminder(task, [started], Date.parse("2026-09-15T12:50:00Z"))?.minutes).toBe(10);
  expect(taskReminder(task, [started], Date.parse("2026-09-15T12:55:00Z"))?.minutes).toBe(5);
  expect(taskReminder(task, [started], Date.parse("2026-09-15T13:00:00Z"))).toBeNull();
});
it("uses adjusted estimate from actual start when the schedule is absent or invalid", () => {
  const adjusted = { ...task, scheduledEnd: undefined, executorEstimateMinutes: 30 };
  expect(expectedTaskEnd(adjusted, [started])).toBe(Date.parse("2026-09-15T12:30:00Z"));
  expect(expectedTaskEnd({ ...adjusted, scheduledStart: "10:00", scheduledEnd: "09:30" }, [started])).toBe(Date.parse("2026-09-15T12:30:00Z"));
  expect(expectedTaskEnd(adjusted, [])).toBeNull();
});
it("does not warn for completed, paused, blocked or review tasks", () => {
  for (const status of ["completed", "paused", "blocked", "in_review", "ready"] as const) expect(taskReminder({ ...task, status }, [started], Date.parse("2026-09-15T12:50:00Z"))).toBeNull();
});
it("uses a stable reminder key and changes it when the planned end changes", () => {
  const first = taskReminder(task, [started], Date.parse("2026-09-15T12:50:00Z"));
  expect(taskReminder(task, [started], Date.parse("2026-09-15T12:55:00Z"))?.id).toBe(first?.id);
  expect(taskReminder({ ...task, scheduledEnd: "10:05" }, [started], Date.parse("2026-09-15T12:55:00Z"))?.id).not.toBe(first?.id);
});
