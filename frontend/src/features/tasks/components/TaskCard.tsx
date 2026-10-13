import { CalendarDays, GripVertical, UserRound } from "lucide-react";
import type { Project, Task } from "../tasks.types";
import { formatTaskDate, isTaskOverdue } from "../tasks.utils";
import { TaskPriorityBadge, TaskStatusBadge } from "./TaskBadges";

interface Props {
  task: Task;
  project?: Project;
  assigneeName?: string;
  draggable: boolean;
  onOpen: (task: Task) => void;
  onDragStart: (task: Task | null) => void;
}

export default function TaskCard({ task, project, assigneeName, draggable, onOpen, onDragStart }: Props) {
  const overdue = isTaskOverdue(task);
  return <article className={`ts-task-card ${overdue ? "is-overdue" : ""}`} draggable={draggable} onDragStart={() => onDragStart(task)} onDragEnd={() => onDragStart(null)}>
    <div className="ts-task-card-top"><span className="ts-task-card-grip" aria-hidden="true"><GripVertical size={15} /></span><TaskPriorityBadge priority={task.priority} /><button type="button" className="ts-task-card-open" onClick={() => onOpen(task)} aria-label={`Open ${task.title}`}>Open</button></div>
    <button type="button" className="ts-task-card-title" onClick={() => onOpen(task)}>{task.title}</button>
    {task.description && <p className="ts-task-card-description">{task.description}</p>}
    <div className="ts-task-card-project">{project?.name ?? `Project #${task.project_id}`}</div>
    <div className="ts-task-card-footer">
      <span className={`ts-task-card-date ${overdue ? "is-overdue" : ""}`}><CalendarDays size={14} />{formatTaskDate(task.due_date)}</span>
      <span className="ts-task-card-assignee" title={assigneeName ?? (task.assigned_to_id ? `Teammate #${task.assigned_to_id}` : "Unassigned")}><UserRound size={14} />{assigneeName ?? (task.assigned_to_id ? `#${task.assigned_to_id}` : "Unassigned")}</span>
    </div>
    <div className="ts-task-card-status"><TaskStatusBadge status={task.status} /></div>
  </article>;
}
