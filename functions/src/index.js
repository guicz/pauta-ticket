import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentWritten, onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { setGlobalOptions } from 'firebase-functions/v2';
import { defineString, defineSecret } from 'firebase-functions/params';
import { randomBytes } from 'node:crypto';
import webpush from 'web-push';
import { OAuth2Client } from 'google-auth-library';
import { digest, roleForEmail, teamEmail, validSubscription, calendarEvent, reminderForTask } from './policy.js';

initializeApp();
setGlobalOptions({ region: 'us-central1', maxInstances: 1, concurrency: 1, memory: '256MiB' });
const db = getFirestore();
const origin = defineString('APP_ORIGIN', { default: 'https://ticket-pauta-gui.web.app' });
const clientId = defineString('GOOGLE_CALENDAR_CLIENT_ID', { default: '' });
const clientSecret = defineSecret('GOOGLE_CALENDAR_CLIENT_SECRET');
const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.app.created';
const CALENDAR_LIST_SCOPE = 'https://www.googleapis.com/auth/calendar.calendarlist.readonly';
const privateCalendar = db.doc('privateIntegrations/calendar');

function authenticated(request, guiOnly = false) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Entre na sua conta.');
  const email = request.auth.token.email?.toLowerCase();
  if (!request.auth.token.email_verified) throw new HttpsError('permission-denied', 'Confirme seu e-mail antes de conectar serviços.');
  if (guiOnly && roleForEmail(email) !== 'gui') throw new HttpsError('permission-denied', 'Disponível somente para Guilherme.');
  return { uid: request.auth.uid, email, role: roleForEmail(email) };
}

async function vapid() {
  const ref = db.doc('privateIntegrations/webPush');
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (snap.exists) return snap.data();
    const keys = webpush.generateVAPIDKeys();
    tx.create(ref, keys);
    return keys;
  });
}

export const notificationConfig = onCall(async request => {
  authenticated(request);
  return { publicKey: (await vapid()).publicKey };
});

export const registerPush = onCall(async request => {
  const account = authenticated(request);
  const subscription = request.data?.subscription;
  if (!validSubscription(subscription)) throw new HttpsError('invalid-argument', 'Assinatura inválida.');
  const ref = db.doc(`pushDevices/${digest(subscription.endpoint)}`);
  await ref.set({ ...account, subscription, updatedAt: FieldValue.serverTimestamp() });
  return { registered: true };
});

export const unregisterPush = onCall(async request => {
  const { uid } = authenticated(request);
  const endpoint = request.data?.endpoint;
  if (typeof endpoint !== 'string') throw new HttpsError('invalid-argument', 'Dispositivo inválido.');
  const ref = db.doc(`pushDevices/${digest(endpoint)}`);
  await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (snap.data()?.uid === uid) tx.delete(ref);
  });
  return { removed: true };
});

async function teamUid(role) {
  const email = teamEmail(role);
  if (!email) return null;
  try { return (await getAuth().getUserByEmail(email)).uid; }
  catch (error) { if (error.code === 'auth/user-not-found') return null; throw error; }
}

async function deliver(uid, item) {
  if (!uid) return;
  const ref = db.doc(`userInboxes/${uid}/items/${digest(item.id)}`);
  try { await ref.create({ ...item, recipientUid: uid, read: false, createdAt: item.createdAt ?? new Date().toISOString() }); }
  catch (error) { if (error.code !== 6) throw error; }
}

export const pushInboxItem = onDocumentCreated({ document: 'userInboxes/{uid}/items/{itemId}', retry: true }, async event => {
  const item = event.data.data();
  const uid = event.params.uid;
  const devices = await db.collection('pushDevices').where('uid', '==', uid).get();
  const keys = await vapid();
  for (const device of devices.docs) {
    // Recheck ownership after reads so a switched account cannot inherit old pushes.
    const current = await device.ref.get();
    if (current.data()?.uid !== uid) continue;
    const receipt = db.doc(`pushReceipts/${digest(`${event.params.itemId}:${device.id}`)}`);
    if ((await receipt.get()).exists) continue;
    try {
      await webpush.sendNotification(current.data().subscription, JSON.stringify({ uid, title: item.title, body: item.message, taskId: item.taskId, tag: event.params.itemId }), {
        TTL: 3600, vapidDetails: { subject: `mailto:${teamEmail('gui')}`, publicKey: keys.publicKey, privateKey: keys.privateKey },
      });
      await receipt.set({ sentAt: FieldValue.serverTimestamp() });
    } catch (error) {
      if ([404, 410].includes(error.statusCode)) await device.ref.delete();
      else throw error;
    }
  }
});

