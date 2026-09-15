import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { Header } from '../layouts/DashboardLayout/Header';
import { NotificationPopover } from '../components/NotificationPopover';
import { NotificationsPage } from '../features/notifications/pages/NotificationsPage';
import { renderWithProviders } from './test-utils';
import { api } from '../services/api';

// Mock api
vi.mock('../services/api', () => ({
  api: {
    get: vi.fn(),
    getPaginated: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const makeUser = (role: 'employee' | 'director' | 'admin', id = '1'): any => ({
  user_id: `user-${id}`,
  email: `${role}@company.com`,
  username: role,
  full_name: `${role.charAt(0).toUpperCase() + role.slice(1)} Test User`,
  role_name: role,
  role_id: `role-${role}`,
  role: {
    role_id: `role-${role}`,
    role_name: role,
    description: null,
    is_system_role: true,
  },
  department_id: null,
  designation_id: null,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

const mockNotifications = [
  {
    notification_id: 'notif-1',
    user_id: 'user-emp',
    notification_type: 'task_assignment',
    title: 'New Task Assigned',
    message: 'You have been assigned to Task Alpha.',
    reference_type: 'task_assignment',
    reference_id: 'task-123',
    is_read: false,
    created_at: new Date().toISOString(),
    read_at: null,
  },
  {
    notification_id: 'notif-2',
    user_id: 'user-emp',
    notification_type: 'daily_update',
    title: 'Daily Update Reviewed',
    message: 'Director reviewed your daily update.',
    reference_type: 'daily_update',
    reference_id: 'update-456',
    is_read: false,
    created_at: new Date().toISOString(),
    read_at: null,
  },
  {
    notification_id: 'notif-3',
    user_id: 'user-emp',
    notification_type: 'review_approved',
    title: 'Daily Update Approved',
    message: 'Your update was approved by Director.',
    reference_type: 'daily_update',
    reference_id: 'update-789',
    is_read: true,
    created_at: new Date().toISOString(),
    read_at: new Date().toISOString(),
  },
];

describe('Notification Bell & Clear All Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches only unread notifications with unread_only=true in NotificationPopover', async () => {
    (api.getPaginated as any).mockResolvedValueOnce({
      success: true,
      data: {
        items: [mockNotifications[0], mockNotifications[1]],
        total: 2,
        page: 1,
        page_size: 10,
        total_pages: 1,
      },
    });
    (api.get as any).mockResolvedValueOnce({
      success: true,
      data: { unread_count: 2 },
    });

    const onUnreadCountChange = vi.fn();
    renderWithProviders(
      <NotificationPopover
        isOpen={true}
        onClose={vi.fn()}
        onUnreadCountChange={onUnreadCountChange}
      />,
      {
        preloadedState: {
          auth: {
            user: makeUser('employee'),
            token: 'emp-token',
            refreshToken: null,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          },
        },
      }
    );

    await waitFor(() => {
      expect(api.getPaginated).toHaveBeenCalledWith('/notifications', {
        page: 1,
        page_size: 10,
        unread_only: true,
      });
    });

    expect(screen.getByText('New Task Assigned')).toBeInTheDocument();
    expect(screen.getByText('Daily Update Reviewed')).toBeInTheDocument();
    expect(screen.getByText('2 new')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument();
  });

  it('clears all notifications immediately, shows empty state, and sets unread count to 0 in Employee workspace', async () => {
    (api.getPaginated as any).mockResolvedValueOnce({
      success: true,
      data: {
        items: [mockNotifications[0], mockNotifications[1]],
        total: 2,
        page: 1,
        page_size: 10,
        total_pages: 1,
      },
    });
    (api.get as any).mockResolvedValueOnce({
      success: true,
      data: { unread_count: 2 },
    });
    (api.patch as any).mockResolvedValueOnce({
      success: true,
      data: { message: 'All notifications marked as read', updated_count: 2 },
    });

    const onUnreadCountChange = vi.fn();
    renderWithProviders(
      <NotificationPopover
        isOpen={true}
        onClose={vi.fn()}
        onUnreadCountChange={onUnreadCountChange}
      />,
      {
        preloadedState: {
          auth: {
            user: makeUser('employee'),
            token: 'emp-token',
            refreshToken: null,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          },
        },
      }
    );

    await waitFor(() => {
      expect(screen.getByText('New Task Assigned')).toBeInTheDocument();
    });

    const clearAllBtn = screen.getByRole('button', { name: /clear all/i });
    fireEvent.click(clearAllBtn);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/notifications/read-all');
    });

    // Should immediately empty the list and display empty state
    await waitFor(() => {
      expect(screen.queryByText('New Task Assigned')).not.toBeInTheDocument();
      expect(screen.queryByText('Daily Update Reviewed')).not.toBeInTheDocument();
      expect(screen.getByText('No new notifications')).toBeInTheDocument();
      expect(screen.getByText("You're all caught up!")).toBeInTheDocument();
    });

    // Clear All button and badge tag should disappear
    expect(screen.queryByRole('button', { name: /clear all/i })).not.toBeInTheDocument();
    expect(screen.queryByText('2 new')).not.toBeInTheDocument();

    // unread count callback invoked with 0
    expect(onUnreadCountChange).toHaveBeenCalledWith(0);
  });

  it('works identically in Director workspace and allows navigation', async () => {
    (api.getPaginated as any).mockResolvedValueOnce({
      success: true,
      data: {
        items: [
          {
            notification_id: 'dir-notif-1',
            user_id: 'user-dir',
            notification_type: 'daily_update',
            title: 'Employee submitted daily update',
            message: 'John submitted update for review.',
            reference_type: 'daily_update',
            reference_id: 'update-999',
            is_read: false,
            created_at: new Date().toISOString(),
            read_at: null,
          },
        ],
        total: 1,
        page: 1,
        page_size: 10,
        total_pages: 1,
      },
    });
    (api.get as any).mockResolvedValueOnce({
      success: true,
      data: { unread_count: 1 },
    });
    (api.patch as any).mockResolvedValueOnce({
      success: true,
      data: { message: 'All notifications marked as read', updated_count: 1 },
    });

    const onUnreadCountChange = vi.fn();
    renderWithProviders(
      <NotificationPopover
        isOpen={true}
        onClose={vi.fn()}
        onUnreadCountChange={onUnreadCountChange}
      />,
      {
        preloadedState: {
          auth: {
            user: makeUser('director'),
            token: 'dir-token',
            refreshToken: null,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          },
        },
      }
    );

    await waitFor(() => {
      expect(screen.getByText('Employee submitted daily update')).toBeInTheDocument();
    });

    const clearAllBtn = screen.getByRole('button', { name: /clear all/i });
    fireEvent.click(clearAllBtn);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/notifications/read-all');
      expect(screen.getByText('No new notifications')).toBeInTheDocument();
    });
  });

  it('NotificationsPage continues displaying full notification history after Clear All', async () => {
    const historyList = [
      {
        ...mockNotifications[0],
        is_read: true,
        read_at: new Date().toISOString(),
      },
      {
        ...mockNotifications[1],
        is_read: true,
        read_at: new Date().toISOString(),
      },
    ];

    (api.getPaginated as any).mockResolvedValueOnce({
      success: true,
      data: {
        items: historyList,
        total: 2,
        page: 1,
        page_size: 15,
        total_pages: 1,
      },
    });

    renderWithProviders(<NotificationsPage />, {
      preloadedState: {
        auth: {
          user: makeUser('employee'),
          token: 'emp-token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });

    await waitFor(() => {
      expect(api.getPaginated).toHaveBeenCalledWith('/notifications', {
        page: 1,
        page_size: 15,
      });
    });

    expect(screen.getByText('New Task Assigned')).toBeInTheDocument();
    expect(screen.getByText('Daily Update Reviewed')).toBeInTheDocument();
  });

  it('keeps Admin workspace completely unchanged with no notification bell in Header', () => {
    renderWithProviders(<Header onOpenMobileMenu={vi.fn()} />, {
      preloadedState: {
        auth: {
          user: makeUser('admin'),
          token: 'admin-token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });

    expect(screen.queryByRole('button', { name: /notifications/i })).not.toBeInTheDocument();
  });
});

describe('Notification Center - Manage Mode & Deletion Redesign', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Default Mode (Clean Reading Mode)', () => {
    it('does not display checkboxes or bulk toolbar, and shows Manage button', async () => {
      (api.getPaginated as any).mockResolvedValueOnce({
        success: true,
        data: {
          items: mockNotifications,
          total: 3,
          page: 1,
          page_size: 15,
          total_pages: 1,
        },
      });

      renderWithProviders(<NotificationsPage />, {
        preloadedState: {
          auth: {
            user: makeUser('employee'),
            token: 'emp-token',
            refreshToken: null,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          },
        },
      });

      await waitFor(() => {
        expect(screen.getByText('New Task Assigned')).toBeInTheDocument();
      });

      // 1. Checkboxes are NOT visible
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Select notification/i)).not.toBeInTheDocument();

      // 2. Bulk toolbar is NOT visible
      expect(screen.queryByText(/selected/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /done managing/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /delete selected/i })).not.toBeInTheDocument();

      // 3. Manage button is visible
      expect(screen.getByRole('button', { name: /^manage$/i })).toBeInTheDocument();
    });
  });

  describe('Manage Mode (Selection Mode)', () => {
    it('enters manage mode, supports selecting, select all, deselect all, and exiting clears selections', async () => {
      (api.getPaginated as any).mockResolvedValueOnce({
        success: true,
        data: {
          items: mockNotifications,
          total: 3,
          page: 1,
          page_size: 15,
          total_pages: 1,
        },
      });

      renderWithProviders(<NotificationsPage />, {
        preloadedState: {
          auth: {
            user: makeUser('employee'),
            token: 'emp-token',
            refreshToken: null,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          },
        },
      });

      await waitFor(() => {
        expect(screen.getByText('New Task Assigned')).toBeInTheDocument();
      });

      // Click Manage to enter Manage Mode
      const manageBtn = screen.getByRole('button', { name: /^manage$/i });
      fireEvent.click(manageBtn);

      // Checkboxes appear
      const cb1 = screen.getByLabelText('Select notification New Task Assigned');
      const cb2 = screen.getByLabelText('Select notification Daily Update Reviewed');
      const cb3 = screen.getByLabelText('Select notification Daily Update Approved');
      expect(cb1).toBeInTheDocument();
      expect(cb1).not.toBeChecked();

      // Toolbar appears showing 0 selected
      expect(screen.getByText('0 selected')).toBeInTheDocument();
      const deleteSelectedBtn = screen.getByRole('button', { name: /delete selected/i });
      expect(deleteSelectedBtn).toBeDisabled();

      // User selects one notification
      fireEvent.click(cb1);
      expect(cb1).toBeChecked();
      expect(screen.getByText('1 selected')).toBeInTheDocument();
      expect(deleteSelectedBtn).toBeEnabled();

      // User selects multiple notifications
      fireEvent.click(cb2);
      expect(cb2).toBeChecked();
      expect(screen.getByText('2 selected')).toBeInTheDocument();

      // Select All works
      const selectAllBtn = screen.getByRole('button', { name: /^select all$/i });
      fireEvent.click(selectAllBtn);
      expect(cb1).toBeChecked();
      expect(cb2).toBeChecked();
      expect(cb3).toBeChecked();
      expect(screen.getByText('3 selected')).toBeInTheDocument();

      // Deselect All works
      const deselectAllBtn = screen.getByRole('button', { name: /^deselect all$/i });
      fireEvent.click(deselectAllBtn);
      expect(cb1).not.toBeChecked();
      expect(cb2).not.toBeChecked();
      expect(cb3).not.toBeChecked();
      expect(screen.getByText('0 selected')).toBeInTheDocument();

      // Select one again, then Done Managing exits Manage Mode and clears selections
      fireEvent.click(cb1);
      expect(screen.getByText('1 selected')).toBeInTheDocument();

      const doneBtn = screen.getByRole('button', { name: /done managing/i });
      fireEvent.click(doneBtn);

      // Checkboxes and toolbar hidden
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
      expect(screen.queryByText(/selected/i)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^manage$/i })).toBeInTheDocument();

      // Re-enter Manage Mode, verify selections were cleared
      fireEvent.click(screen.getByRole('button', { name: /^manage$/i }));
      expect(screen.getByText('0 selected')).toBeInTheDocument();
      expect(screen.getByLabelText('Select notification New Task Assigned')).not.toBeChecked();
    });
  });

  describe('Individual Notification Deletion (Three-Dot Menu)', () => {
    it('opens 3-dot menu, shows appropriate actions, prompts confirmation, and deletes single item', async () => {
      (api.getPaginated as any).mockResolvedValueOnce({
        success: true,
        data: {
          items: mockNotifications,
          total: 3,
          page: 1,
          page_size: 15,
          total_pages: 1,
        },
      });
      (api.delete as any).mockResolvedValueOnce({
        success: true,
        data: { message: 'Notification deleted successfully', deleted_count: 1 },
      });

      renderWithProviders(<NotificationsPage />, {
        preloadedState: {
          auth: {
            user: makeUser('employee'),
            token: 'emp-token',
            refreshToken: null,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          },
        },
      });

      await waitFor(() => {
        expect(screen.getByText('New Task Assigned')).toBeInTheDocument();
      });

      // 1. Open 3-dot menu for unread notification
      const menuBtn = screen.getByLabelText('Options for New Task Assigned');
      fireEvent.click(menuBtn);

      // Unread notification should show both "Mark as read" and "Delete notification"
      expect(screen.getByRole('button', { name: /mark as read/i })).toBeInTheDocument();
      const deleteOption = screen.getByRole('button', { name: /delete notification/i });
      expect(deleteOption).toBeInTheDocument();

      // Click Delete notification -> Confirmation dialog appears
      fireEvent.click(deleteOption);

      expect(screen.getByText('Delete notification?')).toBeInTheDocument();
      expect(
        screen.getByText('This notification will be permanently deleted. This action cannot be undone.')
      ).toBeInTheDocument();

      // Cancel does not delete
      const cancelBtn = screen.getByRole('button', { name: /^cancel$/i });
      fireEvent.click(cancelBtn);
      expect(screen.queryByText('Delete notification?')).not.toBeInTheDocument();
      expect(screen.getByText('New Task Assigned')).toBeInTheDocument();
      expect(api.delete).not.toHaveBeenCalled();

      // Click delete again and confirm
      fireEvent.click(screen.getByLabelText('Options for New Task Assigned'));
      fireEvent.click(screen.getByRole('button', { name: /delete notification/i }));
      const confirmDeleteBtn = screen.getByRole('button', { name: /^delete$/i });
      fireEvent.click(confirmDeleteBtn);

      await waitFor(() => {
        expect(api.delete).toHaveBeenCalledWith('/notifications/notif-1');
      });

      // UI updates immediately
      await waitFor(() => {
        expect(screen.queryByText('New Task Assigned')).not.toBeInTheDocument();
      });
      expect(screen.getByText('Daily Update Reviewed')).toBeInTheDocument();
    });

    it('shows only Delete notification for already-read notifications', async () => {
      (api.getPaginated as any).mockResolvedValueOnce({
        success: true,
        data: {
          items: [mockNotifications[2]], // notif-3 is_read: true
          total: 1,
          page: 1,
          page_size: 15,
          total_pages: 1,
        },
      });

      renderWithProviders(<NotificationsPage />, {
        preloadedState: {
          auth: {
            user: makeUser('employee'),
            token: 'emp-token',
            refreshToken: null,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          },
        },
      });

      await waitFor(() => {
        expect(screen.getByText('Daily Update Approved')).toBeInTheDocument();
      });

      const menuBtn = screen.getByLabelText('Options for Daily Update Approved');
      fireEvent.click(menuBtn);

      expect(screen.queryByRole('button', { name: /mark as read/i })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete notification/i })).toBeInTheDocument();
    });

    it('renders dropdown via portal into document.body, handles outside click, escape key, and menu switching', async () => {
      (api.getPaginated as any).mockResolvedValueOnce({
        success: true,
        data: {
          items: mockNotifications,
          total: 3,
          page: 1,
          page_size: 15,
          total_pages: 1,
        },
      });

      renderWithProviders(<NotificationsPage />, {
        preloadedState: {
          auth: {
            user: makeUser('employee'),
            token: 'emp-token',
            refreshToken: null,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          },
        },
      });

      await waitFor(() => {
        expect(screen.getByText('New Task Assigned')).toBeInTheDocument();
      });

      // 1. Open menu for notif 1
      const btn1 = screen.getByLabelText('Options for New Task Assigned');
      fireEvent.click(btn1);

      const portalMenu = document.querySelector('[data-menu-portal]');
      expect(portalMenu).toBeInTheDocument();
      expect(portalMenu?.parentElement).toBe(document.body);

      // 2. Escape key closes menu
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(document.querySelector('[data-menu-portal]')).not.toBeInTheDocument();

      // 3. Open menu 1 again, then click outside
      fireEvent.click(btn1);
      expect(document.querySelector('[data-menu-portal]')).toBeInTheDocument();
      fireEvent.mouseDown(document.body);
      expect(document.querySelector('[data-menu-portal]')).not.toBeInTheDocument();

      // 4. Open menu 1, then click menu 2 button -> seamlessly switches to menu 2
      fireEvent.click(btn1);
      expect(document.querySelector('[data-menu-portal]')).toBeInTheDocument();
      const btn2 = screen.getByLabelText('Options for Daily Update Reviewed');
      fireEvent.click(btn2);
      expect(document.querySelector('[data-menu-portal]')).toBeInTheDocument();
      // Only one menu open at a time
      expect(document.querySelectorAll('[data-menu-portal]').length).toBe(1);
    });
  });

  describe('Bulk Notification Deletion', () => {
    it('disables Delete Selected with 0 selection, enables with selection, confirms with count, and deletes', async () => {
      (api.getPaginated as any).mockResolvedValueOnce({
        success: true,
        data: {
          items: [...mockNotifications],
          total: 3,
          page: 1,
          page_size: 15,
          total_pages: 1,
        },
      });
      (api.delete as any).mockResolvedValueOnce({
        success: true,
        data: { message: 'Notifications deleted successfully', deleted_count: 2 },
      });

      renderWithProviders(<NotificationsPage />, {
        preloadedState: {
          auth: {
            user: makeUser('employee'),
            token: 'emp-token',
            refreshToken: null,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          },
        },
      });

      await waitFor(() => {
        expect(screen.getByText('New Task Assigned')).toBeInTheDocument();
      });

      // Enter Manage Mode
      fireEvent.click(screen.getByRole('button', { name: /^manage$/i }));

      const deleteSelectedBtn = screen.getByRole('button', { name: /delete selected/i });
      expect(deleteSelectedBtn).toBeDisabled();

      // Select 2 items
      fireEvent.click(screen.getByLabelText('Select notification New Task Assigned'));
      fireEvent.click(screen.getByLabelText('Select notification Daily Update Reviewed'));
      expect(deleteSelectedBtn).toBeEnabled();

      fireEvent.click(deleteSelectedBtn);

      // Confirmation dialog displays correct number
      expect(screen.getByText('Delete 2 notifications?')).toBeInTheDocument();
      expect(
        screen.getByText('You are about to permanently delete 2 notifications. This action cannot be undone.')
      ).toBeInTheDocument();

      // Cancel preserves notifications
      fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
      expect(screen.queryByText('Delete 2 notifications?')).not.toBeInTheDocument();
      expect(screen.getByText('New Task Assigned')).toBeInTheDocument();
      expect(api.delete).not.toHaveBeenCalled();

      // Re-open and Confirm Delete
      fireEvent.click(deleteSelectedBtn);
      fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));

      await waitFor(() => {
        expect(api.delete).toHaveBeenCalledWith('/notifications', {
          notification_ids: ['notif-1', 'notif-2'],
        });
      });

      // Removed immediately from UI
      await waitFor(() => {
        expect(screen.queryByText('New Task Assigned')).not.toBeInTheDocument();
        expect(screen.queryByText('Daily Update Reviewed')).not.toBeInTheDocument();
        expect(screen.getByText('Daily Update Approved')).toBeInTheDocument();
      });
    });
  });

  describe('Synchronization & Isolation', () => {
    it('synchronizes notification bell badge when unread notifications are deleted', async () => {
      const refreshSpy = vi.fn();
      window.addEventListener('notification-refresh', refreshSpy);

      (api.getPaginated as any).mockResolvedValueOnce({
        success: true,
        data: {
          items: [mockNotifications[0]], // unread notification
          total: 1,
          page: 1,
          page_size: 15,
          total_pages: 1,
        },
      });
      (api.delete as any).mockResolvedValueOnce({
        success: true,
        data: { message: 'Deleted', deleted_count: 1 },
      });

      renderWithProviders(<NotificationsPage />, {
        preloadedState: {
          auth: {
            user: makeUser('employee'),
            token: 'emp-token',
            refreshToken: null,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          },
        },
      });

      await waitFor(() => {
        expect(screen.getByText('New Task Assigned')).toBeInTheDocument();
      });

      // Delete the unread notification via 3-dot menu
      fireEvent.click(screen.getByLabelText('Options for New Task Assigned'));
      fireEvent.click(screen.getByRole('button', { name: /delete notification/i }));
      fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));

      await waitFor(() => {
        expect(refreshSpy).toHaveBeenCalled();
      });

      window.removeEventListener('notification-refresh', refreshSpy);
    });

    it('works identically in Director workspace with isolated notifications', async () => {
      const directorNotification = {
        notification_id: 'dir-notif-1',
        user_id: 'user-dir',
        notification_type: 'daily_update_submitted',
        title: 'Director Alert: Daily Update Submitted',
        message: 'Alice submitted a daily update.',
        reference_type: 'daily_update',
        reference_id: 'up-100',
        is_read: false,
        created_at: new Date().toISOString(),
        read_at: null,
      };

      (api.getPaginated as any).mockResolvedValueOnce({
        success: true,
        data: {
          items: [directorNotification],
          total: 1,
          page: 1,
          page_size: 15,
          total_pages: 1,
        },
      });
      (api.delete as any).mockResolvedValueOnce({
        success: true,
        data: { message: 'Deleted', deleted_count: 1 },
      });

      renderWithProviders(<NotificationsPage />, {
        preloadedState: {
          auth: {
            user: makeUser('director'),
            token: 'dir-token',
            refreshToken: null,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          },
        },
      });

      await waitFor(() => {
        expect(screen.getByText('Director Alert: Daily Update Submitted')).toBeInTheDocument();
      });

      // Manage Mode works for director
      fireEvent.click(screen.getByRole('button', { name: /^manage$/i }));
      expect(screen.getByLabelText('Select notification Director Alert: Daily Update Submitted')).toBeInTheDocument();

      // Selection & Bulk delete works for director
      fireEvent.click(screen.getByLabelText('Select notification Director Alert: Daily Update Submitted'));
      fireEvent.click(screen.getByRole('button', { name: /delete selected/i }));
      fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));

      await waitFor(() => {
        expect(api.delete).toHaveBeenCalledWith('/notifications', {
          notification_ids: ['dir-notif-1'],
        });
        expect(screen.queryByText('Director Alert: Daily Update Submitted')).not.toBeInTheDocument();
      });
    });
  });
});

