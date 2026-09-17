import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from './test-utils';
import { DirectorTasksPage } from '../features/tasks/pages/DirectorTasksPage';
import { DirectorTaskDetailPage } from '../features/tasks/pages/DirectorTaskDetailPage';
import { api } from '../services/api';
import type { CurrentUser } from '../types/user';
import type { TaskResponse } from '../types/task';

const mockDirector: CurrentUser = {
  user_id: 'dir-101',
  full_name: 'Director Boss',
  email: 'director@example.com',
  employee_code: 'DIR001',
  role_id: 'role-2',
  role_name: 'director',
  department_id: 'dept-1',
};

const directorAuthState = {
  auth: {
    user: mockDirector as any,
    token: 'dir-token',
    refreshToken: null,
    isAuthenticated: true,
    isLoading: false,
    error: null,
  },
};

const mockTasks: TaskResponse[] = [
  {
    task_id: 'task-1',
    task_code: 'TSK-001',
    title: 'Alpha Project Deliverable',
    description: 'Core architectural milestone for Alpha release',
    priority: 'high',
    start_date: '2026-09-01',
    due_date: '2026-09-30',
    created_by: 'dir-101',
    creator_name: 'Director Boss',
    status: 'open',
    assignments_count: 2,
    created_at: '2026-09-01T09:00:00Z',
    updated_at: '2026-09-01T09:00:00Z',
  },
  {
    task_id: 'task-2',
    task_code: 'TSK-002',
    title: 'Beta Quality Audit',
    description: 'Run automated end-to-end regression tests',
    priority: 'medium',
    start_date: '2026-09-05',
    due_date: '2026-09-25',
    created_by: 'dir-101',
    creator_name: 'Director Boss',
    status: 'archived',
    assignments_count: 1,
    created_at: '2026-09-05T09:00:00Z',
    updated_at: '2026-09-10T14:30:00Z',
  },
];

