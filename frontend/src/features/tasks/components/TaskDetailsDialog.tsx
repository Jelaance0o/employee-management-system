import { useState } from "react";
import { AlertCircle, CalendarDays, Check, Clock3, Edit3, LoaderCircle, X } from "lucide-react";
import type { Project, Task, TaskStatus } from "../tasks.types";
import { TASK_STATUSES } from "../tasks.types";
import { formatTaskDate, canTransitionTask, getTaskErrorMessage } from "../tasks.utils";
import { updateTask } from "../tasks.api";
import { TaskPriorityBadge, TaskStatusBadge } from "./TaskBadges";

interface Props {
  task: Task;
  project?: Project;
  assigneeName?: string;
  role: string | undefined;
  userId: number | undefined;
  onClose: () => void;
  onEdit: (task: Task) => void;
  onUpdated: (task: Task) => void;
}

export default function TaskDetailsDialog({ task, project, assigneeName, role, userId, onClose, onEdit, onUpdated }: Props) {
  const [busyStatus, setBusyStatus] = useState<TaskStatus | null>(null);
  const [error, setError] = useState("");
  const isAssignedProjectManager = role === "project_manager" && project?.project_manager_id === userId;
  const canEdit = role === "admin" || isAssignedProjectManager;
  const transitions = TASK_STATUSES.filter((status) => status !== task.status && canTransitionTask(task, status, role, isAssignedProjectManager, userId));

  const changeStatus = async (status: TaskStatus) => {
    setBusyStatus(status); setError("");
    try { onUpdated(await updateTask(task.id, { status })); }
    catch (err) { setError(getTaskErrorMessage(err)); }
    finally { setBusyStatus(null); }
  };

  return <div className="ts-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busyStatus) onClose(); }}>
    <section className="ts-dialog ts-task-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="ts-task-detail-title">
      <header className="ts-dialog-header"><div className="ts-dialog-heading-copy"><span className="ts-task-detail-id">TASK #{task.id}</span><h2 id="ts-task-detail-title">{task.title}</h2><p>{project?.name ?? `Project #${task.project_id}`}</p></div><button type="button" className="ts-icon-button" onClick={onClose} aria-label="Close dialog"><X size={18} /></button></header>
      <div className="ts-task-detail-content">
        {error && <div className="ts-feedback ts-feedback-error"><AlertCircle size={16} /><span>{error}</span></div>}
        <div className="ts-task-detail-badges"><TaskStatusBadge status={task.status} /><TaskPriorityBadge priority={task.priority} /></div>
        <section className="ts-task-detail-description"><h3>Description</h3><p>{task.description?.trim() || "No description has been added to this task."}</p></section>
        <div className="ts-task-detail-grid">
          <div><span><CalendarDays size={15} /> Due date</span><strong>{formatTaskDate(task.due_date)}</strong></div>
          <div><span><Clock3 size={15} /> Created</span><strong>{formatTaskDate(task.created_at)}</strong></div>
          <div><span>Assignee</span><strong>{assigneeName ?? (task.assigned_to_id ? `Teammate #${task.assigned_to_id}` : "Unassigned")}</strong></div>
          <div><span>Completed</span><strong>{task.completed_at ? new Date(task.completed_at).toLocaleDateString("en-IN") : "Not completed"}</strong></div>
        </div>
        {transitions.length > 0 && <section className="ts-task-status-actions"><h3>Update status</h3><div>{transitions.map((status) => <button type="button" key={status} className={status === "Done" ? "ts-button-primary" : "ts-button-secondary"} disabled={Boolean(busyStatus)} onClick={() => void changeStatus(status)}>{busyStatus === status ? <LoaderCircle className="ts-task-spin" size={15} /> : status === "Done" ? <Check size={15} /> : null}{status}</button>)}</div><p className="ts-muted">Available actions depend on your role and the current task status.</p></section>}
        {canEdit && <footer className="ts-task-detail-footer"><button type="button" className="ts-button-secondary" onClick={() => onEdit(task)}><Edit3 size={15} />Edit task details</button></footer>}
      </div>
    </section>
  </div>;
}