export const workspaceNotifications = onDocumentWritten({ document: 'workspaces/pauta-fluxo', retry: true }, async event => {
  const before = event.data.before.data() ?? {};
  const after = event.data.after.data();
  if (!after) return;
  const prior = new Set((before.notifications ?? []).map(item => item.id));
  for (const item of after.notifications ?? []) {
    if (!prior.has(item.id) && !item.read) await deliver(await teamUid(item.recipient), item);
  }
  const previousTasks = new Map((before.tasks ?? []).map(task => [task.id, task]));
  for (const task of after.tasks ?? []) {
    if (previousTasks.get(task.id)?.status === task.status) continue;
    // Request ownership is read from its original submission, never from a shared workspace edit.
    const request = await db.doc(`demandRequests/${task.id}`).get();
    const uid = request.data()?.requesterUid;
    if (uid) await deliver(uid, { id: `task-update:${task.id}:${task.updatedAt}`, recipient: 'atendimento', taskId: task.id, title: 'Sua solicitação foi atualizada', message: `${task.title}: ${statusLabel(task.status)}.`, level: 'normal' });
  }
});

function statusLabel(status) { return ({ ready: 'organizada na pauta', active: 'em execução', blocked: 'com bloqueio', in_review: 'em validação', completed: 'concluída', partial: 'parcialmente concluída', paused: 'pausada', inbox: 'aguardando triagem' })[status] ?? 'atualizada'; }

export const requestNotifications = onDocumentCreated({ document: 'demandRequests/{id}', retry: true }, async event => {
  const task = event.data.data();
  await deliver(await teamUid('pati'), { id: `request:${event.params.id}`, recipient: 'pati', taskId: event.params.id, title: 'Nova solicitação', message: task.title, level: 'normal' });
  await deliver(task.requesterUid, { id: `received:${event.params.id}`, recipient: 'atendimento', title: 'Solicitação recebida', message: `“${task.title}” aguarda a triagem da Pati.`, level: 'quiet' });
});

export const scheduledReminders = onSchedule({ schedule: 'every 5 minutes', timeZone: 'America/Sao_Paulo', retryCount: 3 }, async () => {
  const state = (await db.doc('workspaces/pauta-fluxo').get()).data();
  if (!state) return;
  const now = Date.now();
  for (const task of state.tasks ?? []) {
    const item = reminderForTask(task, state.events ?? [], now);
    if (!item) continue;
    const roles = item.level === 'urgent' ? new Set(['pati', task.assignee]) : new Set([task.assignee]);
    for (const role of roles) await deliver(await teamUid(role), { ...item, taskId: task.id, recipient: role });
  }
});

function oauth() {
  if (!clientId.value()) throw new HttpsError('failed-precondition', 'A conexão Google Calendar ainda não foi configurada.');
  return new OAuth2Client(clientId.value(), clientSecret.value(), `${origin.value()}/api/calendar/callback`);
}

export const calendarStatus = onCall(async request => {
  authenticated(request, true);
  const saved = (await privateCalendar.get()).data();
  return { configured: Boolean(clientId.value()), connected: Boolean(saved?.refreshToken), lastSync: saved?.lastSync ?? null, error: saved?.error ?? null };
});

export const calendarDisconnect = onCall({ secrets: [clientSecret] }, async request => {
  authenticated(request, true);
  const saved = (await privateCalendar.get()).data();
  if (saved?.refreshToken) {
    try { await oauth().revokeToken(saved.refreshToken); }
    catch (error) { if (error.response?.status !== 400) throw error; }
    await privateCalendar.update({ refreshToken: FieldValue.delete(), error: null });
  }
  return { disconnected: true };
});

export const calendarConnect = onCall({ secrets: [clientSecret] }, async request => {
  const { uid } = authenticated(request, true);
  const state = randomBytes(32).toString('hex');
  await db.doc(`oauthStates/${digest(state)}`).set({ uid, expires: Date.now() + 600000 });
  return { url: oauth().generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: ['openid', 'email', CALENDAR_SCOPE, CALENDAR_LIST_SCOPE], state, login_hint: teamEmail('gui') }) };
});

