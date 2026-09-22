import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
const roleForEmail = email => email === 'patricia@dg5.com.br' ? 'pati' : email === 'guilherme@dg5.com.br' ? 'gui' : 'atendimento';
import { validateWorkspaceWrite } from './workspace-policy.js';

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
    const refs = tasks.filter(task => task.requester === 'atendimento').map(task => db.doc(`demandRequests/${task.id}`));
    const originals = refs.length ? await tx.getAll(...refs) : [];
    for (const original of originals) {
      if (!original.exists) continue;
      const task = tasks.find(item => item.id === original.id);
      const previous = original.data();
      if (previous.status === task.status && previous.priority === task.priority) continue;
      const entry = { status: task.status, priority: task.priority, actor: role, at: new Date().toISOString() };
      tx.update(original.ref, { status: task.status, priority: task.priority, updatedAt: entry.at, history: FieldValue.arrayUnion(entry) });
    }
    tx.set(workspace, state);
  });
  return { saved: true };
});
