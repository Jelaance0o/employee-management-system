import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft, LoaderCircle, RefreshCw, Search, UserRound, X,
} from "lucide-react";
import api from "../../lib/api";
import { getErrorMessage } from "./team.utils";
import MemberDetailsView, { type MemberDetail, type MemberSummary } from "./MemberDetailsView";

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
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
    return <MemberDetailsView member={selected} onBack={() => setSelected(null)} />;
  }

  return <section className="ts-page ts-manager-members-page">
    <header className="ts-manager-members-heading"><div><p className="ts-member-eyebrow">YOUR PROJECT TEAM</p><h1>Members</h1><p>Open a profile to review a member's skills, workload, projects, and recent tasks.</p></div><button type="button" className="ts-button-secondary" onClick={() => setRefreshKey((value) => value + 1)} disabled={loading}><RefreshCw size={15} className={loading ? "ts-member-spin" : ""} /> Refresh</button></header>
    {error && <div className="ts-feedback ts-feedback-error"><span>{error}</span><button type="button" className="ts-icon-button" onClick={() => setError("")} aria-label="Dismiss error"><X size={15} /></button></div>}
    <label className="ts-member-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, email, or tech stack" /><span>{filtered.length} members</span></label>
    {loading || detailLoading ? <div className="ts-member-state"><LoaderCircle className="ts-member-spin" size={24} /><p>{detailLoading ? "Loading member profile..." : "Loading your team..."}</p></div> : filtered.length ? <div className="ts-manager-member-grid">{filtered.map((member) => <button type="button" key={member.id} className="ts-manager-member-card" onClick={() => void openMember(member)}><div className="ts-manager-member-card-top"><span className="ts-member-avatar">{initials(member.full_name)}</span><span className="ts-member-open-arrow">↗</span></div><strong className="ts-manager-member-name">{member.full_name}</strong><span className="ts-manager-member-title">{member.job_title || roleLabel(member.role)}</span><span className="ts-manager-member-email">{member.email}</span><div className="ts-manager-member-tags">{member.department && <span>{member.department}</span>}{(member.tech_stack ?? []).slice(0, 2).map((tech) => <span key={tech}>{tech}</span>)}{!member.department && !(member.tech_stack?.length) && <span>Profile incomplete</span>}</div><span className="ts-manager-member-open-label">View full profile <ArrowLeft size={14} /></span></button>)}</div> : <div className="ts-member-state"><UserRound size={26} /><h2>{members.length ? "No members match your search" : "No members in your managed projects"}</h2><p>{members.length ? "Try another name, email, or technology." : "Members will appear here when they are added to one of your projects."}</p></div>}
  </section>;
}
