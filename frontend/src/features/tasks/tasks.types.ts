import type { Project } from "../projects/projects.types";

export type TaskStatus =
  | "To Do"
  | "In Progress"
  | "In Review"
  | "Changes Required"
  | "Done";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Task {
  id: number;
  workspace_id: number;
  project_id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  created_by_id: number;
  assigned_to_id: number | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  project_name?: string | null;
  created_by_name?: string | null;
  assigned_to_name?: string | null;
  project_manager_id?: number | null;
  project_manager_name?: string | null;
}

export interface TaskTeammate {
  id: number;
  full_name: string;
  email: string;
  role: "admin" | "project_manager" | "employee";
  is_active: boolean;
}

export interface TaskFormValues {
  project_id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  assigned_to_id: string;
  due_date: string;
}

export const TASK_STATUSES: TaskStatus[] = [
  "To Do",
  "In Progress",
  "In Review",
  "Changes Required",
  "Done",
];

export const TASK_PRIORITIES: TaskPriority[] = ["low", "medium", "high", "urgent"];

export const EMPTY_TASK_FORM: TaskFormValues = {
  project_id: "",
  title: "",
  description: "",
  priority: "medium",
  assigned_to_id: "",
  due_date: "",
};

export type { Project };
