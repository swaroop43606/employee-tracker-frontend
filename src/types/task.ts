export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';
export type AssignmentStatus = 'active' | 'completed' | 'dropped';

export interface TaskResponse {
  task_id: string;
  task_code: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  start_date: string | null;
  due_date: string | null;
  created_by: string;
  creator_name: string | null;
  status: TaskStatus;
  assignments_count: number;
  created_at: string;
  updated_at: string;
}

export interface TaskAssignmentResponse {
  assignment_id: string;
  task_id: string;
  task_code: string | null;
  task_title: string | null;
  task_priority: TaskPriority | null;
  employee_id: string;
  employee_name: string | null;
  employee_code: string | null;
  assigned_by: string;
  assigned_by_name: string | null;
  assigned_at: string;
  start_date: string | null;
  due_date: string | null;
  status: AssignmentStatus;
  employee_notes: string | null;
  completion_percentage: number;
  completed_at: string | null;
}

export interface TaskHistoryResponse {
  history_id: string;
  task_id: string;
  assignment_id: string | null;
  changed_by: string;
  changed_by_name: string | null;
  action_type: string;
  old_status: string | null;
  new_status: string | null;
  old_due_date: string | null;
  new_due_date: string | null;
  remarks: string | null;
  changed_at: string;
}
