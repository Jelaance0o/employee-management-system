import { ROLE_LABELS, type TeamRole } from "../team.types";

import { getApiUrl } from "../../../lib/api";

export function Avatar({ name, profilePictureUrl, size = "regular" }: { name: string; profilePictureUrl?: string | null; size?: "regular" | "small" }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return <span className={`ts-avatar ${size === "small" ? "ts-avatar-sm" : ""}`} aria-label={name}>
    {profilePictureUrl ? <img src={getApiUrl(profilePictureUrl)} alt="" crossOrigin="use-credentials" loading="lazy" /> : initials || "U"}
  </span>;
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
