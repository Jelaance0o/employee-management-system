import type { TaskPriority, TaskStatus } from "../tasks.types";

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const slug = status.toLowerCase().replaceAll(" ", "-");
  return <span className={`ts-task-status ts-task-status-${slug}`}><span className="ts-task-status-dot" />{status}</span>;
}

export function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  return <span className={`ts-task-priority ts-task-priority-${priority}`}>{priority}</span>;
}
