import { CheckCircle2, CircleDot, Clock3, ListTodo } from "lucide-react";
import type { Task } from "../tasks.types";
import { isTaskOverdue } from "../tasks.utils";

export default function TaskStats({ tasks }: { tasks: Task[] }) {
  const stats = [
    { label: "Total tasks", value: tasks.length, icon: ListTodo, className: "" },
    { label: "In progress", value: tasks.filter((task) => task.status === "In Progress").length, icon: CircleDot, className: "is-active" },
    { label: "In review", value: tasks.filter((task) => task.status === "In Review").length, icon: Clock3, className: "is-review" },
    { label: "Overdue", value: tasks.filter(isTaskOverdue).length, icon: CheckCircle2, className: "is-overdue" },
  ];

  return <section className="ts-task-stats" aria-label="Task summary">
    {stats.map(({ label, value, icon: Icon, className }) => <article className="ts-task-stat" key={label}>
      <div className={`ts-task-stat-icon ${className}`}><Icon size={18} /></div>
      <div className="ts-task-stat-copy"><span>{label}</span><strong>{value}</strong></div>
    </article>)}
  </section>;
}
