import { ROLE_LABELS, type TeamRole } from "../team.types";

export function Avatar({ name }: { name: string }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return <div className="ts-avatar" aria-hidden="true">{initials || "U"}</div>;
}

export function RoleBadge({ role }: { role: TeamRole }) {
  return <span className={`ts-team-role ts-team-role-${role}`}>{ROLE_LABELS[role]}</span>;
}

export function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`ts-team-status ${active ? "ts-team-status-active" : "ts-team-status-inactive"}`}>
      <span className="ts-team-status-dot" />{active ? "Active" : "Inactive"}
    </span>
  );
}
