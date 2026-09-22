import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AppNavigation } from "./AppNavigation";
import type { Person } from "../domain/models";

const navigation = (person: Person) => renderToStaticMarkup(<AppNavigation person={person} view={person === "gui" ? "focus" : person === "pati" ? "overview" : "request"} notifications={[]} onChangePerson={() => {}} onChangeView={() => {}} onOpenNotifications={() => {}} allowPersonSwitch={false} theme="default" onToggleTheme={() => {}} />);
describe("shared appearance preserves role-specific navigation", () => {
  it("offers the light/dark toggle to every role", () => {
    for (const person of ["gui", "pati", "atendimento"] as const) expect(navigation(person)).toContain("Modo escuro");
  });
  it("keeps manager actions out of the executor and attendance menus", () => {
    expect(navigation("pati")).toContain("Relatório semanal");
    for (const person of ["gui", "atendimento"] as const) {
      expect(navigation(person)).not.toContain("Relatório semanal");
      expect(navigation(person)).not.toContain("Fila de demandas");
      expect(navigation(person)).not.toContain("Trocar");
    }
  });
});
