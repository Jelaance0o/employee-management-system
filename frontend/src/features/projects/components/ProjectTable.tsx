import { ArrowUpRight, CalendarDays, FolderKanban } from "lucide-react";
import type { Project, Teammate } from "../projects.types";
import { formatDate, getInitials, isOverdue } from "../projects.utils";
import { PriorityBadge, ProjectStatusBadge } from "./ProjectBadges";
import { getApiUrl } from "../../../lib/api";

interface ProjectTableProps {
  projects: Project[];
  managerMap: Map<number, Teammate>;
  onSelect: (project: Project) => void;
}

export function ProjectTable({ projects, managerMap, onSelect }: ProjectTableProps) {
  return (
    <div className="ts-project-table-wrap">
      <table className="ts-project-table">
        <thead><tr><th>Project</th><th>Status</th><th>Priority</th><th>Project manager</th><th>Due date</th><th aria-label="Actions" /></tr></thead>
        <tbody>
          {projects.map((project) => {
            const manager = project.project_manager_name
              ? { full_name: project.project_manager_name }
              : project.project_manager_id
                ? managerMap.get(project.project_manager_id)
                : undefined;
            return (
              <tr key={project.id}>
                <td><button type="button" className="ts-project-name-button" onClick={() => onSelect(project)}>
                  <span className="ts-project-row-icon"><FolderKanban size={18} /></span>
                  <span className="ts-project-name-copy"><strong>{project.name}</strong><small>{project.description?.trim() || `Project #${project.id}`}</small></span>
                </button></td>
                <td><ProjectStatusBadge status={project.status} /></td>
                <td><PriorityBadge priority={project.priority} /></td>
                <td>{manager ? <span className="ts-project-manager"><span className="ts-project-manager-avatar">{project.project_manager_profile_picture_url ? <img src={getApiUrl(project.project_manager_profile_picture_url)} alt="" crossOrigin="use-credentials" loading="lazy" /> : getInitials(manager.full_name)}</span><span>{manager.full_name}</span></span> : <span className="ts-muted">{project.project_manager_id ? "Manager unavailable" : "Unassigned"}</span>}</td>
                <td><span className={`ts-project-date ${isOverdue(project) ? "is-overdue" : ""}`}><CalendarDays size={15} />{formatDate(project.due_date)}</span></td>
                <td><button type="button" className="ts-project-open-button" onClick={() => onSelect(project)} aria-label={`View ${project.name}`}><ArrowUpRight size={17} /></button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
