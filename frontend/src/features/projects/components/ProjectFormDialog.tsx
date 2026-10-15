import { AlertCircle, Check, LoaderCircle } from "lucide-react";
import type { Project, ProjectFormValues, ProjectStatus, Teammate } from "../projects.types";
import { PROJECT_PRIORITIES, PROJECT_STATUSES } from "../projects.types";
import { formatStatus } from "../projects.utils";
import { ProjectDialog } from "./ProjectDialog";

interface ProjectFormDialogProps {
  editingProject: Project | null;
  canAssignManager: boolean;
  form: ProjectFormValues;
  teammates: Teammate[];
  saving: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onChange: <K extends keyof ProjectFormValues>(key: K, value: ProjectFormValues[K]) => void;
}

export function ProjectFormDialog({ editingProject, canAssignManager, form, teammates, saving, error, onClose, onSubmit, onChange }: ProjectFormDialogProps) {
  const activeManagers = teammates.filter((teammate) => teammate.is_active && teammate.role === "project_manager");

  return (
    <ProjectDialog title={editingProject ? "Edit project" : "Create a project"} subtitle={editingProject ? "Update the project details and delivery plan." : "Set up a project for your team."} onClose={onClose} wide>
      <form className="ts-project-form" onSubmit={onSubmit}>
        {error && <div className="ts-feedback ts-feedback-error"><AlertCircle size={16} /><span>{error}</span></div>}
        <label className="ts-project-field ts-project-field-full"><span>Project name <b>*</b></span><input required minLength={2} maxLength={200} value={form.name} onChange={(event) => onChange("name", event.target.value)} placeholder="e.g. TeamSpace website redesign" /></label>
        <label className="ts-project-field ts-project-field-full"><span>Description</span><textarea rows={4} maxLength={5000} value={form.description} onChange={(event) => onChange("description", event.target.value)} placeholder="What is this project about?" /><small>{form.description.length}/5000 characters</small></label>
        <label className="ts-project-field"><span>Status</span><select value={form.status} onChange={(event) => onChange("status", event.target.value as ProjectStatus)}>{PROJECT_STATUSES.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}</select></label>
        <label className="ts-project-field"><span>Priority</span><select value={form.priority} onChange={(event) => onChange("priority", event.target.value as ProjectFormValues["priority"])}>{PROJECT_PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority.charAt(0).toUpperCase() + priority.slice(1)}</option>)}</select></label>
        <label className="ts-project-field"><span>Start date</span><input type="date" value={form.start_date} onChange={(event) => onChange("start_date", event.target.value)} /></label>
        <label className="ts-project-field"><span>Due date</span><input type="date" min={form.start_date || undefined} value={form.due_date} onChange={(event) => onChange("due_date", event.target.value)} /></label>
        {canAssignManager ? <label className="ts-project-field ts-project-field-full"><span>Project manager</span><select value={form.project_manager_id} onChange={(event) => onChange("project_manager_id", event.target.value)}><option value="">Unassigned</option>{activeManagers.map((teammate) => <option key={teammate.id} value={teammate.id}>{teammate.full_name} — {teammate.email}</option>)}</select>{activeManagers.length === 0 && <small>No active project managers are available. You can leave this unassigned and set one later.</small>}</label> : <div className="ts-project-field ts-project-field-full"><span>Project manager</span><p className="ts-project-readonly-manager">{editingProject?.project_manager_name || "Assigned manager"}</p><small>Only Admins can assign or change the Project Manager.</small></div>}
        <div className="ts-project-form-footer">
          <button type="button" className="ts-button-secondary" disabled={saving} onClick={onClose}>Cancel</button>
          <button type="submit" className="ts-button-primary" disabled={saving}>{saving ? <LoaderCircle className="ts-spin" size={16} /> : <Check size={16} />}{saving ? "Saving..." : editingProject ? "Save changes" : "Create project"}</button>
        </div>
      </form>
    </ProjectDialog>
  );
}
