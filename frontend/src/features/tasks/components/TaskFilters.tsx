import { Plus, Search, X } from "lucide-react";
import type { Project, TaskStatus } from "../tasks.types";

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  projectId: string;
  onProjectChange: (value: string) => void;
  projects: Project[];
  canCreate: boolean;
  onCreate: () => void;
}

const statuses: TaskStatus[] = ["To Do", "In Progress", "In Review", "Changes Required", "Done"];

export default function TaskFilters(props: Props) {
  return (
    <div className="ts-task-toolbar">
      <label className="ts-task-search">
        <Search size={17} />
        <input
          value={props.search}
          onChange={(event) => props.onSearchChange(event.target.value)}
          placeholder="Search tasks by name or ID..."
          aria-label="Search tasks"
        />
        {props.search && (
          <button type="button" className="ts-icon-button" onClick={() => props.onSearchChange("")} aria-label="Clear search">
            <X size={15} />
          </button>
        )}
      </label>
      <label className="ts-task-filter">
        <span>Status</span>
        <select value={props.status} onChange={(event) => props.onStatusChange(event.target.value)}>
          <option value="all">All statuses</option>
          {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
      </label>
      <label className="ts-task-filter">
        <span>Project</span>
        <select value={props.projectId} onChange={(event) => props.onProjectChange(event.target.value)}>
          <option value="all">All projects</option>
          {props.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
      </label>
      {props.canCreate && (
        <button type="button" className="ts-button-primary ts-task-new-button ts-task-toolbar-create" onClick={props.onCreate}>
          <Plus size={16} /> New task
        </button>
      )}
    </div>
  );
}
