import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent, within } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from './test-utils';
import { EmployeeDashboard } from '../features/dashboard/pages/EmployeeDashboard';
import { TasksListPage } from '../features/tasks/pages/TasksListPage';
import { Sidebar } from '../layouts/DashboardLayout/Sidebar';
import { api } from '../services/api';
import type { CurrentUser } from '../types/user';

const mockEmployee: CurrentUser = {
  user_id: 'emp-101',
  full_name: 'Jane Doe',
  email: 'jane.doe@example.com',
  employee_code: 'EMP001',
  role_id: 'role-3',
  role_name: 'employee',
  department_id: 'dept-1',
};

describe('Employee Dashboard & Actionable Shortcuts', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders informative welcome banner, actionable stat links, and Today\'s Focus section', async () => {
    // Mock /task-assignments
    vi.spyOn(api, 'getPaginated').mockImplementation(((url: string) => {
      if (url === '/task-assignments') {
        return Promise.resolve({
          success: true,
          data: {
            items: [
              {
                assignment_id: 'asgn-1',
                task_id: 'task-1',
                task_code: 'TSK-101',
                task_title: 'Implement OAuth Security',
                task_priority: 'high',
                employee_id: 'emp-101',
                employee_name: 'Jane Doe',
                employee_code: 'EMP001',
                assigned_by: 'dir-1',
                assigned_by_name: 'Director Boss',
                assigned_at: '2026-09-01T09:00:00',
                start_date: '2026-09-01',
                due_date: '2026-09-10',
                status: 'active',
                employee_notes: 'Working on token refresh',
                completion_percentage: 60,
                completed_at: null,
              },
              {
                assignment_id: 'asgn-2',
                task_id: 'task-2',
                task_code: 'TSK-102',
                task_title: 'Setup Database Migration',
                task_priority: 'medium',
                employee_id: 'emp-101',
                employee_name: 'Jane Doe',
                employee_code: 'EMP001',
                assigned_by: 'dir-1',
                assigned_by_name: 'Director Boss',
                assigned_at: '2026-09-02T09:00:00',
                start_date: '2026-09-02',
                due_date: '2026-09-15',
                status: 'active',
                employee_notes: null,
                completion_percentage: 0,
                completed_at: null,
              },
              {
                assignment_id: 'asgn-3',
                task_id: 'task-3',
                task_code: 'TSK-103',
                task_title: 'Write Documentation',
                task_priority: 'low',
                employee_id: 'emp-101',
                employee_name: 'Jane Doe',
                employee_code: 'EMP001',
                assigned_by: 'dir-1',
                assigned_by_name: 'Director Boss',
                assigned_at: '2026-09-03T09:00:00',
                start_date: '2026-09-03',
                due_date: '2026-09-05',
                status: 'completed',
                employee_notes: 'Finished docs',
                completion_percentage: 100,
                completed_at: '2026-09-05T12:00:00',
              },
            ],
            total: 3,
            page: 1,
            page_size: 100,
            total_pages: 1,
          },
        });
      }

      if (url === '/daily-updates') {
        return Promise.resolve({
          success: true,
          data: {
            items: [
              {
                update_id: 'upd-1',
                employee_id: 'emp-101',
                employee_name: 'Jane Doe',
                update_date: '2026-09-08',
                overall_status: 'draft',
                total_hours: 4.5,
                items_count: 2,
                summary: 'Refactored frontend task components',
                created_at: '2026-09-08T09:00:00',
              },
            ],
            total: 1,
            page: 1,
            page_size: 5,
            total_pages: 1,
          },
        });
      }

      return Promise.resolve({
        success: true,
        data: { items: [], total: 0, page: 1, page_size: 10, total_pages: 1 },
      });
    }) as any);

    renderWithProviders(<EmployeeDashboard />, {
      preloadedState: {
        auth: {
          user: mockEmployee,
          token: 'emp-token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });

    // 1. Welcome banner renders
    await waitFor(() => {
      expect(screen.getByText(/Welcome back, Jane!/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/pending task/i)).toBeInTheDocument();
    expect(screen.getAllByText(/in progress/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /Continue Today's Draft/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /View Today's Update/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Fill Today's Update/i })).not.toBeInTheDocument();

    // 2. Actionable statistics cards have correct navigation links
    const totalTasksLink = document.querySelector('a[href="/employee/tasks"]');
    expect(totalTasksLink).toBeInTheDocument();

    const pendingLink = document.querySelector('a[href="/employee/tasks?status=pending"]');
    expect(pendingLink).toBeInTheDocument();

    const inProgressLink = document.querySelector('a[href="/employee/tasks?status=in_progress"]');
    expect(inProgressLink).toBeInTheDocument();

    const completedLink = document.querySelector('a[href="/employee/tasks?status=completed"]');
    expect(completedLink).toBeInTheDocument();

    // 3. Active Task List displays task code, title, and progress
    expect(screen.getByText('TSK-101')).toBeInTheDocument();
    expect(screen.getAllByText('Implement OAuth Security').length).toBeGreaterThan(0);
    expect(screen.getAllByText('60%').length).toBeGreaterThan(0);

    // 4. Recent Submissions shows draft and continue option
    expect(screen.getByText('Refactored frontend task components')).toBeInTheDocument();

    // 5. Today's Focus section renders
    expect(screen.getByText(/Today's Focus & Action Items/i)).toBeInTheDocument();
    expect(screen.getByText(/Active In-Flight/i)).toBeInTheDocument();
  });

  it('filters tasks in TasksListPage when navigating with ?status=in_progress', async () => {
    const mockTasks = [
      {
        assignment_id: 'asgn-1',
        task_id: 'task-1',
        task_code: 'TSK-101',
        task_title: 'Active Task 1',
        task_priority: 'high',
        employee_id: 'emp-101',
        employee_name: 'Jane Doe',
        employee_code: 'EMP001',
        assigned_by: 'dir-1',
        assigned_by_name: 'Director',
        assigned_at: '2026-09-01T09:00:00',
        start_date: '2026-09-01',
        due_date: '2026-09-10',
        status: 'active',
        employee_notes: null,
        completion_percentage: 50,
        completed_at: null,
      },
      {
        assignment_id: 'asgn-2',
        task_id: 'task-2',
        task_code: 'TSK-102',
        task_title: 'Pending Task 2',
        task_priority: 'medium',
        employee_id: 'emp-101',
        employee_name: 'Jane Doe',
        employee_code: 'EMP001',
        assigned_by: 'dir-1',
        assigned_by_name: 'Director',
        assigned_at: '2026-09-02T09:00:00',
        start_date: '2026-09-02',
        due_date: '2026-09-15',
        status: 'active',
        employee_notes: null,
        completion_percentage: 0,
        completed_at: null,
      },
    ];

    vi.spyOn(api, 'getPaginated').mockResolvedValue({
      success: true,
      data: {
        items: mockTasks,
        total: 2,
        page: 1,
        page_size: 10,
        total_pages: 1,
      },
    } as any);

    renderWithProviders(<TasksListPage />, {
      route: '/employee/tasks?status=in_progress',
      preloadedState: {
        auth: {
          user: mockEmployee,
          token: 'emp-token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });

    await waitFor(() => {
      // In-progress task should be visible
      expect(screen.getByText('Active Task 1')).toBeInTheDocument();
      // Pending task (0%) is filtered out
      expect(screen.queryByText('Pending Task 2')).not.toBeInTheDocument();
    });

    // Active filter badge is displayed
    expect(screen.getByText(/Status: in progress/i)).toBeInTheDocument();
  });

  it('renders Refresh button instead of Apply Search, and supports manual refresh and automatic search', async () => {
    const mockTasks = [
      {
        assignment_id: 'asgn-1',
        task_id: 'task-1',
        task_code: 'TSK-101',
        task_title: 'Database Indexing',
        task_priority: 'high',
        employee_id: 'emp-101',
        status: 'active',
        completion_percentage: 20,
      },
    ];

    const getSpy = vi.spyOn(api, 'getPaginated').mockResolvedValue({
      success: true,
      data: {
        items: mockTasks,
        total: 1,
        page: 1,
        page_size: 10,
        total_pages: 1,
      },
    } as any);

    renderWithProviders(<TasksListPage />, {
      preloadedState: {
        auth: {
          user: mockEmployee,
          token: 'emp-token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Database Indexing')).toBeInTheDocument();
    });

    // 1. Confirm Apply Search button is completely removed
    expect(screen.queryByRole('button', { name: /apply search/i })).not.toBeInTheDocument();

    // 2. Confirm Refresh button exists
    const refreshBtn = screen.getByRole('button', { name: /refresh/i });
    expect(refreshBtn).toBeInTheDocument();

    // 3. Clicking Refresh re-fetches assignments
    getSpy.mockClear();
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(getSpy).toHaveBeenCalledWith('/task-assignments', expect.objectContaining({
        employee_id: 'emp-101',
      }));
    });
  });
});

describe('Task Lifecycle Status & Consistency Across Scenarios', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('correctly calculates metrics and matches filters using centralized utility', async () => {
    const {
      calculateTaskLifecycleMetrics,
      matchesStatusFilter,
      getAssignmentLifecycleStatus,
      normalizeStatusString,
    } = await import('../utils/taskStatus');

    expect(normalizeStatusString('IN_PROGRESS')).toBe('in_progress');
    expect(normalizeStatusString('In-Progress')).toBe('in_progress');
    expect(normalizeStatusString(' Pending ')).toBe('pending');

    const sampleAssignments = [
      { status: 'active', completion_percentage: 0 },
      { status: 'active', completion_percentage: 40 },
      { status: 'active', completion_percentage: 80 },
      { status: 'completed', completion_percentage: 100 },
      { status: 'dropped', completion_percentage: 10 },
      { status: 'active', completion_percentage: 50, task_status: 'cancelled' },
    ];

    expect(getAssignmentLifecycleStatus(sampleAssignments[0])).toBe('pending');
    expect(getAssignmentLifecycleStatus(sampleAssignments[1])).toBe('in_progress');
    expect(getAssignmentLifecycleStatus(sampleAssignments[2])).toBe('in_progress');
    expect(getAssignmentLifecycleStatus(sampleAssignments[3])).toBe('completed');
    expect(getAssignmentLifecycleStatus(sampleAssignments[4])).toBe('dropped');
    expect(getAssignmentLifecycleStatus(sampleAssignments[5])).toBe('cancelled');

    const metrics = calculateTaskLifecycleMetrics(sampleAssignments);
    expect(metrics.total).toBe(4); // 1 pending + 2 in_progress + 1 completed
    expect(metrics.pending).toBe(1);
    expect(metrics.inProgress).toBe(2);
    expect(metrics.completed).toBe(1);
    expect(metrics.dropped).toBe(1);
    expect(metrics.cancelled).toBe(1);

    expect(matchesStatusFilter(sampleAssignments[1], 'in_progress')).toBe(true);
    expect(matchesStatusFilter(sampleAssignments[0], 'in_progress')).toBe(false);
    expect(matchesStatusFilter(sampleAssignments[4], 'all')).toBe(false);
    expect(matchesStatusFilter(sampleAssignments[5], 'all')).toBe(false);
  });

  it('Scenario 1: No tasks — Dashboard displays 0 and My Tasks displays empty state', async () => {
    vi.spyOn(api, 'getPaginated').mockResolvedValue({
      success: true,
      data: { items: [], total: 0, page: 1, page_size: 10, total_pages: 1 },
    } as any);

    renderWithProviders(<EmployeeDashboard />, {
      preloadedState: {
        auth: {
          user: mockEmployee,
          token: 'token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });

    await waitFor(() => {
      // All metrics should show 0
      const totalHeading = screen.getByText('Total Tasks').closest('div')?.querySelector('h3');
      const inProgHeading = screen.getByText('In Progress').closest('div')?.querySelector('h3');
      expect(totalHeading?.textContent).toBe('0');
      expect(inProgHeading?.textContent).toBe('0');
    });
  });

  it('Scenario 2: Pending tasks only — Dashboard In Progress is 0, Tasks filtered by in_progress shows empty', async () => {
    const pendingTasks = [
      {
        assignment_id: 'p-1',
        task_id: 't-1',
        task_code: 'TSK-001',
        task_title: 'Pending Task One',
        employee_id: 'emp-101',
        status: 'active',
        completion_percentage: 0,
      },
      {
        assignment_id: 'p-2',
        task_id: 't-2',
        task_code: 'TSK-002',
        task_title: 'Pending Task Two',
        employee_id: 'emp-101',
        status: 'active',
        completion_percentage: 0,
      },
    ];

    vi.spyOn(api, 'getPaginated').mockImplementation(((_url: string, params: any) => {
      if (params?.status_filter === 'in_progress') {
        return Promise.resolve({
          success: true,
          data: { items: [], total: 0, page: 1, page_size: 10, total_pages: 1 },
        });
      }
      return Promise.resolve({
        success: true,
        data: { items: pendingTasks, total: 2, page: 1, page_size: 10, total_pages: 1 },
      });
    }) as any);

    renderWithProviders(<TasksListPage />, {
      route: '/employee/tasks?status=in_progress',
      preloadedState: {
        auth: {
          user: mockEmployee,
          token: 'token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });

    await waitFor(() => {
      expect(screen.getByText('No task assignments match the selected filters.')).toBeInTheDocument();
      expect(screen.queryByText('Pending Task One')).not.toBeInTheDocument();
    });
  });

  it('Scenario 3: One In Progress task — Dashboard displays 1 and Tasks filtered by in_progress displays that exact task', async () => {
    const inProgTask = {
      assignment_id: 'ip-1',
      task_id: 't-1',
      task_code: 'TSK-010',
      task_title: 'Daily Tracker UI',
      employee_id: 'emp-101',
      status: 'active',
      completion_percentage: 50,
    };

    vi.spyOn(api, 'getPaginated').mockImplementation(((url: string, _params: any) => {
      if (url === '/task-assignments') {
        return Promise.resolve({
          success: true,
          data: { items: [inProgTask], total: 1, page: 1, page_size: 10, total_pages: 1 },
        });
      }
      return Promise.resolve({
        success: true,
        data: { items: [], total: 0, page: 1, page_size: 5, total_pages: 1 },
      });
    }) as any);

    // 1. Verify on Dashboard
    const { unmount } = renderWithProviders(<EmployeeDashboard />, {
      preloadedState: {
        auth: {
          user: mockEmployee,
          token: 'token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });

    await waitFor(() => {
      const inProgCards = screen.getAllByText('In Progress');
      const inProgHeading = inProgCards[0].closest('div')?.querySelector('h3');
      expect(inProgHeading?.textContent).toBe('1');
    });

    unmount();

    // 2. Verify on My Assigned Tasks with ?status=in_progress
    renderWithProviders(<TasksListPage />, {
      route: '/employee/tasks?status=in_progress',
      preloadedState: {
        auth: {
          user: mockEmployee,
          token: 'token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Daily Tracker UI')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.queryByText('No task assignments match the selected filters.')).not.toBeInTheDocument();
    });
  });

  it('Scenario 6 & 7: Mixed statuses and multiple employees — Dashboard counts strictly reflect current employee', async () => {
    const mixedTasks = [
      {
        assignment_id: 'm-1',
        task_id: 't-1',
        task_code: 'TSK-101',
        task_title: 'Pending Task',
        employee_id: 'emp-101',
        status: 'active',
        completion_percentage: 0,
      },
      {
        assignment_id: 'm-2',
        task_id: 't-2',
        task_code: 'TSK-102',
        task_title: 'In Progress Task 1',
        employee_id: 'emp-101',
        status: 'active',
        completion_percentage: 30,
      },
      {
        assignment_id: 'm-3',
        task_id: 't-3',
        task_code: 'TSK-103',
        task_title: 'In Progress Task 2',
        employee_id: 'emp-101',
        status: 'active',
        completion_percentage: 75,
      },
      {
        assignment_id: 'm-4',
        task_id: 't-4',
        task_code: 'TSK-104',
        task_title: 'Completed Task',
        employee_id: 'emp-101',
        status: 'completed',
        completion_percentage: 100,
      },
    ];

    vi.spyOn(api, 'getPaginated').mockImplementation(((url: string) => {
      if (url === '/task-assignments') {
        return Promise.resolve({
          success: true,
          data: { items: mixedTasks, total: 4, page: 1, page_size: 100, total_pages: 1 },
        });
      }
      return Promise.resolve({
        success: true,
        data: { items: [], total: 0, page: 1, page_size: 5, total_pages: 1 },
      });
    }) as any);

    renderWithProviders(<EmployeeDashboard />, {
      preloadedState: {
        auth: {
          user: mockEmployee,
          token: 'token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });

    await waitFor(() => {
      const totalHeading = screen.getByText('Total Tasks').closest('div')?.querySelector('h3');
      const pendingLabel = screen.getAllByText('Pending').find((el) => el.tagName === 'P');
      const inProgLabel = screen.getAllByText('In Progress').find((el) => el.tagName === 'P');
      const completedLabel = screen.getAllByText('Completed').find((el) => el.tagName === 'P');

      const pendingHeading = pendingLabel?.closest('div')?.querySelector('h3');
      const inProgHeading = inProgLabel?.closest('div')?.querySelector('h3');
      const completedHeading = completedLabel?.closest('div')?.querySelector('h3');

      expect(totalHeading?.textContent).toBe('4');
      expect(pendingHeading?.textContent).toBe('1');
      expect(inProgHeading?.textContent).toBe('2');
      expect(completedHeading?.textContent).toBe('1');
    });
  });
});

describe('Employee Workspace Requirements (A-G)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // A. Hero action removal
  it('A: Hero action removal — verifies no action buttons exist across update statuses while keeping metadata', async () => {
    // 1. Test with draft update
    vi.spyOn(api, 'getPaginated').mockImplementation(((url: string, params: any) => {
      if (url === '/task-assignments') {
        return Promise.resolve({
          success: true,
          data: {
            items: [{
              assignment_id: 'asgn-1',
              task_id: 'task-1',
              task_code: 'TSK-101',
              task_title: 'Draft Task',
              status: 'active',
              completion_percentage: 20,
              assigned_at: '2026-09-01T09:00:00',
            }],
            total: 1,
            page: 1,
            page_size: 100,
            total_pages: 1,
          },
        });
      }
      if (url === '/daily-updates') {
        if (params?.date_from) {
          return Promise.resolve({
            success: true,
            data: {
              items: [{
                update_id: 'upd-draft',
                employee_id: 'emp-101',
                update_date: '2026-09-11',
                overall_status: 'draft',
                items_count: 1,
                total_hours: 2,
              }],
              total: 1,
              page: 1,
              page_size: 1,
              total_pages: 1,
            },
          });
        }
        return Promise.resolve({
          success: true,
          data: { items: [], total: 0, page: 1, page_size: 5, total_pages: 1 },
        });
      }
      return Promise.resolve({ success: true, data: { items: [], total: 0 } });
    }) as any);

    const { unmount } = renderWithProviders(<EmployeeDashboard />, {
      preloadedState: {
        auth: {
          user: mockEmployee,
          token: 'emp-token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });

    await waitFor(() => {
      expect(screen.getByText(/Welcome back, Jane!/i)).toBeInTheDocument();
    });

    // Verify hero action buttons DO NOT exist
    expect(screen.queryByRole('button', { name: /View Today's Update/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Fill Today's Update/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Continue Today's Draft/i })).not.toBeInTheDocument();

    // Verify hero metadata remains intact
    expect(screen.getByText(/Employee Workspace/i)).toBeInTheDocument();
    expect(screen.getByText(/Draft Saved/i)).toBeInTheDocument();

    unmount();

    // 2. Test with submitted update
    vi.spyOn(api, 'getPaginated').mockImplementation(((url: string, params: any) => {
      if (url === '/task-assignments') {
        return Promise.resolve({
          success: true,
          data: { items: [], total: 0, page: 1, page_size: 100, total_pages: 1 },
        });
      }
      if (url === '/daily-updates' && params?.date_from) {
        return Promise.resolve({
          success: true,
          data: {
            items: [{
              update_id: 'upd-sub',
              employee_id: 'emp-101',
              update_date: '2026-09-11',
              overall_status: 'submitted',
              items_count: 1,
              total_hours: 4,
            }],
            total: 1,
            page: 1,
            page_size: 1,
            total_pages: 1,
          },
        });
      }
      return Promise.resolve({ success: true, data: { items: [], total: 0, page: 1, page_size: 5, total_pages: 1 } });
    }) as any);

    const subRender = renderWithProviders(<EmployeeDashboard />, {
      preloadedState: {
        auth: {
          user: mockEmployee,
          token: 'emp-token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });

    await waitFor(() => {
      expect(screen.getAllByText(/Submitted/i).length).toBeGreaterThan(0);
    });

    expect(screen.queryByRole('button', { name: /View Today's Update/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Fill Today's Update/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Continue Today's Draft/i })).not.toBeInTheDocument();

    subRender.unmount();

    // 3. Test with no update today (pending)
    vi.spyOn(api, 'getPaginated').mockImplementation(((url: string) => {
      if (url === '/task-assignments') {
        return Promise.resolve({
          success: true,
          data: { items: [], total: 0, page: 1, page_size: 100, total_pages: 1 },
        });
      }
      if (url === '/daily-updates') {
        return Promise.resolve({
          success: true,
          data: { items: [], total: 0, page: 1, page_size: 5, total_pages: 1 },
        });
      }
      return Promise.resolve({ success: true, data: { items: [], total: 0 } });
    }) as any);

    renderWithProviders(<EmployeeDashboard />, {
      preloadedState: {
        auth: {
          user: mockEmployee,
          token: 'emp-token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });

    await waitFor(() => {
      expect(screen.getAllByText(/Pending/i).length).toBeGreaterThan(0);
    });

    expect(screen.queryByRole('button', { name: /View Today's Update/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Fill Today's Update/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Continue Today's Draft/i })).not.toBeInTheDocument();
  });

  // B. Navigation
  it('B: Navigation — "Upload Daily Tracker" exists and "Daily Tracker" does not exist in sidebar', () => {
    renderWithProviders(<Sidebar />, {
      preloadedState: {
        auth: {
          user: mockEmployee,
          token: 'emp-token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });

    const uploadItem = screen.getByRole('link', { name: /Upload Daily Tracker/i });
    expect(uploadItem).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Daily Tracker$/i })).not.toBeInTheDocument();
  });

  // C. Navigation target
  it('C: Navigation target — clicking "Upload Daily Tracker" navigates to /employee/daily-update', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/employee/dashboard" element={<Sidebar />} />
        <Route path="/employee/daily-update" element={<div>Employee Daily Tracker Page Target</div>} />
      </Routes>,
      {
        route: '/employee/dashboard',
        preloadedState: {
          auth: {
            user: mockEmployee,
            token: 'emp-token',
            refreshToken: null,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          },
        },
      }
    );

    const uploadLink = screen.getByRole('link', { name: /Upload Daily Tracker/i });
    expect(uploadLink).toHaveAttribute('href', '/employee/daily-update');

    fireEvent.click(uploadLink);

    await waitFor(() => {
      expect(screen.getByText('Employee Daily Tracker Page Target')).toBeInTheDocument();
    });
  });

  // D. Active state
  it('D: Active state — "Upload Daily Tracker" has active styling on /employee/daily-update and inactive on other routes', () => {
    // 1. On /employee/daily-update
    const { unmount } = renderWithProviders(<Sidebar />, {
      route: '/employee/daily-update',
      preloadedState: {
        auth: {
          user: mockEmployee,
          token: 'emp-token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });

    const activeUploadLink = screen.getByRole('link', { name: /Upload Daily Tracker/i });
    expect(activeUploadLink.className).toContain('bg-white/20');
    expect(activeUploadLink.className).toContain('font-semibold');

    const inactiveDashboardLink = screen.getByRole('link', { name: /^Dashboard$/i });
    expect(inactiveDashboardLink.className).not.toContain('bg-white/20');

    unmount();

    // 2. On /employee/dashboard
    renderWithProviders(<Sidebar />, {
      route: '/employee/dashboard',
      preloadedState: {
        auth: {
          user: mockEmployee,
          token: 'emp-token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });

    const inactiveUploadLink = screen.getByRole('link', { name: /Upload Daily Tracker/i });
    expect(inactiveUploadLink.className).not.toContain('bg-white/20');

    const activeDashLink = screen.getByRole('link', { name: /^Dashboard$/i });
    expect(activeDashLink.className).toContain('bg-white/20');
  });

  // E. Recent submissions — 5 most recent records in ascending order
  it('E: Recent Submissions — selects 5 most recent records and displays them in ascending chronological order', async () => {
    // Updates dataset: 7 updates on Sep 1, Sep 3, Sep 5, Sep 7, Sep 9, Sep 11, Sep 13
    const allUpdates = [
      {
        update_id: 'upd-1',
        employee_id: 'emp-101',
        update_date: '2026-09-01',
        overall_status: 'reviewed',
        summary: 'Work on Sep 1',
        created_at: '2026-09-01T17:00:00',
        items_count: 1,
        total_hours: 8,
      },
      {
        update_id: 'upd-2',
        employee_id: 'emp-101',
        update_date: '2026-09-03',
        overall_status: 'reviewed',
        summary: 'Work on Sep 3',
        created_at: '2026-09-03T17:00:00',
        items_count: 1,
        total_hours: 8,
      },
      {
        update_id: 'upd-3',
        employee_id: 'emp-101',
        update_date: '2026-09-05',
        overall_status: 'reviewed',
        summary: 'Work on Sep 5',
        created_at: '2026-09-05T17:00:00',
        items_count: 1,
        total_hours: 8,
      },
      {
        update_id: 'upd-4',
        employee_id: 'emp-101',
        update_date: '2026-09-07',
        overall_status: 'reviewed',
        summary: 'Work on Sep 7',
        created_at: '2026-09-07T17:00:00',
        items_count: 1,
        total_hours: 8,
      },
      {
        update_id: 'upd-5',
        employee_id: 'emp-101',
        update_date: '2026-09-09',
        overall_status: 'reviewed',
        summary: 'Work on Sep 9',
        created_at: '2026-09-09T17:00:00',
        items_count: 1,
        total_hours: 8,
      },
      {
        update_id: 'upd-6',
        employee_id: 'emp-101',
        update_date: '2026-09-11',
        overall_status: 'reviewed',
        summary: 'Work on Sep 11',
        created_at: '2026-09-11T17:00:00',
        items_count: 1,
        total_hours: 8,
      },
      {
        update_id: 'upd-7',
        employee_id: 'emp-101',
        update_date: '2026-09-13',
        overall_status: 'submitted',
        summary: 'Work on Sep 13',
        created_at: '2026-09-13T17:00:00',
        items_count: 1,
        total_hours: 8,
      },
    ];

    vi.spyOn(api, 'getPaginated').mockImplementation(((url: string, params: any) => {
      if (url === '/task-assignments') {
        return Promise.resolve({
          success: true,
          data: { items: [], total: 0, page: 1, page_size: 100, total_pages: 1 },
        });
      }

      if (url === '/daily-updates') {
        // Backend behavior: order by update_date desc, return page_size items
        const pageSize = params?.page_size || 5;
        const sortedDesc = [...allUpdates].sort((a, b) => new Date(b.update_date).getTime() - new Date(a.update_date).getTime());
        const paginated = sortedDesc.slice(0, pageSize);
        return Promise.resolve({
          success: true,
          data: {
            items: paginated,
            total: allUpdates.length,
            page: 1,
            page_size: pageSize,
            total_pages: 2,
          },
        });
      }

      return Promise.resolve({ success: true, data: { items: [], total: 0 } });
    }) as any);

    renderWithProviders(<EmployeeDashboard />, {
      preloadedState: {
        auth: {
          user: mockEmployee,
          token: 'emp-token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Work on Sep 5')).toBeInTheDocument();
    });

    // Assert that the five most recent are displayed
    expect(screen.getByText('Work on Sep 5')).toBeInTheDocument();
    expect(screen.getByText('Work on Sep 7')).toBeInTheDocument();
    expect(screen.getByText('Work on Sep 9')).toBeInTheDocument();
    expect(screen.getByText('Work on Sep 11')).toBeInTheDocument();
    expect(screen.getByText('Work on Sep 13')).toBeInTheDocument();

    // Assert that older records (Sep 1, Sep 3) are NOT displayed
    expect(screen.queryByText('Work on Sep 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Work on Sep 3')).not.toBeInTheDocument();

    // Assert strict ascending chronological order
    const renderedSummaries = screen
      .getAllByText(/Work on Sep \d+/)
      .map((el) => el.textContent?.trim());

    expect(renderedSummaries).toEqual([
      'Work on Sep 5',
      'Work on Sep 7',
      'Work on Sep 9',
      'Work on Sep 11',
      'Work on Sep 13',
    ]);
  });

  // F. Active tasks — ascending order
  it('F: My Active Task List — displays tasks in ascending order by assigned_at with stable secondary sorting', async () => {
    const taskAssignments = [
      {
        assignment_id: 'asgn-c',
        task_id: 't-3',
        task_code: 'TSK-003',
        task_title: 'Task C Gamma',
        status: 'active',
        completion_percentage: 40,
        assigned_at: '2026-09-10T09:00:00Z',
      },
      {
        assignment_id: 'asgn-a',
        task_id: 't-1',
        task_code: 'TSK-001',
        task_title: 'Task A Alpha',
        status: 'active',
        completion_percentage: 10,
        assigned_at: '2026-09-01T09:00:00Z',
      },
      {
        assignment_id: 'asgn-b',
        task_id: 't-2',
        task_code: 'TSK-002',
        task_title: 'Task B Beta',
        status: 'active',
        completion_percentage: 25,
        assigned_at: '2026-09-05T09:00:00Z',
      },
      {
        // Equal assigned_at to test secondary tiebreaker (assignment_id ASC)
        assignment_id: 'asgn-d2',
        task_id: 't-5',
        task_code: 'TSK-005',
        task_title: 'Task D2 Delta',
        status: 'active',
        completion_percentage: 0,
        assigned_at: '2026-09-12T09:00:00Z',
      },
      {
        assignment_id: 'asgn-d1',
        task_id: 't-4',
        task_code: 'TSK-004',
        task_title: 'Task D1 Delta',
        status: 'active',
        completion_percentage: 0,
        assigned_at: '2026-09-12T09:00:00Z',
      },
    ];

    vi.spyOn(api, 'getPaginated').mockImplementation(((url: string) => {
      if (url === '/task-assignments') {
        return Promise.resolve({
          success: true,
          data: {
            items: taskAssignments,
            total: taskAssignments.length,
            page: 1,
            page_size: 100,
            total_pages: 1,
          },
        });
      }
      return Promise.resolve({
        success: true,
        data: { items: [], total: 0, page: 1, page_size: 5, total_pages: 1 },
      });
    }) as any);

    renderWithProviders(<EmployeeDashboard />, {
      preloadedState: {
        auth: {
          user: mockEmployee,
          token: 'emp-token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });

    await waitFor(() => {
      expect(screen.getByText('My Active Task List')).toBeInTheDocument();
    });

    const activeCard = screen.getByText('My Active Task List').closest<HTMLElement>('.bg-white')!;
    await waitFor(() => {
      expect(within(activeCard).getByText('Task A Alpha')).toBeInTheDocument();
    });

    // Extract all task titles within My Active Task List
    const taskTitles = within(activeCard)
      .getAllByText(/Task (A Alpha|B Beta|C Gamma|D1 Delta|D2 Delta)/)
      .map((el) => el.textContent?.trim());

    // Oldest assignment first (Sep 1 -> Sep 5 -> Sep 10 -> Sep 12 asgn-d1 -> Sep 12 asgn-d2)
    expect(taskTitles).toEqual([
      'Task A Alpha',
      'Task B Beta',
      'Task C Gamma',
      'Task D1 Delta',
      'Task D2 Delta',
    ]);
  });

  // G. Existing filtering
  it('G: Existing filtering — only qualifying active tasks are displayed in My Active Task List', async () => {
    const candidateTasks = [
      {
        assignment_id: 'q-1',
        task_id: 't-1',
        task_code: 'TSK-101',
        task_title: 'Qualifying Pending Task',
        status: 'active',
        completion_percentage: 0,
        assigned_at: '2026-09-01T09:00:00Z',
      },
      {
        assignment_id: 'q-2',
        task_id: 't-2',
        task_code: 'TSK-102',
        task_title: 'Qualifying In Progress Task',
        status: 'active',
        completion_percentage: 50,
        assigned_at: '2026-09-02T09:00:00Z',
      },
      {
        assignment_id: 'nq-1',
        task_id: 't-3',
        task_code: 'TSK-103',
        task_title: 'Completed Task Not Displayed',
        status: 'completed',
        completion_percentage: 100,
        assigned_at: '2026-09-03T09:00:00Z',
      },
      {
        assignment_id: 'nq-2',
        task_id: 't-4',
        task_code: 'TSK-104',
        task_title: 'Dropped Task Not Displayed',
        status: 'dropped',
        completion_percentage: 20,
        assigned_at: '2026-09-04T09:00:00Z',
      },
      {
        assignment_id: 'nq-3',
        task_id: 't-5',
        task_code: 'TSK-105',
        task_title: 'Cancelled Task Not Displayed',
        status: 'active',
        task_status: 'cancelled',
        completion_percentage: 30,
        assigned_at: '2026-09-05T09:00:00Z',
      },
    ];

    vi.spyOn(api, 'getPaginated').mockImplementation(((url: string) => {
      if (url === '/task-assignments') {
        return Promise.resolve({
          success: true,
          data: {
            items: candidateTasks,
            total: candidateTasks.length,
            page: 1,
            page_size: 100,
            total_pages: 1,
          },
        });
      }
      return Promise.resolve({
        success: true,
        data: { items: [], total: 0, page: 1, page_size: 5, total_pages: 1 },
      });
    }) as any);

    renderWithProviders(<EmployeeDashboard />, {
      preloadedState: {
        auth: {
          user: mockEmployee,
          token: 'emp-token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });

    await waitFor(() => {
      expect(screen.getByText('My Active Task List')).toBeInTheDocument();
    });

    const activeCard = screen.getByText('My Active Task List').closest<HTMLElement>('.bg-white')!;
    await waitFor(() => {
      expect(within(activeCard).getByText('Qualifying Pending Task')).toBeInTheDocument();
    });

    expect(within(activeCard).getByText('Qualifying Pending Task')).toBeInTheDocument();
    expect(within(activeCard).getByText('Qualifying In Progress Task')).toBeInTheDocument();

    // Non-qualifying tasks must NOT appear in the active task list
    expect(within(activeCard).queryByText('Completed Task Not Displayed')).not.toBeInTheDocument();
    expect(within(activeCard).queryByText('Dropped Task Not Displayed')).not.toBeInTheDocument();
    expect(within(activeCard).queryByText('Cancelled Task Not Displayed')).not.toBeInTheDocument();
  });
});


