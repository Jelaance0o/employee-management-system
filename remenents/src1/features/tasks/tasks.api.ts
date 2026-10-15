import api from "../../lib/api";
import type { Project } from "../projects/projects.types";
import type { Task, TaskFormValues, TaskStatus, TaskTeammate } from "./tasks.types";

export interface TaskFilters {
  project_id?: number;
  status?: TaskStatus;
  limit?: number;
  offset?: number;
}

export async function getTasks(filters: TaskFilters = {}): Promise<Task[]> {
  const response = await api.get<Task[]>("/api/v1/tasks", { params: filters });
  return response.data;
}

export async function getTaskProjects(): Promise<Project[]> {
  const response = await api.get<Project[]>("/api/v1/projects", {
    params: { limit: 100, offset: 0 },
  });
  return response.data;
}


export async function getProjectMembers(projectId: number): Promise<TaskTeammate[]> {
  const response = await api.get<TaskTeammate[]>(`/api/v1/projects/${projectId}/members`);
  return response.data;
}

export async function getEligibleProjectAssignees(projectId: number): Promise<TaskTeammate[]> {
  const response = await api.get<TaskTeammate[]>(`/api/v1/projects/${projectId}/eligible-assignees`);
  return response.data;
}

export async function getTaskTeammates(): Promise<TaskTeammate[]> {
  const response = await api.get<TaskTeammate[]>("/api/v1/teammates", {
    params: { limit: 100, offset: 0 },
  });
  return response.data;
}

export async function createTask(values: TaskFormValues): Promise<Task> {
  const response = await api.post<Task>("/api/v1/tasks", {
    project_id: Number(values.project_id),
    title: values.title.trim(),
    description: values.description.trim() || null,
    priority: values.priority,
    assigned_to_id: values.assigned_to_id ? Number(values.assigned_to_id) : null,
    due_date: values.due_date || null,
  });
  return response.data;
}

export async function updateTask(
  taskId: number,
  values: Partial<Pick<Task, "title" | "description" | "priority" | "assigned_to_id" | "due_date" | "status">>,
): Promise<Task> {
  const response = await api.patch<Task>(`/api/v1/tasks/${taskId}`, values);
  return response.data;
}
