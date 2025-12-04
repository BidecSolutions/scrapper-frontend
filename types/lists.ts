export interface List {
  id: number;
  name: string;
  description?: string | null;
  total_leads: number;
  is_campaign_ready: boolean;
  created_at: string;
  updated_at: string;
}

