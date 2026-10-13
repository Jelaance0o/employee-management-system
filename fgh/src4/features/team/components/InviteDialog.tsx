import { useEffect, useState, type FormEvent } from "react";
import { Check, Clipboard, LoaderCircle } from "lucide-react";
import type { InvitationCreated, TeamRole } from "../team.types";
import { formatDate } from "../team.utils";
import TeamDialog from "./TeamDialog";
import TeamFeedback from "./TeamFeedback";

export default function InviteDialog({
  open,
  busy,
  invitation,
  error,
  onDismissError,
  onClose,
  onSubmit,
  onCopy,
}: {
  open: boolean;
  busy: boolean;
  invitation: InvitationCreated | null;
  error: string;
  onDismissError: () => void;
  onClose: () => void;
  onSubmit: (email: string, role: TeamRole) => Promise<void>;
  onCopy: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("employee");
  useEffect(() => {
    if (open && !invitation) {
      setEmail("");
      setRole("employee");
    }
  }, [open, invitation]);
  if (!open) return null;
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit(email, role);
  };
  return (
    <TeamDialog
      title="Invite a teammate"
      description="Create an invitation link for someone to join your workspace."
      onClose={onClose}
    >
      {error && (
        <div className="mb-4">
          <TeamFeedback
            message={error}
            type="error"
            onDismiss={onDismissError}
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
              onClick={onClose}
              className="ts-button-secondary ts-focus rounded-lg px-4 py-2.5 text-sm font-medium"
            >
              Close
            </button>
            <button
              type="button"
              onClick={onCopy}
              className="ts-button-primary ts-focus inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium"
            >
              <Clipboard size={16} />
              Copy invitation link
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
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
              value={email}
              onChange={(event) => setEmail(event.target.value)}
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
              value={role}
              onChange={(event) => setRole(event.target.value as TeamRole)}
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
              onClick={onClose}
              className="ts-button-secondary ts-focus rounded-lg px-4 py-2.5 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !email.trim()}
              className="ts-button-primary ts-focus inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {busy && <LoaderCircle size={16} className="animate-spin" />}
              Create invitation
            </button>
          </div>
        </form>
      )}
    </TeamDialog>
  );
}
