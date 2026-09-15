import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from './test-utils';
import { ProfilePage } from '../features/profile/pages/ProfilePage';
import { api } from '../services/api';
import type { CurrentUser } from '../types/user';

vi.mock('../services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

const makeEmployee = (): CurrentUser => ({
  user_id: 'emp-123',
  full_name: 'John Doe',
  email: 'john.doe@company.com',
  employee_code: 'EMP001',
  role_name: 'employee',
  designation: 'Software Engineer',
  department_name: 'Engineering',
  phone: '9876543210',
  status: 'active',
});

const makeDirector = (): CurrentUser => ({
  user_id: 'dir-456',
  full_name: 'Sarah Connor',
  email: 'sarah.connor@company.com',
  employee_code: 'DIR001',
  role_name: 'director',
  designation: 'Engineering Director',
  department_name: 'Engineering',
  phone: '9876543211',
  status: 'active',
});

const makeAdmin = (): CurrentUser => ({
  user_id: 'admin-789',
  full_name: 'Admin Boss',
  email: 'admin@company.com',
  employee_code: 'ADM001',
  role_name: 'admin',
  designation: 'System Administrator',
  department_name: 'Operations',
  phone: '9876543212',
  status: 'active',
});

describe('Role-Based Profile Workspace & Access Control', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/departments') {
        return Promise.resolve({
          success: true,
          data: [
            { department_id: 'dept-1', department_name: 'Engineering', department_code: 'ENG' },
            { department_id: 'dept-2', department_name: 'Operations', department_code: 'OPS' },
          ],
        });
      }
      if (url === '/roles') {
        return Promise.resolve({
          success: true,
          data: [
            { role_id: 'role-admin', role_name: 'admin' },
            { role_id: 'role-director', role_name: 'director' },
            { role_id: 'role-employee', role_name: 'employee' },
          ],
        });
      }
      if (url === '/notification-preferences') {
        return Promise.resolve({
          success: true,
          data: {
            preference_id: 'pref-1',
            in_app_enabled: true,
            task_assignment: true,
            director_comment: true,
            employee_reply: true,
            review_notification: true,
          },
        });
      }
      return Promise.resolve({ success: true, data: null });
    });
  });

  // ==========================================
  // 1. ADDRESS REMOVAL
  // ==========================================
  it('does NOT render Address field anywhere in the Profile Details view', () => {
    const user = makeEmployee();

    renderWithProviders(<ProfilePage />, {
      preloadedState: {
        auth: {
          user,
          token: 'mock-token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });

    // Verify Address is completely absent
    expect(screen.queryByLabelText(/Address/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Address/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Address$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Residential Address/i)).not.toBeInTheDocument();
  });

  // ==========================================
  // 2. EMPLOYEE ROLE-BASED VIEW
  // ==========================================
  it('renders official Company Information as READ-ONLY definition cards for Employee', () => {
    const user = makeEmployee();

    renderWithProviders(<ProfilePage />, {
      preloadedState: {
        auth: {
          user,
          token: 'mock-token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });

    // Heading for Company Information and READ-ONLY badge
    expect(screen.getByRole('heading', { name: /Company Information/i })).toBeInTheDocument();
    expect(screen.getByText(/READ-ONLY/i)).toBeInTheDocument();
    expect(screen.queryByText(/ADMIN ACCESS/i)).not.toBeInTheDocument();

    // Verify read-only values are displayed
    expect(screen.getAllByText('John Doe').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('john.doe@company.com').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('EMP001').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Engineering/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Account Status')).toBeInTheDocument();

    // Verify company fields are NOT form inputs
    expect(screen.queryByLabelText(/Official Email/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Employee Code/i)).not.toBeInTheDocument();

    // Verify Administrator-managed notice
    expect(
      screen.getByText('Official company information is managed by the Administrator.')
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Official company details are managed by Admin/i)
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/contact HR/i)).not.toBeInTheDocument();
  });

  // ==========================================
  // 3. DIRECTOR ROLE-BASED VIEW
  // ==========================================
  it('renders official Company Information as READ-ONLY definition cards for Director', () => {
    const user = makeDirector();

    renderWithProviders(<ProfilePage />, {
      preloadedState: {
        auth: {
          user,
          token: 'mock-token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });

    expect(screen.getByRole('heading', { name: /Company Information/i })).toBeInTheDocument();
    expect(screen.getByText(/READ-ONLY/i)).toBeInTheDocument();
    expect(screen.queryByText(/ADMIN ACCESS/i)).not.toBeInTheDocument();

    expect(screen.getAllByText('Sarah Connor').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('DIR001').length).toBeGreaterThanOrEqual(1);

    // Verify Administrator-managed notice
    expect(
      screen.getByText('Official company information is managed by the Administrator.')
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Official company details are managed by Admin/i)
    ).not.toBeInTheDocument();
  });

  // ==========================================
  // 4. ADMIN ROLE-BASED VIEW
  // ==========================================
  it('renders ADMIN ACCESS badge, editable company inputs, and no "contact Administrator" notice for Admin', async () => {
    const user = makeAdmin();

    renderWithProviders(<ProfilePage />, {
      preloadedState: {
        auth: {
          user,
          token: 'mock-token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });

    // Badge and Subtitle
    expect(screen.getByText(/ADMIN ACCESS/i)).toBeInTheDocument();
    expect(
      screen.getByText('Manage official company information and account details.')
    ).toBeInTheDocument();

    // MUST NOT display contact Administrator messages
    expect(
      screen.queryByText('Official company information is managed by the Administrator.')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Official company details are managed by Admin/i)
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/contact HR/i)).not.toBeInTheDocument();

    // Company inputs must exist for Admin
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Official Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Employee Code/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Department/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Role$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Designation/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Account Status/i)).toBeInTheDocument();

    // Notification tab should be hidden for Admin
    expect(screen.queryByRole('button', { name: /Notification Settings/i })).not.toBeInTheDocument();
  });

  // ==========================================
  // 5. ADMIN COMPANY SAVE BEHAVIOR
  // ==========================================
  it('disables Admin Company Save button when unchanged, enables on change, and calls PATCH /users/{user_id}', async () => {
    const user = makeAdmin();

    (api.patch as any).mockResolvedValue({
      success: true,
      data: {
        ...user,
        full_name: 'Admin Boss Updated',
      },
    });

    renderWithProviders(<ProfilePage />, {
      preloadedState: {
        auth: {
          user,
          token: 'mock-token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });

    // Initially, both Save Changes buttons (company + phone) are disabled
    const saveButtons = screen.getAllByRole('button', { name: /Save Changes/i });
    const companySaveBtn = saveButtons[0];
    expect(companySaveBtn).toBeDisabled();

    // Change Full Name
    const nameInput = screen.getByLabelText(/Full Name/i);
    fireEvent.change(nameInput, { target: { value: 'Admin Boss Updated' } });

    // Button should now be enabled
    expect(companySaveBtn).not.toBeDisabled();

    // Click Save
    fireEvent.click(companySaveBtn);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(`/users/${user.user_id}`, {
        full_name: 'Admin Boss Updated',
      });
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Company information updated successfully!/i)
      ).toBeInTheDocument();
    });
  });

  // ==========================================
  // 6. PHONE VALIDATION & ATTRIBUTES
  // ==========================================
  it('renders Phone Number with tel attributes, placeholder, and disabled Save Changes when unchanged', () => {
    const user = makeEmployee();

    renderWithProviders(<ProfilePage />, {
      preloadedState: {
        auth: {
          user,
          token: 'mock-token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });

    const phoneInput = screen.getByLabelText(/Phone Number/i) as HTMLInputElement;
    expect(phoneInput).toBeInTheDocument();
    expect(phoneInput.value).toBe('9876543210');
    expect(phoneInput).toHaveAttribute('type', 'tel');
    expect(phoneInput).toHaveAttribute('inputMode', 'numeric');
    expect(phoneInput).toHaveAttribute('maxLength', '10');
    expect(phoneInput).toHaveAttribute('placeholder', 'Enter 10-digit phone number');

    const saveButton = screen.getByRole('button', { name: /Save Changes/i });
    expect(saveButton).toBeInTheDocument();
    expect(saveButton).toBeDisabled();

    // No error message should be displayed when loaded with a valid number
    expect(screen.queryByText('Phone number is required.')).not.toBeInTheDocument();
    expect(screen.queryByText('Phone number must contain only digits.')).not.toBeInTheDocument();
    expect(screen.queryByText('Phone number must be exactly 10 digits.')).not.toBeInTheDocument();
  });

  it('shows "Phone number is required." when cleared and keeps Save Changes disabled', () => {
    const user = makeEmployee();

    renderWithProviders(<ProfilePage />, {
      preloadedState: {
        auth: {
          user,
          token: 'mock-token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });

    const phoneInput = screen.getByLabelText(/Phone Number/i);
    const saveButton = screen.getByRole('button', { name: /Save Changes/i });

    // Clear the phone number
    fireEvent.change(phoneInput, { target: { value: '' } });

    expect(screen.getByText('Phone number is required.')).toBeInTheDocument();
    expect(saveButton).toBeDisabled();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('shows "Phone number must contain only digits." when non-numeric input is entered and keeps Save Changes disabled', () => {
    const user = makeEmployee();

    renderWithProviders(<ProfilePage />, {
      preloadedState: {
        auth: {
          user,
          token: 'mock-token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });

    const phoneInput = screen.getByLabelText(/Phone Number/i);
    const saveButton = screen.getByRole('button', { name: /Save Changes/i });

    // Enter non-numeric input
    fireEvent.change(phoneInput, { target: { value: '98765abcde' } });

    expect(screen.getByText('Phone number must contain only digits.')).toBeInTheDocument();
    expect(saveButton).toBeDisabled();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('shows "Phone number must be exactly 10 digits." when length is not 10 and keeps Save Changes disabled', () => {
    const user = makeEmployee();

    renderWithProviders(<ProfilePage />, {
      preloadedState: {
        auth: {
          user,
          token: 'mock-token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });

    const phoneInput = screen.getByLabelText(/Phone Number/i);
    const saveButton = screen.getByRole('button', { name: /Save Changes/i });

    // Enter 8 digits
    fireEvent.change(phoneInput, { target: { value: '98765432' } });

    expect(screen.getByText('Phone number must be exactly 10 digits.')).toBeInTheDocument();
    expect(saveButton).toBeDisabled();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('automatically clears validation error once a valid 10-digit number is entered, and enables Save Changes', () => {
    const user = makeEmployee();

    renderWithProviders(<ProfilePage />, {
      preloadedState: {
        auth: {
          user,
          token: 'mock-token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });

    const phoneInput = screen.getByLabelText(/Phone Number/i);
    const saveButton = screen.getByRole('button', { name: /Save Changes/i });

    // Trigger error first
    fireEvent.change(phoneInput, { target: { value: '123' } });
    expect(screen.getByText('Phone number must be exactly 10 digits.')).toBeInTheDocument();
    expect(saveButton).toBeDisabled();

    // Now type a valid 10-digit number
    fireEvent.change(phoneInput, { target: { value: '8877665544' } });

    // Error message must disappear automatically and button becomes enabled
    expect(screen.queryByText('Phone number must be exactly 10 digits.')).not.toBeInTheDocument();
    expect(saveButton).not.toBeDisabled();
  });

  it('enables Save Changes when Phone Number is edited and submits only valid phone via PATCH /users/profile', async () => {
    const user = makeEmployee();
    (api.patch as any).mockResolvedValue({
      success: true,
      data: {
        ...user,
        phone: '9123456780',
      },
    });

    renderWithProviders(<ProfilePage />, {
      preloadedState: {
        auth: {
          user,
          token: 'mock-token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });

    const phoneInput = screen.getByLabelText(/Phone Number/i);
    const saveButton = screen.getByRole('button', { name: /Save Changes/i });

    // Modify phone number to valid 10 digits
    fireEvent.change(phoneInput, { target: { value: '9123456780' } });
    expect(saveButton).not.toBeDisabled();

    // Submit form
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/users/profile', {
        phone: '9123456780',
      });
    });

    // Success feedback
    await waitFor(() => {
      expect(screen.getByText(/Profile updated successfully!/i)).toBeInTheDocument();
    });

    // Save Changes should be disabled again after successful sync
    expect(saveButton).toBeDisabled();
  });

  it('displays clear error message and retains user input if profile update fails', async () => {
    const user = makeEmployee();
    (api.patch as any).mockRejectedValue(new Error('Network connection timeout'));

    renderWithProviders(<ProfilePage />, {
      preloadedState: {
        auth: {
          user,
          token: 'mock-token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });

    const phoneInput = screen.getByLabelText(/Phone Number/i) as HTMLInputElement;
    const saveButton = screen.getByRole('button', { name: /Save Changes/i });

    fireEvent.change(phoneInput, { target: { value: '7890123456' } });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/Network connection timeout/i)).toBeInTheDocument();
    });

    // Value in input is preserved
    expect(phoneInput.value).toBe('7890123456');
    expect(saveButton).not.toBeDisabled();
  });

  // ==========================================
  // 7. PASSWORD TAB
  // ==========================================
  it('renders and supports Change Password functionality', async () => {
    const user = makeEmployee();
    (api.post as any).mockResolvedValue({
      success: true,
      message: 'Password updated successfully.',
    });

    renderWithProviders(<ProfilePage />, {
      preloadedState: {
        auth: {
          user,
          token: 'mock-token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });

    // Switch to Change Password tab
    const pwdTab = screen.getByRole('button', { name: /Change Password/i });
    fireEvent.click(pwdTab);

    expect(screen.getByLabelText(/Current Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^New Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm New Password/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Current Password/i), {
      target: { value: 'OldPass@123' },
    });
    fireEvent.change(screen.getByLabelText(/^New Password/i), {
      target: { value: 'NewPass@123' },
    });
    fireEvent.change(screen.getByLabelText(/Confirm New Password/i), {
      target: { value: 'NewPass@123' },
    });

    const submitBtn = screen.getByRole('button', { name: /Update Password/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/users/change-password', {
        current_password: 'OldPass@123',
        new_password: 'NewPass@123',
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/Password updated successfully!/i)).toBeInTheDocument();
    });
  });
});
