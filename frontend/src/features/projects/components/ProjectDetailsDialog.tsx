import { AlertCircle, CalendarDays, Check, Clock3, LoaderCircle, Plus, Users } from "lucide-react";
import type { Project, Teammate } from "../projects.types";
import type { Task } from "../../tasks/tasks.types";
import { formatDate, isOverdue } from "../projects.utils";
import { formatTaskDate, isTaskOverdue } from "../../tasks/tasks.utils";
import { TaskPriorityBadge, TaskStatusBadge } from "../../tasks/components/TaskBadges";
import { Avatar } from "../../team/components/TeamBadges";
import { getApiUrl } from "../../../lib/api";
import { PriorityBadge, ProjectStatusBadge } from "./ProjectBadges";
import { ProjectDialog } from "./ProjectDialog";

interface ProjectDetailsDialogProps {
  project: Project;
  role?: string;
  managerMap: Map<number, Teammate>;
  canManage: boolean;
  canManageMembers: boolean;
  tasks: Task[];
  tasksLoading: boolean;
  tasksError: string;
  onRetryTasks: () => void;
  onOpenTask: (task: Task) => void;
  members: Teammate[];
  membersLoading: boolean;
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
  const {
    project, role, managerMap, canManage, canManageMembers, tasks, tasksLoading,
    tasksError, onRetryTasks, onOpenTask, members, membersLoading,
    availableMembers, loadingMembers, memberUserId, addingMember, memberError,
    memberSuccess, onMemberUserIdChange, onAddMember, onEdit, onClose,
  } = props;
  const completed = tasks.filter((task) => task.status === "Done").length;
  const pending = tasks.length - completed;
  const inReview = tasks.filter((task) => task.status === "In Review").length;
  const overdue = tasks.filter(isTaskOverdue).length;
  const completion = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const regularMembers = members.filter((member) => member.role === "employee");
  const managerName = project.project_manager_name
    ?? (project.project_manager_id ? managerMap.get(project.project_manager_id)?.full_name : null)
    ?? (project.project_manager_id ? "Manager unavailable" : "Unassigned");

