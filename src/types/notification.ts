export interface NotificationResponse {
  notification_id: string;
  user_id: string;
  notification_type: string;
  title: string;
  message: string;
  reference_type: string | null;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

export interface UnreadCountResponse {
  unread_count: number;
}

export interface NotificationPreferenceResponse {
  preference_id: string;
  user_id: string;
  task_assignment: boolean;
  daily_update_reminder: boolean;
  director_comment: boolean;
  employee_reply: boolean;
  review_notification: boolean;
  email_enabled: boolean;
  in_app_enabled: boolean;
  updated_at: string;
}
