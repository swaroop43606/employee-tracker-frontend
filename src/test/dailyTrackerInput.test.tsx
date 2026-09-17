import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders } from './test-utils';
import { DailyTrackerPage } from '../features/dailyUpdates/pages/DailyTrackerPage';
import { api } from '../services/api';
import type { CurrentUser } from '../types/user';
import type { TaskAssignmentResponse } from '../types/task';
import type { DailyUpdateResponse } from '../types/dailyUpdate';

const mockEmployee: CurrentUser = {
  user_id: 'emp-101',
  full_name: 'John Doe',
  email: 'john.doe@example.com',
  employee_code: 'EMP001',
  role_id: 'role-3',
  role_name: 'employee',
  department_id: 'dept-1',
};

const mockAssignment: TaskAssignmentResponse = {
  assignment_id: 'asgn-101',
  task_id: 'task-101',
  task_code: 'TSK-001',
  task_title: 'Refactor Core Components',
  task_priority: 'medium',
  employee_id: 'emp-101',
  employee_name: 'John Doe',
  employee_code: 'EMP001',
  assigned_by: 'dir-1',
  assigned_by_name: 'Director Jane',
  assigned_at: '2026-09-01T09:00:00Z',
  start_date: '2026-09-01',
  due_date: '2026-09-30',
  completion_percentage: 0,
  status: 'active',
  employee_notes: null,
  completed_at: null,
};

