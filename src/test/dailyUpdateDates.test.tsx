import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from './test-utils';
import { DailyUpdateDetailPage } from '../features/dailyUpdates/pages/DailyUpdateDetailPage';
import { DailyUpdatesListPage } from '../features/dailyUpdates/pages/DailyUpdatesListPage';
import { DirectorReviewsPage } from '../features/reviews/pages/DirectorReviewsPage';
import { DirectorReviewDetailPage } from '../features/reviews/pages/DirectorReviewDetailPage';
import { api } from '../services/api';
import type { CurrentUser } from '../types/user';
import type { DailyUpdateResponse, DailyUpdateListItem } from '../types/dailyUpdate';

const mockEmployeeUser: CurrentUser = {
  user_id: 'emp-101',
  full_name: 'John Doe',
  email: 'john.doe@example.com',
  employee_code: 'EMP101',
  role_id: 'role-3',
  role_name: 'employee',
  department_id: 'dept-1',
};

const mockDirectorUser: CurrentUser = {
  user_id: 'dir-202',
  full_name: 'Director Jane',
  email: 'director.jane@example.com',
  employee_code: 'DIR202',
  role_id: 'role-2',
  role_name: 'director',
  department_id: 'dept-1',
};

// Section 19 Critical Regression Scenario Data
const criticalDailyUpdate: DailyUpdateResponse = {
  update_id: 'du-crit-001',
  employee_id: 'emp-101',
  employee_name: 'John Doe',
  employee_code: 'EMP101',
  work_date: '2026-09-16',
  update_date: '2026-09-16',
  summary: 'Worked on high priority feature implementation',
  completed_work: 'Completed core architecture',
  next_work_plan: 'Integration testing',
  blockers: null,
  overall_status: 'submitted',
  employee_updated_at: '2026-09-16T17:08:00',
  submitted_at: '2026-09-16T17:10:00',
  reviewed_at: null,
  created_at: '2026-09-16T09:00:00',
  updated_at: '2026-09-16T17:08:00',
  total_hours: 5.0,
  items: [
    {
      item_id: 'item-1',
      update_id: 'du-crit-001',
      assignment_id: 'asgn-1',
      task_title: 'Critical Architecture Feature',
      task_code: 'TSK-CRIT-01',
      task_due_date: '2026-10-20',
      work_description: 'Implemented backend services',
      hours_spent: 5.0,
      progress_percentage: 80.0,
      status: 'in_progress',
    },
  ],
};

const multiTaskDailyUpdate: DailyUpdateResponse = {
  update_id: 'du-multi-002',
  employee_id: 'emp-101',
  employee_name: 'John Doe',
  employee_code: 'EMP101',
  work_date: '2026-09-16',
  update_date: '2026-09-16',
  summary: 'Multi-task progress',
  completed_work: 'Work on Task A and B',
  next_work_plan: 'Review Task A',
  blockers: null,
  overall_status: 'draft',
  employee_updated_at: '2026-09-16T16:00:00',
  submitted_at: null,
  reviewed_at: null,
  created_at: '2026-09-16T09:00:00',
  updated_at: '2026-09-16T16:00:00',
  total_hours: 6.0,
  items: [
    {
      item_id: 'item-a',
      update_id: 'du-multi-002',
      assignment_id: 'asgn-a',
      task_title: 'Task Alpha',
      task_code: 'TSK-A',
      task_due_date: '2026-09-20',
      work_description: 'Alpha task work',
      hours_spent: 3.0,
      progress_percentage: 50.0,
      status: 'in_progress',
    },
    {
      item_id: 'item-b',
      update_id: 'du-multi-002',
      assignment_id: 'asgn-b',
      task_title: 'Task Beta',
      task_code: 'TSK-B',
      task_due_date: '2026-10-20',
      work_description: 'Beta task work',
      hours_spent: 3.0,
      progress_percentage: 40.0,
      status: 'in_progress',
    },
  ],
};

const reviewedCriticalUpdate: DailyUpdateResponse = {
  ...criticalDailyUpdate,
  overall_status: 'reviewed',
  reviewed_at: '2026-09-16T18:30:00',
};

