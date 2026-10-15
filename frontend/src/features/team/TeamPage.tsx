import { useCallback, useEffect, useMemo, useState } from "react";
import { LoaderCircle, MailPlus, RefreshCw, ShieldCheck } from "lucide-react";
import api from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import TeamFeedback from "./components/TeamFeedback";
import ManagerMembersPage from "./ManagerMembersPage";
import MemberDetailsView, { type MemberDetail } from "./MemberDetailsView";
import TeamStats from "./components/TeamStats";
import TeamFilters from "./components/TeamFilters";
import TeamTable from "./components/TeamTable";
import InviteDialog from "./components/InviteDialog";
import ChangeRoleDialog from "./components/ChangeRoleDialog";
import DeactivateDialog from "./components/DeactivateDialog";
import {
  PAGE_SIZE,
  type InvitationCreated,
  type RoleFilter,
  type TeamRole,
  type Teammate,
} from "./team.types";
import { getErrorMessage } from "./team.utils";
import "./team.css";
import "./styles/team-table.css";
import "./styles/team-dialogs.css";

export default function TeamPage() {
  const { user } = useAuth();
  const [teammates, setTeammates] = useState<Teammate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [page, setPage] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invitation, setInvitation] = useState<InvitationCreated | null>(null);
  const [roleTarget, setRoleTarget] = useState<Teammate | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Teammate | null>(
    null,
  );
  const [selectedMember, setSelectedMember] = useState<MemberDetail | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const loadTeammates = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get<Teammate[]>("/api/v1/teammates", {
        params: { limit: PAGE_SIZE, offset: page * PAGE_SIZE },
      });
      setTeammates(response.data);
      setHasNextPage(response.data.length === PAGE_SIZE);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    if (user?.role === "admin") void loadTeammates();
    else setLoading(false);
  }, [user?.role, loadTeammates, refreshKey]);

  const filteredTeammates = useMemo(() => {
    const query = search.trim().toLowerCase();
    return teammates.filter(
      (teammate) =>
        (!query ||
          teammate.full_name.toLowerCase().includes(query) ||
          teammate.email.toLowerCase().includes(query)) &&
        (roleFilter === "all" || teammate.role === roleFilter),
    );
  }, [teammates, search, roleFilter]);

  const activeOnPage = teammates.filter(
    (teammate) => teammate.is_active,
  ).length;
  const refresh = () => {
    setError("");
    setNotice("");
    setRefreshKey((key) => key + 1);
  };
  const showSuccess = (message: string) => {
    setError("");
    setNotice(message);
  };

  async function handleViewDetails(teammate: Teammate) {
    setProfileLoading(true);
    setError("");
    try {
      const response = await api.get<MemberDetail>(`/api/v1/teammates/${teammate.id}/details`);
      setSelectedMember(response.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setProfileLoading(false);
    }
  }

  async function handleInvite(email: string, role: TeamRole) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await api.post<InvitationCreated>(
        "/api/v1/invitations",
        { email: email.trim(), role },
      );
      setInvitation(response.data);
      showSuccess("Invitation created. Copy and share the link privately.");
      setRefreshKey((key) => key + 1);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleCopyInvitation() {
    if (!invitation) return;
    try {
      await navigator.clipboard.writeText(invitation.invitation_url);
      showSuccess("Invitation link copied to your clipboard.");
    } catch {
      setError(
        "Clipboard access was blocked. Select the invitation link and copy it manually.",
      );
    }
  }

  async function handleRoleUpdate(role: TeamRole) {
    if (!roleTarget) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api.patch(`/api/v1/teammates/${roleTarget.id}/role`, { role });
      const name = roleTarget.full_name;
      setRoleTarget(null);
      setRefreshKey((key) => key + 1);
      showSuccess(`${name}'s role has been updated.`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDeactivate() {
    if (!deactivateTarget) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api.patch(`/api/v1/teammates/${deactivateTarget.id}/deactivate`);
      const name = deactivateTarget.full_name;
      setDeactivateTarget(null);
      setRefreshKey((key) => key + 1);
      showSuccess(`${name}'s account has been deactivated.`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (user?.role === "project_manager") return <ManagerMembersPage />;

  if (user?.role !== "admin")
    return (
      <section className="ts-panel ts-team-access">
        <ShieldCheck className="ts-muted" size={30} />
        <h1 className="mt-4 text-xl font-semibold ts-text">
          Access restricted
        </h1>
        <p className="mt-2 text-sm ts-secondary">
          Only workspace administrators can manage teammates.
        </p>
      </section>
    );

  if (selectedMember) {
    return <MemberDetailsView member={selectedMember} onBack={() => setSelectedMember(null)} backLabel="Back to team members" />;
  }

  if (profileLoading) {
    return <section className="ts-page ts-team-page"><div className="ts-team-state"><LoaderCircle className="animate-spin ts-accent" size={24} /><span className="text-sm ts-secondary">Loading teammate details...</span></div></section>;
  }

  return (
    <section className="ts-page ts-team-page">
      <header className="ts-team-page-header">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest ts-accent">
            Workspace administration
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight ts-text">
            Team members
          </h1>
          <p className="mt-2 text-sm ts-secondary">
            Manage workspace access, roles, and invitations.
          </p>
        </div>
        <div className="ts-team-page-actions">
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="ts-button-secondary ts-focus inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => {
              setInvitation(null);
              setInviteOpen(true);
              setError("");
            }}
            className="ts-button-primary ts-focus inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium"
          >
            <MailPlus size={17} />
            Invite teammate
          </button>
        </div>
      </header>
      {error && !inviteOpen && !roleTarget && !deactivateTarget && (
        <TeamFeedback
          message={error}
          type="error"
          onDismiss={() => setError("")}
        />
      )}
      {notice && (
        <TeamFeedback
          message={notice}
          type="success"
          onDismiss={() => setNotice("")}
        />
      )}
      <TeamStats
        teammates={teammates}
        activeCount={activeOnPage}
        filteredCount={filteredTeammates.length}
        page={page}
        pageSize={PAGE_SIZE}
      />
      <section className="ts-panel ts-team-panel">
        <TeamFilters
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(0);
          }}
          roleFilter={roleFilter}
          onRoleChange={(value) => {
            setRoleFilter(value);
            setPage(0);
          }}
        />
        <TeamTable
          teammates={teammates}
          filteredTeammates={filteredTeammates}
          loading={loading}
          search={search}
          roleFiltered={roleFilter !== "all"}
          page={page}
          hasNextPage={hasNextPage}
          busy={busy}
          currentUser={user}
          onInvite={() => {
            setInvitation(null);
            setInviteOpen(true);
            setError("");
          }}
          onViewDetails={(teammate) => void handleViewDetails(teammate)}
          onChangeRole={(teammate) => {
            setRoleTarget(teammate);
            setError("");
          }}
          onDeactivate={(teammate) => {
            setDeactivateTarget(teammate);
            setError("");
          }}
          onPrevious={() => setPage((current) => Math.max(0, current - 1))}
          onNext={() => setPage((current) => current + 1)}
        />
      </section>
      <InviteDialog
        open={inviteOpen}
        busy={busy}
        invitation={invitation}
        error={error}
        onDismissError={() => setError("")}
        onClose={() => {
          if (!busy) setInviteOpen(false);
        }}
        onSubmit={handleInvite}
        onCopy={() => void handleCopyInvitation()}
      />
      <ChangeRoleDialog
        teammate={roleTarget}
        busy={busy}
        error={error}
        onDismissError={() => setError("")}
        onClose={() => {
          if (!busy) setRoleTarget(null);
        }}
        onSubmit={handleRoleUpdate}
      />
      <DeactivateDialog
        teammate={deactivateTarget}
        busy={busy}
        error={error}
        onDismissError={() => setError("")}
        onClose={() => {
          if (!busy) setDeactivateTarget(null);
        }}
        onConfirm={() => void handleDeactivate()}
      />
    </section>
  );
}
