import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders } from './test-utils';
import { AdminUsersPage } from '../features/users/pages/AdminUsersPage';
import { api } from '../services/api';
import type { CurrentUser, UserListItem, Role, Department } from '../types/user';

vi.mock('../services/api', () => ({
  api: {
    get: vi.fn(),
    getPaginated: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockAdminAuth: CurrentUser = {
  user_id: 'admin-uuid-1',
  full_name: 'Alex Admin',
  email: 'admin@example.com',
  employee_code: 'ADM001',
  role_id: 'role-admin',
  role_name: 'admin',
};

const mockRoles: Role[] = [
  { role_id: 'role-admin', role_name: 'admin', is_active: true },
  { role_id: 'role-director', role_name: 'director', is_active: true },
  { role_id: 'role-employee', role_name: 'employee', is_active: true },
];

const mockDepartments: Department[] = [
  { department_id: 'dept-eng', department_code: 'ENG', department_name: 'Engineering', is_active: true },
  { department_id: 'dept-ops', department_code: 'OPS', department_name: 'Operations', is_active: true },
];

const mockUserList: UserListItem[] = [
  {
    user_id: 'admin-uuid-1',
    full_name: 'Alex Admin',
    email: 'admin@example.com',
    employee_code: 'ADM001',
    role_name: 'admin',
    department_name: 'Engineering',
    designation: 'Chief Administrator',
    manager_name: null,
    status: 'active',
    phone: '9988776655',
    date_of_joining: '2023-01-01',
    created_at: '2023-01-01T00:00:00Z',
  },
  {
    user_id: 'emp-uuid-a',
    full_name: 'John Developer',
    email: 'john@example.com',
    employee_code: 'EMP001',
    role_name: 'employee',
    department_name: 'Engineering',
    designation: 'Senior Engineer',
    manager_name: 'Alex Admin',
    status: 'active',
    phone: '9123456789',
    date_of_joining: '2024-06-15',
    created_at: '2024-06-15T00:00:00Z',
  },
  {
    user_id: 'emp-uuid-b',
    full_name: 'Emma Specialist',
    email: 'emma@example.com',
    employee_code: 'EMP002',
    role_name: 'employee',
    department_name: 'Operations',
    designation: 'Lead Specialist',
    manager_name: 'Alex Admin',
    status: 'active',
    phone: '9876543210',
    date_of_joining: '2024-09-01',
    created_at: '2024-09-01T00:00:00Z',
  },
];

describe('AdminUsersPage - USER_UPDATED Audit Regression & Form Safeguards', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/roles') return { success: true, data: mockRoles } as any;
      if (url === '/departments') return { success: true, data: mockDepartments } as any;
      return { success: true, data: [] } as any;
    });

    vi.mocked(api.getPaginated).mockImplementation(async (url: string) => {
      if (url === '/users') {
        return {
          success: true,
          data: {
            items: mockUserList,
            total: mockUserList.length,
            page: 1,
            page_size: 10,
            total_pages: 1,
          },
        } as any;
      }
      return { success: true, data: { items: [], total: 0, page: 1, page_size: 10, total_pages: 1 } } as any;
    });

    vi.mocked(api.patch).mockResolvedValue({
      success: true,
      data: mockUserList[1],
      message: 'User details updated successfully!',
    } as any);
  });

  const renderComponent = () => {
    return renderWithProviders(<AdminUsersPage />, {
      preloadedState: {
        auth: {
          user: mockAdminAuth,
          token: 'mock-jwt',
          refreshToken: 'mock-refresh',
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });
  };

  it('1. Clicking Save once sends exactly one update request with expected payload', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('John Developer')).toBeInTheDocument();
    });

    // Open Edit specs on John
    const editButtons = screen.getAllByRole('button', { name: /edit specs/i });
    fireEvent.click(editButtons[1]); // John Developer

    await waitFor(() => {
      expect(screen.getByText('Edit Account Specifications')).toBeInTheDocument();
    });

    const saveButton = screen.getByRole('button', { name: /save settings/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledTimes(1);
    });
    expect(api.patch).toHaveBeenCalledWith('/users/emp-uuid-a', expect.objectContaining({
      full_name: 'John Developer',
      email: 'john@example.com',
      employee_code: 'EMP001',
      date_of_joining: '2024-06-15',
    }));
  });

  it('2 & 3 & 4. Save button enters Saving state, is disabled, and duplicate submission is prevented', async () => {
    let resolvePatch: any;
    const patchPromise = new Promise((resolve) => {
      resolvePatch = resolve;
    });
    vi.mocked(api.patch).mockReturnValue(patchPromise as any);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('John Developer')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByRole('button', { name: /edit specs/i });
    fireEvent.click(editButtons[1]);

    await waitFor(() => {
      expect(screen.getByText('Edit Account Specifications')).toBeInTheDocument();
    });

    const saveButton = screen.getByRole('button', { name: /save settings/i });
    
    // First click triggers save
    fireEvent.click(saveButton);

    // Save button should transition to disabled and display "Saving..."
    expect(saveButton).toBeDisabled();
    expect(saveButton).toHaveTextContent(/saving\.\.\./i);

    // Rapid second click while request is in flight
    fireEvent.click(saveButton);
    fireEvent.submit(saveButton.closest('form')!);

    // Assert only ONE request was dispatched
    expect(api.patch).toHaveBeenCalledTimes(1);

    // Complete the async operation
    resolvePatch({ success: true, data: mockUserList[1] });
    await waitFor(() => {
      expect(screen.queryByText('Edit Account Specifications')).not.toBeInTheDocument();
    });
  });

  it('5 & 6. Existing date_of_joining is preserved and no-op save does not mutate date', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('John Developer')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByRole('button', { name: /edit specs/i });
    fireEvent.click(editButtons[1]); // John Developer has date_of_joining '2024-06-15'

    await waitFor(() => {
      expect(screen.getByText('Edit Account Specifications')).toBeInTheDocument();
    });

    // Verify date input is populated with '2024-06-15', NOT empty string
    const dateInput = screen.getByDisplayValue('2024-06-15');
    expect(dateInput).toHaveValue('2024-06-15');

    // Click save without changing anything
    const saveButton = screen.getByRole('button', { name: /save settings/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledTimes(1);
    });

    // Date must remain preserved as 2024-06-15, NOT null
    expect(api.patch).toHaveBeenCalledWith(
      '/users/emp-uuid-a',
      expect.objectContaining({
        date_of_joining: '2024-06-15',
      })
    );
  });

  it('7. Editing Employee A then Employee B sends two distinct operations', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('John Developer')).toBeInTheDocument();
    });

    // Edit Employee A (John)
    const editButtons = screen.getAllByRole('button', { name: /edit specs/i });
    fireEvent.click(editButtons[1]);

    await waitFor(() => {
      expect(screen.getByText('Edit Account Specifications')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));
    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/users/emp-uuid-a', expect.any(Object));
    });

    // Close / wait for modal dismissal
    await waitFor(() => {
      expect(screen.queryByText('Edit Account Specifications')).not.toBeInTheDocument();
    });

    // Edit Employee B (Emma)
    const editButtonsAfter = screen.getAllByRole('button', { name: /edit specs/i });
    fireEvent.click(editButtonsAfter[2]);

    await waitFor(() => {
      expect(screen.getByText('Edit Account Specifications')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));
    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/users/emp-uuid-b', expect.any(Object));
    });

    expect(api.patch).toHaveBeenCalledTimes(2);
  });

  it('8. Role and Department dropdown values remain selected correctly with case-insensitivity', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Emma Specialist')).toBeInTheDocument();
    });

    // Emma has role 'employee' and department 'Operations'
    const editButtons = screen.getAllByRole('button', { name: /edit specs/i });
    fireEvent.click(editButtons[2]);

    await waitFor(() => {
      expect(screen.getByText('Edit Account Specifications')).toBeInTheDocument();
    });

    // Verify role select has role-employee selected
    const roleSelect = screen.getByDisplayValue('employee');
    expect(roleSelect).toHaveValue('role-employee');

    // Verify department select has dept-ops selected
    const deptSelect = screen.getByDisplayValue('Operations');
    expect(deptSelect).toHaveValue('dept-ops');
  });
});
