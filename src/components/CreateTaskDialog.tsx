import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import type { Person, Priority, Shift, Task } from "../domain/models";

interface CreateTaskDialogProps {
  onClose: () => void;
  onCreate: (task: Omit<Task, "id" | "createdAt" | "updatedAt">) => void;
}

export function CreateTaskDialog({ onClose, onCreate }: CreateTaskDialogProps) {
  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [project, setProject] = useState("");
  const [expectedResult, setExpectedResult] = useState("");
  const [doneCondition, setDoneCondition] = useState("");
  const [steps, setSteps] = useState("");
  const [estimate, setEstimate] = useState(25);
  const [priority, setPriority] = useState<Priority>("normal");
  const [assignee, setAssignee] = useState<Person>("gui");
  const [shift, setShift] = useState<Shift>(null);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [recurrence, setRecurrence] = useState<Task["recurrence"]>("none");

  function submit(event: FormEvent) {
    event.preventDefault();
    const now = new Date();
    const scheduledDate = shift ? now.toISOString().slice(0, 10) : undefined;
    onCreate({
      title: title.trim(),
      client: client.trim() || "Interno",
      project: project.trim() || "Sem projeto",
      expectedResult: expectedResult.trim(),
      doneCondition: doneCondition.trim(),
      assignee,
      requester: "pati",
      priority,
      status: "ready",
      estimatedMinutes: estimate,
      scheduledDate,
      shift,
      scheduledStart: start || undefined,
      scheduledEnd: end || undefined,
      recurrence,
      steps: steps
        .split("\n")
        .map((label) => label.trim())
        .filter(Boolean)
        .map((label, index) => ({ id: `step-${Date.now()}-${index}`, label, done: false })),
    });
    onClose();
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <dialog open className="task-dialog" aria-labelledby="new-task-title">
        <header className="dialog-header">
          <div>
            <span className="eyebrow">NOVA DEMANDA</span>
            <h2 id="new-task-title">Transforme o pedido em ação</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </button>
        </header>

        <form onSubmit={submit} className="task-form">
          <label className="field field-wide">
            <span>Ação clara</span>
            <input required autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Revisar textos da página" />
          </label>

          <label className="field">
            <span>Cliente</span>
            <input value={client} onChange={(event) => setClient(event.target.value)} placeholder="Cliente ou área" />
          </label>
          <label className="field">
            <span>Projeto</span>
            <input value={project} onChange={(event) => setProject(event.target.value)} placeholder="Projeto relacionado" />
          </label>

          <label className="field field-wide">
            <span>Resultado esperado</span>
            <textarea required value={expectedResult} onChange={(event) => setExpectedResult(event.target.value)} placeholder="O que muda quando esta tarefa termina?" rows={2} />
          </label>
          <label className="field field-wide">
            <span>Pronto quando</span>
            <textarea required value={doneCondition} onChange={(event) => setDoneCondition(event.target.value)} placeholder="Qual prova confirma a conclusão?" rows={2} />
          </label>
          <label className="field field-wide">
            <span>Etapas curtas <small>(uma por linha)</small></span>
            <textarea value={steps} onChange={(event) => setSteps(event.target.value)} placeholder={"Revisar título\nConferir benefícios\nAnexar o link"} rows={3} />
          </label>

          <label className="field">
            <span>Estimativa inicial</span>
            <select value={estimate} onChange={(event) => setEstimate(Number(event.target.value))}>
              <option value={5}>5 minutos</option>
              <option value={15}>15 minutos</option>
              <option value={25}>25 minutos</option>
              <option value={45}>45 minutos</option>
              <option value={60}>1 hora</option>
              <option value={90}>1h30</option>
            </select>
            <small>Tarefas maiores devem ser divididas.</small>
          </label>
          <label className="field">
            <span>Prioridade</span>
            <select value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>
              <option value="low">Baixa</option>
              <option value="normal">Normal</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </select>
          </label>
          <label className="field">
            <span>Responsável</span>
            <select value={assignee} onChange={(event) => setAssignee(event.target.value as Person)}>
              <option value="gui">Guilherme</option>
              <option value="pati">Pati</option>
            </select>
          </label>
          <label className="field">
            <span>Período</span>
            <select value={shift ?? ""} onChange={(event) => setShift((event.target.value || null) as Shift)}>
              <option value="">Deixar na fila</option>
              <option value="morning">Manhã de hoje</option>
              <option value="afternoon">Tarde de hoje</option>
            </select>
          </label>
          <label className="field"><span>Horário de início</span><input type="time" value={start} onChange={(event) => setStart(event.target.value)} /><small>Use junto com manhã ou tarde para montar a pauta.</small></label>
          <label className="field"><span>Horário de término</span><input type="time" value={end} min={start || undefined} onChange={(event) => setEnd(event.target.value)} /><small>O intervalo continua protegido dentro do turno.</small></label>

          <label className="field field-wide"><span>Repetição</span><select value={recurrence} onChange={(event) => setRecurrence(event.target.value as Task["recurrence"])}><option value="none">Não repetir</option><option value="daily">Diária</option><option value="weekly">Semanal</option><option value="monthly">Mensal</option></select><small>A próxima ocorrência será criada após a aprovação: um dia, uma semana ou um mês depois. Não interrompe a tarefa atual.</small></label>
          <footer className="dialog-actions field-wide">
            <button type="button" className="button secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="button primary">Adicionar demanda</button>
          </footer>
        </form>
      </dialog>
    </div>
  );
}
