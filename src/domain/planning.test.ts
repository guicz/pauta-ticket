import { describe, expect, it } from 'vitest'

import {
  buildWeeklyReport,
  interruptTask,
  planDay,
  requestEstimateChange,
} from './planning'

type TaskStatus = 'ready' | 'active' | 'paused' | 'in_progress' | 'completed'

type Task = {
  id: string
  title: string
  estimateMinutes: number
  priority: number
  status: TaskStatus
  verified?: boolean
  progress?: string[]
  returnPoint?: string
}

type ManagementEvent = {
  id: string
  type: 'demand_created' | 'priority_changed' | 'estimate_changed' | 'task_interrupted'
  description: string
  occurredAt: string
}

describe('planDay', () => {
  it('respects effective capacity after buffer and schedules at most three tasks', () => {
    const tasks: Task[] = [
      { id: 'task-1', title: 'Revisar campanha', estimateMinutes: 40, priority: 1, status: 'ready' },
      { id: 'task-2', title: 'Ajustar página', estimateMinutes: 30, priority: 2, status: 'ready' },
      { id: 'task-3', title: 'Preparar relatório', estimateMinutes: 20, priority: 3, status: 'ready' },
      { id: 'task-4', title: 'Organizar materiais', estimateMinutes: 10, priority: 4, status: 'ready' },
    ]

    const result = planDay({
      tasks,
      capacityMinutes: 120,
      bufferMinutes: 30,
      maxTasks: 3,
    })

    expect(result.effectiveCapacityMinutes).toBe(90)
    expect(result.scheduledTasks.map((task) => task.id)).toEqual(['task-1', 'task-2', 'task-3'])
    expect(result.scheduledMinutes).toBe(90)
    expect(result.scheduledTasks).toHaveLength(3)
  })

  it('keeps the current task active when a new routine demand has higher priority', () => {
    const tasks: Task[] = [
      {
        id: 'current-task',
        title: 'Finalizar página em andamento',
        estimateMinutes: 45,
        priority: 3,
        status: 'active',
      },
      {
        id: 'new-demand',
        title: 'Nova solicitação de cliente',
        estimateMinutes: 20,
        priority: 1,
        status: 'ready',
      },
    ]

    const result = planDay({
      tasks,
      capacityMinutes: 90,
      bufferMinutes: 15,
      maxTasks: 3,
    })

    expect(result.activeTask?.id).toBe('current-task')
    expect(result.scheduledTasks[0]?.id).toBe('current-task')
    expect(result.scheduledTasks.find((task) => task.id === 'new-demand')?.status).toBe('ready')
  })
})

describe('requestEstimateChange', () => {
  it('records a revised estimate without blocking the active task', () => {
    const activeTask: Task = {
      id: 'task-1',
      title: 'Configurar agentes da campanha',
      estimateMinutes: 60,
      priority: 1,
      status: 'active',
    }

    const result = requestEstimateChange({
      task: activeTask,
      requestedEstimateMinutes: 180,
      reason: 'A configuração possui mais etapas que o previsto',
      requestedBy: 'guilherme',
      requestedAt: '2026-09-03T11:00:00-03:00',
    })

    expect(result.task.estimateMinutes).toBe(180)
    expect(result.task.status).toBe('active')
    expect(result.executionBlocked).toBe(false)
    expect(result.managementEvent.type).toBe('estimate_changed')
  })
})

describe('interruptTask', () => {
  it('saves the exact return point before activating the interrupting task', () => {
    const activeTask: Task = {
      id: 'task-current',
      title: 'Montar apresentação',
      estimateMinutes: 90,
      priority: 2,
      status: 'active',
    }
    const urgentTask: Task = {
      id: 'task-urgent',
      title: 'Corrigir campanha fora do ar',
      estimateMinutes: 20,
      priority: 1,
      status: 'ready',
    }

    const result = interruptTask({
      activeTask,
      interruptingTask: urgentTask,
      returnPoint: 'Retomar no slide 9 e inserir o gráfico já aprovado',
      reason: 'Campanha do cliente está fora do ar',
      authorizedBy: 'pati',
      interruptedAt: '2026-09-03T14:30:00-03:00',
    })

    expect(result.interruptedTask.status).toBe('paused')
    expect(result.interruptedTask.returnPoint).toBe(
      'Retomar no slide 9 e inserir o gráfico já aprovado',
    )
    expect(result.activeTask.id).toBe('task-urgent')
    expect(result.activeTask.status).toBe('active')
    expect(result.managementEvent.type).toBe('task_interrupted')
  })
})

describe('buildWeeklyReport', () => {
  it('counts only verified completed tasks as deliveries', () => {
    const tasks: Task[] = [
      {
        id: 'verified-delivery',
        title: 'Campanha publicada e conferida',
        estimateMinutes: 60,
        priority: 1,
        status: 'completed',
        verified: true,
      },
      {
        id: 'unverified-completion',
        title: 'Página aguardando conferência',
        estimateMinutes: 45,
        priority: 2,
        status: 'completed',
        verified: false,
      },
      {
        id: 'partial-work',
        title: 'Preparar palestra',
        estimateMinutes: 120,
        priority: 3,
        status: 'in_progress',
        progress: ['Estrutura definida', 'Oito slides preparados'],
      },
    ]

    const result = buildWeeklyReport({ tasks, managementEvents: [] })

    expect(result.deliveryCount).toBe(1)
    expect(result.deliveries.map((task) => task.id)).toEqual(['verified-delivery'])
  })

  it('lists partial progress and management events in separate sections', () => {
    const tasks: Task[] = [
      {
        id: 'partial-work',
        title: 'Preparar palestra',
        estimateMinutes: 120,
        priority: 1,
        status: 'in_progress',
        progress: ['Tema definido', 'Introdução escrita'],
      },
    ]
    const managementEvents: ManagementEvent[] = [
      {
        id: 'event-1',
        type: 'priority_changed',
        description: 'Pati reorganizou a pauta da tarde',
        occurredAt: '2026-09-03T12:00:00-03:00',
      },
    ]

    const result = buildWeeklyReport({ tasks, managementEvents })

    expect(result.partialProgress).toEqual([
      {
        taskId: 'partial-work',
        title: 'Preparar palestra',
        completedParts: ['Tema definido', 'Introdução escrita'],
      },
    ])
    expect(result.managementActivity).toEqual(managementEvents)
    expect(result.deliveries).toEqual([])
  })
})
