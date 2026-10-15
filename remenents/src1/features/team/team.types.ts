export type TeamRole = "admin" | "project_manager" | "employee";
export type RoleFilter = "all" | TeamRole;

export interface Teammate {
  id: number;
  workspace_id: number;
  full_name: string;
  email: string;
  role: TeamRole;
  is_active: boolean;
  created_at: string;
}

export interface InvitationCreated {
  email: string;
  role: TeamRole;
  invitation_url: string;
  expires_at: string;
}

export const PAGE_SIZE = 20;

export const ROLE_LABELS: Record<TeamRole, string> = {
  admin: "Admin",
  project_manager: "Team Manager",
  employee: "Member",
};
