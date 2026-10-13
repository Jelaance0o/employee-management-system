import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDot,
  Clock3,
  FolderKanban,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  Users,
  X,
} from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

type ProjectStatus =
  | "planned"
  | "active"
  | "on_hold"
  | "completed"
  | "cancelled";

type ProjectPriority = "low" | "medium" | "high" | "urgent";

interface Project {
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

interface Teammate {
  id: number;
  full_name: string;
  email: string;
  role: "admin" | "project_manager" | "employee";
  is_active: boolean;
}

interface ProjectForm {
  name: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  start_date: string;
  due_date: string;
  project_manager_id: string;
}

const STATUSES: ProjectStatus[] = [
  "planned",
  "active",
  "on_hold",
  "completed",
  "cancelled",
];

const PRIORITIES: ProjectPriority[] = ["low", "medium", "high", "urgent"];

const EMPTY_FORM: ProjectForm = {
  name: "",
  description: "",
  status: "planned",
  priority: "medium",
  start_date: "",
  due_date: "",
  project_manager_id: "",
};

function getErrorMessage(error: unknown): string {
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

function formatStatus(status: ProjectStatus): string {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value: string | null): string {
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

function isOverdue(project: Project): boolean {
  if (!project.due_date || project.status === "completed") return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(`${project.due_date.slice(0, 10)}T00:00:00`);

  return due < today;
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span className={`ts-project-status ts-project-status-${status}`}>
      <span className="ts-status-dot" />
      {formatStatus(status)}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: ProjectPriority }) {
  return (
    <span className={`ts-project-priority ts-project-priority-${priority}`}>
      {priority}
    </span>
  );
}

function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="ts-dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={`ts-dialog ts-project-dialog ${wide ? "ts-project-dialog-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-dialog-title"
      >
        <div className="ts-dialog-header">
          <div>
            {subtitle && <p>{subtitle}</p>}
          </div>

          <button
            type="button"
            className="ts-icon-button"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {children}
      </section>
    </div>
  );
}