const mockListItem: DailyUpdateListItem = {
  update_id: 'du-crit-001',
  employee_id: 'emp-101',
  employee_name: 'John Doe',
  employee_code: 'EMP101',
  work_date: '2026-09-16',
  update_date: '2026-09-16',
  summary: 'Worked on high priority feature implementation',
  completed_work: 'Completed core architecture',
  next_work_plan: 'Integration testing',
  blockers: null,
  overall_status: 'submitted',
  items_count: 1,
  total_hours: 5.0,
  submitted_at: '2026-09-16T17:10:00',
  created_at: '2026-09-16T09:00:00',
  employee_updated_at: '2026-09-16T17:08:00',
};

describe('Daily Update Date Integrity Regression Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1 & 2. Employee Daily Update Detail displays work_date and does NOT use task.due_date as heading
  it('1 & 2. Employee Daily Update Detail displays work_date in heading and metadata, never task.due_date', async () => {
    vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
      if (url === '/daily-updates/du-crit-001') {
        return { success: true, data: criticalDailyUpdate, message: 'OK' };
      }
      return { success: true, data: [], message: 'OK' };
    });

    renderWithProviders(
      <Routes>
        <Route path="/employee/daily-updates/:id" element={<DailyUpdateDetailPage />} />
      </Routes>,
      {
        route: '/employee/daily-updates/du-crit-001',
        preloadedState: {
          auth: { user: mockEmployeeUser, isAuthenticated: true, token: 'token' } as any,
        },
      }
    );

    await waitFor(() => {
      // Heading must contain Wednesday, September 16, 2026 (work_date)
      expect(screen.getByText(/Daily Update Log: Wednesday, September 16, 2026/i)).toBeInTheDocument();
    });

    // Heading must NOT contain October 20, 2026 (which is task.due_date)
    expect(screen.queryByText(/Daily Update Log: .*October 20, 2026/i)).not.toBeInTheDocument();

    // Work Date metadata displayed
    expect(screen.getByText(/Work Date:/i)).toBeInTheDocument();
    expect(screen.getByText('Sep 16, 2026')).toBeInTheDocument();

    // Task Due Date displayed separately for the task item
    expect(screen.getByText(/Task Due Date:/i)).toBeInTheDocument();
    expect(screen.getByText('Oct 20, 2026')).toBeInTheDocument();
  });

  // 3, 4, 5, 6. Employee history displays work_date, employee_updated_at, submitted_at, task info
  it('3, 4, 5, 6. Employee history displays work_date, employee_updated_at, and submitted_at', async () => {
    vi.spyOn(api, 'getPaginated').mockResolvedValue({
      success: true,
      data: {
        items: [mockListItem],
        total: 1,
        page: 1,
        page_size: 10,
        total_pages: 1,
      },
      message: 'OK',
    });

    renderWithProviders(<DailyUpdatesListPage />, {
      route: '/employee/daily-updates',
      preloadedState: {
        auth: { user: mockEmployeeUser, isAuthenticated: true, token: 'token' } as any,
      },
    });

    await waitFor(() => {
      expect(screen.getByText(/Work Date:/i)).toBeInTheDocument();
    });

    // Work date shown
    expect(screen.getAllByText(/Sep 16, 2026/i).length).toBeGreaterThanOrEqual(1);
    // Employee updated timestamp shown
    expect(screen.getByText(/Last updated by employee:/i)).toBeInTheDocument();
    // Submitted timestamp shown
    expect(screen.getByText(/Submitted:/i)).toBeInTheDocument();
  });

  // 7. Director Review Queue displays work_date
  it('7. Director Review Queue displays work_date, submitted_at, and employee_updated_at', async () => {
    vi.spyOn(api, 'getPaginated').mockImplementation(async (url: string) => {
      if (url === '/users') {
        return {
          success: true,
          data: { items: [], total: 0, page: 1, page_size: 100, total_pages: 1 },
          message: 'OK',
        };
      }
      if (url === '/daily-updates') {
        return {
          success: true,
          data: {
            items: [mockListItem],
            total: 1,
            page: 1,
            page_size: 10,
            total_pages: 1,
          },
          message: 'OK',
        };
      }
      return { success: true, data: { items: [], total: 0, page: 1, page_size: 10, total_pages: 1 }, message: 'OK' };
    });

    renderWithProviders(<DirectorReviewsPage />, {
      route: '/director/daily-updates',
      preloadedState: {
        auth: { user: mockDirectorUser, isAuthenticated: true, token: 'token' } as any,
      },
    });

    await waitFor(() => {
      expect(screen.getByText(/Work Date:/i)).toBeInTheDocument();
    });

    expect(screen.getAllByText(/Sep 16, 2026/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Submitted:/i)).toBeInTheDocument();
    expect(screen.getByText(/Last updated by employee:/i)).toBeInTheDocument();
  });

  // 8, 9, 10, 11, 12. Director Review Detail displays work_date, employee_updated_at, submitted_at, task_due_date, reviewed_at separately
  it('8-12. Director Review Detail clearly separates work_date, employee_updated_at, submitted_at, task_due_date, and reviewed_at', async () => {
    vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
      if (url === '/daily-updates/du-crit-001') {
        return { success: true, data: reviewedCriticalUpdate, message: 'OK' };
      }
      if (url === '/daily-updates/du-crit-001/reviews') {
        return {
          success: true,
          data: [
            {
              review_id: 'rev-01',
              update_id: 'du-crit-001',
              reviewer_id: 'dir-202',
              reviewer_name: 'Director Jane',
              reviewer_code: 'DIR202',
              review_status: 'approved',
              review_comment: 'Approved work.',
              reviewed_at: '2026-09-16T18:30:00',
            },
          ],
          message: 'OK',
        };
      }
      return { success: true, data: [], message: 'OK' };
    });

    renderWithProviders(
      <Routes>
        <Route path="/director/daily-updates/:id" element={<DirectorReviewDetailPage />} />
      </Routes>,
      {
        route: '/director/daily-updates/du-crit-001',
        preloadedState: {
          auth: { user: mockDirectorUser, isAuthenticated: true, token: 'token' } as any,
        },
      }
    );

    await waitFor(() => {
      // 8. Log heading uses work_date
      expect(screen.getByText(/Daily Update Log: Wednesday, September 16, 2026/i)).toBeInTheDocument();
    });

    // 8. Work Date displayed
    const workDateLabels = screen.getAllByText(/Work Date/i);
    expect(workDateLabels.length).toBeGreaterThan(0);

    // 9. Employee updated timestamp displayed separately
    const empUpdatedLabels = screen.getAllByText(/Last updated by employee/i);
    expect(empUpdatedLabels.length).toBeGreaterThan(0);

    // 10. Submitted timestamp displayed separately
    const submittedLabels = screen.getAllByText(/^Submitted:?$/i);
    expect(submittedLabels.length).toBeGreaterThan(0);

    // 11. Task Due Date displayed separately for the task
    const taskDueLabels = screen.getAllByText(/Task Due Date/i);
    expect(taskDueLabels.length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Oct 20, 2026/i).length).toBeGreaterThanOrEqual(1);

    // 12. Director Reviewed timestamp displayed separately
    expect(screen.getByText(/Director Reviewed:/i)).toBeInTheDocument();
  });

  // 13 & 14. Multi-task and different task due dates do not alter work_date or Daily Update Log heading
  it('13 & 14. Multiple tasks with different due dates do not alter the Daily Update Log heading or work_date', async () => {
    vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
      if (url === '/daily-updates/du-multi-002') {
        return { success: true, data: multiTaskDailyUpdate, message: 'OK' };
      }
      return { success: true, data: [], message: 'OK' };
    });

    renderWithProviders(
      <Routes>
        <Route path="/employee/daily-updates/:id" element={<DailyUpdateDetailPage />} />
      </Routes>,
      {
        route: '/employee/daily-updates/du-multi-002',
        preloadedState: {
          auth: { user: mockEmployeeUser, isAuthenticated: true, token: 'token' } as any,
        },
      }
    );

    await waitFor(() => {
      // Heading still uses work_date (September 16, 2026)
      expect(screen.getByText(/Daily Update Log: Wednesday, September 16, 2026/i)).toBeInTheDocument();
    });

    // It should NEVER use Task A due date (Sep 20) or Task B due date (Oct 20) in heading
    expect(screen.queryByText(/Daily Update Log: .*September 20, 2026/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Daily Update Log: .*October 20, 2026/i)).not.toBeInTheDocument();

    // Both individual task due dates are rendered
    expect(screen.getByText('Sep 20, 2026')).toBeInTheDocument();
    expect(screen.getByText('Oct 20, 2026')).toBeInTheDocument();
  });
});
