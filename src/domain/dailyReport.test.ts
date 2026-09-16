import { expect, it } from "vitest";
import { seedState } from "../data/seed";
import { agencyDate, dailyReport } from "./dailyReport";
import type { AppState } from "./models";

it("uses Sao Paulo calendar day at the UTC midnight boundary", () => {
  expect(agencyDate(new Date("2026-09-17T02:59:59Z"))).toBe("2026-09-16");
  expect(agencyDate(new Date("2026-09-17T03:00:00Z"))).toBe("2026-09-17");
});
it("separates review submissions from completion and excludes other days", () => {
  const task = { ...seedState.tasks[0], id: "task", title: "Demanda exemplo", status: "in_review" as const };
  const state: AppState = { ...seedState, tasks: [task], events: [
    { id: "1", taskId: "task", actor: "gui", kind: "sent_to_review", description: "Enviada", createdAt: "2026-09-17T02:59:59Z" },
    { id: "2", taskId: "task", actor: "pati", kind: "task_created", description: "Registro do dia seguinte", createdAt: "2026-09-17T03:00:00Z" },
  ] };
  const text = dailyReport(state, "2026-09-16");
  expect(text).toContain("ENTREGAS REGISTRADAS NO DIA\n• Nenhum registro.");
  expect(text).toContain("enviada para avaliação, sem contar como conclusão");
  expect(text).not.toContain("Registro do dia seguinte");
});
it("keeps a historical completion event even when the demand was reopened later", () => {
  const task = { ...seedState.tasks[0], status: "ready" as const, completedAt: undefined };
  const text = dailyReport({ ...seedState, tasks: [task], events: [{ id: "done", taskId: task.id, actor: "pati", kind: "task_completed", description: "Entrega conferida.", createdAt: "2026-09-16T15:00:00Z" }] }, "2026-09-16");
  expect(text).toContain("Entrega conferida.");
  expect(text).toContain("não representam uma fotografia histórica");
});
