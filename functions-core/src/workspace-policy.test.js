import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateWorkspaceWrite } from './workspace-policy.js';
const state = { tasks: [{ id: 'a', priority: 'normal', status: 'ready' }], events: [], notifications: [] };
test('only Pati changes priority', () => {
  const changed = { ...state, tasks: [{ ...state.tasks[0], priority: 'urgent' }] };
  assert.doesNotThrow(() => validateWorkspaceWrite('pati', state, changed));
  assert.throws(() => validateWorkspaceWrite('gui', state, changed));
  assert.throws(() => validateWorkspaceWrite('atendimento', state, state));
});
test('Gui keeps existing execution actions but cannot substitute tasks', () => {
  assert.doesNotThrow(() => validateWorkspaceWrite('gui', state, { ...state, tasks: [{ ...state.tasks[0], status: 'active' }] }));
  assert.throws(() => validateWorkspaceWrite('gui', state, { ...state, tasks: [] }));
  assert.throws(() => validateWorkspaceWrite('gui', state, { ...state, tasks: [{ ...state.tasks[0], id: 'b' }] }));
  assert.throws(() => validateWorkspaceWrite('pati', state, { ...state, tasks: [state.tasks[0], state.tasks[0]] }));
});
test('only Pati can remove a demand from the shared workspace', () => {
  const deleted = { ...state, tasks: [] };
  assert.doesNotThrow(() => validateWorkspaceWrite('pati', state, deleted));
  assert.throws(() => validateWorkspaceWrite('gui', state, deleted));
});
