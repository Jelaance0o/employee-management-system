import { useEffect, useState } from "react";
import "./dashboard.css";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  FolderKanban,
  LoaderCircle,
  RefreshCw,
  Users,
  UserRound,
  UserCog,
} from "lucide-react";

import api from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";

interface Project {
  id: number;
  name: string;
  description: string | null;
  status: "planned" | "active" | "on_hold" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  due_date: string | null;
  project_manager_id: number | null;
}

interface Task {
  id: number;
  project_id: number;
  title: string;
  status: "To Do" | "In Progress" | "In Review" | "Changes Required" | "Done";
  priority: "low" | "medium" | "high" | "urgent";
  due_date: string | null;
  assigned_to_id: number | null;
  project_name?: string | null;
  created_by_id?: number | null;
  created_by_name?: string | null;
  assigned_to_name?: string | null;
  project_manager_name?: string | null;
}

interface Teammate {
  id: number;
  full_name: string;
  email: string;
  role: "admin" | "project_manager" | "employee" | string;
  is_active: boolean;
}

function formatDate(value: string | null) {
  if (!value) return "No deadline";

  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString(
    undefined,
    { day: "numeric", month: "short", year: "numeric" },
  );
}

function isOverdue(task: Task) {
  if (!task.due_date || task.status === "Done") return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(`${task.due_date.slice(0, 10)}T00:00:00`);
  return dueDate < today;
}

function getStatusClass(status: string) {
  switch (status) {
    case "Done":
    case "completed":
      return "ts-status-success";
    case "In Progress":
    case "active":
      return "ts-status-accent";
    case "In Review":
      return "ts-status-review";
    case "Changes Required":
    case "cancelled":
      return "ts-status-danger";
    case "on_hold":
      return "ts-status-muted";
    default:
      return "ts-status-muted";
  }
}

