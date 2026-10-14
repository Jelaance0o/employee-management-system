import { CalendarDays, ChevronRight, UserRound } from "lucide-react";
import type { Project, Task } from "../tasks.types";
import { formatTaskDate, isTaskOverdue } from "../tasks.utils";
import { TaskPriorityBadge, TaskStatusBadge } from "./TaskBadges";

interface Props {
  tasks: Task[];
  projectsById: Map<number, Project>;
  teammatesById: Map<number, string>;
  onOpen: (task: Task) => void;
}

export default function TaskList({ tasks, projectsById, teammatesById, onOpen }: Props) {
  return (
    <div className="ts-task-list" aria-label="Tasks">
      {tasks.map((task) => {
        const project = projectsById.get(task.project_id);
        const assignee = task.assigned_to_name ?? (task.assigned_to_id ? teammatesById.get(task.assigned_to_id) : undefined);
        const overdue = isTaskOverdue(task);

        return (
          <button
            key={task.id}
            type="button"
            className={`ts-task-list-row ${overdue ? "is-overdue" : ""}`}
            onClick={() => onOpen(task)}
            aria-label={`Open task ${task.title}`}
          >
            <span className="ts-task-list-main">
              <span className="ts-task-list-title-line">
                <strong>{task.title}</strong>
                <span className="ts-task-list-id">#{task.id}</span>
              </span>
              <span className="ts-task-list-project">{project?.name ?? task.project_name ?? `Project #${task.project_id}`}</span>
              <span className="ts-task-list-owners"><span>Assigned to: <b>{task.assigned_to_name ?? assignee ?? (task.assigned_to_id ? `Member #${task.assigned_to_id}` : "Unassigned")}</b></span><span>Assigned by: <b>{task.created_by_name ?? `User #${task.created_by_id}`}</b></span><span>Project manager: <b>{task.project_manager_name ?? "Not assigned"}</b></span></span>
            </span>

            <span className="ts-task-list-status"><TaskStatusBadge status={task.status} /></span>
            <span className="ts-task-list-priority"><TaskPriorityBadge priority={task.priority} /></span>

            <span className="ts-task-list-meta ts-task-list-assignee">
              <UserRound size={14} />
              <span>{assignee ?? (task.assigned_to_id ? `Member #${task.assigned_to_id}` : "Unassigned")}</span>
            </span>

            <span className={`ts-task-list-meta ts-task-list-date ${overdue ? "is-overdue" : ""}`}>
              <CalendarDays size={14} />
              <span>{formatTaskDate(task.due_date)}</span>
            </span>

            <span className="ts-task-list-open" aria-hidden="true"><ChevronRight size={17} /></span>
          </button>
        );
      })}
    </div>
  );
}
