import { expect, it } from "vitest";
import { seedState } from "../data/seed";
import { guiWork, reassignTask } from "./guiWork";
import type { Task } from "./models";

const base: Task = { ...seedState.tasks[0], assignee: "gui", scheduledDate: "2026-09-14", priority: "normal", status: "active" };
const urgent: Task = { ...base, id: "urgent", priority: "urgent", status: "ready" };

it("keeps started work visible when an urgent demand arrives", () => {
  const work = guiWork([urgent, base], new Date(2026, 8, 14));
  expect(work.running?.id).toBe(base.id);
  expect(work.next?.id).toBe(urgent.id);
});

it("distinguishes a scheduled preview from actual started work", () => {
  const work = guiWork([urgent], new Date(2026, 8, 14));
  expect(work.running).toBeUndefined();
  expect(work.current?.id).toBe(urgent.id);
});

it("preserves delivery history and removes reassigned work from Gui's focus", () => {
  const task = { ...base, evidence: "Print entregue", steps: [{ id: "step", label: "Parte pronta", done: true }] };
  const changed = reassignTask(task, "pati", "2026-09-14T15:00:00Z");
  expect(changed.status).toBe("ready");
  expect(changed.steps).toEqual(task.steps);
  expect(changed.evidence).toBe(task.evidence);
  expect(guiWork([changed, urgent], new Date(2026, 8, 14)).current?.id).toBe(urgent.id);
  expect(reassignTask({ ...task, status: "completed" }, "pati", "now").assignee).toBe("gui");
});
