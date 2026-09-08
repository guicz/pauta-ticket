import { Activity, ArrowUpRight, CheckCircle2, Clock3, FileDown, Settings2 } from "lucide-react";
import type { AppState, Person, Task } from "../domain/models";
import { currentWeekRange, formatMinutes } from "../lib/format";
import { weeklySnapshot } from "../domain/reporting";

export function WeeklyReport({ state }: { state: AppState }) {
  const { completed, partial, management } = weeklySnapshot(state);
  const patiDone = completed.filter((task) => task.assignee === "pati");
  const guiDone = completed.filter((task) => task.assignee === "gui");

  return (
    <div className="page report-page">
      <header className="page-header report-header">
        <div><span className="eyebrow">RELATÓRIO DE GESTÃO</span><h1>Semana em movimento</h1><p>{currentWeekRange()}</p></div>
        <button className="button secondary" onClick={() => window.print()}><FileDown size={17} /> Imprimir / salvar PDF</button>
      </header>

      <section className="report-summary">
        <div className="summary-lead"><span>RESUMO DA SEMANA</span><strong>{completed.length}</strong><p>entregas concluídas e conferidas</p></div>
        <div className="summary-stat"><CheckCircle2 size={18} /><div><strong>{patiDone.length}</strong><span>entregas da Pati</span></div></div>
        <div className="summary-stat"><Activity size={18} /><div><strong>{guiDone.length}</strong><span>entregas do Gui</span></div></div>
        <div className="summary-stat"><Settings2 size={18} /><div><strong>{management.length}</strong><span>ações de gestão</span></div></div>
      </section>

      <div className="report-grid">
        <section className="report-section deliveries">
          <SectionTitle icon={CheckCircle2} title="Entregas concluídas" note="Somente resultados conferidos entram nesta conta." />
          <div className="report-list">
            {completed.map((task) => <ReportTask key={task.id} task={task} />)}
            {completed.length === 0 && <EmptyReport text="Nenhuma entrega concluída nesta semana." />}
          </div>
        </section>

        <section className="report-section progress-section">
          <SectionTitle icon={Clock3} title="Progresso em andamento" note="Tarefas com registros nesta semana. As etapas abaixo mostram o avanço acumulado, sem contar como entrega final." />
          <div className="report-list">
            {partial.map((task) => {
              const done = task.steps.filter((step) => step.done);
              return <article className="progress-item" key={task.id}><div className="progress-number">{done.length}/{task.steps.length}</div><div><strong>{task.title}</strong><p>{done.map((step) => step.label).join(" · ")}</p>{task.returnPoint && <small>Retomar: {task.returnPoint}</small>}</div></article>;
            })}
            {partial.length === 0 && <EmptyReport text="Nenhum progresso parcial registrado." />}
          </div>
        </section>

        <section className="report-section management-section">
          <SectionTitle icon={Settings2} title="Trabalho de gestão" note="Organização, decisões e bloqueios resolvidos pela Pati." />
          <div className="timeline">
            {management.map((event) => <article key={event.id}><span /><div><strong>{event.description}</strong><small>{new Intl.DateTimeFormat("pt-BR", { weekday: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(event.createdAt))}</small></div></article>)}
            {management.length === 0 && <EmptyReport text="Nenhuma ação de gestão registrada." />}
          </div>
        </section>

        <section className="report-section next-week">
          <SectionTitle icon={ArrowUpRight} title="Próxima semana" note="Itens abertos que precisam de decisão ou continuidade." />
          <div className="next-week-numbers">
            <div><strong>{state.tasks.filter((task) => task.status === "ready").length}</strong><span>prontas</span></div>
            <div><strong>{state.tasks.filter((task) => task.status === "blocked").length}</strong><span>bloqueadas</span></div>
            <div><strong>{state.tasks.filter((task) => task.status === "in_review").length}</strong><span>em validação</span></div>
          </div>
        </section>
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, note }: { icon: typeof Activity; title: string; note: string }) {
  return <header className="report-section-title"><span><Icon size={18} /></span><div><h2>{title}</h2><p>{note}</p></div></header>;
}

function ReportTask({ task }: { task: Task }) {
  return <article className="report-task"><span className={`avatar avatar-${task.assignee}`}>{task.assignee === "gui" ? "G" : "P"}</span><div><strong>{task.title}</strong><p>{task.client} · {task.project}</p><small>{task.evidence || task.doneCondition}</small>{task.evidenceAttachment && <span className="report-proof"><CheckCircle2 size={13} /> Print anexado</span>}</div><span className="report-time">{formatMinutes(task.actualMinutes ?? task.executorEstimateMinutes ?? task.estimatedMinutes)}</span></article>;
}

function EmptyReport({ text }: { text: string }) { return <div className="report-empty">{text}</div>; }
