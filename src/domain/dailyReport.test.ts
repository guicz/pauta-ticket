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
  expect(text).toContain("TAREFAS EXECUTADAS POR PATI — ENTREGAS NO DIA\n• Nenhum registro.");
  expect(text).toContain("não significa aprovação da Pati");
  expect(text).not.toContain("Registro do dia seguinte");
});
it("keeps a historical completion event even when the demand was reopened later", () => {
  const task = { ...seedState.tasks[0], assignee: "pati" as const, status: "ready" as const, completedAt: undefined };
  const text = dailyReport({ ...seedState, tasks: [task], events: [{ id: "done", taskId: task.id, actor: "pati", kind: "task_completed", description: "Entrega conferida.", createdAt: "2026-09-16T15:00:00Z" }] }, "2026-09-16");
  expect(text).toContain("Entrega conferida.");
  expect(text).toContain("não representam uma fotografia histórica");
});

it("separates Pati execution and management from Gui submissions, preserving completion ownership", () => {
  const task = { ...seedState.tasks[0], id: "gui", assignee: "pati" as const };
  const text = dailyReport({ ...seedState, tasks: [task], events: [
    { id: "sent", taskId: task.id, actor: "gui", kind: "sent_to_review", description: "Enviada", createdAt: "2026-09-16T12:00:00Z" },
    { id: "done", taskId: task.id, actor: "pati", assignee: "gui", kind: "task_completed", description: "Aprovada", createdAt: "2026-09-16T13:00:00Z" },
  ] }, "2026-09-16");
  const pati = text.split("DEMANDAS GUI")[0];
  expect(pati).toContain("ENTREGAS NO DIA\n• Nenhum registro.");
  expect(pati).toContain("Conferência/encerramento pela Pati (não é execução da tarefa).");
  expect(text.split("DEMANDAS GUI")[1]).toContain("executada e enviada por Gui");
});

it("includes carried-over overdue work and its management without inventing an execution", () => {
  const task = { ...seedState.tasks[0], id: "late", assignee: "gui" as const, status: "ready" as const, createdAt: "2026-09-14T10:00:00Z", scheduledDate: "2026-09-15", scheduledStart: "08:00", scheduledEnd: "09:30" };
  const state: AppState = { ...seedState, tasks: [task], events: [{ id: "managed", taskId: task.id, actor: "pati", kind: "priority_changed", description: "Prioridade organizada", createdAt: "2026-09-14T12:00:00Z" }] };
  const text = dailyReport(state, "2026-09-16", new Date("2026-09-16T15:00:00Z"));
  expect(text).toContain("responsável pela entrega: Gui; prazo vencido: 15/09/2026, 09:30; entrega pendente.");
  expect(text).toContain("Gestão da Pati em 14/09/2026: Prioridade organizada");
  expect(text).toContain("TAREFAS EXECUTADAS E ENVIADAS POR GUI NO DIA\n• Nenhum registro.");
  for (const status of ["completed", "in_review", "inbox"] as const) {
    expect(dailyReport({ ...state, tasks: [{ ...task, status }] }, "2026-09-16", new Date("2026-09-16T15:00:00Z"))).not.toContain("prazo vencido:");
  }
  expect(dailyReport(state, "2026-09-15", new Date("2026-09-15T12:29:00Z"))).not.toContain("prazo vencido:");
});
