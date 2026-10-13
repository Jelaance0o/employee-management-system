import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, FolderKanban, LoaderCircle, Plus, RefreshCw, X } from "lucide-react";
import api from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import type { Project, ProjectFormValues, Teammate } from "./projects.types";
import { EMPTY_PROJECT_FORM } from "./projects.types";
import { getErrorMessage } from "./projects.utils";
import { ProjectStats } from "./components/ProjectStats";
import { ProjectFilters } from "./components/ProjectFilters";
import { ProjectTable } from "./components/ProjectTable";
import { ProjectFormDialog } from "./components/ProjectFormDialog";
import { ProjectDetailsDialog } from "./components/ProjectDetailsDialog";
import "./projects.css";

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
  const [form, setForm] = useState<ProjectFormValues>(EMPTY_PROJECT_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [memberUserId, setMemberUserId] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [memberError, setMemberError] = useState("");
  const [memberSuccess, setMemberSuccess] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const projectRequest = api.get<Project[]>("/api/v1/projects", { params: { limit: 100, offset: 0 } });
      if (isAdmin) {
        const [projectResponse, teammateResponse] = await Promise.all([
          projectRequest,
          api.get<Teammate[]>("/api/v1/teammates", { params: { limit: 100, offset: 0 } }),
        ]);
        setProjects(projectResponse.data);
        setTeammates(teammateResponse.data);
      } else {
        const response = await projectRequest;
        setProjects(response.data);
        setTeammates([]);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin]);

  useEffect(() => { void loadData(); }, [loadData, refreshKey]);

  useEffect(() => {
    if (!success) return;
    const timeout = window.setTimeout(() => setSuccess(""), 4000);
    return () => window.clearTimeout(timeout);
  }, [success]);

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesSearch = !query || project.name.toLowerCase().includes(query) || (project.description ?? "").toLowerCase().includes(query) || String(project.id).includes(query);
      const matchesStatus = statusFilter === "all" || project.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || project.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [projects, search, statusFilter, priorityFilter]);

  const managerMap = useMemo(() => new Map(teammates.map((teammate) => [teammate.id, teammate])), [teammates]);
  const canManageProject = (project: Project) => isAdmin || (isProjectManager && project.project_manager_id === user?.id);

  const openCreateForm = () => {
    setEditingProject(null);
    setForm(EMPTY_PROJECT_FORM);
    setFormError("");
    setFormOpen(true);
  };

  const openEditForm = (project: Project) => {
    setEditingProject(project);
    setForm({ name: project.name, description: project.description ?? "", status: project.status, priority: project.priority, start_date: project.start_date?.slice(0, 10) ?? "", due_date: project.due_date?.slice(0, 10) ?? "", project_manager_id: project.project_manager_id ? String(project.project_manager_id) : "" });
    setFormError("");
    setFormOpen(true);
  };

  const updateForm = <K extends keyof ProjectFormValues>(key: K, value: ProjectFormValues[K]) => setForm((current) => ({ ...current, [key]: value }));

  const saveProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    if (form.name.trim().length < 2) { setFormError("Project name must contain at least 2 characters."); return; }
    if (form.start_date && form.due_date && form.due_date < form.start_date) { setFormError("Due date cannot be before the start date."); return; }

    const payload = { name: form.name.trim(), description: form.description.trim() || null, status: form.status, priority: form.priority, start_date: form.start_date || null, due_date: form.due_date || null, project_manager_id: form.project_manager_id ? Number(form.project_manager_id) : null };
    setSaving(true);
    try {
      if (editingProject) {
        const response = await api.patch<Project>(`/api/v1/projects/${editingProject.id}`, payload);
        setProjects((current) => current.map((project) => project.id === response.data.id ? response.data : project));
        setSelectedProject((current) => current?.id === response.data.id ? response.data : current);
        setSuccess("Project updated successfully.");
      } else {
        const response = await api.post<Project>("/api/v1/projects", payload);
        setProjects((current) => [response.data, ...current]);
        setSuccess("Project created successfully.");
      }
      setFormOpen(false);
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally { setSaving(false); }
  };

  const addProjectMember = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMemberError("");
    setMemberSuccess("");
    if (!selectedProject) return;
    const userId = Number(memberUserId);
    if (!Number.isInteger(userId) || userId <= 0) { setMemberError("Enter a valid teammate ID."); return; }
    setAddingMember(true);
    try {
      await api.post(`/api/v1/projects/${selectedProject.id}/members`, { user_id: userId });
      const teammate = teammates.find((item) => item.id === userId);
      setMemberSuccess(teammate ? `${teammate.full_name} was added to the project.` : `Teammate ID ${userId} was added to the project.`);
      setMemberUserId("");
    } catch (err) { setMemberError(getErrorMessage(err)); }
    finally { setAddingMember(false); }
  };

  const selectProject = (project: Project) => {
    setSelectedProject(project);
    setMemberError("");
    setMemberSuccess("");
  };

  const refreshProjects = () => { setRefreshing(true); setSuccess(""); setRefreshKey((current) => current + 1); };

  return (
    <main className="ts-page ts-projects-page">
      <header className="ts-projects-heading">
        <div>
          <div className="ts-projects-eyebrow"><FolderKanban size={15} />WORKSPACE</div>
          <h1 className="ts-projects-title">Projects</h1>
          <p className="ts-secondary ts-projects-subtitle">Plan work, coordinate teammates, and keep every project moving.</p>
        </div>
        <div className="ts-projects-heading-actions">
          <button type="button" className="ts-button-secondary ts-project-refresh" onClick={refreshProjects} disabled={loading || refreshing}>{refreshing ? <LoaderCircle className="ts-spin" size={16} /> : <RefreshCw size={16} />}Refresh</button>
          {isAdmin && <button type="button" className="ts-button-primary ts-project-create" onClick={openCreateForm}><Plus size={17} />New project</button>}
        </div>
      </header>

      {error && <div className="ts-feedback ts-feedback-error ts-project-feedback"><AlertCircle size={17} /><span>{error}</span><button type="button" className="ts-icon-button" onClick={() => setError("")} aria-label="Dismiss error"><X size={16} /></button></div>}
      {success && <div className="ts-feedback ts-feedback-success ts-project-feedback"><Check size={17} /><span>{success}</span><button type="button" className="ts-icon-button" onClick={() => setSuccess("")} aria-label="Dismiss message"><X size={16} /></button></div>}

      <ProjectStats projects={projects} loading={loading} />
      <section className="ts-panel ts-project-list-panel">
        <ProjectFilters search={search} statusFilter={statusFilter} priorityFilter={priorityFilter} resultCount={filteredProjects.length} onSearchChange={setSearch} onStatusChange={setStatusFilter} onPriorityChange={setPriorityFilter} />
        {loading ? <div className="ts-project-state"><LoaderCircle className="ts-spin" size={25} /><p>Loading projects...</p></div> : filteredProjects.length === 0 ? (
          <div className="ts-project-state"><span className="ts-project-empty-icon"><FolderKanban size={25} /></span><h3>{projects.length ? "No matching projects" : "No projects yet"}</h3><p>{projects.length ? "Try changing your search or filters." : isAdmin ? "Create your first project to start organizing your team's work." : "Projects you have access to will appear here."}</p>{isAdmin && projects.length === 0 && <button type="button" className="ts-button-primary" onClick={openCreateForm}><Plus size={16} />Create first project</button>}</div>
        ) : <ProjectTable projects={filteredProjects} managerMap={managerMap} onSelect={selectProject} />}
      </section>

      {formOpen && <ProjectFormDialog editingProject={editingProject} form={form} teammates={teammates} saving={saving} error={formError} onClose={() => { if (!saving) setFormOpen(false); }} onSubmit={saveProject} onChange={updateForm} />}
      {selectedProject && <ProjectDetailsDialog project={selectedProject} managerMap={managerMap} canManage={canManageProject(selectedProject)} isAdmin={isAdmin} teammates={teammates} memberUserId={memberUserId} addingMember={addingMember} memberError={memberError} memberSuccess={memberSuccess} onMemberUserIdChange={setMemberUserId} onAddMember={addProjectMember} onEdit={() => { const project = selectedProject; setSelectedProject(null); openEditForm(project); }} onClose={() => setSelectedProject(null)} />}
    </main>
  );
}
