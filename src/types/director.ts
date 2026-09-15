import type { DailyUpdateListItem } from './dailyUpdate';

export interface DirectorSummaryMetrics {
  pending_reviews: number;
  total_team: number;
  active_team: number;
  approved_logs: number;
  open_tasks?: number;
  active_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  overdue_tasks: number;
}

export interface MissingEmployeeItem {
  user_id: string;
  full_name: string;
  employee_code?: string | null;
  designation?: string | null;
  email?: string | null;
}

export interface DirectorAlerts {
  overdue_tasks_count: number;
  pending_reviews_count: number;
  missing_updates_count: number;
  missing_employees: MissingEmployeeItem[];
}

export interface DirectorActivityItem {
  activity_id: string;
  activity_type: string;
  title: string;
  description: string;
  employee_name: string;
  timestamp: string;
  link?: string | null;
  reference_type?: string | null;
  reference_id?: string | null;
}

export interface DirectorDashboardResponse {
  summary: DirectorSummaryMetrics;
  alerts: DirectorAlerts;
  recent_activity: DirectorActivityItem[];
  pending_updates: DailyUpdateListItem[];
}
