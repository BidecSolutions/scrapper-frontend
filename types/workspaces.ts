export interface Workspace {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  organization_id: number;
  plan_tier: string;
  created_at: string;
  member_count?: number;
  current_user_role?: string;
}

export interface WorkspaceMember {
  id: number;
  user_id?: number | null;
  email?: string | null;
  full_name?: string | null;
  role: string;
  invited_email?: string | null;
  accepted_at?: string | null;
  last_active_at?: string | null;
}

export type WorkspaceRole = "owner" | "admin" | "member";

