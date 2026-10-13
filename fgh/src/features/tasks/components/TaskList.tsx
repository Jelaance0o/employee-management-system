import { CalendarDays, ExternalLink } from "lucide-react";
import type { Project, Task } from "../tasks.types";
import { formatTaskDate, isTaskOverdue } from "../tasks.utils";
import { TaskPriorityBadge, TaskStatusBadge } from "./TaskBadges";

export default function TaskList({ tasks, projectsById, teammatesById, onOpen }: { tasks: Task[]; projectsById: Map<number, Project>; teammatesById: Map<number, string>; onOpen: (task: Task) => void }) {
  return <div className="ts-task-table-wrap"><table className="ts-task-table"><thead><tr><th>Task</th><th>Project</th><th>Status</th><th>Priority</th><th>Assignee</th><th>Due date</th><th /></tr></thead><tbody>
    {tasks.map((task) => <tr key={task.id}>
      <td><button type="button" className="ts-task-table-title" onClick={() => onOpen(task)}><strong>{task.title}</strong><small>Task #{task.id}</small></button></td>
      <td>{projectsById.get(task.project_id)?.name ?? `Project #${task.project_id}`}</td>
      <td><TaskStatusBadge status={task.status} /></td><td><TaskPriorityBadge priority={task.priority} /></td>
      <td>{task.assigned_to_id ? teammatesById.get(task.assigned_to_id) ?? `Teammate #${task.assigned_to_id}` : <span className="ts-muted">Unassigned</span>}</td>
      <td><span className={`ts-task-table-date ${isTaskOverdue(task) ? "is-overdue" : ""}`}><CalendarDays size={14} />{formatTaskDate(task.due_date)}</span></td>
      <td><button type="button" className="ts-icon-button" onClick={() => onOpen(task)} aria-label={`Open ${task.title}`}><ExternalLink size={15} /></button></td>
    </tr>)}
  </tbody></table></div>;
}
