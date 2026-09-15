export interface AuditLogResponse {
  log_id: string;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  user_role: string | null;
  user_employee_code: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditLogUserItem {
  user_id: string;
  full_name: string;
  employee_code: string;
  role_name: string;
  status: string;
}

export interface AuditLogCleanupResponse {
  deleted_count: number;
  eligible_count: number;
  cutoff_date: string;
  retention_days: number;
  dry_run: boolean;
}