function StatCard({
  label,
  value,
  description,
  icon: Icon,
  variant = "accent",
}: {
  label: string;
  value: number;
  description: string;
  icon: typeof FolderKanban;
  variant?: "accent" | "success" | "danger" | "neutral" | "review";
}) {
  return (
    <article className="ts-stat-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium ts-secondary">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight ts-text">
            {value.toLocaleString()}
          </p>
        </div>

        <div className={`ts-stat-icon ts-stat-icon-${variant}`}>
          <Icon size={20} strokeWidth={1.8} />
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 ts-muted">{description}</p>
    </article>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teammates, setTeammates] = useState<Teammate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [expandedProjectIds, setExpandedProjectIds] = useState<Set<number>>(new Set());
  const [projectTasksById, setProjectTasksById] = useState<Record<number, Task[]>>({});
  const [projectTaskLoadingIds, setProjectTaskLoadingIds] = useState<Set<number>>(new Set());
  const [projectTaskErrors, setProjectTaskErrors] = useState<Record<number, string>>({});

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError("");
      setExpandedProjectIds(new Set());
      setProjectTasksById({});
      setProjectTaskLoadingIds(new Set());
      setProjectTaskErrors({});

      try {
        const [projectsResponse, tasksResponse] = await Promise.all([
          api.get<Project[]>("/api/v1/projects"),
          api.get<Task[]>("/api/v1/tasks"),
        ]);

        let allTeammates: Teammate[] = [];

        if (user?.role === "admin") {
          const pageSize = 100;
          let offset = 0;

          while (true) {
            const response = await api.get<Teammate[]>("/api/v1/teammates", {
              params: { limit: pageSize, offset },
            });

            allTeammates = [...allTeammates, ...response.data];

            if (response.data.length < pageSize) break;
            offset += pageSize;
          }
        }

        if (!cancelled) {
          setProjects(projectsResponse.data);
          setTasks(tasksResponse.data);
          setTeammates(allTeammates);
        }
      } catch {
        if (!cancelled) {
          setError(
            "We couldn't load your workspace data. Check your connection and try again.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [user?.role, refreshKey]);

  async function fetchProjectTasks(projectId: number) {
    if (Object.prototype.hasOwnProperty.call(projectTasksById, projectId) || projectTaskLoadingIds.has(projectId)) return;

    setProjectTaskLoadingIds((current) => new Set(current).add(projectId));
    setProjectTaskErrors((current) => {
      const next = { ...current };
      delete next[projectId];
      return next;
    });

    try {
      const response = await api.get<Task[]>(`/api/v1/projects/${projectId}/top-tasks`);
      setProjectTasksById((current) => ({ ...current, [projectId]: response.data }));
    } catch {
      setProjectTaskErrors((current) => ({
        ...current,
        [projectId]: "We couldn't load tasks for this project. Please try again.",
      }));
    } finally {
      setProjectTaskLoadingIds((current) => {
        const next = new Set(current);
        next.delete(projectId);
        return next;
      });
    }
  }

  function toggleProjectTasks(projectId: number) {
    const willExpand = !expandedProjectIds.has(projectId);
    setExpandedProjectIds((current) => {
      const next = new Set(current);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
    if (willExpand) void fetchProjectTasks(projectId);
  }

  function getPriorityClass(priority: Task["priority"]) {
    if (priority === "urgent" || priority === "high") return "ts-status-danger";
    if (priority === "medium") return "ts-status-accent";
    return "ts-status-muted";
  }

  const activeProjects = projects.filter(
    (project) => project.status === "active",
  ).length;

  const completedTasks = tasks.filter((task) => task.status === "Done").length;

  const pendingTasks = tasks.filter((task) => task.status !== "Done").length;

  const overdueTasks = tasks.filter(isOverdue);

  const activeTeammates = teammates.filter((teammate) => teammate.is_active);

  const activeMembers = activeTeammates.filter(
    (teammate) => teammate.role === "employee",
  ).length;

  const activeManagers = activeTeammates.filter(
    (teammate) => teammate.role === "project_manager",
  ).length;

  const recentTasks = [...tasks].sort((a, b) => b.id - a.id).slice(0, 5);

  const projectNames = new Map(
    projects.map((project) => [project.id, project.name]),
  );

  if (loading) {
    return (
      <div className="ts-page flex min-h-64 items-center justify-center gap-3">
        <LoaderCircle className="animate-spin ts-accent" size={22} />
        <p className="text-sm ts-secondary">Loading your dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <section className="ts-surface rounded-xl p-6">
        <div className="flex items-center gap-3">
          <AlertCircle
            className="shrink-0"
            style={{ color: "var(--ts-danger)" }}
            size={22}
          />
          <p className="text-sm ts-text">{error}</p>
        </div>

        <button
          type="button"
          onClick={() => setRefreshKey((key) => key + 1)}
          className="ts-button-secondary ts-focus mt-5 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
        >
          <RefreshCw size={16} />
          Try again
        </button>
      </section>
    );
  }

  return (
    <section className="ts-page space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest ts-accent">
            Workspace overview
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight ts-text">
            Dashboard
          </h1>
          <p className="mt-2 text-sm ts-secondary">
            A clear view of your projects, tasks, and team.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setRefreshKey((key) => key + 1)}
          className="ts-button-secondary ts-focus inline-flex w-fit items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium"
        >
          <RefreshCw size={15} />
          Refresh data
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total projects"
          value={projects.length}
          description={`${activeProjects} currently active`}
          icon={FolderKanban}
          variant="accent"
        />

        <StatCard
          label="Pending tasks"
          value={pendingTasks}
          description="Tasks not yet completed"
          icon={Clock3}
          variant="neutral"
        />

        <StatCard
          label="Completed tasks"
          value={completedTasks}
          description="Tasks marked as done"
          icon={CheckCircle2}
          variant="success"
        />

        <StatCard
          label="Overdue tasks"
          value={overdueTasks.length}
          description="Uncompleted tasks past their deadline"
          icon={AlertCircle}
          variant="danger"
        />

        {user?.role === "admin" && (
          <>
            <StatCard
              label="Total teammates"
              value={teammates.length}
              description={`${activeTeammates.length} active accounts across all roles`}
              icon={Users}
              variant="accent"
            />

            <StatCard
              label="Members"
              value={activeMembers}
              description="Active employee accounts"
              icon={UserRound}
              variant="success"
            />

            <StatCard
              label="Team managers"
              value={activeManagers}
              description="Active project managers"
              icon={UserCog}
              variant="review"
            />
          </>
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="ts-panel overflow-hidden rounded-xl">
          <div className="flex items-center justify-between border-b px-5 py-4 ts-divider">
            <div>
              <h2 className="text-sm font-semibold ts-text">Projects</h2>
              <p className="mt-1 text-xs ts-muted">
                Projects available to your account
              </p>
            </div>
            <FolderKanban className="ts-muted" size={19} />
          </div>

          {projects.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <FolderKanban className="mx-auto ts-muted" size={28} />
              <p className="mt-3 text-sm font-medium ts-text">
                No projects yet
              </p>
              <p className="mx-auto mt-1 max-w-xs text-sm ts-secondary">
                Projects will appear here when they're created or assigned to
                you.
              </p>
            </div>
          ) : (
            <div className="divide-y ts-divider">
              {projects.slice(0, 5).map((project) => {
                const expanded = expandedProjectIds.has(project.id);
                const projectTasks = projectTasksById[project.id] ?? [];
                const loadingProjectTasks = projectTaskLoadingIds.has(project.id);
                const projectTaskError = projectTaskErrors[project.id];

                return (
                  <div key={project.id}>
                    <div className="flex items-center justify-between gap-3 px-5 py-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium ts-text">
                          {project.name}
                        </p>
                        <p className="mt-1 text-xs ts-muted">
                          Due {formatDate(project.due_date)}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <span className={`ts-status ${getStatusClass(project.status)}`}>
                          {project.status.replace("_", " ")}
                        </span>
                        <button
                          type="button"
                          className="ts-button-secondary ts-focus inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-medium"
                          aria-expanded={expanded}
                          aria-controls={`project-top-tasks-${project.id}`}
                          onClick={() => toggleProjectTasks(project.id)}
                        >
                          Tasks
                          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>
                    </div>

                    {expanded && (
                      <div id={`project-top-tasks-${project.id}`} className="border-t px-5 py-3" style={{ borderColor: "var(--ts-border)", background: "var(--ts-surface-muted)" }}>
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wide ts-muted">Top priority tasks</p>
                        {loadingProjectTasks ? (
                          <div className="flex items-center gap-2 py-3 text-sm ts-secondary"><LoaderCircle className="animate-spin" size={16} />Loading project tasks...</div>
                        ) : projectTaskError ? (
                          <div className="flex flex-wrap items-center justify-between gap-3 py-2">
                            <p className="text-sm" style={{ color: "var(--ts-danger)" }}>{projectTaskError}</p>
                            <button type="button" className="ts-button-secondary ts-focus rounded-lg px-3 py-1.5 text-xs font-medium" onClick={() => void fetchProjectTasks(project.id)}>Retry</button>
                          </div>
                        ) : projectTasks.length === 0 ? (
                          <p className="py-2 text-sm ts-secondary">No tasks have been created for this project yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {projectTasks.slice(0, 3).map((task) => (
                              <article key={task.id} className="rounded-lg border p-3" style={{ borderColor: "var(--ts-border)", background: "var(--ts-surface)" }}>
                                <p className="break-words text-sm font-medium ts-text">{task.title}</p>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <span className={`ts-status ${getStatusClass(task.status)}`}>{task.status}</span>
                                  <span className={`ts-status ${getPriorityClass(task.priority)}`}>{task.priority}</span>
                                  <span className="inline-flex items-center gap-1 text-xs ts-muted"><CalendarDays size={13} />{formatDate(task.due_date)}</span>
                                </div>
                              </article>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="ts-panel overflow-hidden rounded-xl">
          <div className="flex items-center justify-between border-b px-5 py-4 ts-divider">
            <div>
              <h2 className="text-sm font-semibold ts-text">Recent tasks</h2>
              <p className="mt-1 text-xs ts-muted">
                Tasks visible to your account
              </p>
            </div>
            <CheckCircle2 className="ts-muted" size={19} />
          </div>

          {recentTasks.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <CheckCircle2 className="mx-auto ts-muted" size={28} />
              <p className="mt-3 text-sm font-medium ts-text">No tasks yet</p>
              <p className="mx-auto mt-1 max-w-xs text-sm ts-secondary">
                Tasks will appear here once they're created or assigned.
              </p>
            </div>
          ) : (
            <div className="divide-y ts-divider">
              {recentTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between gap-4 px-5 py-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium ts-text">
                      {task.title}
                    </p>
                    <p className="mt-1 truncate text-xs ts-muted">
                      {projectNames.get(task.project_id) ?? task.project_name ?? "Project"} · Due {formatDate(task.due_date)}
                    </p>
                    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] ts-muted">
                      <span>Assigned to: <strong className="font-medium ts-secondary">{task.assigned_to_name ?? "Unassigned"}</strong></span>
                      <span>Assigned by: <strong className="font-medium ts-secondary">{task.created_by_name ?? "Not available"}</strong></span>
                      <span>Project manager: <strong className="font-medium ts-secondary">{task.project_manager_name ?? "Not assigned"}</strong></span>
                    </p>
                  </div>

                  <span className={`ts-status ${getStatusClass(task.status)}`}>
                    {task.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {overdueTasks.length > 0 && (
        <div className="ts-alert-danger flex items-start gap-3 rounded-xl p-5">
          <AlertCircle className="mt-0.5 shrink-0" size={19} />
          <div>
            <h2 className="text-sm font-semibold">Attention needed</h2>
            <p className="mt-1 text-sm">
              You have {overdueTasks.length} overdue{" "}
              {overdueTasks.length === 1 ? "task" : "tasks"}. Review their
              deadlines and update their status.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
