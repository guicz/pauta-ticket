import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
const roleForEmail = email => email === 'patricia@dg5.com.br' ? 'pati' : email === 'guilherme@dg5.com.br' ? 'gui' : 'atendimento';
import { validateWorkspaceWrite } from './workspace-policy.js';
import { planRequestMirror, removedRequestIds } from './workspace-sync-plan.js';

export const saveTeamWorkspace = onCall({ region: 'us-central1', maxInstances: 1, memory: '256MiB' }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Entre na sua conta.');
  const role = roleForEmail(request.auth.token.email);
  const db = getFirestore();
  const workspace = db.doc('workspaces/pauta-fluxo');
  await db.runTransaction(async tx => {
    const current = await tx.get(workspace);
    try { validateWorkspaceWrite(role, current.data(), request.data); }
    catch (error) { throw new HttpsError('permission-denied', error.message); }
    const { tasks, events, notifications, morningCapacity, afternoonCapacity, bufferMinutes, agendaPublishedAt } = request.data;
    const state = { tasks, events, notifications, morningCapacity, afternoonCapacity, bufferMinutes, ...(agendaPublishedAt ? { agendaPublishedAt } : {}), syncedAt: FieldValue.serverTimestamp() };
    // Request ownership is read from its original document, never from the client workspace.
    const previousTasks = current.data()?.tasks ?? [];
    const removedRequests = removedRequestIds(previousTasks, tasks);
    const requestIds = new Set([
      ...tasks.filter(task => task.requester === 'atendimento').map(task => task.id),
      ...removedRequests,
    ]);
    const refs = [...requestIds].map(id => db.doc(`demandRequests/${id}`));
    const originals = refs.length ? await tx.getAll(...refs) : [];
    for (const original of originals) {
      if (!original.exists) continue;
      const task = tasks.find(item => item.id === original.id);
      const previous = original.data();
      const plan = planRequestMirror({ previous, task, events, role, at: new Date().toISOString() });
      const patch = { ...plan.snapshot };
      for (const field of plan.deleteFields ?? []) patch[field] = FieldValue.delete();
      if (plan.historyEntries.length) patch.history = FieldValue.arrayUnion(...plan.historyEntries);
      if (plan.activityEntries.length) patch.activity = FieldValue.arrayUnion(...plan.activityEntries);
      if (plan.archive) Object.assign(patch, plan.archive);
      if (Object.keys(patch).length) {
        patch.syncedAt = FieldValue.serverTimestamp();
        tx.update(original.ref, patch);
      }
    }
    tx.set(workspace, state);
  });
  return { saved: true };
});
