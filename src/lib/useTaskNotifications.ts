import { useEffect, useRef, useState } from "react";
import type { AppNotification, AppState, Person } from "../domain/models";
import { overdueTask, taskReminder } from "../domain/taskReminder";
import { showBrowserNotification } from "./browserNotifications";
import { notificationTaskId } from "../domain/notificationTarget";

export function useTaskNotifications(state: AppState, person: Person, account: string, enabled: boolean) {
  const [now, setNow] = useState(Date.now);
  const baseline = useRef<{ account: string; since: number } | null>(null);
  const attempted = useRef(new Set<string>());
  const [reminders, setReminders] = useState<AppNotification[]>([]);
  const storageKey = `pauta-time-reminders:${account}`;
  useEffect(() => {
    baseline.current = null;
    attempted.current.clear();
    try { setReminders(JSON.parse(localStorage.getItem(storageKey) ?? "[]")); } catch { setReminders([]); }
  }, [storageKey]);
  useEffect(() => {
    if (!enabled) return;
    const tick = () => setNow(Date.now());
    tick();
    const timer = window.setInterval(tick, 15_000);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", tick); document.removeEventListener("visibilitychange", tick); };
  }, [enabled]);
  useEffect(() => {
    if (!enabled) return;
    const due = state.tasks.filter(task => person === "pati" || task.assignee === person).flatMap<AppNotification>(task => {
      const overdue = overdueTask(task, state.events, now);
      if (overdue) return [{ id: overdue.id, recipient: person, level: "urgent", title: "Demanda atrasada", message: `“${task.title}” passou do término previsto em ${new Date(overdue.end).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}. Responsável: ${task.assignee === "gui" ? "Gui" : "Pati"}.`, createdAt: new Date(now).toISOString(), read: false }];
      const reminder = task.assignee === person ? taskReminder(task, state.events, now) : null;
      return reminder ? [{ id: reminder.id, recipient: person, level: "normal" as const, title: "Fim previsto se aproximando", message: `Faltam ${reminder.minutes} min para o fim previsto de “${task.title}”. Se precisar, ajuste a estimativa.`, createdAt: new Date(now).toISOString(), read: false }] : [];
    });
    if (!due.length) return;
    setReminders(current => {
      const additions = due.filter(item => !current.some(existing => existing.id === item.id));
      if (!additions.length) return current;
      const next = [...additions, ...current].slice(0, 100);
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Keep in-memory reminders available. */ }
      return next;
    });
  }, [enabled, now, state.tasks, state.events, person, storageKey]);
  useEffect(() => {
    if (!enabled) return;
    if (baseline.current?.account !== account) baseline.current = { account, since: Date.now() };
    const dueIds = new Set(state.tasks.filter(task => person === "pati" || task.assignee === person).map(task => overdueTask(task, state.events, now)?.id ?? (task.assignee === person ? taskReminder(task, state.events, now)?.id : undefined)));
    const fresh = [...state.notifications, ...reminders].filter(item => item.recipient === person && !item.read && (/^(ending|overdue):/.test(item.id) ? dueIds.has(item.id) : Date.parse(item.createdAt) >= baseline.current!.since));
    for (const item of fresh) {
      const key = `pauta-notified:${account}:${item.id}`;
      if (attempted.current.has(key)) continue;
      attempted.current.add(key);
      const send = async () => {
        try {
          if (localStorage.getItem(key)) return;
          if (await showBrowserNotification(item.title, item.message, key, notificationTaskId(item))) localStorage.setItem(key, "1");
          else attempted.current.delete(key);
        } catch { attempted.current.delete(key); }
      };
      if (navigator.locks) void navigator.locks.request(key, send);
      else void send();
    }
  }, [enabled, account, person, now, state.notifications, state.tasks, state.events, reminders]);
  function markRemindersRead() {
    setReminders(current => {
      const next = current.map(item => ({ ...item, read: true }));
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Reading still works in memory. */ }
      return next;
    });
  }
  const currentIds = new Set(state.tasks.filter(task => person === "pati" || task.assignee === person).map(task => overdueTask(task, state.events, now)?.id ?? (task.assignee === person ? taskReminder(task, state.events, now)?.id : undefined)));
  return { reminders: enabled ? reminders : [], currentReminder: enabled ? reminders.find(item => !item.read && currentIds.has(item.id)) : undefined, markRemindersRead };
}
