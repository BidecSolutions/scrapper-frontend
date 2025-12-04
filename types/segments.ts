export interface Segment {
  id: number;
  name: string;
  description?: string | null;
  filter_json: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface SegmentLead {
  id: number;
  name: string;
  contact_person_name?: string | null;
  contact_person_role?: string | null;
  website?: string | null;
  quality_score?: number | null;
  source?: string | null;
}

