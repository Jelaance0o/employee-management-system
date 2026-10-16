import { useEffect, useState, type FormEvent } from "react";
import { LoaderCircle } from "lucide-react";
import type { Teammate, TeamRole } from "../team.types";
import { Avatar } from "./TeamBadges";
import TeamDialog from "./TeamDialog";
import TeamFeedback from "./TeamFeedback";

export default function ChangeRoleDialog({ teammate, busy, error, onDismissError, onClose, onSubmit }: { teammate: Teammate | null; busy: boolean; error: string; onDismissError: () => void; onClose: () => void; onSubmit: (role: TeamRole) => Promise<void> }) {
  const [role, setRole] = useState<TeamRole>(teammate?.role ?? "employee");
  useEffect(() => { if (teammate) setRole(teammate.role); }, [teammate]);
  if (!teammate) return null;
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); await onSubmit(role); };
  return <TeamDialog title="Change teammate role" description={`Update the workspace role for ${teammate.full_name}.`} onClose={onClose}>{error && <div className="mb-4"><TeamFeedback message={error} type="error" onDismiss={onDismissError} /></div>}<form onSubmit={submit} className="space-y-5"><div className="ts-profile-card flex items-center gap-3 p-3"><Avatar name={teammate.full_name} /><div className="min-w-0"><p className="truncate text-sm font-medium ts-text">{teammate.full_name}</p><p className="truncate text-xs ts-muted">{teammate.email}</p></div></div><div><label htmlFor="new-role" className="mb-2 block text-sm font-medium ts-text">New role</label><select id="new-role" value={role} onChange={(event) => setRole(event.target.value as TeamRole)} className="ts-input px-3 py-2.5 text-sm"><option value="employee">Member</option><option value="project_manager">Team Manager</option><option value="admin">Admin</option></select><p className="mt-2 text-xs ts-muted">A role change affects which workspace actions the user can access.</p></div><div className="flex justify-end gap-2"><button type="button" disabled={busy} onClick={onClose} className="ts-button-secondary ts-focus rounded-lg px-4 py-2.5 text-sm font-medium">Cancel</button><button type="submit" disabled={busy || role === teammate.role} className="ts-button-primary ts-focus inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50">{busy && <LoaderCircle size={16} className="animate-spin" />}Save role</button></div></form></TeamDialog>;
}
