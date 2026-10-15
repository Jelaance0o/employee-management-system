import { Check, CircleDot, Clock3, FolderKanban } from "lucide-react";
import type { Project } from "../projects.types";
import { isOverdue } from "../projects.utils";

interface ProjectStatsProps { projects: Project[]; loading: boolean }

export function ProjectStats({ projects, loading }: ProjectStatsProps) {
  const stats = [
    { label: "All projects", value: projects.length, caption: "Projects you can access", icon: FolderKanban, tone: "" },
    { label: "Active", value: projects.filter((project) => project.status === "active").length, caption: "Currently in progress", icon: CircleDot, tone: "active" },
    { label: "Completed", value: projects.filter((project) => project.status === "completed").length, caption: "Marked as completed", icon: Check, tone: "complete" },
    { label: "Overdue", value: projects.filter(isOverdue).length, caption: "Past their due date", icon: Clock3, tone: "overdue" },
  ];

  return (
    <section className="ts-project-stats" aria-label="Project summary">
      {stats.map(({ label, value, caption, icon: Icon, tone }) => (
        <article className="ts-project-stat" key={label}>
          <div className="ts-project-stat-top">
            <span className={`ts-project-stat-icon ${tone ? `ts-project-stat-${tone}` : ""}`}><Icon size={19} /></span>
            <span className="ts-muted ts-project-stat-label">{label}</span>
          </div>
          <strong>{loading ? "—" : value}</strong>
          <span className="ts-muted ts-project-stat-caption">{caption}</span>
        </article>
      ))}
    </section>
  );
}
