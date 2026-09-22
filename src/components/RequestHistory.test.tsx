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
});
