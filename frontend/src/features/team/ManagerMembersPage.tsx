import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft, BriefcaseBusiness, CalendarDays, CheckCircle2, CircleUserRound,
  Clock3, Code2, FolderKanban, LoaderCircle, Mail, RefreshCw, Search,
  ShieldCheck, Sparkles, Target, UserRound, X,
} from "lucide-react";
import api from "../../lib/api";
import { getErrorMessage } from "./team.utils";
import "./styles/manager-members.css";

interface MemberSummary {
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
}
interface MemberProject {
  id: number; name: string; status: string; priority: string; due_date: string | null;
}
interface MemberTask {
  id: number; title: string; status: string; priority: string; due_date: string | null;
  project_id: number; project_name: string; updated_at: string;
}
interface MemberDetail extends MemberSummary {
  projects: MemberProject[];
  task_stats: { total: number; completed: number; pending: number; overdue: number };
  recent_tasks: MemberTask[];
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}
function formatDate(value?: string | null) {
  if (!value) return "No deadline";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "No deadline" : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function roleLabel(role: string) { return role === "project_manager" ? "Project Manager" : role === "admin" ? "Admin" : "Member"; }

export default function ManagerMembersPage() {
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [selected, setSelected] = useState<MemberDetail | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const loadMembers = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await api.get<MemberSummary[]>("/api/v1/teammates/manager/members");
      setMembers(response.data);
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadMembers(); }, [loadMembers, refreshKey]);

  async function openMember(member: MemberSummary) {
    setSelected(null); setDetailLoading(true); setError("");
    try {
      const response = await api.get<MemberDetail>(`/api/v1/teammates/manager/members/${member.id}`);
      setSelected(response.data);
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setDetailLoading(false); }
  }

  const query = search.trim().toLowerCase();
  const filtered = members.filter((member) => !query || member.full_name.toLowerCase().includes(query) || member.email.toLowerCase().includes(query) || (member.tech_stack ?? []).some((item) => item.toLowerCase().includes(query)));

  if (selected) {
    const completion = selected.task_stats.total ? Math.round(selected.task_stats.completed / selected.task_stats.total * 100) : 0;
    return <section className="ts-page ts-manager-members-page">
      <button type="button" className="ts-button-secondary ts-member-back" onClick={() => setSelected(null)}><ArrowLeft size={16} /> Back to members</button>
      <header className="ts-member-profile-hero">
        <div className="ts-member-avatar ts-member-avatar-large">{initials(selected.full_name)}</div>
        <div className="ts-member-profile-heading"><p className="ts-member-eyebrow">TEAM MEMBER PROFILE</p><h1>{selected.full_name}</h1><p>{selected.job_title || roleLabel(selected.role)}{selected.department ? ` · ${selected.department}` : ""}</p><span className="ts-member-email"><Mail size={14} />{selected.email}</span></div>
        <span className="ts-member-role-pill">{roleLabel(selected.role)}</span>
      </header>

      <div className="ts-member-stat-grid">
        <article className="ts-member-stat"><span className="ts-member-stat-icon"><Target size={18} /></span><span>Total tasks</span><strong>{selected.task_stats.total}</strong></article>
        <article className="ts-member-stat"><span className="ts-member-stat-icon is-success"><CheckCircle2 size={18} /></span><span>Completed</span><strong>{selected.task_stats.completed}</strong></article>
        <article className="ts-member-stat"><span className="ts-member-stat-icon is-warning"><Clock3 size={18} /></span><span>Pending</span><strong>{selected.task_stats.pending}</strong></article>
        <article className="ts-member-stat"><span className="ts-member-stat-icon is-danger"><CalendarDays size={18} /></span><span>Overdue</span><strong>{selected.task_stats.overdue}</strong></article>
      </div>

      <div className="ts-member-profile-grid">
        <section className="ts-panel ts-member-info-panel"><header><CircleUserRound size={18} /><h2>Profile details</h2></header><div className="ts-member-info-list"><div><span>Full name</span><strong>{selected.full_name}</strong></div><div><span>Email address</span><strong>{selected.email}</strong></div><div><span>Role</span><strong>{roleLabel(selected.role)}</strong></div><div><span>Department</span><strong>{selected.department || "Not added yet"}</strong></div><div><span>Job title</span><strong>{selected.job_title || "Not added yet"}</strong></div><div><span>Joined</span><strong>{formatDate(selected.created_at)}</strong></div></div>{selected.bio && <div className="ts-member-bio"><h3>About</h3><p>{selected.bio}</p></div>}</section>
        <section className="ts-panel ts-member-info-panel"><header><Code2 size={18} /><h2>Skills & tech stack</h2></header><div className="ts-member-chip-section"><h3><Sparkles size={14} /> Skills</h3>{selected.skills?.length ? <div className="ts-member-chips">{selected.skills.map((skill) => <span key={skill}>{skill}</span>)}</div> : <p className="ts-member-empty-copy">No skills added to this profile yet.</p>}</div><div className="ts-member-chip-section"><h3><Code2 size={14} /> Technologies</h3>{selected.tech_stack?.length ? <div className="ts-member-chips">{selected.tech_stack.map((tech) => <span key={tech}>{tech}</span>)}</div> : <p className="ts-member-empty-copy">No tech stack added to this profile yet.</p>}</div><div className="ts-member-profile-footnote"><ShieldCheck size={15} /> Profile details are shown only for members in your managed projects.</div></section>
      </div>

      <section className="ts-panel ts-member-info-panel"><header><FolderKanban size={18} /><h2>Projects</h2><span className="ts-member-section-count">{selected.projects.length}</span></header>{selected.projects.length ? <div className="ts-member-project-grid">{selected.projects.map((project) => <article className="ts-member-project-card" key={project.id}><div><strong>{project.name}</strong><span className={`ts-member-status status-${project.status.replaceAll("_", "-")}`}>{project.status.replaceAll("_", " ")}</span></div><p>{project.priority} priority</p><small>Due {formatDate(project.due_date)}</small></article>)}</div> : <p className="ts-member-empty-copy">No projects are linked to this member yet.</p>}</section>

      <section className="ts-panel ts-member-info-panel"><header><BriefcaseBusiness size={18} /><h2>Recent tasks</h2><span className="ts-member-section-count">{selected.recent_tasks.length}</span></header>{selected.recent_tasks.length ? <div className="ts-member-task-list">{selected.recent_tasks.map((task) => <article key={task.id} className="ts-member-task-row"><div className="ts-member-task-copy"><strong>{task.title}</strong><span>{task.project_name} · Updated {formatDate(task.updated_at)}</span></div><span className={`ts-member-status status-${task.status.toLowerCase().replaceAll(" ", "-")}`}>{task.status}</span><small>{formatDate(task.due_date)}</small></article>)}</div> : <p className="ts-member-empty-copy">No tasks assigned in these projects yet.</p>}
        <div className="ts-member-completion"><div className="ts-member-completion-copy"><span>Task completion</span><strong>{completion}%</strong></div><div className="ts-member-progress-track"><span style={{ width: `${completion}%` }} /></div></div>
      </section>
    </section>;
  }

  return <section className="ts-page ts-manager-members-page">
    <header className="ts-manager-members-heading"><div><p className="ts-member-eyebrow">YOUR PROJECT TEAM</p><h1>Members</h1><p>Open a profile to review a member's skills, workload, projects, and recent tasks.</p></div><button type="button" className="ts-button-secondary" onClick={() => setRefreshKey((value) => value + 1)} disabled={loading}><RefreshCw size={15} className={loading ? "ts-member-spin" : ""} /> Refresh</button></header>
    {error && <div className="ts-feedback ts-feedback-error"><span>{error}</span><button type="button" className="ts-icon-button" onClick={() => setError("")} aria-label="Dismiss error"><X size={15} /></button></div>}
    <label className="ts-member-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, email, or tech stack" /><span>{filtered.length} members</span></label>
    {loading || detailLoading ? <div className="ts-member-state"><LoaderCircle className="ts-member-spin" size={24} /><p>{detailLoading ? "Loading member profile..." : "Loading your team..."}</p></div> : filtered.length ? <div className="ts-manager-member-grid">{filtered.map((member) => <button type="button" key={member.id} className="ts-manager-member-card" onClick={() => void openMember(member)}><div className="ts-manager-member-card-top"><span className="ts-member-avatar">{initials(member.full_name)}</span><span className="ts-member-open-arrow">↗</span></div><strong className="ts-manager-member-name">{member.full_name}</strong><span className="ts-manager-member-title">{member.job_title || roleLabel(member.role)}</span><span className="ts-manager-member-email">{member.email}</span><div className="ts-manager-member-tags">{member.department && <span>{member.department}</span>}{(member.tech_stack ?? []).slice(0, 2).map((tech) => <span key={tech}>{tech}</span>)}{!member.department && !(member.tech_stack?.length) && <span>Profile incomplete</span>}</div><span className="ts-manager-member-open-label">View full profile <ArrowLeft size={14} /></span></button>)}</div> : <div className="ts-member-state"><UserRound size={26} /><h2>{members.length ? "No members match your search" : "No members in your managed projects"}</h2><p>{members.length ? "Try another name, email, or technology." : "Members will appear here when they are added to one of your projects."}</p></div>}
  </section>;
}
