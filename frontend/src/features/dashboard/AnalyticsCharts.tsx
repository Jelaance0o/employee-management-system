import { CheckCircle2, Clock3, FolderKanban, RotateCcw } from "lucide-react";

interface ProjectAnalytics {
  status: "planned" | "active" | "on_hold" | "completed" | "cancelled" | string;
}

interface TaskAnalytics {
  status: "To Do" | "In Progress" | "In Review" | "Changes Required" | "Done" | string;
  due_date: string | null;
}

interface Segment {
  label: string;
  value: number;
  color: string;
}

function RoundedDonut({ title, total, segments }: { title: string; total: number; segments: Segment[] }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const arcs = segments.map((segment) => {
    const length = total > 0 ? (segment.value / total) * circumference : 0;
    const arc = { ...segment, length, offset };
    offset += length;
    return arc;
  });

  return (
    <div className="ts-analytics-donut-layout">
      <div className="ts-analytics-donut" role="img" aria-label={`${title}: ${total} total`}>
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--ts-border)" strokeWidth="10" />
          {arcs.filter((arc) => arc.value > 0).map((arc) => <circle key={arc.label} cx="50" cy="50" r={radius} fill="none" stroke={arc.color} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${Math.max(0, arc.length - 2.5)} ${circumference}`} strokeDashoffset={-arc.offset} transform="rotate(-90 50 50)" />)}
        </svg>
        <div className="ts-analytics-donut-center"><strong>{total}</strong><span>Total</span></div>
      </div>
      <div className="ts-analytics-legend">{segments.map((segment) => <div className="ts-analytics-legend-row" key={segment.label}><span className="ts-analytics-legend-dot" style={{ background: segment.color }} /><span>{segment.label}</span><strong>{segment.value}</strong></div>)}</div>
    </div>
  );
}

function countStatus<T extends { status: string }>(items: T[], status: string) {
  return items.filter((item) => item.status === status).length;
}

function isOverdue(task: TaskAnalytics) {
  if (!task.due_date || task.status === "Done") return false;
  const due = new Date(`${task.due_date.slice(0, 10)}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

export default function AnalyticsCharts({ projects, tasks }: { projects: ProjectAnalytics[]; tasks: TaskAnalytics[] }) {
  const projectSegments: Segment[] = [
    { label: "Active", value: countStatus(projects, "active"), color: "var(--ts-chart-1)" },
    { label: "Planned", value: countStatus(projects, "planned"), color: "var(--ts-chart-2)" },
    { label: "On hold", value: countStatus(projects, "on_hold"), color: "var(--ts-chart-3)" },
    { label: "Completed", value: countStatus(projects, "completed"), color: "var(--ts-chart-4)" },
    { label: "Cancelled", value: countStatus(projects, "cancelled"), color: "var(--ts-chart-5)" },
  ];
  const taskSegments: Segment[] = [
    { label: "To do", value: countStatus(tasks, "To Do"), color: "var(--ts-chart-3)" },
    { label: "In progress", value: countStatus(tasks, "In Progress"), color: "var(--ts-chart-1)" },
    { label: "In review", value: countStatus(tasks, "In Review"), color: "var(--ts-chart-4)" },
    { label: "Changes required", value: countStatus(tasks, "Changes Required"), color: "var(--ts-chart-5)" },
    { label: "Completed", value: countStatus(tasks, "Done"), color: "var(--ts-chart-2)" },
  ];
  const completed = countStatus(tasks, "Done");
  const remaining = tasks.length - completed;
  const inReview = countStatus(tasks, "In Review");
  const overdue = tasks.filter(isOverdue).length;
  const taskCompletion = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const projectCompletion = projects.length ? Math.round((countStatus(projects, "completed") / projects.length) * 100) : 0;

  return (
    <section className="ts-analytics-section" aria-labelledby="ts-analytics-title">
      <header className="ts-analytics-heading"><div><p>WORKLOAD & DELIVERY</p><h2 id="ts-analytics-title">Project and task analytics</h2><span>Calculated from the projects and tasks available to your role.</span></div><span className="ts-analytics-live-label">Live workspace data</span></header>
      <div className="ts-analytics-chart-grid">
        <article className="ts-panel ts-analytics-card"><header><span className="ts-analytics-card-icon"><FolderKanban size={17} /></span><div><h3>Project status</h3><p>Distribution across visible projects</p></div></header><RoundedDonut title="Project status" total={projects.length} segments={projectSegments} /><div className="ts-analytics-completion"><span>Projects completed</span><strong>{projectCompletion}%</strong><div className="ts-analytics-progress"><span style={{ width: `${projectCompletion}%` }} /></div></div></article>
        <article className="ts-panel ts-analytics-card"><header><span className="ts-analytics-card-icon"><CheckCircle2 size={17} /></span><div><h3>Task status</h3><p>Completion, remaining work, and review queue</p></div></header><RoundedDonut title="Task status" total={tasks.length} segments={taskSegments} /><div className="ts-analytics-metrics"><div><span><Clock3 size={14} /> Remaining</span><strong>{remaining}</strong></div><div><span><RotateCcw size={14} /> In review</span><strong>{inReview}</strong></div><div><span><Clock3 size={14} /> Overdue</span><strong>{overdue}</strong></div></div><div className="ts-analytics-completion"><span>Tasks completed</span><strong>{taskCompletion}%</strong><div className="ts-analytics-progress"><span style={{ width: `${taskCompletion}%` }} /></div></div></article>
      </div>
    </section>
  );
}
