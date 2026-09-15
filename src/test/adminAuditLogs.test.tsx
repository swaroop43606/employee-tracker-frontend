import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders } from './test-utils';
import { AdminAuditLogsPage } from '../features/admin/pages/AdminAuditLogsPage';
import { api } from '../services/api';
import type { AuditLogResponse, AuditLogUserItem } from '../types/auditLog';
import type { CurrentUser } from '../types/user';

vi.mock('../services/api', () => ({
  api: {
    get: vi.fn(),
    getPaginated: vi.fn(),
  },
}));

const mockAdminUser: CurrentUser = {
  user_id: 'admin-001',
  full_name: 'Admin System Lead',
  email: 'admin@example.com',
  employee_code: 'ADM001',
  role_id: 'role-admin',
  role_name: 'admin',
  department_id: 'dept-1',
};

const mockActionTypes: string[] = [
  'LOGIN',
  'LOGOUT',
  'USER_CREATED',
  'USER_UPDATED',
  'USER_DEACTIVATED',
  'USER_SUSPENDED',
  'USER_DELETED',
  'TASK_CREATED',
  'TASK_UPDATED',
  'TASK_ASSIGNED',
  'DAILY_UPDATE_CREATED',
  'DAILY_UPDATE_REVIEWED',
  'COMMENT_CREATED',
  'DEPARTMENT_CREATED',
  'ROLE_CREATED',
];

const mockFilterUsers: AuditLogUserItem[] = [
  {
    user_id: 'user-001',
    full_name: 'Alice Johnson',
    employee_code: 'EMP001',
    role_name: 'employee',
    status: 'active',
  },
  {
    user_id: 'user-002',
    full_name: 'Bob Offboarded',
    employee_code: 'EMP002',
    role_name: 'employee',
    status: 'inactive',
  },
  {
    user_id: 'user-003',
    full_name: 'Charlie Suspended',
    employee_code: 'DIR001',
    role_name: 'director',
    status: 'suspended',
  },
];

const mockAuditLogs: AuditLogResponse[] = [
  {
    log_id: 'log-001',
    user_id: 'user-001',
    user_name: 'Alice Johnson',
    user_email: 'alice@example.com',
    user_role: 'employee',
    user_employee_code: 'EMP001',
    action: 'TASK_CREATED',
    entity_type: 'task',
    entity_id: 'task-101',
    old_data: null,
    new_data: { title: 'Implement Security Module', priority: 'HIGH' },
    ip_address: '192.168.1.50',
    user_agent: 'Mozilla/5.0',
    created_at: '2026-09-10T10:30:00Z',
  },
  {
    log_id: 'log-002',
    user_id: 'user-002',
    user_name: 'Bob Offboarded',
    user_email: 'bob@example.com',
    user_role: 'employee',
    user_employee_code: 'EMP002',
    action: 'USER_DEACTIVATED',
    entity_type: 'user',
    entity_id: 'user-002',
    old_data: { status: 'active' },
    new_data: { status: 'inactive' },
    ip_address: '10.0.0.1',
    user_agent: 'Mozilla/5.0',
    created_at: '2026-09-09T14:15:00Z',
  },
];

