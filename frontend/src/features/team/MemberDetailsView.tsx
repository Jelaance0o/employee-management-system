import {
  ArrowLeft, BriefcaseBusiness, CalendarDays, CheckCircle2, CircleUserRound,
  Clock3, Code2, FolderKanban, Mail, ShieldCheck, Sparkles, Target,
} from "lucide-react";
import AuthenticatedProfileImage from "../../components/AuthenticatedProfileImage";
import "./styles/manager-members.css";

export interface MemberSummary {
  id: number;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  department?: string | null;
  job_title?: string | null;
  bio?: string | null;
  skills?: string[] | null;
  tech_stack?: string[] | null;
  created_at: string;
  profile_picture_url?: string | null;
}

export interface MemberProject {
  id: number;
  name: string;
  status: string;
  priority: string;
  due_date: string | null;
}

export interface MemberTask {
  id: number;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  project_id: number;
  project_name: string;
  updated_at: string;
}

export interface MemberReport {
  id: number;
  task_id: number;
  task_title?: string | null;
  project_name?: string | null;
  report_type: string;
  message: string;
  status: string;
  manager_response?: string | null;
  created_at: string;
}

export interface MemberDetail extends MemberSummary {
  projects: MemberProject[];
  task_stats: { total: number; completed: number; pending: number; overdue: number };
  recent_tasks: MemberTask[];
  recent_reports?: MemberReport[];
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function formatDate(value?: string | null) {
  if (!value) return "No deadline";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "No deadline" : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function roleLabel(role: string) {
  return role === "project_manager" ? "Project Manager" : role === "admin" ? "Admin" : "Teammate";
}

export default function MemberDetailsView({ member, onBack, backLabel = "Back to members" }: { member: MemberDetail; onBack: () => void; backLabel?: string }) {
  const completion = member.task_stats.total ? Math.round(member.task_stats.completed / member.task_stats.total * 100) : 0;
  return <section className="ts-page ts-manager-members-page">
    <button type="button" className="ts-button-secondary ts-member-back" onClick={onBack}><ArrowLeft size={16} /> {backLabel}</button>
    <header className="ts-member-profile-hero">
      <div className="ts-member-avatar ts-member-avatar-large"><span>{initials(member.full_name)}</span>{member.profile_picture_url && <AuthenticatedProfileImage src={member.profile_picture_url} alt={`${member.full_name} profile`} className="h-full w-full rounded-full object-cover" />}</div>
      <div className="ts-member-profile-heading"><p className="ts-member-eyebrow">TEAM MEMBER PROFILE</p><h1>{member.full_name}</h1><p>{member.job_title || roleLabel(member.role)}{member.department ? ` · ${member.department}` : ""}</p><span className="ts-member-email"><Mail size={14} />{member.email}</span></div>
      <span className="ts-member-role-pill">{roleLabel(member.role)} · {member.is_active ? "Active" : "Inactive"}</span>
    </header>

    <div className="ts-member-stat-grid">
      <article className="ts-member-stat"><span className="ts-member-stat-icon"><Target size={18} /></span><span>Total tasks</span><strong>{member.task_stats.total}</strong></article>
      <article className="ts-member-stat"><span className="ts-member-stat-icon is-success"><CheckCircle2 size={18} /></span><span>Completed</span><strong>{member.task_stats.completed}</strong></article>
      <article className="ts-member-stat"><span className="ts-member-stat-icon is-warning"><Clock3 size={18} /></span><span>Pending</span><strong>{member.task_stats.pending}</strong></article>
      <article className="ts-member-stat"><span className="ts-member-stat-icon is-danger"><CalendarDays size={18} /></span><span>Overdue</span><strong>{member.task_stats.overdue}</strong></article>
    </div>

    <div className="ts-member-profile-grid">
      <section className="ts-panel ts-member-info-panel"><header><CircleUserRound size={18} /><h2>Profile details</h2></header><div className="ts-member-info-list"><div><span>Full name</span><strong>{member.full_name}</strong></div><div><span>Email address</span><strong>{member.email}</strong></div><div><span>Role</span><strong>{roleLabel(member.role)}</strong></div><div><span>Account status</span><strong>{member.is_active ? "Active" : "Inactive"}</strong></div><div><span>Department</span><strong>{member.department || "Not added yet"}</strong></div><div><span>Job title</span><strong>{member.job_title || "Not added yet"}</strong></div><div><span>Joined</span><strong>{formatDate(member.created_at)}</strong></div></div>{member.bio && <div className="ts-member-bio"><h3>About</h3><p>{member.bio}</p></div>}</section>
      <section className="ts-panel ts-member-info-panel"><header><Code2 size={18} /><h2>Skills & tech stack</h2></header><div className="ts-member-chip-section"><h3><Sparkles size={14} /> Skills</h3>{member.skills?.length ? <div className="ts-member-chips">{member.skills.map((skill) => <span key={skill}>{skill}</span>)}</div> : <p className="ts-member-empty-copy">No skills added to this profile yet.</p>}</div><div className="ts-member-chip-section"><h3><Code2 size={14} /> Technologies</h3>{member.tech_stack?.length ? <div className="ts-member-chips">{member.tech_stack.map((tech) => <span key={tech}>{tech}</span>)}</div> : <p className="ts-member-empty-copy">No tech stack added to this profile yet.</p>}</div><div className="ts-member-profile-footnote"><ShieldCheck size={15} /> Read-only profile and work overview. Sensitive account credentials are never returned.</div></section>
    </div>

    <section className="ts-panel ts-member-info-panel"><header><FolderKanban size={18} /><h2>Projects</h2><span className="ts-member-section-count">{member.projects.length}</span></header>{member.projects.length ? <div className="ts-member-project-grid">{member.projects.map((project) => <article className="ts-member-project-card" key={project.id}><div><strong>{project.name}</strong><span className={`ts-member-status status-${project.status.replaceAll("_", "-")}`}>{project.status.replaceAll("_", " ")}</span></div><p>{project.priority} priority</p><small>Due {formatDate(project.due_date)}</small></article>)}</div> : <p className="ts-member-empty-copy">No projects are linked to this member yet.</p>}</section>

    <section className="ts-panel ts-member-info-panel"><header><BriefcaseBusiness size={18} /><h2>Recent assigned tasks</h2><span className="ts-member-section-count">{member.recent_tasks.length}</span></header>{member.recent_tasks.length ? <div className="ts-member-task-list">{member.recent_tasks.map((task) => <article key={task.id} className="ts-member-task-row"><div className="ts-member-task-copy"><strong>{task.title}</strong><span>{task.project_name} · Updated {formatDate(task.updated_at)}</span></div><span className={`ts-member-status status-${task.status.toLowerCase().replaceAll(" ", "-")}`}>{task.status}</span><small>{formatDate(task.due_date)}</small></article>)}</div> : <p className="ts-member-empty-copy">No tasks assigned to this teammate yet.</p>}<div className="ts-member-completion"><div className="ts-member-completion-copy"><span>Task completion</span><strong>{completion}%</strong></div><div className="ts-member-progress-track"><span style={{ width: `${completion}%` }} /></div></div></section>

    <section className="ts-panel ts-member-info-panel"><header><ShieldCheck size={18} /><h2>Recent task reports</h2><span className="ts-member-section-count">{member.recent_reports?.length ?? 0}</span></header>{member.recent_reports?.length ? <div className="ts-member-task-list">{member.recent_reports.map((report) => <article className="ts-member-task-row ts-member-report-row" key={report.id}><div className="ts-member-task-copy"><strong>{report.report_type.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase())}: {report.task_title || `Task #${report.task_id}`}</strong><span>{report.project_name || "Project"} · {formatDate(report.created_at)}</span><p>{report.message}</p>{report.manager_response && <p className="ts-member-report-response"><strong>Manager response:</strong> {report.manager_response}</p>}</div><span className={`ts-member-status status-${report.status}`}>{report.status}</span></article>)}</div> : <p className="ts-member-empty-copy">No task reports or blockers have been submitted.</p>}</section>
  </section>;
}
