import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertCircle, ClipboardList, LoaderCircle, Plus, RefreshCw, X } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../lib/api";
import type { Project, Task, TaskTeammate } from "./tasks.types";
import { getTaskErrorMessage } from "./tasks.utils";
import { getTaskProjects, getTaskTeammates, getTasks } from "./tasks.api";
import TaskStats from "./components/TaskStats";
import TaskFilters from "./components/TaskFilters";
import TaskList from "./components/TaskList";
import TaskFormDialog from "./components/TaskFormDialog";
import TaskDetailsDialog from "./components/TaskDetailsDialog";
import TaskReportsPanel from "./components/TaskReportsPanel";
import MemberProfileEditor from "../team/MemberProfileEditor";
import "./tasks.css";
import "./styles/task-list.css";
import "./styles/task-form.css";

export default function TasksPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const handledTaskId = useRef<string | null>(null);
  const isAdmin = user?.role === "admin";
  const canCreate = isAdmin || user?.role === "project_manager";
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teammates, setTeammates] = useState<TaskTeammate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState(() => searchParams.get("projectId") ?? "all");
  const [formTask, setFormTask] = useState<Task | null | "create">(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [taskData, projectData] = await Promise.all([getTasks({ limit: 100, offset: 0 }), getTaskProjects()]);
      setTasks(taskData); setProjects(projectData);
      if (isAdmin) {
        try { setTeammates(await getTaskTeammates()); }
        catch { setTeammates([]); }
      } else setTeammates([]);
    } catch (err) { setError(getTaskErrorMessage(err)); }
    finally { setLoading(false); setRefreshing(false); }
  }, [isAdmin]);

  useEffect(() => { void loadData(); }, [loadData, refreshKey]);
  useEffect(() => { if (!success) return; const timeout = window.setTimeout(() => setSuccess(""), 3500); return () => window.clearTimeout(timeout); }, [success]);

  useEffect(() => {
    const projectId = searchParams.get("projectId");
    if (projectId && projectFilter !== projectId) setProjectFilter(projectId);
  }, [searchParams, projectFilter]);

  useEffect(() => {
    const taskId = searchParams.get("taskId");
    if (!taskId || loading || handledTaskId.current === taskId) return;
    handledTaskId.current = taskId;
    const clearTaskQuery = () => {
      const next = new URLSearchParams(searchParams);
      next.delete("taskId");
      setSearchParams(next, { replace: true });
    };
    const existingTask = tasks.find((task) => task.id === Number(taskId));
    if (existingTask) {
      setSelectedTask(existingTask);
      clearTaskQuery();
      return;
    }
    api.get<Task>(`/api/v1/tasks/${encodeURIComponent(taskId)}`)
      .then((response) => {
        setTasks((current) => current.some((task) => task.id === response.data.id) ? current : [response.data, ...current]);
        setSelectedTask(response.data);
      })
      .catch((err: unknown) => setError(getTaskErrorMessage(err)))
      .finally(clearTaskQuery);
  }, [loading, tasks, searchParams, setSearchParams]);

  const projectsById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);
  const taskCreationProjects = useMemo(
    () => isAdmin ? projects : projects.filter((project) => project.project_manager_id === user?.id),
    [isAdmin, projects, user?.id],
  );
  const teammatesById = useMemo(() => new Map(teammates.map((person) => [person.id, person.full_name])), [teammates]);

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchesSearch = !query || task.title.toLowerCase().includes(query) || (task.description ?? "").toLowerCase().includes(query) || String(task.id).includes(query);
      const matchesStatus = statusFilter === "all" || task.status === statusFilter;
      const matchesProject = projectFilter === "all" || task.project_id === Number(projectFilter);
      return matchesSearch && matchesStatus && matchesProject;
    });
  }, [tasks, search, statusFilter, projectFilter]);

  const replaceTask = (updated: Task) => {
    setTasks((current) => current.map((task) => task.id === updated.id ? updated : task));
    setSelectedTask(updated);
  };


  const handleSaved = (saved: Task, created: boolean) => {
    if (created) setTasks((current) => [saved, ...current]);
    else setTasks((current) => current.map((task) => task.id === saved.id ? saved : task));
    setFormTask(null);
    setSelectedTask(created ? null : saved);
    setSuccess(created ? "Task created successfully." : "Task updated successfully.");
  };

  return <main className="ts-page ts-tasks-page">
    <header className="ts-tasks-heading"><div><div className="ts-tasks-eyebrow"><ClipboardList size={15} /> WORKSPACE</div><h1>Tasks</h1><p className="ts-secondary">Track assignments, deadlines, and reviews across your projects.</p></div><div className="ts-tasks-heading-actions"><button type="button" className="ts-button-secondary ts-task-refresh" onClick={() => { setRefreshing(true); setRefreshKey((value) => value + 1); }} disabled={loading || refreshing}>{refreshing ? <LoaderCircle className="ts-task-spin" size={16} /> : <RefreshCw size={16} />}Refresh</button>{canCreate && <button type="button" className="ts-button-primary ts-task-new-button" onClick={() => setFormTask("create")}><Plus size={17} />New task</button>}</div></header>

    {error && <div className="ts-feedback ts-feedback-error ts-task-page-feedback"><AlertCircle size={16} /><span>{error}</span><button type="button" className="ts-icon-button" onClick={() => setError("")} aria-label="Dismiss error"><X size={15} /></button></div>}
    {success && <div className="ts-feedback ts-feedback-success ts-task-page-feedback"><span>{success}</span><button type="button" className="ts-icon-button" onClick={() => setSuccess("")} aria-label="Dismiss message"><X size={15} /></button></div>}

    <TaskStats tasks={tasks} />
    <section className="ts-panel ts-task-main-panel"><div className="ts-task-panel-heading"><div><h2>Task workspace</h2><p className="ts-secondary">{filteredTasks.length} {filteredTasks.length === 1 ? "task" : "tasks"} shown</p></div><span className="ts-task-panel-count">{tasks.length} total</span></div>
      <TaskFilters search={search} onSearchChange={setSearch} status={statusFilter} onStatusChange={setStatusFilter} projectId={projectFilter} onProjectChange={setProjectFilter} projects={projects} canCreate={Boolean(canCreate)} onCreate={() => setFormTask("create")} />
      {loading ? <div className="ts-task-page-state"><LoaderCircle className="ts-task-spin" size={25} /><p>Loading tasks...</p></div> : filteredTasks.length === 0 ? <div className="ts-task-page-state"><span className="ts-task-empty-icon"><ClipboardList size={24} /></span><h3>{tasks.length ? "No matching tasks" : "No tasks yet"}</h3><p>{tasks.length ? "Try another search or filter." : canCreate ? "Create a task to start tracking your team's work." : "Tasks assigned to you will appear here."}</p>{canCreate && tasks.length === 0 && <button type="button" className="ts-button-primary" onClick={() => setFormTask("create")}><Plus size={16} />Create first task</button>}</div> : <TaskList tasks={filteredTasks} projectsById={projectsById} teammatesById={teammatesById} onOpen={setSelectedTask} />}
    </section>

    <TaskReportsPanel tasks={tasks} userId={user?.id} role={user?.role} />
    {user?.role === "employee" && <MemberProfileEditor />}

    {formTask !== null && <TaskFormDialog task={formTask === "create" ? null : formTask} projects={formTask === "create" ? taskCreationProjects : projects} onClose={() => setFormTask(null)} onSaved={handleSaved} />}
    {selectedTask && <TaskDetailsDialog key={selectedTask.id} task={selectedTask} project={projectsById.get(selectedTask.project_id)} assigneeName={selectedTask.assigned_to_id ? teammatesById.get(selectedTask.assigned_to_id) : undefined} role={user?.role} userId={user?.id} onClose={() => setSelectedTask(null)} onEdit={(task) => { setSelectedTask(null); setFormTask(task); }} onUpdated={replaceTask} />}
  </main>;
}