describe('AdminAuditLogsPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (api.get as any).mockImplementation((url: string) => {
      if (url === '/audit-logs/actions') {
        return Promise.resolve({ success: true, data: mockActionTypes });
      }
      if (url === '/audit-logs/users') {
        return Promise.resolve({ success: true, data: mockFilterUsers });
      }
      return Promise.resolve({ success: true, data: [] });
    });

    (api.getPaginated as any).mockResolvedValue({
      success: true,
      data: {
        items: mockAuditLogs,
        total: 3661,
        page: 1,
        page_size: 25,
        total_pages: 147,
      },
    });
  });

  it('renders page header with total count and initial 25 records', async () => {
    renderWithProviders(<AdminAuditLogsPage />, {
      preloadedState: { auth: { user: mockAdminUser, token: 'fake-token' } as any },
    });

    expect(screen.getByText('Security Audit Logs')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('3,661 Total Audit Events')).toBeInTheDocument();
      expect(screen.getAllByText('TASK_CREATED').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('USER_DEACTIVATED').length).toBeGreaterThanOrEqual(1);
    });

    // Check actor metadata
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.getByText('EMP001')).toBeInTheDocument();
    expect(screen.getByText('<alice@example.com>')).toBeInTheDocument();

    // Verify initial call requested page_size 25
    expect(api.getPaginated).toHaveBeenCalledWith(
      '/audit-logs',
      expect.objectContaining({
        page: 1,
        page_size: 25,
      })
    );
  });

  it('allows expanding and inspecting sanitized state diff payload', async () => {
    renderWithProviders(<AdminAuditLogsPage />, {
      preloadedState: { auth: { user: mockAdminUser, token: 'fake-token' } as any },
    });

    await waitFor(() => {
      expect(screen.getAllByText('Inspect Payload')).toHaveLength(2);
    });

    // Expand the first payload
    const inspectButtons = screen.getAllByText('Inspect Payload');
    fireEvent.click(inspectButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Old State Data')).toBeInTheDocument();
      expect(screen.getByText('New State Data')).toBeInTheDocument();
      expect(screen.getByText(/"Implement Security Module"/)).toBeInTheDocument();
    });

    // Collapse payload
    fireEvent.click(inspectButtons[0]);
    await waitFor(() => {
      expect(screen.queryByText('Old State Data')).not.toBeInTheDocument();
    });
  });

  it('triggers search query and resets to page 1', async () => {
    renderWithProviders(<AdminAuditLogsPage />, {
      preloadedState: { auth: { user: mockAdminUser, token: 'fake-token' } as any },
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search by action/i)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search by action/i);
    fireEvent.change(searchInput, { target: { value: 'EMP001' } });

    await waitFor(() => {
      expect(api.getPaginated).toHaveBeenCalledWith(
        '/audit-logs',
        expect.objectContaining({
          search: 'EMP001',
          page: 1,
        })
      );
    });
  });

  it('filters by action type', async () => {
    renderWithProviders(<AdminAuditLogsPage />, {
      preloadedState: { auth: { user: mockAdminUser, token: 'fake-token' } as any },
    });

    await waitFor(() => {
      expect(screen.getByText(/All Actions/)).toBeInTheDocument();
    });

    const allSelects = screen.getAllByRole('combobox');
    const actionDropdown = allSelects[0];

    fireEvent.change(actionDropdown, { target: { value: 'USER_DEACTIVATED' } });

    await waitFor(() => {
      expect(api.getPaginated).toHaveBeenCalledWith(
        '/audit-logs',
        expect.objectContaining({
          action: 'USER_DEACTIVATED',
          page: 1,
        })
      );
    });
  });

  it('filters by historical users including inactive and suspended', async () => {
    renderWithProviders(<AdminAuditLogsPage />, {
      preloadedState: { auth: { user: mockAdminUser, token: 'fake-token' } as any },
    });

    await waitFor(() => {
      expect(screen.getByText(/Bob Offboarded \(EMP002\) \[inactive\]/)).toBeInTheDocument();
      expect(screen.getByText(/Charlie Suspended \(DIR001\) \[suspended\]/)).toBeInTheDocument();
    });

    const allSelects = screen.getAllByRole('combobox');
    const userDropdown = allSelects[1];

    fireEvent.change(userDropdown, { target: { value: 'user-002' } });

    await waitFor(() => {
      expect(api.getPaginated).toHaveBeenCalledWith(
        '/audit-logs',
        expect.objectContaining({
          user_id: 'user-002',
          page: 1,
        })
      );
    });
  });

  it('applies date presets (Today, Last 7 Days, Last 30 Days)', async () => {
    renderWithProviders(<AdminAuditLogsPage />, {
      preloadedState: { auth: { user: mockAdminUser, token: 'fake-token' } as any },
    });

    await waitFor(() => {
      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(screen.getByText('Last 7 Days')).toBeInTheDocument();
    });

    // Click 'Today' preset
    fireEvent.click(screen.getByText('Today'));

    await waitFor(() => {
      expect(api.getPaginated).toHaveBeenCalledWith(
        '/audit-logs',
        expect.objectContaining({
          date_from: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          date_to: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          page: 1,
        })
      );
    });

    // Click 'Last 7 Days' preset
    fireEvent.click(screen.getByText('Last 7 Days'));
    await waitFor(() => {
      expect(api.getPaginated).toHaveBeenCalledWith(
        '/audit-logs',
        expect.objectContaining({
          date_from: expect.any(String),
          date_to: expect.any(String),
        })
      );
    });
  });

  it('allows custom date range selection', async () => {
    renderWithProviders(<AdminAuditLogsPage />, {
      preloadedState: { auth: { user: mockAdminUser, token: 'fake-token' } as any },
    });

    await waitFor(() => {
      expect(screen.getByText('Custom Range')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Custom Range'));

    await waitFor(() => {
      expect(screen.getByText('From:')).toBeInTheDocument();
      expect(screen.getByText('To:')).toBeInTheDocument();
    });
  });

  it('resets all filters on Reset Filters button click', async () => {
    renderWithProviders(<AdminAuditLogsPage />, {
      preloadedState: { auth: { user: mockAdminUser, token: 'fake-token' } as any },
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search by action/i)).toBeInTheDocument();
    });

    // Enter search value to make reset button visible
    fireEvent.change(screen.getByPlaceholderText(/Search by action/i), {
      target: { value: 'Something' },
    });

    await waitFor(() => {
      expect(screen.getByText('Reset Filters')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Reset Filters'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search by action/i)).toHaveValue('');
      expect(api.getPaginated).toHaveBeenCalledWith(
        '/audit-logs',
        expect.objectContaining({
          search: undefined,
          page: 1,
        })
      );
    });
  });

  it('navigates to next and previous pages', async () => {
    renderWithProviders(<AdminAuditLogsPage />, {
      preloadedState: { auth: { user: mockAdminUser, token: 'fake-token' } as any },
    });

    await waitFor(() => {
      expect(screen.getByText('Next')).toBeInTheDocument();
      expect(screen.getByText('Previous')).toBeInTheDocument();
    });

    // Click next page
    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(api.getPaginated).toHaveBeenCalledWith(
        '/audit-logs',
        expect.objectContaining({
          page: 2,
        })
      );
    });
  });

  it('renders empty state when zero audit logs match', async () => {
    (api.getPaginated as any).mockResolvedValueOnce({
      success: true,
      data: {
        items: [],
        total: 0,
        page: 1,
        page_size: 25,
        total_pages: 1,
      },
    });

    renderWithProviders(<AdminAuditLogsPage />, {
      preloadedState: { auth: { user: mockAdminUser, token: 'fake-token' } as any },
    });

    await waitFor(() => {
      expect(screen.getByText('No audit records match your filters.')).toBeInTheDocument();
    });
  });

  it('renders error state and provides retry action', async () => {
    (api.getPaginated as any).mockRejectedValueOnce(new Error('Internal network error'));

    renderWithProviders(<AdminAuditLogsPage />, {
      preloadedState: { auth: { user: mockAdminUser, token: 'fake-token' } as any },
    });

    await waitFor(() => {
      expect(screen.getByText('Internal network error')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    // Retry
    (api.getPaginated as any).mockResolvedValueOnce({
      success: true,
      data: {
        items: mockAuditLogs,
        total: 2,
        page: 1,
        page_size: 25,
        total_pages: 1,
      },
    });

    fireEvent.click(screen.getByText('Try Again'));

    await waitFor(() => {
      expect(screen.getAllByText('TASK_CREATED').length).toBeGreaterThanOrEqual(1);
    });
  });
});
