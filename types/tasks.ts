export type TaskStatus = "open" | "done";
export type TaskType = "custom" | "from_nba";

export interface Task {
  id: number;
  title: string;
  type: string;
  status: string;
  due_at?: string | null;
  completed_at?: string | null;
  description?: string | null;
  user_id: number;
  user_name?: string | null;
  assigned_to_user_id?: number | null;
  assigned_to_name?: string | null;
  lead_id: number;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: number;
  content: string;
  user_id: number;
  user_name?: string | null;
  created_at: string;
  updated_at: string;
}

