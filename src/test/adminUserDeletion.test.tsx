import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent, within } from '@testing-library/react';
import { renderWithProviders } from './test-utils';
import { AdminUsersPage } from '../features/users/pages/AdminUsersPage';
import { api } from '../services/api';
import type { CurrentUser, UserListItem } from '../types/user';

vi.mock('../services/api', () => ({
  api: {
    get: vi.fn(),
    getPaginated: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockAdminUser: CurrentUser = {
  user_id: 'admin-uuid-1',
  full_name: 'Alex Admin',
  email: 'admin@example.com',
  employee_code: 'ADM001',
  role_id: 'role-admin',
  role_name: 'admin',
};

const mockUserList: UserListItem[] = [
  {
    user_id: 'admin-uuid-1',
    full_name: 'Alex Admin',
    email: 'admin@example.com',
    employee_code: 'ADM001',
    role_name: 'admin',
    department_name: 'Executive',
    designation: 'System Administrator',
    manager_name: null,
    status: 'active',
    phone: '+1 555-0100',
    date_of_joining: '2024-01-01',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    user_id: 'emp-uuid-2',
    full_name: 'Jane Developer',
    email: 'jane@example.com',
    employee_code: 'EMP002',
    role_name: 'employee',
    department_name: 'Engineering',
    designation: 'Senior Engineer',
    manager_name: 'Alex Admin',
    status: 'active',
    phone: '+1 555-0200',
    date_of_joining: '2024-06-15',
    created_at: '2024-06-15T00:00:00Z',
  },
  {
    user_id: 'inactive-uuid-3',
    full_name: 'Bob Offboarded',
    email: 'bob@example.com',
    employee_code: 'EMP003',
    role_name: 'employee',
    department_name: 'Marketing',
    designation: 'Copywriter',
    manager_name: null,
    status: 'inactive',
    phone: null,
    date_of_joining: '2024-03-10',
    created_at: '2024-03-10T00:00:00Z',
  },
];

const mockRoles = [
  { role_id: 'role-admin', role_name: 'admin', is_active: true },
  { role_id: 'role-emp', role_name: 'employee', is_active: true },
];

const mockDepts = [
  { department_id: 'dept-eng', department_code: 'ENG', department_name: 'Engineering', is_active: true },
  { department_id: 'dept-exec', department_code: 'EXEC', department_name: 'Executive', is_active: true },
];

describe('Admin Workspace: Safe User Deletion & Action Menu UX', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/roles') return { success: true, data: mockRoles } as any;
      if (url === '/departments') return { success: true, data: mockDepts } as any;
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
  });

  const renderComponent = () => {
    return renderWithProviders(<AdminUsersPage />, {
      preloadedState: {
        auth: {
          user: mockAdminUser,
          token: 'mock-jwt',
          refreshToken: 'mock-refresh',
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });
  };

  it('renders user cards with [ Edit specs ] [ Status ▼ ] [ ⋮ ] layout', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Jane Developer')).toBeInTheDocument();
    });

    // Check Edit specs buttons
    const editButtons = screen.getAllByRole('button', { name: /edit specs/i });
    expect(editButtons.length).toBe(3);

    // Check More actions buttons
    const moreButtons = screen.getAllByRole('button', { name: /more actions/i });
    expect(moreButtons.length).toBe(3);
  });

  it('opens More Actions menu with all expected items and supports Escape to close', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Jane Developer')).toBeInTheDocument();
    });

    const moreButtonJane = screen.getByRole('button', { name: /more actions for jane developer/i });
    fireEvent.click(moreButtonJane);

    // Menu options should be visible
    expect(screen.getByRole('menuitem', { name: /view profile/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /edit user/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /deactivate account/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /suspend account/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /delete user/i })).toBeInTheDocument();

    // Press Escape to close
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menuitem', { name: /view profile/i })).not.toBeInTheDocument();
  });

  it('disables Delete User for the currently logged-in administrator (self-delete protection)', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Alex Admin')).toBeInTheDocument();
    });

    const moreButtonAlex = screen.getByRole('button', { name: /more actions for alex admin/i });
    fireEvent.click(moreButtonAlex);

    const deleteOption = screen.getByRole('menuitem', { name: /delete user/i });
    expect(deleteOption).toBeDisabled();
    expect(deleteOption).toHaveAttribute('title', 'You cannot delete your own administrator account.');
  });

  it('opens View Profile compact read-only modal displaying all required attributes', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Jane Developer')).toBeInTheDocument();
    });

    const moreButton = screen.getByRole('button', { name: /more actions for jane developer/i });
    fireEvent.click(moreButton);

    const viewProfileOption = screen.getByRole('menuitem', { name: /view profile/i });
    fireEvent.click(viewProfileOption);

    // Verify modal is open
    const modal = screen.getByRole('dialog', { name: /user profile/i });
    expect(modal).toBeInTheDocument();
    expect(within(modal).getByText('Jane Developer')).toBeInTheDocument();
    expect(within(modal).getByText('EMP002')).toBeInTheDocument();
    expect(within(modal).getByText('jane@example.com')).toBeInTheDocument();
    expect(within(modal).getByText('Senior Engineer')).toBeInTheDocument();
    expect(within(modal).getByText('Engineering')).toBeInTheDocument();
    expect(within(modal).getByText('Alex Admin')).toBeInTheDocument();
    expect(within(modal).getByText('+1 555-0200')).toBeInTheDocument();

    // Close button
    const closeBtn = within(modal).getByRole('button', { name: /^close$/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByRole('dialog', { name: /user profile/i })).not.toBeInTheDocument();
  });

  it('opens Edit User modal from More Actions menu', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Jane Developer')).toBeInTheDocument();
    });

    const moreButton = screen.getByRole('button', { name: /more actions for jane developer/i });
    fireEvent.click(moreButton);

    const editUserOption = screen.getByRole('menuitem', { name: /edit user/i });
    fireEvent.click(editUserOption);

    expect(screen.getByText('Edit Account Specifications')).toBeInTheDocument();
  });

  it('shows Activate Account for inactive user and triggers activation', async () => {
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
    vi.mocked(api.post).mockResolvedValueOnce({ success: true, data: {} } as any);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Bob Offboarded')).toBeInTheDocument();
    });

    const moreButton = screen.getByRole('button', { name: /more actions for bob offboarded/i });
    fireEvent.click(moreButton);

    const activateOption = screen.getByRole('menuitem', { name: /activate account/i });
    expect(activateOption).toBeInTheDocument();

    fireEvent.click(activateOption);

    expect(api.post).toHaveBeenCalledWith('/admin/users/inactive-uuid-3/activate');
  });

  it('requires exact case-sensitive DELETE before enabling Delete Permanently button', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Jane Developer')).toBeInTheDocument();
    });

    const moreButton = screen.getByRole('button', { name: /more actions for jane developer/i });
    fireEvent.click(moreButton);

    const deleteOption = screen.getByRole('menuitem', { name: /delete user/i });
    fireEvent.click(deleteOption);

    // Modal open
    expect(screen.getByRole('dialog', { name: /delete user account/i })).toBeInTheDocument();

    const deleteBtn = screen.getByRole('button', { name: /delete permanently/i });
    expect(deleteBtn).toBeDisabled();

    const input = screen.getByPlaceholderText('Type DELETE to confirm');

    // Lowercase "delete" -> disabled
    fireEvent.change(input, { target: { value: 'delete' } });
    expect(deleteBtn).toBeDisabled();

    // Mixed case "Delete" -> disabled
    fireEvent.change(input, { target: { value: 'Delete' } });
    expect(deleteBtn).toBeDisabled();

    // Extra whitespace "DELETE " -> disabled (no trimming bypass)
    fireEvent.change(input, { target: { value: 'DELETE ' } });
    expect(deleteBtn).toBeDisabled();

    // Exact "DELETE" -> enabled!
    fireEvent.change(input, { target: { value: 'DELETE' } });
    expect(deleteBtn).not.toBeDisabled();
  });

  it('handles successful permanent deletion: removes user from list and displays success toast', async () => {
    vi.mocked(api.delete).mockResolvedValueOnce({
      success: true,
      data: { user_id: 'emp-uuid-2', action: 'deleted' },
      message: 'User deleted successfully',
    } as any);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Jane Developer')).toBeInTheDocument();
    });

    const moreButton = screen.getByRole('button', { name: /more actions for jane developer/i });
    fireEvent.click(moreButton);
    fireEvent.click(screen.getByRole('menuitem', { name: /delete user/i }));

    const input = screen.getByPlaceholderText('Type DELETE to confirm');
    fireEvent.change(input, { target: { value: 'DELETE' } });

    const deleteBtn = screen.getByRole('button', { name: /delete permanently/i });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/users/emp-uuid-2');
      expect(screen.getByText('User deleted successfully.')).toBeInTheDocument();
      expect(screen.queryByText('Jane Developer')).not.toBeInTheDocument();
    });
  });

  it('displays API error message inline when deletion fails (e.g. last admin, self-delete)', async () => {
    const apiErrorMsg = 'You cannot delete your own administrator account.';
    vi.mocked(api.delete).mockRejectedValueOnce({
      message: apiErrorMsg,
      response: { data: { detail: apiErrorMsg } },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Jane Developer')).toBeInTheDocument();
    });

    const moreButton = screen.getByRole('button', { name: /more actions for jane developer/i });
    fireEvent.click(moreButton);
    fireEvent.click(screen.getByRole('menuitem', { name: /delete user/i }));

    const deleteModal = screen.getByRole('dialog', { name: /delete user account/i });
    const input = within(deleteModal).getByPlaceholderText('Type DELETE to confirm');
    fireEvent.change(input, { target: { value: 'DELETE' } });

    const deleteBtn = within(deleteModal).getByRole('button', { name: /delete permanently/i });
    fireEvent.click(deleteBtn);

    // Error message is shown inline in the modal
    await waitFor(() => {
      expect(within(deleteModal).getByText(apiErrorMsg)).toBeInTheDocument();
    });

    // User must remain in the list
    expect(screen.getAllByText('Jane Developer').length).toBeGreaterThanOrEqual(1);

    // Modal remains open with confirmation input (no Deactivate Account Instead button)
    expect(within(deleteModal).queryByRole('button', { name: /deactivate account instead/i })).not.toBeInTheDocument();
  });

  it('shows Suspend Account option and triggers suspension API', async () => {
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
    vi.mocked(api.post).mockResolvedValueOnce({ success: true, data: {} } as any);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Jane Developer')).toBeInTheDocument();
    });

    const moreButton = screen.getByRole('button', { name: /more actions for jane developer/i });
    fireEvent.click(moreButton);

    const suspendOption = screen.getByRole('menuitem', { name: /suspend account/i });
    expect(suspendOption).toBeInTheDocument();

    fireEvent.click(suspendOption);

    expect(api.post).toHaveBeenCalledWith('/admin/users/emp-uuid-2/suspend');
  });

  it('closes More Actions menu when clicking outside', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Jane Developer')).toBeInTheDocument();
    });

    const moreButton = screen.getByRole('button', { name: /more actions for jane developer/i });
    fireEvent.click(moreButton);

    expect(screen.getByRole('menuitem', { name: /view profile/i })).toBeInTheDocument();

    // Click outside on body
    fireEvent.mouseDown(document.body);

    expect(screen.queryByRole('menuitem', { name: /view profile/i })).not.toBeInTheDocument();
  });

  it('preserves existing search and filter controls', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Jane Developer')).toBeInTheDocument();
    });

    // Search input exists and responds
    const searchInput = screen.getByPlaceholderText(/search by name, email, code/i);
    expect(searchInput).toBeInTheDocument();
    fireEvent.change(searchInput, { target: { value: 'Jane' } });
    expect(searchInput).toHaveValue('Jane');

    // Status filter exists and responds
    const statusSelect = screen.getByDisplayValue('All Statuses');
    expect(statusSelect).toBeInTheDocument();
    fireEvent.change(statusSelect, { target: { value: 'active' } });
    expect(statusSelect).toHaveValue('active');

    // Reset button clears filters
    const resetBtn = screen.getByRole('button', { name: /reset/i });
    fireEvent.click(resetBtn);
    expect(searchInput).toHaveValue('');
    expect(statusSelect).toHaveValue('');
  });

  it('switches open menu when clicking another user\'s More Actions button', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Jane Developer')).toBeInTheDocument();
    });

    const moreButtonJane = screen.getByRole('button', { name: /more actions for jane developer/i });
    fireEvent.click(moreButtonJane);

    // Jane is active, so Deactivate Account is visible
    expect(screen.getByRole('menuitem', { name: /deactivate account/i })).toBeInTheDocument();

    // Click Bob's More Actions button
    const moreButtonBob = screen.getByRole('button', { name: /more actions for bob offboarded/i });
    fireEvent.click(moreButtonBob);

    // Menu should now reflect Bob (inactive -> Activate Account)
    expect(screen.getByRole('menuitem', { name: /activate account/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /deactivate account/i })).not.toBeInTheDocument();
  });

  it('renders More Actions menu through a portal with fixed positioning and high z-index', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Jane Developer')).toBeInTheDocument();
    });

    const moreButton = screen.getByRole('button', { name: /more actions for jane developer/i });
    fireEvent.click(moreButton);

    const menu = screen.getByRole('menu');
    expect(menu).toBeInTheDocument();
    expect(menu.parentElement).toBe(document.body);
    expect(menu).toHaveStyle({ position: 'fixed', zIndex: '9999' });
  });

  it('supports keyboard navigation through menu items with ArrowDown and Tab to close', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Jane Developer')).toBeInTheDocument();
    });

    const moreButton = screen.getByRole('button', { name: /more actions for jane developer/i });
    fireEvent.click(moreButton);

    const viewProfileItem = screen.getByRole('menuitem', { name: /view profile/i });
    const editUserItem = screen.getByRole('menuitem', { name: /edit user/i });

    viewProfileItem.focus();
    expect(document.activeElement).toBe(viewProfileItem);

    // Arrow down to next item
    const menu = screen.getByRole('menu');
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(editUserItem);

    // Arrow up back to previous item
    fireEvent.keyDown(menu, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(viewProfileItem);

    // Tab closes the menu
    fireEvent.keyDown(menu, { key: 'Tab' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
