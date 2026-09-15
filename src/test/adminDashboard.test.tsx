import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders } from './test-utils';
import { AdminDashboard } from '../features/dashboard/pages/AdminDashboard';
import { api } from '../services/api';
import type { CurrentUser } from '../types/user';

vi.mock('../services/api', () => ({
  api: {
    get: vi.fn(),
    getPaginated: vi.fn(),
  },
}));

const mockAdmin: CurrentUser = {
  user_id: 'admin-101',
  full_name: 'Admin System Lead',
  email: 'admin@example.com',
  employee_code: 'ADM001',
  role_id: 'role-admin',
  role_name: 'admin',
  department_id: 'dept-1',
};

const mockStatsWithAlerts = {
  total_users: 25,
  active_users: 20,
  inactive_users: 3,
  suspended_users: 2,
  total_departments: 4,
  active_departments: 4,
  total_roles: 3,
  active_roles: 3,
  total_tasks: 45,
  total_daily_updates: 120,
  total_audit_logs: 3177,
  users_by_role: [
    { role_name: 'admin', count: 2 },
    { role_name: 'director', count: 3 },
    { role_name: 'employee', count: 20 },
  ],
  users_by_department: [
    { department_name: 'Engineering', count: 15 },
    { department_name: 'Operations', count: 10 },
  ],
};

const mockStatsZeroAlerts = {
  total_users: 20,
  active_users: 20,
  inactive_users: 0,
  suspended_users: 0,
  total_departments: 4,
  active_departments: 4,
  total_roles: 3,
  active_roles: 3,
  total_tasks: 40,
  total_daily_updates: 100,
  total_audit_logs: 1500,
  users_by_role: [],
  users_by_department: [],
};

const mockAudits = [
  {
    log_id: 'log-1',
    user_id: 'admin-101',
    user_name: 'Admin System Lead',
    action: 'LOGIN',
    entity_type: 'user_session',
    entity_id: 'sess-1',
    created_at: '2026-09-10T10:00:00Z',
    ip_address: '127.0.0.1',
    details: {},
  },
  {
    log_id: 'log-2',
    user_id: 'admin-101',
    user_name: 'Admin System Lead',
    action: 'USER_CREATED',
    entity_type: 'user',
    entity_id: 'user-2',
    created_at: '2026-09-10T09:30:00Z',
    ip_address: '127.0.0.1',
    details: {},
  },
];

