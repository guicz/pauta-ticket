import { useMemo, useState } from "react";
import { Copy, Download } from "lucide-react";
import type { AppState } from "../domain/models";
import { agencyDate, dailyReport } from "../domain/dailyReport";

export function DailyReport({ state }: { state: AppState }) {
  const [date, setDate] = useState(agencyDate);
  const [feedback, setFeedback] = useState("");
  const report = useMemo(() => dailyReport(state, date), [state, date]);
  async function copy() {
    try { await navigator.clipboard.writeText(report); setFeedback("Relatório copiado. Pronto para colar na daily."); }
    catch { setFeedback("Não foi possível copiar automaticamente. Selecione o texto abaixo e copie com Ctrl+C."); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([report], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = `daily-${date}.txt`; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="page report-page"><header className="page-header"><div><span className="eyebrow">RELATÓRIO DIÁRIO</span><h1>Resumo para a daily</h1><p>Entregas, avanços e pontos de continuidade de Pati e Gui.</p></div><div className="header-actions"><button className="button secondary" onClick={download}><Download size={18} /> Baixar texto</button><button className="button primary" onClick={copy}><Copy size={18} /> Copiar para daily</button></div></header>
    <section className="report-section daily-report"><label className="field">Dia do relatório<input type="date" value={date} max={agencyDate()} onChange={event => { if (event.target.value) setDate(event.target.value); setFeedback(""); }} /></label>
    {feedback && <p role="status">{feedback}</p>}
    <label className="field">Texto para enviar<textarea className="daily-report-text" readOnly value={report} rows={24} /></label></section></div>;
}
