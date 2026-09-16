import { expect, it } from "vitest";
import { notificationTaskId } from "./notificationTarget";
import type { AppNotification } from "./models";

const base: AppNotification = { id: "notice", recipient: "pati", level: "normal", title: "Aviso", message: "Texto", read: false, createdAt: "2026-09-15T12:00:00Z" };
it("opens the explicit linked demand rather than inferring from notification text", () => {
  expect(notificationTaskId({ ...base, taskId: "task-1" })).toBe("task-1");
  expect(notificationTaskId({ ...base, message: "task-1" })).toBeUndefined();
});
it("recovers task links from legacy deadline reminders", () => {
  expect(notificationTaskId({ ...base, id: "ending:task-123:1789471800000" })).toBe("task-123");
  expect(notificationTaskId({ ...base, id: "overdue:task:123:1789471800000" })).toBe("task:123");
  expect(notificationTaskId({ ...base, id: "ending:invalid" })).toBeUndefined();
});