describe('Admin Workspace Dashboard Refinement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockResolvedValue({
      success: true,
      data: mockStatsWithAlerts,
    });
    (api.getPaginated as any).mockResolvedValue({
      success: true,
      data: {
        items: mockAudits,
        total: 2,
        page: 1,
        page_size: 5,
        total_pages: 1,
      },
    });
  });

  // ==========================================
  // 1. KPI CARDS & REAL VALUES
  // ==========================================
  it('renders real backend metrics in KPI cards with clear terminology', async () => {
    renderWithProviders(<AdminDashboard />, {
      preloadedState: {
        auth: {
          user: mockAdmin,
          token: 'token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });

    // Wait for data load
    await waitFor(() => {
      expect(screen.getByText('25')).toBeInTheDocument(); // Total users
    });

    // Terminology checks
    expect(screen.getByText(/Total Audit Events/i)).toBeInTheDocument();
    expect(screen.getByText('3,177')).toBeInTheDocument(); // Formatted audit count
    expect(screen.getByText(/20 active • 3 inactive • 2 suspended/i)).toBeInTheDocument();
    expect(screen.getByText('4 Active Units')).toBeInTheDocument();
    expect(screen.getByText('3 Active RBAC Levels')).toBeInTheDocument();
  });

  // ==========================================
  // 2. ACTIONABLE KPI NAVIGATION
  // ==========================================
  it('ensures all 4 KPI cards link to their respective management routes', async () => {
    renderWithProviders(<AdminDashboard />, {
      preloadedState: {
        auth: {
          user: mockAdmin,
          token: 'token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });

    await waitFor(() => {
      expect(screen.getByText('25')).toBeInTheDocument();
    });

    const usersCard = screen.getByRole('link', { name: /Users management/i });
    expect(usersCard).toHaveAttribute('href', '/admin/users');

    const deptsCard = screen.getByRole('link', { name: /Departments management/i });
    expect(deptsCard).toHaveAttribute('href', '/admin/departments');

    const rolesCard = screen.getByRole('link', { name: /Roles management/i });
    expect(rolesCard).toHaveAttribute('href', '/admin/roles');

    const auditsCard = screen.getByRole('link', { name: /Audit Logs/i });
    expect(auditsCard).toHaveAttribute('href', '/admin/audit-logs');
  });

  // ==========================================
  // 3. NEEDS ATTENTION: WITH ALERTS
  // ==========================================
  it('renders active alert cards for inactive and suspended accounts linking with query filters', async () => {
    renderWithProviders(<AdminDashboard />, {
      preloadedState: {
        auth: {
          user: mockAdmin,
          token: 'token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Needs Attention')).toBeInTheDocument();
    });

    // Inactive alert card
    expect(screen.getByText('3 Inactive Accounts')).toBeInTheDocument();
    expect(screen.getByText('Review inactive employee accounts')).toBeInTheDocument();
    const inactiveLink = screen.getByRole('link', { name: /3 inactive accounts/i });
    expect(inactiveLink).toHaveAttribute('href', '/admin/users?status=inactive');

    // Suspended alert card
    expect(screen.getByText('2 Suspended Accounts')).toBeInTheDocument();
    expect(screen.getByText('Review account status')).toBeInTheDocument();
    const suspendedLink = screen.getByRole('link', { name: /2 suspended accounts/i });
    expect(suspendedLink).toHaveAttribute('href', '/admin/users?status=suspended');

    // "All caught up" should NOT be shown
    expect(screen.queryByText('All caught up')).not.toBeInTheDocument();
  });

  // ==========================================
  // 4. NEEDS ATTENTION: ZERO ALERTS
  // ==========================================
  it('renders "All caught up" zero-state when inactive and suspended counts are zero', async () => {
    (api.get as any).mockResolvedValue({
      success: true,
      data: mockStatsZeroAlerts,
    });

    renderWithProviders(<AdminDashboard />, {
      preloadedState: {
        auth: {
          user: mockAdmin,
          token: 'token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Needs Attention')).toBeInTheDocument();
    });

    expect(screen.getByText('All caught up')).toBeInTheDocument();
    expect(
      screen.getByText('No administrative issues require your attention.')
    ).toBeInTheDocument();

    // No alert cards
    expect(screen.queryByText(/Inactive Account/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Suspended Account/i)).not.toBeInTheDocument();
  });

  // ==========================================
  // 5. RECENT AUDIT TRAIL
  // ==========================================
  it('renders recent audit trail with actor, action, timestamp, entity badge, and full trail link', async () => {
    renderWithProviders(<AdminDashboard />, {
      preloadedState: {
        auth: {
          user: mockAdmin,
          token: 'token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Recent Audit Trail')).toBeInTheDocument();
    });

    // Audit rows
    expect(screen.getAllByText('BY: Admin System Lead').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('LOGIN').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('USER_CREATED').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('user_session')).toBeInTheDocument();

    // Full trail link
    const fullTrailLink = screen.getByRole('link', { name: /Full Trail/i });
    expect(fullTrailLink).toHaveAttribute('href', '/admin/audit-logs');
  });

  it('filters recent audit logs when an action filter is selected', async () => {
    renderWithProviders(<AdminDashboard />, {
      preloadedState: {
        auth: {
          user: mockAdmin,
          token: 'token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/Filter audit logs by action/i)).toBeInTheDocument();
    });

    // Select action filter
    const actionSelect = screen.getByLabelText(/Filter audit logs by action/i);
    fireEvent.change(actionSelect, { target: { value: 'LOGIN' } });

    await waitFor(() => {
      expect(api.getPaginated).toHaveBeenCalledWith(
        '/audit-logs',
        expect.objectContaining({
          action: 'LOGIN',
          page_size: 5,
        })
      );
    });
  });

  // ==========================================
  // 6. ORGANIZATION SETTINGS SHORTCUTS
  // ==========================================
  it('renders Organization Settings shortcuts with short descriptions and links', async () => {
    renderWithProviders(<AdminDashboard />, {
      preloadedState: {
        auth: {
          user: mockAdmin,
          token: 'token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Organization Settings')).toBeInTheDocument();
    });

    expect(screen.getByText('Manage Departments')).toBeInTheDocument();
    expect(
      screen.getByText('Create and organize company departments')
    ).toBeInTheDocument();

    expect(screen.getByText('Access Roles (RBAC)')).toBeInTheDocument();
    expect(
      screen.getByText('Manage roles and access permissions')
    ).toBeInTheDocument();

    expect(screen.getByText('Employee Accounts')).toBeInTheDocument();
    expect(
      screen.getByText('Manage employee accounts and account status')
    ).toBeInTheDocument();

    // Check link destinations
    expect(screen.getByRole('link', { name: /Create and organize company departments/i })).toHaveAttribute(
      'href',
      '/admin/departments'
    );
    expect(screen.getByRole('link', { name: /Manage roles and access permissions/i })).toHaveAttribute(
      'href',
      '/admin/roles'
    );
    expect(screen.getByRole('link', { name: /Manage employee accounts and account status/i })).toHaveAttribute(
      'href',
      '/admin/users'
    );
  });

  // ==========================================
  // 7. REFRESH BEHAVIOR
  // ==========================================
  it('refreshes dashboard data on Refresh button click while preserving view', async () => {
    renderWithProviders(<AdminDashboard />, {
      preloadedState: {
        auth: {
          user: mockAdmin,
          token: 'token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });

    await waitFor(() => {
      expect(screen.getByText('25')).toBeInTheDocument();
    });

    const refreshBtn = screen.getByRole('button', { name: /Refresh/i });
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledTimes(2);
    });
  });

  // ==========================================
  // 8. LOADING SKELETON
  // ==========================================
  it('renders skeleton loading state during initial load', () => {
    (api.get as any).mockReturnValue(new Promise(() => {})); // Never resolves
    (api.getPaginated as any).mockReturnValue(new Promise(() => {}));

    renderWithProviders(<AdminDashboard />, {
      preloadedState: {
        auth: {
          user: mockAdmin,
          token: 'token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });

    expect(screen.getByTestId('dashboard-skeleton')).toBeInTheDocument();
  });

  // ==========================================
  // 9. ERROR STATE & RETRY
  // ==========================================
  it('renders error state with retry button when initial API call fails', async () => {
    (api.get as any).mockRejectedValueOnce(new Error('Network failure'));

    renderWithProviders(<AdminDashboard />, {
      preloadedState: {
        auth: {
          user: mockAdmin,
          token: 'token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Unable to load dashboard data.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
    });

    // Retry
    (api.get as any).mockResolvedValueOnce({
      success: true,
      data: mockStatsWithAlerts,
    });

    fireEvent.click(screen.getByRole('button', { name: /Try Again/i }));

    await waitFor(() => {
      expect(screen.getByText('25')).toBeInTheDocument();
    });
  });
});
