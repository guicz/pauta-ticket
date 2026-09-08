import { describe, expect, it } from "vitest";
import { weeklySnapshot } from "./reporting";
import type { AppState, Task } from "./models";

const task = (id: string, completedAt?: string): Task => ({
  id, title: id, client: "Teste", project: "Teste", expectedResult: "Resultado",
  doneCondition: "Conferido", assignee: "gui", requester: "pati", priority: "normal",
  status: "completed", estimatedMinutes: 30, shift: null, steps: [],
  createdAt: "2026-09-01T12:00:00", updatedAt: "2026-09-07T12:00:00", completedAt,
});
const base: AppState = { tasks: [], events: [], notifications: [], morningCapacity: 120, afternoonCapacity: 120, bufferMinutes: 15 };

describe("weeklySnapshot", () => {
  it("counts only dated deliveries from Monday through Sunday", () => {
    const result = weeklySnapshot({ ...base, tasks: [
      task("previous", "2026-09-06T23:59:59"), task("monday", "2026-09-07T00:00:00"),
      task("sunday", "2026-09-13T23:59:59"), task("next", "2026-09-14T00:00:00"), task("undated"),
    ] }, new Date("2026-09-13T12:00:00"));
    expect(result.completed.map((item) => item.id)).toEqual(["monday", "sunday"]);
  });
  it("does not present old partial work as this week's activity", () => {
    const partial = { ...task("partial"), status: "active" as const, steps: [{ id: "step", label: "Parte pronta", done: true }] };
    expect(weeklySnapshot({ ...base, tasks: [partial] }, new Date("2026-09-07T12:00:00")).partial).toHaveLength(0);
    const state: AppState = { ...base, tasks: [partial], events: [{ id: "event", actor: "gui", taskId: "partial", kind: "progress_recorded", description: "Avanço", createdAt: "2026-09-07T12:00:00" }] };
    expect(weeklySnapshot(state, new Date("2026-09-07T12:00:00")).partial).toHaveLength(1);
  });
});
