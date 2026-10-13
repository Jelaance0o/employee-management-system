import { useState } from "react";
import type { Project, Task, TaskStatus } from "../tasks.types";
import { TASK_STATUSES } from "../tasks.types";
import TaskCard from "./TaskCard";

interface Props {
  tasks: Task[];
  projectsById: Map<number, Project>;
  teammatesById: Map<number, string>;
  canDragTo: (task: Task, status: TaskStatus) => boolean;
  onOpen: (task: Task) => void;
  onDropStatus: (task: Task, status: TaskStatus) => void;
}

export default function TaskBoard({ tasks, projectsById, teammatesById, canDragTo, onOpen, onDropStatus }: Props) {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  return <div className="ts-task-board">
    {TASK_STATUSES.map((status) => {
      const columnTasks = tasks.filter((task) => task.status === status);
      return <section key={status} className={`ts-task-column ts-task-column-${status.toLowerCase().replaceAll(" ", "-")}`} onDragOver={(event) => { if (draggedTask && canDragTo(draggedTask, status)) event.preventDefault(); }} onDrop={(event) => { event.preventDefault(); if (draggedTask && canDragTo(draggedTask, status)) onDropStatus(draggedTask, status); setDraggedTask(null); }}>
        <header className="ts-task-column-header"><span className="ts-task-column-indicator" /><h3>{status}</h3><span className="ts-task-column-count">{columnTasks.length}</span></header>
        <div className="ts-task-column-body">
          {columnTasks.map((task) => <TaskCard key={task.id} task={task} project={projectsById.get(task.project_id)} assigneeName={task.assigned_to_id ? teammatesById.get(task.assigned_to_id) : undefined} draggable={TASK_STATUSES.some((target) => target !== task.status && canDragTo(task, target))} onOpen={onOpen} onDragStart={(value) => setDraggedTask(value)} />)}
          {columnTasks.length === 0 && <div className="ts-task-column-empty">No tasks</div>}
        </div>
      </section>;
    })}
  </div>;
}
