export type TaskStatus =
  | "inbox"
  | "ready"
  | "active"
  | "partial"
  | "paused"
  | "blocked"
  | "in_review"
  | "completed";

export type Priority = "urgent" | "high" | "normal" | "low";
export type Shift = "morning" | "afternoon" | null;
export type Person = "pati" | "gui" | "atendimento";

export interface TaskStep {
  id: string;
  label: string;
  done: boolean;
}

export interface TaskMemoryNote {
  id: string;
  text: string;
  createdAt: string;
}

export interface EvidenceAttachment {
  name: string;
  type: string;
  dataUrl: string;
}

export interface Task {
  recurrence?: "none" | "daily" | "weekly" | "monthly";
  recurrenceParentId?: string;
  id: string;
  title: string;
  client: string;
  project: string;
  expectedResult: string;
  doneCondition: string;
  assignee: Person;
  requester: Person;
  priority: Priority;
  status: TaskStatus;
  estimatedMinutes: number;
  executorEstimateMinutes?: number;
  actualMinutes?: number;
  deadline?: string;
  consequence?: string;
  scheduledDate?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  shift: Shift;
  returnPoint?: string;
  blocker?: string;
  evidence?: string;
  evidenceAttachment?: EvidenceAttachment;
  memoryNotes?: TaskMemoryNote[];
  steps: TaskStep[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface ActivityEvent {
  id: string;
  taskId?: string;
  actor: Person;
  kind:
    | "task_created"
    | "agenda_published"
    | "estimate_changed"
    | "priority_changed"
    | "task_started"
    | "progress_recorded"
    | "memory_captured"
    | "task_interrupted"
    | "task_blocked"
    | "sent_to_review"
    | "task_completed";
  description: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  recipient: Person;
  level: "quiet" | "normal" | "urgent";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface AppState {
  tasks: Task[];
  events: ActivityEvent[];
  notifications: AppNotification[];
  morningCapacity: number;
  afternoonCapacity: number;
  bufferMinutes: number;
  agendaPublishedAt?: string;
}