describe('Director Task Archive Flow — UI Specifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1 & 2: Renders [ View & Assign ] and [ ⋮ ] More Actions button next to it on each task card', async () => {
    vi.spyOn(api, 'getPaginated').mockResolvedValue({
      success: true,
      data: {
        items: [mockTasks[0]],
        total: 1,
        page: 1,
        page_size: 10,
        total_pages: 1,
      },
    });

    renderWithProviders(<DirectorTasksPage />, { preloadedState: directorAuthState });

    await waitFor(() => {
      expect(screen.getByText('Alpha Project Deliverable')).toBeInTheDocument();
    });

    // Verify [ View & Assign ] button exists
    const viewAssignBtn = screen.getByRole('button', { name: /view & assign/i });
    expect(viewAssignBtn).toBeInTheDocument();

    // Verify [ ⋮ ] More Actions button exists
    const moreActionsBtn = screen.getByTestId('task-actions-btn-task-1');
    expect(moreActionsBtn).toBeInTheDocument();
    expect(moreActionsBtn).toHaveAttribute('aria-label', 'More actions for Alpha Project Deliverable');
  });

  it('3, 4 & 5: Clicking [ ⋮ ] opens dropdown menu with Edit Task and Archive Task, and NEVER Delete Task', async () => {
    vi.spyOn(api, 'getPaginated').mockResolvedValue({
      success: true,
      data: {
        items: [mockTasks[0]],
        total: 1,
        page: 1,
        page_size: 10,
        total_pages: 1,
      },
    });

    renderWithProviders(<DirectorTasksPage />, { preloadedState: directorAuthState });

    await waitFor(() => {
      expect(screen.getByText('Alpha Project Deliverable')).toBeInTheDocument();
    });

    // Click More Actions
    const moreActionsBtn = screen.getByTestId('task-actions-btn-task-1');
    fireEvent.click(moreActionsBtn);

    // Dropdown should be visible
    const menu = screen.getByTestId('task-menu-task-1');
    expect(menu).toBeInTheDocument();

    // Contains Edit Task
    expect(screen.getByTestId('task-edit-btn-task-1')).toBeInTheDocument();
    expect(screen.getByText('Edit Task')).toBeInTheDocument();

    // Contains Archive Task
    expect(screen.getByTestId('task-archive-btn-task-1')).toBeInTheDocument();
    expect(screen.getByText('Archive Task')).toBeInTheDocument();

    // MUST NOT contain Delete Task anywhere
    expect(screen.queryByText(/delete/i)).not.toBeInTheDocument();
  });

  it('6 & 7: Clicking outside or pressing Escape closes the More Actions menu', async () => {
    vi.spyOn(api, 'getPaginated').mockResolvedValue({
      success: true,
      data: {
        items: [mockTasks[0]],
        total: 1,
        page: 1,
        page_size: 10,
        total_pages: 1,
      },
    });

    renderWithProviders(<DirectorTasksPage />, { preloadedState: directorAuthState });

    await waitFor(() => {
      expect(screen.getByText('Alpha Project Deliverable')).toBeInTheDocument();
    });

    // Open menu
    const moreActionsBtn = screen.getByTestId('task-actions-btn-task-1');
    fireEvent.click(moreActionsBtn);
    expect(screen.getByTestId('task-menu-task-1')).toBeInTheDocument();

    // Press Escape
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('task-menu-task-1')).not.toBeInTheDocument();

    // Open again and click outside
    fireEvent.click(moreActionsBtn);
    expect(screen.getByTestId('task-menu-task-1')).toBeInTheDocument();
    fireEvent.click(window);
    expect(screen.queryByTestId('task-menu-task-1')).not.toBeInTheDocument();
  });

  it('8, 9, 10 & 11: Clicking Archive Task opens confirmation modal with exact text and buttons', async () => {
    vi.spyOn(api, 'getPaginated').mockResolvedValue({
      success: true,
      data: {
        items: [mockTasks[0]],
        total: 1,
        page: 1,
        page_size: 10,
        total_pages: 1,
      },
    });

    renderWithProviders(<DirectorTasksPage />, { preloadedState: directorAuthState });

    await waitFor(() => {
      expect(screen.getByText('Alpha Project Deliverable')).toBeInTheDocument();
    });

    // Open menu and click Archive Task
    fireEvent.click(screen.getByTestId('task-actions-btn-task-1'));
    fireEvent.click(screen.getByTestId('task-archive-btn-task-1'));

    // Modal should be open
    const modal = screen.getByRole('dialog');
    expect(modal).toBeInTheDocument();

    // Title
    expect(screen.getByRole('heading', { name: /archive task\?/i })).toBeInTheDocument();

    // Body text preservation notice
    expect(
      screen.getByText(/This task will no longer appear in active task lists or be available for new assignments\. Existing assignments, daily updates, reviews, comments, attachments, task history, and audit records will be preserved\./i)
    ).toBeInTheDocument();

    // Buttons: Cancel and Archive Task
    expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^archive task$/i })).toBeInTheDocument();
  });

  it('12: Clicking Cancel closes the confirmation modal without changes', async () => {
    vi.spyOn(api, 'getPaginated').mockResolvedValue({
      success: true,
      data: {
        items: [mockTasks[0]],
        total: 1,
        page: 1,
        page_size: 10,
        total_pages: 1,
      },
    });
    const postSpy = vi.spyOn(api, 'post');

    renderWithProviders(<DirectorTasksPage />, { preloadedState: directorAuthState });

    await waitFor(() => {
      expect(screen.getByText('Alpha Project Deliverable')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('task-actions-btn-task-1'));
    fireEvent.click(screen.getByTestId('task-archive-btn-task-1'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Click Cancel
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(postSpy).not.toHaveBeenCalled();
  });

  it('13, 14 & 15: Confirming archive calls POST /tasks/:id/archive, shows toast and refreshes', async () => {
    const getSpy = vi.spyOn(api, 'getPaginated').mockResolvedValue({
      success: true,
      data: {
        items: [mockTasks[0]],
        total: 1,
        page: 1,
        page_size: 10,
        total_pages: 1,
      },
    });
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({
      success: true,
      data: {
        task_id: 'task-1',
        status: 'archived',
      },
    });

    renderWithProviders(<DirectorTasksPage />, { preloadedState: directorAuthState });

    await waitFor(() => {
      expect(screen.getByText('Alpha Project Deliverable')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('task-actions-btn-task-1'));
    fireEvent.click(screen.getByTestId('task-archive-btn-task-1'));

    const confirmBtn = screen.getByRole('button', { name: /^archive task$/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith('/tasks/task-1/archive');
    });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByText(/task archived successfully/i)).toBeInTheDocument();
    });

    // fetchTasks refreshed
    expect(getSpy).toHaveBeenCalledTimes(2);
  });

  it('16 & 17: Status filter includes "Archived" option and queries backend correctly', async () => {
    const getSpy = vi.spyOn(api, 'getPaginated').mockResolvedValue({
      success: true,
      data: {
        items: [mockTasks[1]],
        total: 1,
        page: 1,
        page_size: 10,
        total_pages: 1,
      },
    });

    renderWithProviders(<DirectorTasksPage />, { preloadedState: directorAuthState });

    await waitFor(() => {
      expect(screen.getByTestId('status-filter-select')).toBeInTheDocument();
    });

    // Find the Status select
    const statusSelect = screen.getByTestId('status-filter-select');
    expect(statusSelect).toBeInTheDocument();

    // Verify option exists
    const archivedOption = screen.getByRole('option', { name: 'Archived' });
    expect(archivedOption).toBeInTheDocument();
    expect(archivedOption).toHaveValue('archived');

    // Select "Archived"
    fireEvent.change(statusSelect, { target: { value: 'archived' } });

    await waitFor(() => {
      expect(getSpy).toHaveBeenCalledWith(
        '/tasks',
        expect.objectContaining({
          status_filter: 'archived',
        })
      );
    });

    // Task card badge shows ARCHIVED
    await waitFor(() => {
      expect(screen.getByText('Beta Quality Audit')).toBeInTheDocument();
      expect(screen.getByText('archived')).toBeInTheDocument();
    });
  });

  it('Already archived task has disabled Archive Task action in menu', async () => {
    vi.spyOn(api, 'getPaginated').mockResolvedValue({
      success: true,
      data: {
        items: [mockTasks[1]],
        total: 1,
        page: 1,
        page_size: 10,
        total_pages: 1,
      },
    });

    renderWithProviders(<DirectorTasksPage />, { preloadedState: directorAuthState });

    await waitFor(() => {
      expect(screen.getByText('Beta Quality Audit')).toBeInTheDocument();
    });

    // Open menu on archived task
    fireEvent.click(screen.getByTestId('task-actions-btn-task-2'));

    // Archive action is disabled with tooltip "Already archived"
    const archiveBtn = screen.getByTitle('Already archived');
    expect(archiveBtn).toBeInTheDocument();
    expect(archiveBtn).toBeDisabled();
  });
});

describe('DirectorTaskDetailPage — Archive & Edit parameter behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Enters edit mode automatically when ?edit=true is present in URL', async () => {
    vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
      if (url === '/tasks/task-1') {
        return { success: true, data: mockTasks[0] };
      }
      if (url === '/tasks/task-1/history') {
        return { success: true, data: [] };
      }
      return { success: false, data: null };
    });
    vi.spyOn(api, 'getPaginated').mockResolvedValue({
      success: true,
      data: { items: [], total: 0, page: 1, page_size: 100, total_pages: 1 },
    });

    renderWithProviders(
      <Routes>
        <Route path="/director/tasks/:id" element={<DirectorTaskDetailPage />} />
      </Routes>,
      {
        route: '/director/tasks/task-1?edit=true',
        preloadedState: {
          auth: {
            user: mockDirector as any,
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
      // Edit form is visible
      expect(screen.getByText('Edit Task Specification')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });
  });

  it('Displays ARCHIVED badge and suppresses assignment form with informative banner for archived task', async () => {
    vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
      if (url === '/tasks/task-2') {
        return { success: true, data: mockTasks[1] };
      }
      if (url === '/tasks/task-2/history') {
        return { success: true, data: [] };
      }
      return { success: false, data: null };
    });
    vi.spyOn(api, 'getPaginated').mockResolvedValue({
      success: true,
      data: { items: [], total: 0, page: 1, page_size: 100, total_pages: 1 },
    });

    renderWithProviders(
      <Routes>
        <Route path="/director/tasks/:id" element={<DirectorTaskDetailPage />} />
      </Routes>,
      {
        route: '/director/tasks/task-2',
        preloadedState: {
          auth: {
            user: mockDirector as any,
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
      expect(screen.getByText(/Beta Quality Audit/i)).toBeInTheDocument();
    });

    // Badge indicates archived
    expect(screen.getByText('archived')).toBeInTheDocument();

    // Assignment form is suppressed and replaced by banner
    expect(screen.getByText(/this task is archived and cannot be assigned to new employees\./i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /assign employee/i })).not.toBeInTheDocument();
  });
});
