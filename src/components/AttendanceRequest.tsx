import { useState, type FormEvent } from "react";
import { ClipboardPlus, Send } from "lucide-react";
import type { Task } from "../domain/models";

export function AttendanceRequest({ onCreate }: { onCreate: (task: Omit<Task, "id" | "createdAt" | "updatedAt">) => void }) {
  const [title, setTitle] = useState("");
  const [context, setContext] = useState("");
  const [client, setClient] = useState("");
  const [sent, setSent] = useState(false);

  function submit(event: FormEvent) {
    event.preventDefault();
    onCreate({ title: title.trim(), client: client.trim() || "Não informado", project: "Solicitação de atendimento", expectedResult: context.trim(), doneCondition: "Pati avaliou a solicitação e definiu o próximo passo.", assignee: "pati", requester: "atendimento", priority: "normal", status: "inbox", estimatedMinutes: 15, shift: null, steps: [] });
    setTitle(""); setContext(""); setClient(""); setSent(true);
    window.setTimeout(() => setSent(false), 2600);
  }

  return <div className="page attendance-page"><header className="page-header"><div><span className="eyebrow">PEDIR PARA A GESTÃO</span><h1>Nova solicitação</h1><p>O pedido chega primeiro para a Pati. O Gui só recebe depois que ela organizar e encaminhar.</p></div><span className="attendance-lock"><ClipboardPlus size={18} /> Visível para a Pati</span></header><section className="attendance-card"><form className="task-form" onSubmit={submit}><label className="field field-wide"><span>O que precisa ser feito?</span><input required autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Cliente pediu uma nova campanha" /></label><label className="field"><span>Cliente</span><input value={client} onChange={(event) => setClient(event.target.value)} placeholder="Nome do cliente" /></label><label className="field field-wide"><span>Contexto do pedido</span><textarea required value={context} onChange={(event) => setContext(event.target.value)} rows={5} placeholder="Explique o pedido, prazo ou informação importante." /></label><footer className="dialog-actions field-wide"><button className="button primary" type="submit"><Send size={17} /> Enviar para Pati</button></footer>{sent && <p className="request-success">Solicitação enviada. Ela aparecerá apenas na fila da Pati.</p>}</form></section></div>;
}
