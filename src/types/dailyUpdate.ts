export type DailyUpdateStatus = 'draft' | 'submitted' | 'reviewed';
export type DailyUpdateItemStatus = 'in_progress' | 'completed' | 'blocked';

export interface DailyUpdateItemCreate {
  assignment_id: string;
  work_description: string;
  hours_spent: number;
  progress_percentage: number;
  status: DailyUpdateItemStatus;
}

export interface DailyUpdateCreatePayload {
  work_date?: string;
  update_date?: string;
  summary?: string | null;
  completed_work?: string | null;
  next_work_plan?: string | null;
  blockers?: string | null;
  status: DailyUpdateStatus;
  items: DailyUpdateItemCreate[];
}

export interface DailyUpdateItemResponse {
  item_id: string;
  update_id: string;
  assignment_id: string;
  task_id?: string | null;
  task_code: string | null;
  task_title: string | null;
  task_due_date?: string | null;
  work_description: string | null;
  hours_spent: number;
  progress_percentage: number;
  status: DailyUpdateItemStatus;
  created_at?: string;
  updated_at?: string;
}

export interface DailyUpdateResponse {
  update_id: string;
  employee_id: string;
  employee_name: string | null;
  employee_code: string | null;
  work_date?: string;
  update_date: string;
  summary: string | null;
  completed_work?: string | null;
  next_work_plan?: string | null;
  blockers?: string | null;
  overall_status: DailyUpdateStatus;
  submitted_at: string | null;
  reviewed_at: string | null;
  total_hours: number;
  items: DailyUpdateItemResponse[];
  created_at: string;
  updated_at: string;
  employee_updated_at?: string | null;
}

export interface DailyUpdateListItem {
  update_id: string;
  employee_id: string;
  employee_name: string | null;
  employee_code: string | null;
  work_date?: string;
  update_date: string;
  summary: string | null;
  completed_work?: string | null;
  next_work_plan?: string | null;
  blockers?: string | null;
  overall_status: DailyUpdateStatus;
  items_count: number;
  total_hours: number;
  submitted_at: string | null;
  reviewed_at?: string | null;
  created_at: string;
  employee_updated_at?: string | null;
}
