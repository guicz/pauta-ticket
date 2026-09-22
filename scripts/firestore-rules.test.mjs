import { readFileSync } from 'node:fs';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, updateDoc, getDocs, collection, query, where } from 'firebase/firestore';
let env;
const person = (uid, email) => env.authenticatedContext(uid, { email, email_verified: true }).firestore();
before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-pauta', firestore: { host: '127.0.0.1', port: 8088, rules: readFileSync('firestore.rules', 'utf8') } });
  await env.withSecurityRulesDisabled(async ctx => {
    await setDoc(doc(ctx.firestore(), 'demandRequests/a'), { requesterUid: 'alice', requesterEmail: 'alice@example.com', priority: 'normal', status: 'inbox' });
    await setDoc(doc(ctx.firestore(), 'workspaces/pauta-fluxo'), { tasks: [] });
  });
});
after(async () => { await env?.cleanup(); });
test('history belongs to its requester, Pati can monitor all requests', async () => {
  await assertSucceeds(getDoc(doc(person('alice', 'alice@example.com'), 'demandRequests/a')));
  await assertFails(getDoc(doc(person('bob', 'bob@example.com'), 'demandRequests/a')));
  await assertSucceeds(getDocs(query(collection(person('alice', 'alice@example.com'), 'demandRequests'), where('requesterUid', '==', 'alice'))));
  await assertSucceeds(getDocs(collection(person('pati', 'patricia@dg5.com.br'), 'demandRequests')));
  await assertFails(getDocs(collection(person('bob', 'bob@example.com'), 'demandRequests')));
});
test('only Pati changes request priority; identity cannot be replaced', async () => {
  await assertFails(updateDoc(doc(person('alice', 'alice@example.com'), 'demandRequests/a'), { priority: 'urgent' }));
  await assertFails(updateDoc(doc(person('gui', 'guilherme@dg5.com.br'), 'demandRequests/a'), { priority: 'urgent' }));
  await assertFails(updateDoc(doc(person('pati', 'patricia@dg5.com.br'), 'demandRequests/a'), { priority: 'high' }));
  await assertFails(updateDoc(doc(person('pati', 'patricia@dg5.com.br'), 'demandRequests/a'), { requesterUid: 'bob' }));
});
test('new requests cannot choose their own priority or impersonate another user', async () => {
  const data = { requesterUid: 'bob', requesterEmail: 'bob@example.com', requester: 'atendimento', assignee: 'pati', status: 'inbox', priority: 'normal' };
  const ref = doc(person('bob', 'bob@example.com'), 'demandRequests/b');
  await assertFails(setDoc(ref, { ...data, priority: 'urgent' }));
  await assertFails(setDoc(ref, { ...data, requesterUid: 'alice' }));
  await assertSucceeds(setDoc(ref, data));
});
test('workspace writes cannot bypass server priority validation', async () => {
  for (const [uid,email] of [['gui','guilherme@dg5.com.br'],['pati','patricia@dg5.com.br']]) {
    await assertSucceeds(getDoc(doc(person(uid,email), 'workspaces/pauta-fluxo')));
    await assertFails(setDoc(doc(person(uid,email), 'workspaces/pauta-fluxo'), { tasks: [] }));
  }
});
test('server saves execution, protects priority and mirrors request history', async () => {
  const { saveTeamWorkspace } = await import('../functions-core/src/index.js');
  const state = { tasks: [{ id: 'a', requester: 'atendimento', priority: 'high', status: 'ready' }], events: [], notifications: [], morningCapacity: 90, afternoonCapacity: 120, bufferMinutes: 10 };
  const asUser = (email, data) => saveTeamWorkspace.run({ auth: { uid: email, token: { email } }, data });
  await asUser('patricia@dg5.com.br', state);
  const owner = doc(person('alice','alice@example.com'), 'demandRequests/a');
  assert.equal((await getDoc(owner)).data().status, 'ready');
  assert.equal((await getDoc(owner)).data().history.length, 1);
  const execution = { ...state, tasks: [{ ...state.tasks[0], status: 'active' }] };
  await asUser('guilherme@dg5.com.br', execution);
  assert.equal((await getDoc(owner)).data().status, 'active');
  await assert.rejects(asUser('guilherme@dg5.com.br', { ...execution, tasks: [{ ...execution.tasks[0], priority: 'urgent' }] }));
  await assert.rejects(asUser('alice@example.com', state));
});