describe('Employee Workspace → Upload Daily Tracker Task Update Form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupPageWithTaskSelected = async () => {
    vi.spyOn(api, 'getPaginated').mockImplementation(async (url: string) => {
      if (url === '/task-assignments') {
        return {
          success: true,
          data: {
            items: [mockAssignment],
            total: 1,
            page: 1,
            page_size: 100,
            total_pages: 1,
          },
          message: 'OK',
        };
      }
      return { success: true, data: { items: [], total: 0, page: 1, page_size: 10, total_pages: 1 }, message: 'OK' };
    });

    vi.spyOn(api, 'get').mockImplementation(async () => {
      // 404 means no update exists for today yet
      const error: any = new Error('Not found');
      error.response = { status: 404, data: { detail: 'Daily update not found' } };
      throw error;
    });

    renderWithProviders(<DailyTrackerPage />, {
      route: '/employee/daily-update',
      preloadedState: {
        auth: {
          user: mockEmployee,
          token: 'token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        } as any,
      },
    });

    // Wait for task to be rendered in "Tasks Worked On Today"
    const taskButton = await screen.findByRole('button', { name: /Refactor Core Components/i });
    expect(taskButton).toBeInTheDocument();

    // Select the task
    fireEvent.click(taskButton);

    // Verify task update form section is displayed
    await waitFor(() => {
      expect(screen.getByText(/LOG DETAILS FOR SELECTED TASKS/i)).toBeInTheDocument();
    });

    const hoursInput = screen.getByLabelText(/HOURS SPENT/i) || screen.getByRole('spinbutton', { name: /hours spent/i });
    // Find Task Progress input
    const progressInput = screen.getByLabelText(/TASK PROGRESS \(%\)/i) || screen.getByRole('spinbutton', { name: /task progress/i });

    return { hoursInput, progressInput };
  };

  // 1. Hours Spent initially displays 0.
  it('1. Hours Spent initially displays 0', async () => {
    const { hoursInput } = await setupPageWithTaskSelected();
    expect(hoursInput).toHaveValue(0);
  });

  // 2 & 3. User can clear Hours Spent and type a new value (0 → Backspace → 4)
  it('2 & 3. User can clear Hours Spent and type a new value (0 → Backspace → 4)', async () => {
    const { hoursInput } = await setupPageWithTaskSelected();

    // User clears 0 with Backspace
    fireEvent.change(hoursInput, { target: { value: '' } });
    expect(hoursInput).toHaveValue(null);

    // User types 4
    fireEvent.change(hoursInput, { target: { value: '4' } });
    expect(hoursInput).toHaveValue(4);
  });

  // 4. User can enter decimal Hours Spent (e.g. 2.5)
  it('4. User can enter decimal Hours Spent (e.g. 2.5)', async () => {
    const { hoursInput } = await setupPageWithTaskSelected();

    fireEvent.change(hoursInput, { target: { value: '' } });
    fireEvent.change(hoursInput, { target: { value: '2.5' } });
    expect(hoursInput).toHaveValue(2.5);
  });

  // 5. Task Progress initially displays 0.
  it('5. Task Progress initially displays 0', async () => {
    const { progressInput } = await setupPageWithTaskSelected();
    expect(progressInput).toHaveValue(0);
  });

  // 6 & 7. User can clear Task Progress and type a new progress value (0 → Backspace → 50)
  it('6 & 7. User can clear Task Progress and type a new progress value (0 → Backspace → 50)', async () => {
    const { progressInput } = await setupPageWithTaskSelected();

    // User clears 0 with Backspace
    fireEvent.change(progressInput, { target: { value: '' } });
    expect(progressInput).toHaveValue(null);

    // User types 50
    fireEvent.change(progressInput, { target: { value: '50' } });
    expect(progressInput).toHaveValue(50);
  });

  // 8 & 9. Progress 0 remains valid and Progress 100 remains valid
  it('8 & 9. Progress 0 remains valid and Progress 100 remains valid upon submission', async () => {
    const { hoursInput, progressInput } = await setupPageWithTaskSelected();

    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({
      success: true,
      data: {
        update_id: 'new-up-1',
        employee_id: 'emp-101',
        update_date: '2026-09-16',
        work_date: '2026-09-16',
        status: 'draft',
        overall_status: 'draft',
        items: [],
      } as any,
      message: 'Draft saved',
    });

    const patchSpy = vi.spyOn(api, 'patch').mockResolvedValue({
      success: true,
      data: {
        update_id: 'new-up-1',
        employee_id: 'emp-101',
        update_date: '2026-09-16',
        work_date: '2026-09-16',
        status: 'draft',
        overall_status: 'draft',
        items: [],
      } as any,
      message: 'Draft patched',
    });

    // Test Progress 0
    fireEvent.change(hoursInput, { target: { value: '3' } });
    fireEvent.change(progressInput, { target: { value: '0' } });

    const saveDraftBtn = screen.getByRole('button', { name: /Save as Draft/i });
    fireEvent.click(saveDraftBtn);

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalled();
    });
    expect((postSpy.mock.calls[0][1] as any).items[0].progress_percentage).toBe(0);

    // Test Progress 100 (now updates existing draft via patch)
    fireEvent.change(progressInput, { target: { value: '100' } });
    fireEvent.click(saveDraftBtn);

    await waitFor(() => {
      expect(patchSpy).toHaveBeenCalled();
    });
    expect((patchSpy.mock.calls[0][1] as any).items[0].progress_percentage).toBe(100);
  });

  // 10. Progress greater than 100 is rejected
  it('10. Progress greater than 100 is rejected according to validation', async () => {
    const { hoursInput, progressInput } = await setupPageWithTaskSelected();

    const postSpy = vi.spyOn(api, 'post');

    fireEvent.change(hoursInput, { target: { value: '4' } });
    fireEvent.change(progressInput, { target: { value: '105' } });

    const saveDraftBtn = screen.getByRole('button', { name: /Save as Draft/i });
    fireEvent.click(saveDraftBtn);

    await waitFor(() => {
      expect(screen.getByText(/Task progress for .* must be between 0 and 100/i)).toBeInTheDocument();
    });

    expect(postSpy).not.toHaveBeenCalled();
  });

  // 11. Negative values are rejected according to validation
  it('11. Negative values are rejected according to validation', async () => {
    const { hoursInput, progressInput } = await setupPageWithTaskSelected();

    const postSpy = vi.spyOn(api, 'post');

    // Negative hours
    fireEvent.change(hoursInput, { target: { value: '-2' } });
    fireEvent.change(progressInput, { target: { value: '50' } });

    const saveDraftBtn = screen.getByRole('button', { name: /Save as Draft/i });
    fireEvent.click(saveDraftBtn);

    await waitFor(() => {
      expect(screen.getByText(/Hours spent for .* cannot be negative/i)).toBeInTheDocument();
    });
    expect(postSpy).not.toHaveBeenCalled();

    // Negative progress
    fireEvent.change(hoursInput, { target: { value: '2' } });
    fireEvent.change(progressInput, { target: { value: '-10' } });
    fireEvent.click(saveDraftBtn);

    await waitFor(() => {
      expect(screen.getByText(/Task progress for .* must be between 0 and 100/i)).toBeInTheDocument();
    });
    expect(postSpy).not.toHaveBeenCalled();
  });

  // 12. Empty required values show validation error instead of being silently converted to 0
  it('12. Empty required values show validation error instead of being silently converted to 0', async () => {
    const { hoursInput, progressInput } = await setupPageWithTaskSelected();

    const postSpy = vi.spyOn(api, 'post');

    // Clear Hours Spent and leave empty
    fireEvent.change(hoursInput, { target: { value: '' } });
    fireEvent.change(progressInput, { target: { value: '25' } });

    const submitBtn = screen.getByRole('button', { name: /Submit Daily Update/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Please enter hours spent for/i)).toBeInTheDocument();
    });
    expect(postSpy).not.toHaveBeenCalled();

    // Now fill hours and clear progress
    fireEvent.change(hoursInput, { target: { value: '4' } });
    fireEvent.change(progressInput, { target: { value: '' } });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Please enter task progress percentage for/i)).toBeInTheDocument();
    });
    expect(postSpy).not.toHaveBeenCalled();
  });

  // 13. Existing task update submission continues to work
  it('13. Existing task update submission continues to work with valid values', async () => {
    const { hoursInput, progressInput } = await setupPageWithTaskSelected();

    const postSpy = vi.spyOn(api, 'post').mockImplementation(async (url: string) => {
      if (url === '/daily-updates') {
        return {
          success: true,
          data: {
            update_id: 'new-up-2',
            employee_id: 'emp-101',
            update_date: '2026-09-16',
            work_date: '2026-09-16',
            status: 'draft',
            overall_status: 'draft',
            items: [],
          } as any,
          message: 'Created draft',
        };
      }
      if (url === '/daily-updates/new-up-2/submit') {
        return {
          success: true,
          data: {
            update_id: 'new-up-2',
            employee_id: 'emp-101',
            update_date: '2026-09-16',
            work_date: '2026-09-16',
            status: 'submitted',
            overall_status: 'submitted',
            items: [],
          } as any,
          message: 'Submitted',
        };
      }
      return { success: true, data: null, message: 'OK' };
    });

    fireEvent.change(hoursInput, { target: { value: '6.5' } });
    fireEvent.change(progressInput, { target: { value: '75' } });

    const submitBtn = screen.getByRole('button', { name: /Submit Daily Update/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith(
        '/daily-updates',
        expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({
              assignment_id: 'asgn-101',
              hours_spent: 6.5,
              progress_percentage: 75,
            }),
          ]),
        })
      );
    });
  });

  // 14. Existing Daily Tracker functionality is not affected (loads existing update data)
  it('14. Existing Daily Tracker functionality is not affected and loads existing update data', async () => {
    const existingUpdate: DailyUpdateResponse = {
      update_id: 'up-existing-1',
      employee_id: 'emp-101',
      employee_name: 'John Doe',
      employee_code: 'EMP001',
      work_date: '2026-09-16',
      update_date: '2026-09-16',
      summary: 'Today summary remarks',
      completed_work: 'Done authentication',
      next_work_plan: 'Review code',
      blockers: 'None',
      overall_status: 'draft',
      submitted_at: null,
      reviewed_at: null,
      total_hours: 5,
      items: [
        {
          item_id: 'item-1',
          update_id: 'up-existing-1',
          assignment_id: 'asgn-101',
          task_id: 'task-101',
          task_code: 'TSK-001',
          task_title: 'Refactor Core Components',
          task_due_date: '2026-09-30',
          work_description: 'Implemented updates',
          hours_spent: 5,
          progress_percentage: 60,
          status: 'in_progress',
        },
      ],
      created_at: '2026-09-16T09:00:00Z',
      updated_at: '2026-09-16T10:00:00Z',
    };

    vi.spyOn(api, 'getPaginated').mockResolvedValue({
      success: true,
      data: {
        items: [mockAssignment],
        total: 1,
        page: 1,
        page_size: 100,
        total_pages: 1,
      },
      message: 'OK',
    });

    vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
      if (url.startsWith('/daily-updates/date/')) {
        return { success: true, data: existingUpdate, message: 'OK' };
      }
      return { success: true, data: [], message: 'OK' };
    });

    renderWithProviders(<DailyTrackerPage />, {
      route: '/employee/daily-update',
      preloadedState: {
        auth: {
          user: mockEmployee,
          token: 'token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        } as any,
      },
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Today summary remarks')).toBeInTheDocument();
    });

    const hoursInput = await screen.findByDisplayValue('5');
    const progressInput = await screen.findByDisplayValue('60');

    expect(hoursInput).toBeInTheDocument();
    expect(progressInput).toBeInTheDocument();
  });
});
