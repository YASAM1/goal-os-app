export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  metric_name: string;
  metric_unit: string;
  direction: "increase" | "decrease";
  baseline_value: number;
  baseline_date: string;
  target_value: number;
  target_date?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Frontend convenience — mapped from description or title context
  domain?: string;
}

export interface Action {
  id: string;
  goal_id: string;
  user_id: string;
  title: string;
  description?: string | null;
  sort_order: number;
  is_ai_generated: boolean;
  ai_output_id?: string | null;
  created_at: string;
  // Frontend convenience fields (not from API)
  cadence?: "daily";
  estimated_minutes?: number | null;
  priority?: number;
}

export interface ActionInstance {
  id: string;
  action_id: string;
  user_id: string;
  date: string;
  status: "pending" | "done" | "skipped";
  created_at: string;
  // Frontend convenience
  completed?: boolean;
  goal_id?: string;
  notes?: string | null;
}

export interface Milestone {
  id: string;
  goal_id: string;
  user_id: string;
  title: string;
  description?: string | null;
  target_date?: string | null;
  status: "pending" | "done";
  sort_order: number;
  is_ai_generated: boolean;
  ai_output_id?: string | null;
  completed_at?: string | null;
  created_at: string;
  // Frontend convenience
  due_date?: string | null;
}

export interface MetricLog {
  id: string;
  goal_id: string;
  user_id: string;
  date: string;
  value: number;
  note?: string | null;
  created_at: string;
  // Frontend compatibility alias
  notes?: string | null;
}

export interface Resource {
  id: string;
  goal_id: string;
  user_id: string;
  type: "article" | "book" | "course" | "video" | "tool" | "person";
  title: string;
  url?: string | null;
  source?: string | null;
  summary?: string | null;
  why_relevant?: string | null;
  is_paid: boolean;
  is_ai_generated: boolean;
  ai_output_id?: string | null;
  created_at: string;
  // Frontend convenience
  author?: string | null;
  paid?: boolean;
  tags?: string[];
}

export interface RoleModel {
  name: string;
  why: string;
  links: string[];
}

export interface CheckinPayload {
  instances: { action_id: string; completed: boolean; notes?: string }[];
  metric?: { value: number; notes?: string };
}

export interface GoalCreatePayload {
  title: string;
  description?: string;
  metric_name: string;
  metric_unit: string;
  direction: "increase" | "decrease";
  baseline_value: number;
  baseline_date: string;
  target_value: number;
  target_date?: string | null;
  // Frontend-only field for onboarding UI
  domain?: string;
}
