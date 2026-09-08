import { expect, it } from "vitest";
import { nextOccurrence } from "./recurrence";
import { seedState } from "../data/seed";

it("clamps monthly recurrence to February and resets delivery evidence", () => {
  const task = { ...seedState.tasks[0], recurrence: "monthly" as const, evidence: "old", completedAt: "2026-01-31", steps: [{ id: "s", label: "Review", done: true }] };
  const next = nextOccurrence(task, [task], new Date(2026, 0, 31, 12));
  expect(next?.scheduledDate).toBe("2026-02-28");
  expect(next?.steps[0].done).toBe(false);
  expect(next?.evidence).toBeUndefined();
  expect(next?.completedAt).toBeUndefined();
  expect(nextOccurrence(task, [task, next!])).toBeNull();
});
it("schedules daily and weekly after approval and supports disabling", () => {
  const task = seedState.tasks[0];
  const now = new Date(2026, 11, 31, 12);
  expect(nextOccurrence({ ...task, recurrence: "daily" }, [], now)?.scheduledDate).toBe("2027-01-01");
  expect(nextOccurrence({ ...task, recurrence: "weekly" }, [], now)?.scheduledDate).toBe("2027-01-07");
  expect(nextOccurrence({ ...task, recurrence: "none" }, [], now)).toBeNull();
});
