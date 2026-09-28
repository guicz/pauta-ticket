import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { seedState } from "../data/seed";
import { ManagerDashboard } from "./ManagerDashboard";

it("lets Pati release a blocked task back to the queue", () => {
  const task = { ...seedState.tasks[0], id: "blocked-task", title: "ADS DG5i", status: "blocked" as const, blocker: "Correções necessárias" };
  const markup = renderToStaticMarkup(<ManagerDashboard
    state={{ ...seedState, tasks: [task], events: [] }}
    queueOnly
    onCreateTask={() => {}}
    onPublishAgenda={() => {}}
    onApproveTask={() => {}}
    onFinalizeTask={() => {}}
    onReturnTask={() => {}}
    onForwardTask={() => {}}
    onUnblockTask={() => {}}
    onDeleteTask={() => {}}
    onUpdateTask={() => {}}
    onChangeAssignee={() => {}}
  />);

  expect(markup).toContain("Bloqueada");
  expect(markup).toContain("Liberar bloqueio");
});
