export type ProjectStatus =
  | "planned"
  | "active"
  | "on_hold"
  | "completed"
  | "cancelled";

export type ProjectPriority = "low" | "medium" | "high" | "urgent";

export interface Project {
  id: number;
  workspace_id: number;
  name: string;
  description: string | null;
  status: ProjectStatus;
  priority: ProjectPriority;
  start_date: string | null;
  due_date: string | null;
  created_by_id: number;
  project_manager_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface Teammate {
  id: number;
  full_name: string;
  email: string;
  role: "admin" | "project_manager" | "employee";
  is_active: boolean;
}

export interface ProjectFormValues {
  name: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  start_date: string;
  due_date: string;
  project_manager_id: string;
}

export const PROJECT_STATUSES: ProjectStatus[] = [
  "planned", "active", "on_hold", "completed", "cancelled",
];

export const PROJECT_PRIORITIES: ProjectPriority[] = [
  "low", "medium", "high", "urgent",
];

export const EMPTY_PROJECT_FORM: ProjectFormValues = {
  name: "", description: "", status: "planned", priority: "medium",
  start_date: "", due_date: "", project_manager_id: "",
};
