import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RequestHistory } from "./RequestHistory";
import { seedState } from "../data/seed";
describe("request history permissions", () => {
  it("shows completed requests and gives only Pati the priority selector", () => {
    const tasks = [{ ...seedState.tasks[0], status: "completed" as const }];
    const render = (manager: boolean) => renderToStaticMarkup(<RequestHistory tasks={tasks} events={[]} manager={manager} onPriority={() => {}} />);
    expect(render(true)).toContain(`Prioridade de ${tasks[0].title} no histórico`);
    expect(render(false)).not.toContain(`Prioridade de ${tasks[0].title} no histórico`);
    expect(render(false)).toContain("Concluído");
    expect(render(false)).not.toContain('role="tooltip"');
  });

  it("shows the complete request brief, archived status and Gui's recorded return to its requester", () => {
    const task = {
      ...seedState.tasks[0],
      requester: "atendimento" as const,
      status: "completed" as const,
      expectedResult: "Publish the approved page and verify the public link.",
      doneCondition: "The live page loads and matches the approved copy.",
      steps: [{ id: "step-1", label: "Verify the public link", done: true }],
      archivedAt: "2026-09-25T12:00:00.000Z",
      archivedStatus: "completed" as const,
      activity: [{ id: "gui-return", taskId: "request-1", actor: "gui" as const, kind: "progress_recorded" as const, description: "Gui retornou: aguardando confirmação da colega.", createdAt: "2026-09-25T11:00:00.000Z" }],
    };
    const markup = renderToStaticMarkup(<RequestHistory tasks={[task]} events={[]} manager={false} onPriority={() => {}} />);
    expect(markup).toContain("Resultado esperado:");
    expect(markup).toContain("Publish the approved page and verify the public link.");
    expect(markup).toContain("The live page loads and matches the approved copy.");
    expect(markup).toContain("Verify the public link");
    expect(markup).toContain("Arquivada · Concluído");
    expect(markup).toContain("Gui retornou: aguardando confirmação da colega.");
  });
});
