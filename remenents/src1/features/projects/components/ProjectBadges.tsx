import type { ProjectPriority, ProjectStatus } from "../projects.types";
import { formatStatus } from "../projects.utils";

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span className={`ts-project-status ts-project-status-${status}`}>
      <span className="ts-status-dot" />
      {formatStatus(status)}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: ProjectPriority }) {
  return (
    <span className={`ts-project-priority ts-project-priority-${priority}`}>
      {priority}
    </span>
  );
}

