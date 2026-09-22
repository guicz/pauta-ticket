const priorities = new Set(['urgent', 'high', 'normal', 'low']);

export function validateWorkspaceWrite(role, before, next) {
  if (!['pati', 'gui'].includes(role)) throw new Error('Acesso restrito à equipe.');
  if (!next || !Array.isArray(next.tasks) || !Array.isArray(next.events) || !Array.isArray(next.notifications)) throw new Error('Pauta inválida.');
  const ids = new Set();
  for (const task of next.tasks) {
    if (typeof task.id !== 'string' || !task.id || task.id.includes('/') || ids.has(task.id) || !priorities.has(task.priority)) throw new Error('Pedido inválido.');
    ids.add(task.id);
  }
  if (role === 'pati') return;
  const previous = new Map((before?.tasks ?? []).map(task => [task.id, task]));
  if (previous.size !== ids.size) throw new Error('Somente Pati pode adicionar ou remover pedidos.');
  for (const task of next.tasks) {
    if (!previous.has(task.id) || previous.get(task.id).priority !== task.priority) throw new Error('Somente Pati pode alterar prioridades. Atualize a página.');
  }
}
