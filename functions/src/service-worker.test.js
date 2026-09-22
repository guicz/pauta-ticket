import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

function worker(uid) {
  const handlers = {};
  const notifications = [];
  const indexedDB = { open() {
    const request = {};
    queueMicrotask(() => {
      request.result = { close() {}, transaction() {
        const transaction = { objectStore: () => ({ get: () => ({ result: uid }), put(value) { uid = value; return { result: undefined }; } }) };
        queueMicrotask(() => transaction.oncomplete());
        return transaction;
      } };
      request.onsuccess();
    });
    return request;
  } };
  const self = { location: { origin: 'https://example.com' }, addEventListener: (event, handler) => { handlers[event] = handler; },
    registration: { showNotification: async (title, options) => notifications.push({ title, ...options }), getNotifications: async () => [] } };
  vm.runInNewContext(readFileSync(new URL('../../public/notifications-sw.js', import.meta.url), 'utf8'), { self, indexedDB, URL });
  const push = async data => { let pending; handlers.push({ data: { json: () => data }, waitUntil: promise => { pending = promise; } }); await pending; };
  return { push, notifications, handlers };
}

test('push worker only displays notifications for the active individual account', async () => {
  const instance = worker('attendance-a');
  await instance.push({ uid: 'attendance-b', title: 'Private B' });
  assert.equal(instance.notifications.length, 0);
  await instance.push({ uid: 'attendance-a', title: 'Private A', tag: 'stable-id' });
  assert.equal(instance.notifications.length, 1);
  assert.equal(instance.notifications[0].title, 'Private A');
});
test('signed out worker discards pushes', async () => {
  const instance = worker(null);
  await instance.push({ uid: 'gui', title: 'Old account' });
  assert.equal(instance.notifications.length, 0);
});
test('worker does not intercept OAuth callback or authenticated API requests', () => {
  const instance = worker('gui');
  let intercepted = false;
  instance.handlers.fetch({ request: { method: 'GET', mode: 'navigate', url: 'https://example.com/api/calendar/callback?code=private' }, respondWith: () => { intercepted = true; } });
  assert.equal(intercepted, false);
});
