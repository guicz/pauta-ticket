import type { AppState } from "../domain/models";
const now = new Date();
const timestamp = now.toISOString();
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
export const seedState: AppState = {
  tasks: [{
    id: "task-revisar-clientes-trafego",
    title: "Revisar clientes tráfego",
    client: "Clientes de tráfego",
    project: "Gestão de tráfego",
    expectedResult: "Revisar a situação dos clientes de tráfego e registrar o que precisa de atenção.",
    doneCondition: "Clientes revisados e resumo com pendências e próximos passos anexado para validação da Pati.",
    assignee: "gui", requester: "pati", priority: "normal", status: "ready",
    estimatedMinutes: 60, scheduledDate: today, shift: "morning",
    returnPoint: "Abra a lista de clientes de tráfego e comece pelo primeiro cliente.",
    steps: [
      { id: "traffic-list", label: "Listar os clientes de tráfego que serão revisados", done: false },
      { id: "traffic-review", label: "Conferir campanhas e resultados de cada cliente", done: false },
      { id: "traffic-summary", label: "Registrar pendências e próximos passos para a Pati", done: false },
    ],
    createdAt: timestamp, updatedAt: timestamp,
  }],
  morningCapacity: 90, afternoonCapacity: 120, bufferMinutes: 10,
  agendaPublishedAt: timestamp, events: [], notifications: [],
};