  return (
    <ProjectDialog title={project.name} subtitle={`Project #${project.id}`} onClose={onClose} wide>
      <div className="ts-project-detail">
        <div className="ts-project-detail-badges"><ProjectStatusBadge status={project.status} /><PriorityBadge priority={project.priority} />{isOverdue(project) && <span className="ts-project-overdue-badge">Overdue</span>}</div>
        <div className="ts-project-detail-description"><h3>About this project</h3><p>{project.description?.trim() || "No description has been added to this project yet."}</p></div>
        <div className="ts-project-detail-grid">
          <div><span className="ts-muted"><CalendarDays size={15} /> Start date</span><strong>{formatDate(project.start_date)}</strong></div>
          <div><span className="ts-muted"><Clock3 size={15} /> Due date</span><strong>{formatDate(project.due_date)}</strong></div>
          <div><span className="ts-muted"><Users size={15} /> Project manager</span><strong className="ts-project-manager-detail">{project.project_manager_profile_picture_url && <img src={getApiUrl(project.project_manager_profile_picture_url)} alt="" crossOrigin="use-credentials" loading="lazy" />}{managerName}</strong></div>
          <div><span className="ts-muted"><CalendarDays size={15} /> Created</span><strong>{formatDate(project.created_at)}</strong></div>
        </div>

        <section className="ts-project-task-overview">
          <div className="ts-project-section-heading"><div><h3>{role === "employee" ? "Your assigned tasks" : "Project tasks"}</h3><p className="ts-secondary">{role === "employee" ? "Only tasks assigned to you are shown here." : "Completion, remaining work, and review status for this project."}</p></div><span className="ts-project-task-count">{tasks.length} total</span></div>
          {tasksLoading ? <div className="ts-project-task-state"><LoaderCircle className="ts-spin" size={19} />Loading project tasks...</div> : tasksError ? <div className="ts-project-task-state is-error"><AlertCircle size={17} /><span>{tasksError}</span><button type="button" className="ts-button-secondary" onClick={onRetryTasks}>Retry</button></div> : <>
            <div className="ts-project-task-stats"><article><span>Completed</span><strong>{completed}</strong></article><article><span>Remaining</span><strong>{pending}</strong></article><article><span>In review</span><strong>{inReview}</strong></article><article><span>Overdue</span><strong>{overdue}</strong></article></div>
            <div className="ts-project-progress-summary"><div><span>{role === "employee" ? "Your task completion" : "Task completion"}</span><strong>{completion}%</strong></div><div className="ts-project-progress-track"><span style={{ width: `${completion}%` }} /></div></div>
            {tasks.length === 0 ? <p className="ts-project-task-empty">No tasks have been created for this project yet.</p> : <div className="ts-project-detail-task-list">{tasks.map((task) => <button type="button" key={task.id} className="ts-project-detail-task" onClick={() => onOpenTask(task)}><span className="ts-project-detail-task-main"><strong>{task.title}</strong><small>{task.assigned_to_name ? `Assigned to ${task.assigned_to_name}` : "Unassigned"} · Due {formatTaskDate(task.due_date)}</small></span><span className="ts-project-detail-task-badges"><TaskStatusBadge status={task.status} /><TaskPriorityBadge priority={task.priority} />{isTaskOverdue(task) && <span className="ts-project-overdue-badge">Overdue</span>}</span></button>)}</div>}
          </>}
        </section>

        {canManageMembers && <section className="ts-project-members-section"><div className="ts-project-section-heading"><div><h3>Project members</h3><p className="ts-secondary">Only regular Members can be assigned to project tasks.</p></div><span className="ts-project-task-count">{regularMembers.length}</span></div>{membersLoading ? <div className="ts-project-task-state"><LoaderCircle className="ts-spin" size={17} />Loading project members...</div> : regularMembers.length ? <div className="ts-project-member-list">{regularMembers.map((member) => <div className="ts-project-member-row" key={member.id}><Avatar name={member.full_name} profilePictureUrl={member.profile_picture_url} size="small" /><span><strong>{member.full_name}</strong><small>{member.email}</small></span></div>)}</div> : <p className="ts-project-task-empty">No members have been added to this project yet.</p>}</section>}

        {canManage && <>
          <div className="ts-project-detail-divider" />
          <div className="ts-project-section-heading"><div><h3>Manage project</h3><p className="ts-secondary">Update the project details and delivery plan.</p></div><button type="button" className="ts-button-secondary" onClick={onEdit}>Edit project</button></div>
        </>}

        {canManageMembers && <>
          <form className="ts-project-member-form" onSubmit={onAddMember}>
            <label className="ts-project-field"><span>Add member</span>
              <select required value={memberUserId} onChange={(event) => onMemberUserIdChange(event.target.value)} disabled={loadingMembers || availableMembers.filter((member) => member.role === "employee").length === 0}><option value="">{loadingMembers ? "Loading members…" : availableMembers.some((member) => member.role === "employee") ? "Select a Member by name" : "No available Members"}</option>{availableMembers.filter((member) => member.role === "employee").map((member) => <option key={member.id} value={member.id}>{member.full_name} — {member.email}</option>)}</select>
            </label>
            <button type="submit" className="ts-button-primary ts-project-member-submit" disabled={addingMember || !memberUserId}>{addingMember ? <LoaderCircle className="ts-spin" size={16} /> : <Plus size={16} />}Add member</button>
          </form>
          {memberError && <div className="ts-feedback ts-feedback-error"><AlertCircle size={16} /><span>{memberError}</span></div>}
          {memberSuccess && <div className="ts-feedback ts-feedback-success"><Check size={16} /><span>{memberSuccess}</span></div>}
          <p className="ts-muted ts-project-member-note">Only regular Members can be added and assigned to tasks.</p>
        </>}
      </div>
    </ProjectDialog>
  );
}
