import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import axios from "axios";
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  LoaderCircle,
  MailPlus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCog,
  UserRound,
  UserX,
  Users,
  X,
} from "lucide-react";

import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

type TeamRole = "admin" | "project_manager" | "employee";
type RoleFilter = "all" | TeamRole;

interface Teammate {
  id: number;
  workspace_id: number;
  full_name: string;
  email: string;
  role: TeamRole;
  is_active: boolean;
  created_at: string;
}

interface InvitationCreated {
  email: string;
  role: TeamRole;
  invitation_url: string;
  expires_at: string;
}

const PAGE_SIZE = 20;

const ROLE_LABELS: Record<TeamRole, string> = {
  admin: "Admin",
  project_manager: "Team Manager",
  employee: "Member",
};

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;

    if (typeof detail === "string") return detail;

    if (Array.isArray(detail)) {
      return detail
        .map((item: { msg?: string }) => item.msg ?? "Invalid input")
        .join(", ");
    }

    if (!error.response) {
      return "Unable to connect to the server. Check that the backend is running.";
    }
  }

  return "Something went wrong. Please try again.";
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="ts-avatar" aria-hidden="true">
      {initials || "U"}
    </div>
  );
}

function RoleBadge({ role }: { role: TeamRole }) {
  return (
    <span className={`ts-team-role ts-team-role-${role}`}>
      {ROLE_LABELS[role]}
    </span>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`ts-team-status ${
        active ? "ts-team-status-active" : "ts-team-status-inactive"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function Dialog({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="ts-dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="ts-dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold ts-text">{title}</h2>
            <p className="mt-1 text-sm leading-6 ts-secondary">{description}</p>
          </div>

          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            className="ts-icon-button ts-focus"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-6">{children}</div>
      </section>
    </div>
  );
}

function Feedback({
  message,
  type,
  onDismiss,
}: {
  message: string;
  type: "error" | "success";
  onDismiss: () => void;
}) {
  const Icon = type === "error" ? AlertCircle : Check;

  return (
    <div
      role={type === "error" ? "alert" : "status"}
      className={`ts-feedback ${
        type === "error" ? "ts-feedback-error" : "ts-feedback-success"
      }`}
    >
      <Icon size={18} className="shrink-0" />

      <p className="flex-1 text-sm">{message}</p>

      <button
        type="button"
        aria-label="Dismiss message"
        onClick={onDismiss}
        className="shrink-0"
      >
        <X size={16} />
      </button>
    </div>
  );
}

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
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamRole>("employee");
  const [invitation, setInvitation] = useState<InvitationCreated | null>(null);

  const [roleTarget, setRoleTarget] = useState<Teammate | null>(null);
  const [nextRole, setNextRole] = useState<TeamRole>("employee");

  const [deactivateTarget, setDeactivateTarget] = useState<Teammate | null>(
    null,
  );

  const loadTeammates = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get<Teammate[]>("/api/v1/teammates", {
        params: {
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        },
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
    if (user?.role === "admin") {
      void loadTeammates();
    } else {
      setLoading(false);
    }
  }, [user?.role, loadTeammates, refreshKey]);

  const filteredTeammates = useMemo(() => {
    const query = search.trim().toLowerCase();

    return teammates.filter((teammate) => {
      const matchesSearch =
        !query ||
        teammate.full_name.toLowerCase().includes(query) ||
        teammate.email.toLowerCase().includes(query);

      const matchesRole = roleFilter === "all" || teammate.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [teammates, search, roleFilter]);

  const activeOnPage = teammates.filter(
    (teammate) => teammate.is_active,
  ).length;

  function refresh() {
    setError("");
    setNotice("");
    setRefreshKey((key) => key + 1);
  }

  function showSuccess(message: string) {
    setError("");
    setNotice(message);
  }

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const response = await api.post<InvitationCreated>(
        "/api/v1/invitations",
        {
          email: inviteEmail.trim(),
          role: inviteRole,
        },
      );

      setInvitation(response.data);
      setInviteEmail("");
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

  async function handleRoleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!roleTarget) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      await api.patch(`/api/v1/teammates/${roleTarget.id}/role`, {
        role: nextRole,
      });

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

  if (user?.role !== "admin") {
    return (
      <section className="ts-panel rounded-xl p-8">
        <ShieldCheck className="ts-muted" size={30} />

        <h1 className="mt-4 text-xl font-semibold ts-text">
          Access restricted
        </h1>

        <p className="mt-2 text-sm ts-secondary">
          Only workspace administrators can manage teammates.
        </p>
      </section>
    );
  }

  return (
    <section className="ts-page space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
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

        <div className="flex flex-wrap gap-2">
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
      </div>

      {error && (
        <Feedback message={error} type="error" onDismiss={() => setError("")} />
      )}

      {notice && (
        <Feedback
          message={notice}
          type="success"
          onDismiss={() => setNotice("")}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <article className="ts-stat-card">
          <div className="flex items-center gap-3">
            <div className="ts-stat-icon ts-stat-icon-accent">
              <Users size={20} />
            </div>

            <div>
              <p className="text-sm ts-secondary">Accounts on this page</p>
              <p className="mt-1 text-2xl font-semibold ts-text">
                {teammates.length}
              </p>
            </div>
          </div>

          <p className="mt-3 text-xs ts-muted">
            Page {page + 1} · Up to {PAGE_SIZE} accounts
          </p>
        </article>

        <article className="ts-stat-card">
          <div className="flex items-center gap-3">
            <div className="ts-stat-icon ts-stat-icon-success">
              <UserRound size={20} />
            </div>

            <div>
              <p className="text-sm ts-secondary">Active accounts</p>
              <p className="mt-1 text-2xl font-semibold ts-text">
                {activeOnPage}
              </p>
            </div>
          </div>

          <p className="mt-3 text-xs ts-muted">
            Active accounts on the current page
          </p>
        </article>

        <article className="ts-stat-card">
          <div className="flex items-center gap-3">
            <div className="ts-stat-icon ts-stat-icon-review">
              <UserCog size={20} />
            </div>

            <div>
              <p className="text-sm ts-secondary">Filtered results</p>
              <p className="mt-1 text-2xl font-semibold ts-text">
                {filteredTeammates.length}
              </p>
            </div>
          </div>

          <p className="mt-3 text-xs ts-muted">Matches on the current page</p>
        </article>
      </div>

      <div className="ts-panel overflow-hidden rounded-xl">
        <div className="flex flex-col gap-3 border-b p-4 ts-divider sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ts-muted"
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name or email..."
              aria-label="Search teammates by name or email"
              className="ts-input py-2.5 pl-9 pr-3 text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="team-role-filter" className="text-sm ts-secondary">
              Role
            </label>

            <select
              id="team-role-filter"
              value={roleFilter}
              onChange={(event) =>
                setRoleFilter(event.target.value as RoleFilter)
              }
              className="ts-input w-auto min-w-32 px-3 py-2.5 text-sm"
            >
              <option value="all">All roles</option>
              <option value="admin">Admin</option>
              <option value="project_manager">Team Manager</option>
              <option value="employee">Member</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-3">
            <LoaderCircle className="animate-spin ts-accent" size={22} />
            <span className="text-sm ts-secondary">
              Loading team members...
            </span>
          </div>
        ) : filteredTeammates.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <Users className="mx-auto ts-muted" size={32} />

            <h2 className="mt-4 text-sm font-semibold ts-text">
              {teammates.length === 0
                ? "No teammates on this page"
                : "No matching teammates"}
            </h2>

            <p className="mx-auto mt-2 max-w-sm text-sm ts-secondary">
              {search || roleFilter !== "all"
                ? "Try a different search term or role filter."
                : "Invite a teammate to start building your workspace."}
            </p>

            {teammates.length === 0 && page === 0 && (
              <button
                type="button"
                onClick={() => setInviteOpen(true)}
                className="ts-button-primary ts-focus mt-5 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium"
              >
                <MailPlus size={16} />
                Invite teammate
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead>
                  <tr className="ts-table-head">
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider">
                      Teammate
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredTeammates.map((teammate) => (
                    <tr key={teammate.id} className="ts-table-row">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={teammate.full_name} />

                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium ts-text">
                              {teammate.full_name}
                            </p>
                            <p className="mt-1 truncate text-xs ts-muted">
                              {teammate.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <RoleBadge role={teammate.role} />
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge active={teammate.is_active} />
                      </td>

                      <td className="px-5 py-4 text-sm ts-secondary">
                        {formatDate(teammate.created_at)}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={busy || teammate.id === user.id}
                            title={
                              teammate.id === user.id
                                ? "You cannot change your own role"
                                : "Change role"
                            }
                            onClick={() => {
                              setRoleTarget(teammate);
                              setNextRole(teammate.role);
                              setError("");
                            }}
                            className="ts-button-secondary ts-focus rounded-lg px-3 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Change role
                          </button>

                          {teammate.is_active && (
                            <button
                              type="button"
                              disabled={busy || teammate.id === user.id}
                              title={
                                teammate.id === user.id
                                  ? "You cannot deactivate your own account"
                                  : "Deactivate account"
                              }
                              onClick={() => {
                                setDeactivateTarget(teammate);
                                setError("");
                              }}
                              className="ts-button-danger ts-focus inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <UserX size={14} />
                              Deactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t px-4 py-3 ts-divider sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs ts-muted">
                Showing {filteredTeammates.length} of {teammates.length}{" "}
                accounts on this page
              </p>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={page === 0 || loading}
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                  className="ts-button-secondary ts-focus inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>

                <span className="px-2 text-sm ts-secondary">
                  Page {page + 1}
                </span>

                <button
                  type="button"
                  disabled={!hasNextPage || loading}
                  onClick={() => setPage((current) => current + 1)}
                  className="ts-button-secondary ts-focus inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {inviteOpen && (
        <Dialog
          title="Invite a teammate"
          description="Create an invitation link for someone to join your workspace."
          onClose={() => {
            if (!busy) setInviteOpen(false);
          }}
        >
          {error && (
            <div className="mb-4">
              <Feedback
                message={error}
                type="error"
                onDismiss={() => setError("")}
              />
            </div>
          )}

          {invitation ? (
            <div className="space-y-4">
              <div className="ts-feedback ts-feedback-success">
                <Check size={18} />
                <p className="text-sm">Invitation created successfully.</p>
              </div>

              <div>
                <p className="text-sm font-medium ts-text">Invitation for</p>
                <p className="mt-1 text-sm ts-secondary">{invitation.email}</p>
              </div>

              <div>
                <label
                  htmlFor="invitation-link"
                  className="mb-2 block text-sm font-medium ts-text"
                >
                  Invitation link
                </label>

                <input
                  id="invitation-link"
                  readOnly
                  value={invitation.invitation_url}
                  onFocus={(event) => event.currentTarget.select()}
                  className="ts-input px-3 py-2.5 text-sm"
                />

                <p className="mt-2 text-xs ts-muted">
                  Expires {formatDate(invitation.expires_at)}. Share this link
                  privately.
                </p>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setInviteOpen(false)}
                  className="ts-button-secondary ts-focus rounded-lg px-4 py-2.5 text-sm font-medium"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={() => void handleCopyInvitation()}
                  className="ts-button-primary ts-focus inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium"
                >
                  <Clipboard size={16} />
                  Copy invitation link
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label
                  htmlFor="invite-email"
                  className="mb-2 block text-sm font-medium ts-text"
                >
                  Email address
                </label>

                <input
                  id="invite-email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="teammate@company.com"
                  className="ts-input px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="invite-role"
                  className="mb-2 block text-sm font-medium ts-text"
                >
                  Workspace role
                </label>

                <select
                  id="invite-role"
                  value={inviteRole}
                  onChange={(event) =>
                    setInviteRole(event.target.value as TeamRole)
                  }
                  className="ts-input px-3 py-2.5 text-sm"
                >
                  <option value="employee">Member</option>
                  <option value="project_manager">Team Manager</option>
                  <option value="admin">Admin</option>
                </select>

                <p className="mt-2 text-xs ts-muted">
                  Admins can manage workspace members and invitations.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setInviteOpen(false)}
                  className="ts-button-secondary ts-focus rounded-lg px-4 py-2.5 text-sm font-medium"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={busy || !inviteEmail.trim()}
                  className="ts-button-primary ts-focus inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50"
                >
                  {busy && <LoaderCircle size={16} className="animate-spin" />}
                  Create invitation
                </button>
              </div>
            </form>
          )}
        </Dialog>
      )}

      {roleTarget && (
        <Dialog
          title="Change teammate role"
          description={`Update the workspace role for ${roleTarget.full_name}.`}
          onClose={() => {
            if (!busy) setRoleTarget(null);
          }}
        >
          {error && (
            <div className="mb-4">
              <Feedback
                message={error}
                type="error"
                onDismiss={() => setError("")}
              />
            </div>
          )}

          <form onSubmit={handleRoleUpdate} className="space-y-5">
            <div className="ts-profile-card flex items-center gap-3 p-3">
              <Avatar name={roleTarget.full_name} />

              <div className="min-w-0">
                <p className="truncate text-sm font-medium ts-text">
                  {roleTarget.full_name}
                </p>
                <p className="truncate text-xs ts-muted">{roleTarget.email}</p>
              </div>
            </div>

            <div>
              <label
                htmlFor="new-role"
                className="mb-2 block text-sm font-medium ts-text"
              >
                New role
              </label>

              <select
                id="new-role"
                value={nextRole}
                onChange={(event) =>
                  setNextRole(event.target.value as TeamRole)
                }
                className="ts-input px-3 py-2.5 text-sm"
              >
                <option value="employee">Member</option>
                <option value="project_manager">Team Manager</option>
                <option value="admin">Admin</option>
              </select>

              <p className="mt-2 text-xs ts-muted">
                A role change affects which workspace actions the user can
                access.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setRoleTarget(null)}
                className="ts-button-secondary ts-focus rounded-lg px-4 py-2.5 text-sm font-medium"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={busy || nextRole === roleTarget.role}
                className="ts-button-primary ts-focus inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50"
              >
                {busy && <LoaderCircle size={16} className="animate-spin" />}
                Save role
              </button>
            </div>
          </form>
        </Dialog>
      )}

      {deactivateTarget && (
        <Dialog
          title="Deactivate teammate?"
          description={`This will deactivate ${deactivateTarget.full_name}'s account. The account will remain in the workspace list.`}
          onClose={() => {
            if (!busy) setDeactivateTarget(null);
          }}
        >
          {error && (
            <div className="mb-4">
              <Feedback
                message={error}
                type="error"
                onDismiss={() => setError("")}
              />
            </div>
          )}

          <div className="ts-feedback ts-feedback-error">
            <AlertCircle size={18} />
            <p className="text-sm">
              Confirm the account before continuing. This action affects the
              teammate's ability to access the workspace.
            </p>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setDeactivateTarget(null)}
              className="ts-button-secondary ts-focus rounded-lg px-4 py-2.5 text-sm font-medium"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => void handleDeactivate()}
              className="ts-button-danger ts-focus inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {busy && <LoaderCircle size={16} className="animate-spin" />}
              Deactivate account
            </button>
          </div>
        </Dialog>
      )}
    </section>
  );
}
