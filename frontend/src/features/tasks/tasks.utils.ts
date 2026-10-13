import type { Task, TaskPriority, TaskStatus } from "./tasks.types";

export function getTaskErrorMessage(error: unknown): string {
  const value = error as {
    response?: { data?: { detail?: string | { msg?: string }[] } };
    message?: string;
  };
  const detail = value.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((item) => item.msg ?? "Invalid input").join(", ");
  return value.message ?? "Something went wrong. Please try again.";
}

export function formatTaskDate(value: string | null): string {
  if (!value) return "No due date";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? "No due date"
    : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function isTaskOverdue(task: Task): boolean {
  if (!task.due_date || task.status === "Done") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${task.due_date.slice(0, 10)}T00:00:00`) < today;
}

export function formatTaskPriority(priority: TaskPriority): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

export function canTransitionTask(
  task: Task,
  next: TaskStatus,
  role: string | undefined,
  isAssignedProjectManager: boolean,
  userId: number | undefined,
): boolean {
  if (next === task.status) return true;
  if (role === "admin") return true;
  if (role === "project_manager" && isAssignedProjectManager) {
    if (task.status === "In Review") return next === "Done" || next === "Changes Required";
    return true;
  }
  if (task.assigned_to_id !== userId) return false;
  const allowed: Record<TaskStatus, TaskStatus[]> = {
    "To Do": ["In Progress"],
    "In Progress": ["In Review"],
    "In Review": [],
    "Changes Required": ["In Progress"],
    Done: [],
  };
  return allowed[task.status].includes(next);
}
