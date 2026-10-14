import { AlertCircle, CalendarDays, Check, Clock3, LoaderCircle, Plus, Users } from "lucide-react";
import type { Project, Teammate } from "../projects.types";
import { formatDate, isOverdue } from "../projects.utils";
import { PriorityBadge, ProjectStatusBadge } from "./ProjectBadges";
import { ProjectDialog } from "./ProjectDialog";

interface ProjectDetailsDialogProps {
  project: Project;
  managerMap: Map<number, Teammate>;
  canManage: boolean;
  availableMembers: Teammate[];
  loadingMembers: boolean;
  memberUserId: string;
  addingMember: boolean;
  memberError: string;
  memberSuccess: string;
  onMemberUserIdChange: (value: string) => void;
  onAddMember: (event: React.FormEvent<HTMLFormElement>) => void;
  onEdit: () => void;
  onClose: () => void;
}

export function ProjectDetailsDialog(props: ProjectDetailsDialogProps) {
  const { project, managerMap, canManage, availableMembers, loadingMembers, memberUserId, addingMember, memberError, memberSuccess, onMemberUserIdChange, onAddMember, onEdit, onClose } = props;

  return (
    <ProjectDialog title={project.name} subtitle={`Project #${project.id}`} onClose={onClose} wide>
      <div className="ts-project-detail">
        <div className="ts-project-detail-badges"><ProjectStatusBadge status={project.status} /><PriorityBadge priority={project.priority} />{isOverdue(project) && <span className="ts-project-overdue-badge">Overdue</span>}</div>
        <div className="ts-project-detail-description"><h3>About this project</h3><p>{project.description?.trim() || "No description has been added to this project yet."}</p></div>
        <div className="ts-project-detail-grid">
          <div><span className="ts-muted"><CalendarDays size={15} /> Start date</span><strong>{formatDate(project.start_date)}</strong></div>
          <div><span className="ts-muted"><Clock3 size={15} /> Due date</span><strong>{formatDate(project.due_date)}</strong></div>
          <div><span className="ts-muted"><Users size={15} /> Project manager</span><strong>{project.project_manager_name ?? (project.project_manager_id ? managerMap.get(project.project_manager_id)?.full_name ?? "Manager unavailable" : "Unassigned")}</strong></div>
          <div><span className="ts-muted"><CalendarDays size={15} /> Created</span><strong>{formatDate(project.created_at)}</strong></div>
        </div>
        {canManage && <>
          <div className="ts-project-detail-divider" />
          <div className="ts-project-section-heading"><div><h3>Manage project</h3><p className="ts-secondary">Update the project or add a teammate.</p></div><button type="button" className="ts-button-secondary" onClick={onEdit}>Edit project</button></div>
          <form className="ts-project-member-form" onSubmit={onAddMember}>
            <label className="ts-project-field"><span>Add teammate</span>
              <select required value={memberUserId} onChange={(event) => onMemberUserIdChange(event.target.value)} disabled={loadingMembers || availableMembers.length === 0}><option value="">{loadingMembers ? "Loading teammates…" : availableMembers.length ? "Select a teammate by name" : "No available teammates"}</option>{availableMembers.map((teammate) => <option key={teammate.id} value={teammate.id}>{teammate.full_name} — {teammate.email}</option>)}</select>
            </label>
            <button type="submit" className="ts-button-primary ts-project-member-submit" disabled={addingMember || !memberUserId}>{addingMember ? <LoaderCircle className="ts-spin" size={16} /> : <Plus size={16} />}Add member</button>
          </form>
          {memberError && <div className="ts-feedback ts-feedback-error"><AlertCircle size={16} /><span>{memberError}</span></div>}
          {memberSuccess && <div className="ts-feedback ts-feedback-success"><Check size={16} /><span>{memberSuccess}</span></div>}
          <p className="ts-muted ts-project-member-note">Choose a teammate by name. TeamSpace sends their internal ID to the API automatically.</p>
        </>}
      </div>
    </ProjectDialog>
  );
}
