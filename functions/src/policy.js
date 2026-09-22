import { createHash } from 'node:crypto';

export const digest = value => createHash('sha256').update(value).digest('hex');
export const roleForEmail = email => email?.toLowerCase() === 'guilherme@dg5.com.br' ? 'gui' : email?.toLowerCase() === 'patricia@dg5.com.br' ? 'pati' : 'atendimento';
export const teamEmail = role => ({ gui: 'guilherme@dg5.com.br', pati: 'patricia@dg5.com.br' })[role];

export function validSubscription(subscription) {
  try {
    const url = new URL(subscription.endpoint);
    const allowed = ['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'updates-autopush.stage.mozaws.net', 'web.push.apple.com'];
    return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
      allowed.some(host => url.hostname === host || (host === 'web.push.apple.com' && url.hostname.endsWith('.web.push.apple.com'))) &&
      typeof subscription.keys?.p256dh === 'string' && /^[\w-]{80,100}$/.test(subscription.keys.p256dh) &&
      typeof subscription.keys?.auth === 'string' && /^[\w-]{20,30}$/.test(subscription.keys.auth);
  } catch { return false; }
}

export function calendarEvent(task, origin) {
  if (task.assignee !== 'gui' || !task.scheduledDate || task.status === 'inbox') return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(task.scheduledDate)) return null;
  const id = `pauta${digest(task.id)}`;
  let start, end;
  if (task.scheduledStart && /^\d{2}:\d{2}$/.test(task.scheduledStart)) {
    const begin = Date.parse(`${task.scheduledDate}T${task.scheduledStart}:00-03:00`);
    if (!Number.isFinite(begin)) return null;
    let finish = task.scheduledEnd ? Date.parse(`${task.scheduledDate}T${task.scheduledEnd}:00-03:00`) : NaN;
    if (!Number.isFinite(finish) || finish <= begin) finish = begin + Math.max(1, task.executorEstimateMinutes ?? task.estimatedMinutes ?? 30) * 60000;
    start = { dateTime: new Date(begin).toISOString(), timeZone: 'America/Sao_Paulo' };
    end = { dateTime: new Date(finish).toISOString(), timeZone: 'America/Sao_Paulo' };
  } else {
    const date = new Date(`${task.scheduledDate}T12:00:00Z`);
    if (!Number.isFinite(date.getTime())) return null;
    date.setUTCDate(date.getUTCDate() + 1);
    start = { date: task.scheduledDate };
    end = { date: date.toISOString().slice(0, 10) };
  }
  return { id, status: 'confirmed', summary: `${task.status === 'completed' ? '✓ ' : ''}${task.title}`, start, end,
    description: [task.client, task.project, task.expectedResult, `Estado: ${task.status}`, `${origin}/?task=${encodeURIComponent(task.id)}`].filter(Boolean).join('\n'),
    extendedProperties: { private: { pautaTaskId: task.id } }, reminders: { useDefault: true } };
}

export function reminderForTask(task, events, now) {
  if (['completed', 'in_review', 'inbox'].includes(task.status)) return null;
  const started = events.filter(event => event.taskId === task.id && event.kind === 'task_started').map(event => Date.parse(event.createdAt)).filter(Number.isFinite).sort((a,b) => b-a)[0];
  let end = task.scheduledDate && task.scheduledEnd ? Date.parse(`${task.scheduledDate}T${task.scheduledEnd}:00-03:00`) : NaN;
  if (!Number.isFinite(end) && task.status === 'active' && started) end = started + (task.executorEstimateMinutes ?? task.estimatedMinutes) * 60000;
  if (!Number.isFinite(end)) return null;
  if (now > end) return { id: `overdue:${task.id}:${end}`, title: 'Demanda atrasada', level: 'urgent', message: `“${task.title}” passou do término previsto.` };
  if (task.status === 'active' && end - now <= 600000) return { id: `ending:${task.id}:${end}`, title: 'Fim previsto se aproximando', level: 'normal', message: `“${task.title}” termina em ${Math.ceil((end-now)/60000)} min.` };
  return null;
}
