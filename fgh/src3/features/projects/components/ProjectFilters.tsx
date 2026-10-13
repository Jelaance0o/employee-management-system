import { ChevronDown, Search, X } from "lucide-react";
import { PROJECT_PRIORITIES, PROJECT_STATUSES } from "../projects.types";
import { formatStatus } from "../projects.utils";

interface ProjectFiltersProps {
  search: string;
  statusFilter: string;
  priorityFilter: string;
  resultCount: number;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
}

export function ProjectFilters(props: ProjectFiltersProps) {
  const { search, statusFilter, priorityFilter, resultCount, onSearchChange, onStatusChange, onPriorityChange } = props;

  return (
    <>
      <div className="ts-project-list-heading">
        <div>
          <h2>All projects</h2>
          <p className="ts-secondary">{resultCount} {resultCount === 1 ? "project" : "projects"} shown</p>
        </div>
      </div>
      <div className="ts-project-toolbar">
        <label className="ts-project-search">
          <Search size={17} />
          <input type="search" value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search projects..." aria-label="Search projects" />
          {search && <button type="button" className="ts-icon-button" onClick={() => onSearchChange("")} aria-label="Clear search"><X size={15} /></button>}
        </label>
        <label className="ts-project-filter">
          <span className="ts-muted">Status</span>
          <select value={statusFilter} onChange={(event) => onStatusChange(event.target.value)}>
            <option value="all">All statuses</option>
            {PROJECT_STATUSES.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}
          </select>
          <ChevronDown size={14} />
        </label>
        <label className="ts-project-filter">
          <span className="ts-muted">Priority</span>
          <select value={priorityFilter} onChange={(event) => onPriorityChange(event.target.value)}>
            <option value="all">All priorities</option>
            {PROJECT_PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority.charAt(0).toUpperCase() + priority.slice(1)}</option>)}
          </select>
          <ChevronDown size={14} />
        </label>
      </div>
    </>
  );
}
