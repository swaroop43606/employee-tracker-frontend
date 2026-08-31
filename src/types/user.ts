export interface Role {
  role_id: string;
  role_name: string;
  description?: string | null;
  is_active: boolean;
}

export interface Department {
  department_id: string;
  department_code: string;
  department_name: string;
  description?: string | null;
  is_active: boolean;
}

/**
 * CurrentUser represents the response from GET /api/v1/auth/me
 * The backend (CurrentUserResponse schema) returns role_name as a flat string.
 * The optional nested `role` field is kept for backward compatibility only.
 */
export interface CurrentUser {
  user_id: string;
  // Flat role_name returned directly by /auth/me (primary source of truth)
  role_name: string;
  // Optional nested role object (backward-compat; may not be present from /auth/me)
  role?: Role | null;
  role_id?: string | null;
  department_id?: string | null;
  department?: Department | null;
  department_name?: string | null;
  manager_id?: string | null;
  manager_name?: string | null;
  employee_code: string;
  full_name: string;
  email: string;
  phone?: string | null;
  designation?: string | null;
  profile_photo?: string | null;
  status?: string | null;
  address?: string | null;
  last_login_at?: string | null;
  created_at?: string | null;
}

export interface UserSummary {
  user_id: string;
  role_name: string;
  department_name?: string | null;
  employee_code: string;
  full_name: string;
  email: string;
  designation?: string | null;
  status: string;
}

export interface UserListItem {
  user_id: string;
  role_name: string;
  department_name?: string | null;
  employee_code: string;
  full_name: string;
  email: string;
  designation?: string | null;
  status: string;
  phone?: string | null;
  profile_photo?: string | null;
  manager_name?: string | null;
  created_at: string;
}