export const calendarCallback = onRequest({ secrets: [clientSecret] }, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.set('Referrer-Policy', 'no-referrer');
  const state = typeof req.query.state === 'string' ? req.query.state : '';
  const code = typeof req.query.code === 'string' ? req.query.code : '';
  try {
    if (!state || !code) throw new Error('Invalid OAuth response');
    const stateRef = db.doc(`oauthStates/${digest(state)}`);
    const saved = await db.runTransaction(async tx => {
      const snapshot = await tx.get(stateRef);
      const value = snapshot.data();
      if (!value || value.expires < Date.now()) throw new Error('Expired OAuth state');
      tx.delete(stateRef);
      return value;
    });
    const client = oauth();
    const { tokens } = await client.getToken(code);
    const identity = await client.verifyIdToken({ idToken: tokens.id_token, audience: clientId.value() });
    const payload = identity.getPayload();
    const user = await getAuth().getUser(saved.uid);
    if (!payload?.email_verified || payload.email?.toLowerCase() !== teamEmail('gui') || user.email?.toLowerCase() !== teamEmail('gui')) throw new Error('Wrong account');
    if (![CALENDAR_SCOPE, CALENDAR_LIST_SCOPE].every(scope => tokens.scope?.split(' ').includes(scope)) || !tokens.refresh_token) throw new Error('Missing consent');
    await privateCalendar.set({ uid: saved.uid, refreshToken: tokens.refresh_token, error: null, connectedAt: new Date().toISOString() }, { merge: true });
    await syncCalendar();
    res.redirect(`${origin.value()}/?calendar=connected`);
  } catch {
    res.redirect(`${origin.value()}/?calendar=error`);
  }
});

async function syncCalendar() {
  const config = (await privateCalendar.get()).data();
  if (!config?.refreshToken) return;
  const lock = db.doc('privateIntegrations/calendarLock');
  const lease = randomBytes(16).toString('hex');
  const acquired = await db.runTransaction(async tx => {
    const current = await tx.get(lock);
    if ((current.data()?.expires ?? 0) > Date.now()) return false;
    tx.set(lock, { lease, expires: Date.now() + 240000 });
    return true;
  });
  if (!acquired) throw new Error('Calendar synchronization busy');
  try {
    const client = oauth();
    client.setCredentials({ refresh_token: config.refreshToken });
    const api = async (path, method = 'GET', data) => (await client.request({ url: `https://www.googleapis.com/calendar/v3${path}`, method, data })).data;
    let calendarId = config.calendarId;
    if (!calendarId) {
      // Recover a created calendar if an earlier process stopped before persisting its ID.
      let pageToken;
      do {
        const page = await api(`/users/me/calendarList?minAccessRole=owner${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`);
        calendarId = page.items?.find(item => item.description === 'pauta-fluxo-managed-calendar')?.id;
        pageToken = page.nextPageToken;
      } while (!calendarId && pageToken);
      calendarId ??= (await api('/calendars', 'POST', { summary: 'Pauta Fluxo', description: 'pauta-fluxo-managed-calendar', timeZone: 'America/Sao_Paulo' })).id;
      await privateCalendar.set({ calendarId }, { merge: true });
    }
    const state = (await db.doc('workspaces/pauta-fluxo').get()).data();
    const tasks = state?.tasks ?? [];
    const ledger = await db.collection('calendarEvents').get();
    const desired = new Set();
    for (const task of tasks) {
      const event = calendarEvent(task, origin.value());
      if (!event) continue;
      desired.add(event.id);
      const fingerprint = digest(JSON.stringify(event));
      const previous = ledger.docs.find(doc => doc.id === event.id)?.data();
      if (previous?.fingerprint === fingerprint && previous?.calendarId === calendarId) continue;
      const base = `/calendars/${encodeURIComponent(calendarId)}/events`;
      try { await api(`${base}/${event.id}`, 'PUT', event); }
      catch (error) {
        if (![404,410].includes(error.response?.status)) throw error;
        try { await api(base, 'POST', event); }
        catch (insertError) { if (insertError.response?.status !== 409) throw insertError; await api(`${base}/${event.id}`, 'PUT', event); }
      }
      await db.doc(`calendarEvents/${event.id}`).set({ fingerprint, calendarId });
    }
    for (const previous of ledger.docs) {
      if (desired.has(previous.id)) continue;
      try { await api(`/calendars/${encodeURIComponent(previous.data().calendarId)}/events/${previous.id}`, 'DELETE'); }
      catch (error) { if (![404,410].includes(error.response?.status)) throw error; }
      await previous.ref.delete();
    }
    await privateCalendar.set({ lastSync: new Date().toISOString(), error: null }, { merge: true });
  } catch (error) {
    await privateCalendar.set({ error: 'Não foi possível sincronizar. Reconecte sua conta Google se necessário.' }, { merge: true });
    throw error;
  } finally {
    await db.runTransaction(async tx => { const current = await tx.get(lock); if (current.data()?.lease === lease) tx.delete(lock); });
  }
}

export const syncGoogleCalendar = onCall({ secrets: [clientSecret], timeoutSeconds: 240 }, async request => {
  authenticated(request, true);
  await syncCalendar();
  return { synced: true };
});
export const calendarWorkspaceChanged = onDocumentWritten({ document: 'workspaces/pauta-fluxo', secrets: [clientSecret], timeoutSeconds: 240, retry: true }, async event => {
  if (JSON.stringify(event.data.before.data()?.tasks) !== JSON.stringify(event.data.after.data()?.tasks)) await syncCalendar();
});
