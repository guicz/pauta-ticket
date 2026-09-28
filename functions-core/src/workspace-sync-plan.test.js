import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planRequestMirror, removedRequestIds } from './workspace-sync-plan.js';

test('identifies only request documents removed from the manager workspace', () => {
  const previous = [
    { id: 'request-1', requester: 'atendimento' },
    { id: 'manual-1', requester: 'pati' },
    { id: 'request-2', requester: 'atendimento' },
  ];
  const next = [previous[1], previous[2]];

  assert.deepEqual(removedRequestIds(previous, next), ['request-1']);
});

test('mirrors the full request description, status and forwarding activity without changing ownership', () => {
  const previous = { id: 'r1', requester: 'atendimento', requesterUid: 'uid-owner', requesterEmail: 'colleague@example.test', status: 'inbox', priority: 'normal', expectedResult: 'old' };
  const task = { ...previous, requesterUid: 'forged', requesterEmail: 'other@example.test', status: 'ready', expectedResult: 'Description in full', doneCondition: 'Acceptance evidence', steps: [{ id: 's1', label: 'First step', done: false }], client: 'Client', project: 'Project', updatedAt: '2026-09-25T12:00:00.000Z' };
  const events = [{ id: 'forward', taskId: 'r1', actor: 'pati', kind: 'task_reassigned', description: 'Forwarded to Gui', createdAt: '2026-09-25T12:00:00.000Z' }];

  const plan = planRequestMirror({ previous, task, events, role: 'pati', at: '2026-09-25T12:00:00.000Z' });
  assert.equal(plan.snapshot.expectedResult, 'Description in full');
  assert.equal(plan.snapshot.doneCondition, 'Acceptance evidence');
  assert.deepEqual(plan.snapshot.steps, [{ id: 's1', label: 'First step', done: false }]);
  assert.equal(plan.snapshot.requesterUid, undefined);
  assert.equal(plan.snapshot.requesterEmail, undefined);
  assert.deepEqual(plan.historyEntries, [{ status: 'ready', priority: 'normal', actor: 'pati', at: '2026-09-25T12:00:00.000Z' }]);
  assert.deepEqual(plan.activityEntries, events);
});

test('mirrors Gui status transitions and the text of his returns to the request history', () => {
  const previous = { id: 'r1', requester: 'atendimento', status: 'ready', priority: 'normal', returnPoint: 'Initial' };
  const task = { ...previous, status: 'blocked', blocker: 'Awaiting access', returnPoint: 'Resume by checking permissions', memoryNotes: [{ id: 'm1', text: 'Client response', createdAt: '2026-09-25T12:01:00.000Z' }] };
  const events = [{ id: 'block', taskId: 'r1', actor: 'gui', kind: 'task_blocked', description: 'Blocked: awaiting access', createdAt: '2026-09-25T12:01:00.000Z' }];

  const plan = planRequestMirror({ previous, task, events, role: 'gui', at: '2026-09-25T12:01:00.000Z' });
  assert.equal(plan.snapshot.blocker, 'Awaiting access');
  assert.equal(plan.snapshot.returnPoint, 'Resume by checking permissions');
  assert.equal(plan.snapshot.memoryNotes[0].text, 'Client response');
  assert.equal(plan.historyEntries[0].actor, 'gui');
  assert.deepEqual(plan.activityEntries, events);
});

test('mirrors Pati\'s blocked-task release to the request history', () => {
  const previous = { id: 'r1', requester: 'atendimento', status: 'blocked', priority: 'high', blocker: 'Corrections needed' };
  const { blocker: _blocker, ...unblockedTask } = previous;
  const task = { ...unblockedTask, status: 'ready' };
  const event = { id: 'release', taskId: 'r1', actor: 'pati', assignee: 'gui', kind: 'task_unblocked', description: 'Blocked status removed by Pati.', createdAt: '2026-09-28T12:00:00.000Z' };

  const plan = planRequestMirror({ previous, task, events: [event], role: 'pati', at: event.createdAt });
  assert.equal(plan.snapshot.status, 'ready');
  assert.ok(plan.deleteFields.includes('blocker'));
  assert.deepEqual(plan.activityEntries, [{ id: event.id, taskId: event.taskId, actor: event.actor, kind: event.kind, description: event.description, createdAt: event.createdAt }]);
});

test('archives removed requests instead of deleting their durable history', () => {
  const plan = planRequestMirror({ previous: { id: 'r1', status: 'completed', priority: 'normal' }, task: undefined, events: [], role: 'pati', at: '2026-09-25T12:02:00.000Z' });
  assert.deepEqual(plan.archive, { archivedAt: '2026-09-25T12:02:00.000Z', archivedStatus: 'completed', archivedBy: 'pati', updatedAt: '2026-09-25T12:02:00.000Z' });
  assert.equal(plan.activityEntries[0].kind, 'task_archived');
  assert.equal(plan.activityEntries[0].actor, 'pati');
});

test('does not create duplicate timeline entries or rewrite an unchanged request', () => {
  const previous = { id: 'r1', requester: 'atendimento', status: 'ready', priority: 'normal', expectedResult: 'Goal' };
  const event = { id: 'known', taskId: 'r1', actor: 'pati', kind: 'task_reassigned', description: 'Forwarded', createdAt: '2026-09-25T12:00:00.000Z' };
  const plan = planRequestMirror({ previous: { ...previous, activity: [event] }, task: { ...previous }, events: [event], role: 'pati', at: '2026-09-25T12:00:00.000Z' });
  assert.deepEqual(plan.snapshot, {});
  assert.deepEqual(plan.historyEntries, []);
  assert.deepEqual(plan.activityEntries, []);
});