export default function ProjectsPage() {
  const { user } = useAuth();

  const isAdmin = user?.role === "admin";
  const isProjectManager = user?.role === "project_manager";

  const [projects, setProjects] = useState<Project[]>([]);
  const [teammates, setTeammates] = useState<Teammate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [refreshKey, setRefreshKey] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form, setForm] = useState<ProjectForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [memberUserId, setMemberUserId] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [memberError, setMemberError] = useState("");
  const [memberSuccess, setMemberSuccess] = useState("");

  const loadData = useCallback(
    async (showSpinner = true) => {
      if (showSpinner) setLoading(true);

      setError("");

      try {
        const projectRequest = api.get<Project[]>("/api/v1/projects", {
          params: { limit: 100, offset: 0 },
        });

        if (isAdmin) {
          const [projectResponse, teammateResponse] = await Promise.all([
            projectRequest,
            api.get<Teammate[]>("/api/v1/teammates", {
              params: { limit: 100, offset: 0 },
            }),
          ]);

          setProjects(projectResponse.data);
          setTeammates(teammateResponse.data);
        } else {
          const projectResponse = await projectRequest;
          setProjects(projectResponse.data);
          setTeammates([]);
        }
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isAdmin],
  );

  useEffect(() => {
    void loadData();
  }, [loadData, refreshKey]);

  const activeProjects = projects.filter(
    (project) => project.status === "active",
  ).length;

  const completedProjects = projects.filter(
    (project) => project.status === "completed",
  ).length;

  const overdueProjects = projects.filter(isOverdue).length;

  const filteredProjects = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return projects.filter((project) => {
      const matchesSearch =
        !normalizedSearch ||
        project.name.toLowerCase().includes(normalizedSearch) ||
        (project.description ?? "").toLowerCase().includes(normalizedSearch) ||
        String(project.id).includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" || project.status === statusFilter;

      const matchesPriority =
        priorityFilter === "all" || project.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [projects, search, statusFilter, priorityFilter]);

  const managerMap = useMemo(
    () => new Map(teammates.map((teammate) => [teammate.id, teammate])),
    [teammates],
  );

  const canManageProject = (project: Project) =>
    isAdmin || (isProjectManager && project.project_manager_id === user?.id);

  const openCreateForm = () => {
    setEditingProject(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setFormOpen(true);
  };

  const openEditForm = (project: Project) => {
    setEditingProject(project);
    setForm({
      name: project.name,
      description: project.description ?? "",
      status: project.status,
      priority: project.priority,
      start_date: project.start_date?.slice(0, 10) ?? "",
      due_date: project.due_date?.slice(0, 10) ?? "",
      project_manager_id: project.project_manager_id
        ? String(project.project_manager_id)
        : "",
    });
    setFormError("");
    setFormOpen(true);
  };

  const updateForm = <K extends keyof ProjectForm>(
    key: K,
    value: ProjectForm[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const saveProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    if (form.name.trim().length < 2) {
      setFormError("Project name must contain at least 2 characters.");
      return;
    }

    if (form.start_date && form.due_date && form.due_date < form.start_date) {
      setFormError("Due date cannot be before the start date.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      status: form.status,
      priority: form.priority,
      start_date: form.start_date || null,
      due_date: form.due_date || null,
      project_manager_id: form.project_manager_id
        ? Number(form.project_manager_id)
        : null,
    };

    setSaving(true);

    try {
      if (editingProject) {
        const response = await api.patch<Project>(
          `/api/v1/projects/${editingProject.id}`,
          payload,
        );

        setProjects((current) =>
          current.map((project) =>
            project.id === response.data.id ? response.data : project,
          ),
        );

        if (selectedProject?.id === response.data.id) {
          setSelectedProject(response.data);
        }

        setSuccess("Project updated successfully.");
      } else {
        const response = await api.post<Project>("/api/v1/projects", payload);

        setProjects((current) => [response.data, ...current]);
        setSuccess("Project created successfully.");
      }

      setFormOpen(false);
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const addProjectMember = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMemberError("");
    setMemberSuccess("");

    if (!selectedProject) return;

    const userId = Number(memberUserId);

    if (!Number.isInteger(userId) || userId <= 0) {
      setMemberError("Enter a valid teammate ID.");
      return;
    }

    setAddingMember(true);

    try {
      await api.post(`/api/v1/projects/${selectedProject.id}/members`, {
        user_id: userId,
      });

      const teammate = teammates.find((item) => item.id === userId);

      setMemberSuccess(
        teammate
          ? `${teammate.full_name} was added to the project.`
          : `Teammate ID ${userId} was added to the project.`,
      );

      setMemberUserId("");
    } catch (err) {
      setMemberError(getErrorMessage(err));
    } finally {
      setAddingMember(false);
    }
  };

  const refreshProjects = () => {
    setRefreshing(true);
    setSuccess("");
    setRefreshKey((current) => current + 1);
  };

  useEffect(() => {
    if (!success) return;

    const timeout = window.setTimeout(() => setSuccess(""), 4000);
    return () => window.clearTimeout(timeout);
  }, [success]);

  return (
    <main className="ts-page ts-projects-page">
      <div className="ts-projects-heading">
        <div>
          <div className="ts-projects-eyebrow">
            <FolderKanban size={15} />
            WORKSPACE
          </div>

          <h1 className="ts-projects-title">Projects</h1>
          <p className="ts-secondary ts-projects-subtitle">
            Plan work, coordinate teammates, and keep every project moving.
          </p>
        </div>

        <div className="ts-projects-heading-actions">
          <button
            type="button"
            className="ts-button-secondary ts-project-refresh"
            onClick={refreshProjects}
            disabled={loading || refreshing}
          >
            {refreshing ? (
              <LoaderCircle className="ts-spin" size={16} />
            ) : (
              <RefreshCw size={16} />
            )}
            Refresh
          </button>

          {isAdmin && (
            <button
              type="button"
              className="ts-button-primary ts-project-create"
              onClick={openCreateForm}
            >
              <Plus size={17} />
              New project
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="ts-feedback ts-feedback-error ts-project-feedback">
          <AlertCircle size={17} />
          <span>{error}</span>
          <button
            type="button"
            className="ts-icon-button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="ts-feedback ts-feedback-success ts-project-feedback">
          <Check size={17} />
          <span>{success}</span>
          <button
            type="button"
            className="ts-icon-button"
            onClick={() => setSuccess("")}
            aria-label="Dismiss message"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <section className="ts-project-stats" aria-label="Project summary">
        <article className="ts-project-stat">
          <div className="ts-project-stat-top">
            <span className="ts-project-stat-icon">
              <FolderKanban size={19} />
            </span>
            <span className="ts-muted ts-project-stat-label">All projects</span>
          </div>
          <strong>{loading ? "—" : projects.length}</strong>
          <span className="ts-muted ts-project-stat-caption">
            Projects you can access
          </span>
        </article>

        <article className="ts-project-stat">
          <div className="ts-project-stat-top">
            <span className="ts-project-stat-icon ts-project-stat-active">
              <CircleDot size={19} />
            </span>
            <span className="ts-muted ts-project-stat-label">Active</span>
          </div>
          <strong>{loading ? "—" : activeProjects}</strong>
          <span className="ts-muted ts-project-stat-caption">
            Currently in progress
          </span>
        </article>

        <article className="ts-project-stat">
          <div className="ts-project-stat-top">
            <span className="ts-project-stat-icon ts-project-stat-complete">
              <Check size={19} />
            </span>
            <span className="ts-muted ts-project-stat-label">Completed</span>
          </div>
          <strong>{loading ? "—" : completedProjects}</strong>
          <span className="ts-muted ts-project-stat-caption">
            Marked as completed
          </span>
        </article>

        <article className="ts-project-stat">
          <div className="ts-project-stat-top">
            <span className="ts-project-stat-icon ts-project-stat-overdue">
              <Clock3 size={19} />
            </span>
            <span className="ts-muted ts-project-stat-label">Overdue</span>
          </div>
          <strong>{loading ? "—" : overdueProjects}</strong>
          <span className="ts-muted ts-project-stat-caption">
            Past their due date
          </span>
        </article>
      </section>

      <section className="ts-panel ts-project-list-panel">
        <div className="ts-project-list-heading">
          <div>
            <h2>All projects</h2>
            <p className="ts-secondary">
              {filteredProjects.length}{" "}
              {filteredProjects.length === 1 ? "project" : "projects"} shown
            </p>
          </div>
        </div>

        <div className="ts-project-toolbar">
          <label className="ts-project-search">
            <Search size={17} />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search projects..."
              aria-label="Search projects"
            />
            {search && (
              <button
                type="button"
                className="ts-icon-button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </label>

          <label className="ts-project-filter">
            <span className="ts-muted">Status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All statuses</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {formatStatus(status)}
                </option>
              ))}
            </select>
            <ChevronDown size={14} />
          </label>

          <label className="ts-project-filter">
            <span className="ts-muted">Priority</span>
            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
            >
              <option value="all">All priorities</option>
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </option>
              ))}
            </select>
            <ChevronDown size={14} />
          </label>
        </div>

        {loading ? (
          <div className="ts-project-state">
            <LoaderCircle className="ts-spin" size={25} />
            <p>Loading projects...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="ts-project-state">
            <span className="ts-project-empty-icon">
              <FolderKanban size={25} />
            </span>
            <h3>
              {projects.length ? "No matching projects" : "No projects yet"}
            </h3>
            <p>
              {projects.length
                ? "Try changing your search or filters."
                : isAdmin
                  ? "Create your first project to start organizing your team's work."
                  : "Projects you have access to will appear here."}
            </p>
            {isAdmin && projects.length === 0 && (
              <button
                type="button"
                className="ts-button-primary"
                onClick={openCreateForm}
              >
                <Plus size={16} />
                Create first project
              </button>
            )}
          </div>
        ) : (
          <div className="ts-project-table-wrap">
            <table className="ts-project-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Project manager</th>
                  <th>Due date</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>

              <tbody>
                {filteredProjects.map((project) => {
                  const manager = project.project_manager_id
                    ? managerMap.get(project.project_manager_id)
                    : undefined;

                  return (
                    <tr key={project.id}>
                      <td>
                        <button
                          type="button"
                          className="ts-project-name-button"
                          onClick={() => {
                            setSelectedProject(project);
                            setMemberError("");
                            setMemberSuccess("");
                          }}
                        >
                          <span className="ts-project-row-icon">
                            <FolderKanban size={18} />
                          </span>
                          <span className="ts-project-name-copy">
                            <strong>{project.name}</strong>
                            <small>
                              {project.description?.trim()
                                ? project.description
                                : `Project #${project.id}`}
                            </small>
                          </span>
                        </button>
                      </td>

                      <td>
                        <ProjectStatusBadge status={project.status} />
                      </td>

                      <td>
                        <PriorityBadge priority={project.priority} />
                      </td>

                      <td>
                        {manager ? (
                          <span className="ts-project-manager">
                            <span className="ts-project-manager-avatar">
                              {getInitials(manager.full_name)}
                            </span>
                            <span>{manager.full_name}</span>
                          </span>
                        ) : project.project_manager_id ? (
                          <span className="ts-muted">
                            ID #{project.project_manager_id}
                          </span>
                        ) : (
                          <span className="ts-muted">Unassigned</span>
                        )}
                      </td>

                      <td>
                        <span
                          className={`ts-project-date ${isOverdue(project) ? "is-overdue" : ""}`}
                        >
                          <CalendarDays size={15} />
                          {formatDate(project.due_date)}
                        </span>
                      </td>

                      <td>
                        <button
                          type="button"
                          className="ts-project-open-button"
                          onClick={() => {
                            setSelectedProject(project);
                            setMemberError("");
                            setMemberSuccess("");
                          }}
                          aria-label={`View ${project.name}`}
                        >
                          <ArrowUpRight size={17} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {formOpen && (
        <Modal
          title={editingProject ? "Edit project" : "Create a project"}
          subtitle={
            editingProject
              ? "Update Project"
              : "Set up project."
          }
          onClose={() => {
            if (!saving) setFormOpen(false);
          }}
          wide
        >
          <form className="ts-project-form" onSubmit={saveProject}>
            {formError && (
              <div className="ts-feedback ts-feedback-error">
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <label className="ts-project-field ts-project-field-full">
              <span>
                Project name <b>*</b>
              </span>
              <input
                required
                minLength={2}
                maxLength={200}
                value={form.name}
                onChange={(event) => updateForm("name", event.target.value)}
                placeholder="e.g. TeamSpace website redesign"
              />
            </label>

            <label className="ts-project-field ts-project-field-full">
              <span>Description</span>
              <textarea
                rows={4}
                maxLength={5000}
                value={form.description}
                onChange={(event) =>
                  updateForm("description", event.target.value)
                }
                placeholder="What is this project about?"
              />
              <small>{form.description.length}/5000 characters</small>
            </label>

            <label className="ts-project-field">
              <span>Status</span>
              <select
                value={form.status}
                onChange={(event) =>
                  updateForm("status", event.target.value as ProjectStatus)
                }
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {formatStatus(status)}
                  </option>
                ))}
              </select>
            </label>

            <label className="ts-project-field">
              <span>Priority</span>
              <select
                value={form.priority}
                onChange={(event) =>
                  updateForm("priority", event.target.value as ProjectPriority)
                }
              >
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </option>
                ))}
              </select>
            </label>

            <label className="ts-project-field">
              <span>Start date</span>
              <input
                type="date"
                value={form.start_date}
                onChange={(event) =>
                  updateForm("start_date", event.target.value)
                }
              />
            </label>

            <label className="ts-project-field">
              <span>Due date</span>
              <input
                type="date"
                min={form.start_date || undefined}
                value={form.due_date}
                onChange={(event) => updateForm("due_date", event.target.value)}
              />
            </label>

            <label className="ts-project-field ts-project-field-full">
              <span>Project manager</span>
              <select
                value={form.project_manager_id}
                onChange={(event) =>
                  updateForm("project_manager_id", event.target.value)
                }
              >
                <option value="">Unassigned</option>
                {teammates
                  .filter(
                    (teammate) =>
                      teammate.is_active && teammate.role === "project_manager",
                  )
                  .map((teammate) => (
                    <option key={teammate.id} value={teammate.id}>
                      {teammate.full_name} — {teammate.email}
                    </option>
                  ))}
              </select>
              {teammates.filter(
                (teammate) =>
                  teammate.is_active && teammate.role === "project_manager",
              ).length === 0 && (
                <small>
                  No active project managers are available. You can leave this
                  unassigned and set one later.
                </small>
              )}
            </label>

            <div className="ts-project-form-footer">
              <button
                type="button"
                className="ts-button-secondary"
                disabled={saving}
                onClick={() => setFormOpen(false)}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="ts-button-primary"
                disabled={saving}
              >
                {saving ? (
                  <LoaderCircle className="ts-spin" size={16} />
                ) : (
                  <Check size={16} />
                )}
                {saving
                  ? "Saving..."
                  : editingProject
                    ? "Save changes"
                    : "Create project"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {selectedProject && (
        <Modal
          title={selectedProject.name}
          subtitle={`Project #${selectedProject.id}`}
          onClose={() => setSelectedProject(null)}
          wide
        >
          <div className="ts-project-detail">
            <div className="ts-project-detail-badges">
              <ProjectStatusBadge status={selectedProject.status} />
              <PriorityBadge priority={selectedProject.priority} />
              {isOverdue(selectedProject) && (
                <span className="ts-project-overdue-badge">Overdue</span>
              )}
            </div>

            <div className="ts-project-detail-description">
              <h3>About this project</h3>
              <p>
                {selectedProject.description?.trim() ||
                  "No description has been added to this project yet."}
              </p>
            </div>

            <div className="ts-project-detail-grid">
              <div>
                <span className="ts-muted">
                  <CalendarDays size={15} /> Start date
                </span>
                <strong>{formatDate(selectedProject.start_date)}</strong>
              </div>
              <div>
                <span className="ts-muted">
                  <Clock3 size={15} /> Due date
                </span>
                <strong>{formatDate(selectedProject.due_date)}</strong>
              </div>
              <div>
                <span className="ts-muted">
                  <Users size={15} /> Project manager
                </span>
                <strong>
                  {selectedProject.project_manager_id
                    ? (managerMap.get(selectedProject.project_manager_id)
                        ?.full_name ??
                      `Teammate #${selectedProject.project_manager_id}`)
                    : "Unassigned"}
                </strong>
              </div>
              <div>
                <span className="ts-muted">
                  <CalendarDays size={15} /> Created
                </span>
                <strong>{formatDate(selectedProject.created_at)}</strong>
              </div>
            </div>

            {canManageProject(selectedProject) && (
              <>
                <div className="ts-project-detail-divider" />

                <div className="ts-project-section-heading">
                  <div>
                    <h3>Manage project</h3>
                    <p className="ts-secondary">
                      Update the project or add a teammate.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="ts-button-secondary"
                    onClick={() => {
                      const project = selectedProject;
                      setSelectedProject(null);
                      openEditForm(project);
                    }}
                  >
                    Edit project
                  </button>
                </div>

                <form
                  className="ts-project-member-form"
                  onSubmit={addProjectMember}
                >
                  <label className="ts-project-field">
                    <span>Add teammate</span>
                    {isAdmin &&
                    teammates.filter((item) => item.is_active).length > 0 ? (
                      <select
                        required
                        value={memberUserId}
                        onChange={(event) =>
                          setMemberUserId(event.target.value)
                        }
                      >
                        <option value="">Select a teammate</option>
                        {teammates
                          .filter((item) => item.is_active)
                          .map((teammate) => (
                            <option key={teammate.id} value={teammate.id}>
                              {teammate.full_name} — {teammate.email}
                            </option>
                          ))}
                      </select>
                    ) : (
                      <input
                        type="number"
                        min="1"
                        required
                        value={memberUserId}
                        onChange={(event) =>
                          setMemberUserId(event.target.value)
                        }
                        placeholder="Enter teammate ID"
                      />
                    )}
                  </label>

                  <button
                    type="submit"
                    className="ts-button-primary ts-project-member-submit"
                    disabled={addingMember || !memberUserId}
                  >
                    {addingMember ? (
                      <LoaderCircle className="ts-spin" size={16} />
                    ) : (
                      <Plus size={16} />
                    )}
                    Add member
                  </button>
                </form>

                {memberError && (
                  <div className="ts-feedback ts-feedback-error">
                    <AlertCircle size={16} />
                    <span>{memberError}</span>
                  </div>
                )}

                {memberSuccess && (
                  <div className="ts-feedback ts-feedback-success">
                    <Check size={16} />
                    <span>{memberSuccess}</span>
                  </div>
                )}

                <p className="ts-muted ts-project-member-note">
                  The current API supports adding project members, but does not
                  provide an endpoint to list existing project members.
                </p>
              </>
            )}
          </div>
        </Modal>
      )}
    </main>
  );
}
