import type { AppNotification } from "./models";

export function notificationTaskId(notification: AppNotification): string | undefined {
  return notification.taskId ?? /^(?:ending|overdue):(.+):\d+$/.exec(notification.id)?.[1];
}
