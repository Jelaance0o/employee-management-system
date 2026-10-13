import type { Project, ProjectStatus } from "./projects.types";

export function getErrorMessage(error: unknown): string {
  const err = error as {
    response?: {
      data?: {
        detail?: string | { msg?: string }[];
      };
    };
    message?: string;
  };

  const detail = err.response?.data?.detail;

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg ?? "Invalid input").join(", ");
  }

  return err.message ?? "Something went wrong. Please try again.";
}

export function formatStatus(status: ProjectStatus): string {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatDate(value: string | null): string {
  if (!value) return "Not set";

  const date = new Date(`${value.slice(0, 10)}T00:00:00`);

  return Number.isNaN(date.getTime())
    ? "Not set"
    : date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

export function isOverdue(project: Project): boolean {
  if (!project.due_date || project.status === "completed") return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(`${project.due_date.slice(0, 10)}T00:00:00`);

  return due < today;
}

export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

