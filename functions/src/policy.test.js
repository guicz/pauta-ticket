import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarEvent, roleForEmail, teamEmail, validSubscription, reminderForTask } from './policy.js';
const task = { id: 'task-1', title: 'Campanha', assignee: 'gui', status: 'ready', scheduledDate: '2026-09-22', scheduledStart: '23:30', estimatedMinutes: 120, client: 'DG5i' };
test('calendar uses stable IDs, timezone and crosses midnight correctly', () => {
  const event = calendarEvent(task, 'https://example.com');
  assert.equal(event.id, calendarEvent({ ...task, title: 'Renomeada' }, 'https://example.com').id);
  assert.equal(event.start.dateTime, '2026-09-23T02:30:00.000Z');
  assert.equal(event.end.dateTime, '2026-09-23T04:30:00.000Z');
  assert.equal(event.start.timeZone, 'America/Sao_Paulo');
});
test('all-day events have exclusive end date and do not create events for other roles or inbox', () => {
  assert.deepEqual(calendarEvent({ ...task, scheduledStart: undefined }, '').end, { date: '2026-09-23' });
  assert.equal(calendarEvent({ ...task, assignee: 'pati' }, ''), null);
  assert.equal(calendarEvent({ ...task, status: 'inbox' }, ''), null);
  assert.equal(calendarEvent({ ...task, scheduledDate: undefined }, ''), null);
});
test('completed events remain in calendar with completion label', () => {
  assert.match(calendarEvent({ ...task, status: 'completed' }, '').summary, /^✓ /);
});
test('individual attendance accounts are never broadcast targets', () => {
  assert.equal(roleForEmail('client@example.com'), 'atendimento');
  assert.equal(teamEmail('atendimento'), undefined);
  assert.equal(roleForEmail('GUILHERME@DG5.COM.BR'), 'gui');
});
test('push endpoints reject private hosts, credentials and forged vendor suffixes', () => {
  const keys = { p256dh: 'a'.repeat(87), auth: 'a'.repeat(22) };
  assert.equal(validSubscription({ endpoint: 'https://fcm.googleapis.com/fcm/send/token', keys }), true);
  for (const endpoint of ['http://fcm.googleapis.com/', 'https://127.0.0.1/', 'https://fcm.googleapis.com.evil.com/', 'https://user:pass@fcm.googleapis.com/']) assert.equal(validSubscription({ endpoint, keys }), false);
});
test('reminders ignore completed tasks and use a stable ID for repeated scheduler runs', () => {
  const scheduled = { ...task, status: 'active', scheduledEnd: '23:59' };
  const now = Date.parse('2026-09-23T02:55:00Z');
  assert.equal(reminderForTask(scheduled, [], now).id, reminderForTask(scheduled, [], now + 10000).id);
  assert.equal(reminderForTask({ ...scheduled, status: 'completed' }, [], now), null);
  assert.equal(reminderForTask(scheduled, [], now + 600000).level, 'urgent');
});
