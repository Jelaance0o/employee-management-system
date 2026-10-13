import { Search } from "lucide-react";
import type { RoleFilter } from "../team.types";

export default function TeamFilters({ search, onSearchChange, roleFilter, onRoleChange }: { search: string; onSearchChange: (value: string) => void; roleFilter: RoleFilter; onRoleChange: (value: RoleFilter) => void }) {
  return (
    <div className="ts-team-toolbar">
      <label className="ts-team-search"><Search size={17} aria-hidden="true" /><input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search name or email..." aria-label="Search teammates by name or email" /></label>
      <label className="ts-team-role-filter"><span className="text-sm ts-secondary">Role</span><select id="team-role-filter" value={roleFilter} onChange={(event) => onRoleChange(event.target.value as RoleFilter)} className="ts-input w-auto min-w-32 px-3 py-2.5 text-sm"><option value="all">All roles</option><option value="admin">Admin</option><option value="project_manager">Team Manager</option><option value="employee">Member</option></select></label>
    </div>
  );
}
