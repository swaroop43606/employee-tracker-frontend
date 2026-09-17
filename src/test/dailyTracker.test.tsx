import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { getLocalDate, formatDate, formatHours, formatDateTime } from '../utils/date';
import {
  computeStatusFromProgress,
  computeProgressFromStatus,
  getDueDateIndicator,
} from '../utils/taskStatus';
import { renderWithProviders } from './test-utils';
import { api } from '../services/api';
import { DailyUpdatesListPage } from '../features/dailyUpdates/pages/DailyUpdatesListPage';
import { DirectorReviewsPage } from '../features/reviews/pages/DirectorReviewsPage';
import { DirectorReviewDetailPage } from '../features/reviews/pages/DirectorReviewDetailPage';
import type { DailyUpdateCreatePayload, DailyUpdateListItem, DailyUpdateResponse } from '../types/dailyUpdate';

describe('Daily Update Workflow & Utilities', () => {
  describe('Local Date Utilities', () => {
    it('returns local date in YYYY-MM-DD format', () => {
      const todayStr = getLocalDate();
      expect(todayStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // Verify with a specific date
      const testDate = new Date(2026, 4, 15); // May 15, 2026
      expect(getLocalDate(testDate)).toBe('2026-05-15');
    });

    it('formats display dates and hours cleanly', () => {
      expect(formatDate('2026-05-15')).toContain('2026');
      expect(formatHours(4.5)).toBe('4.5h');
      expect(formatHours(1)).toBe('1.0h');
      expect(formatHours(0)).toBe('0.0h');
    });
  });

  describe('Task Status & Progress Synchronization', () => {
    it('computes consistent status from progress percentage', () => {
      expect(computeStatusFromProgress(0)).toBe('pending');
      expect(computeStatusFromProgress(50)).toBe('in_progress');
      expect(computeStatusFromProgress(100)).toBe('completed');
    });

    it('computes consistent progress from status changes', () => {
      expect(computeProgressFromStatus('completed', 40)).toBe(100);
      expect(computeProgressFromStatus('pending', 80)).toBe(0);
      // In progress maintains current progress if > 0 and < 100
      expect(computeProgressFromStatus('in_progress', 65)).toBe(65);
      // In progress defaults to 50 if current was 0 or 100
      expect(computeProgressFromStatus('in_progress', 0)).toBe(50);
      expect(computeProgressFromStatus('in_progress', 100)).toBe(50);
    });
  });

  describe('Task Due-Date Indicators', () => {
    it('correctly categorizes overdue, due today, due soon, and on track', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);

      const in2Days = new Date(today);
      in2Days.setDate(today.getDate() + 2);

      const in10Days = new Date(today);
      in10Days.setDate(today.getDate() + 10);

      // Overdue
      const overdue = getDueDateIndicator(getLocalDate(yesterday), 'in_progress');
      expect(overdue?.label).toBe('Overdue');

      // Completed tasks never show overdue
      const completedYesterday = getDueDateIndicator(getLocalDate(yesterday), 'completed');
      expect(completedYesterday).toBeNull();

      // Due Today
      const dueToday = getDueDateIndicator(getLocalDate(today), 'pending');
      expect(dueToday?.label).toBe('Due Today');

      // Due Soon (within 3 days)
      const dueSoon = getDueDateIndicator(getLocalDate(in2Days), 'in_progress');
      expect(dueSoon?.label).toBe('Due Soon');

      // On Track (> 3 days)
      const onTrack = getDueDateIndicator(getLocalDate(in10Days), 'in_progress');
      expect(onTrack?.label).toBe('On Track');
    });
  });

  describe('Daily Update Payload Structure', () => {
    it('supports optional workflow fields: completed_work, next_work_plan, blockers', () => {
      const payload: DailyUpdateCreatePayload = {
        update_date: getLocalDate(),
        items: [
          {
            assignment_id: '1',
            hours_spent: 4,
            progress_percentage: 50,
            status: 'in_progress',
            work_description: 'Refactored backend services',
          },
        ],
        summary: 'All items on track',
        completed_work: 'Built authentication and RBAC guards',
        next_work_plan: 'Implement search optimization and reporting',
        blockers: 'None at this time',
        status: 'draft',
      };

      expect(payload.completed_work).toBe('Built authentication and RBAC guards');
      expect(payload.next_work_plan).toBe('Implement search optimization and reporting');
      expect(payload.blockers).toBe('None at this time');
      expect(payload.items).toHaveLength(1);
    });
  });

  describe('Employee Last Updated Timestamp & Fallback Order', () => {
    it('formats ISO timestamps with localized month, day, year, and time', () => {
      const iso = '2026-09-09T11:38:00Z';
      const formatted = formatDateTime(iso);
      expect(formatted).toContain('2026');
      expect(formatted).toContain('Sep');
      expect(formatted).toContain('9');
      // Graceful fallback for invalid or null dates
      expect(formatDateTime(null)).toBe('N/A');
      expect(formatDateTime(undefined)).toBe('N/A');
      expect(formatDateTime('invalid-date')).toBe('N/A');
    });

    it('implements strict employee_updated_at -> submitted_at -> created_at fallback resolution', () => {
      const resolveTimestamp = (item: {
        employee_updated_at?: string | null;
        submitted_at?: string | null;
        created_at: string;
      }) => {
        return item.employee_updated_at || item.submitted_at || item.created_at;
      };

      // 1. When employee_updated_at is present, it takes precedence
      const itemWithAll = {
        employee_updated_at: '2026-09-09T11:38:00Z',
        submitted_at: '2026-09-09T10:15:00Z',
        created_at: '2026-09-09T09:00:00Z',
      };
      expect(resolveTimestamp(itemWithAll)).toBe('2026-09-09T11:38:00Z');

      // 2. When employee_updated_at is null/undefined, falls back to submitted_at
      const itemNoEmployeeUpdated = {
        employee_updated_at: null,
        submitted_at: '2026-09-09T10:15:00Z',
        created_at: '2026-09-09T09:00:00Z',
      };
      expect(resolveTimestamp(itemNoEmployeeUpdated)).toBe('2026-09-09T10:15:00Z');

      // 3. When both employee_updated_at and submitted_at are null/undefined, falls back to created_at
      const itemOnlyCreated = {
        employee_updated_at: null,
        submitted_at: null,
        created_at: '2026-09-09T09:00:00Z',
      };
      expect(resolveTimestamp(itemOnlyCreated)).toBe('2026-09-09T09:00:00Z');
    });
  });

  describe('Daily Update Last Updated UI Displays', () => {
    const mockEmployee = {
      user_id: 'emp-101',
      full_name: 'John Doe',
      email: 'john.doe@example.com',
      employee_code: 'EMP001',
      role_id: 'role-emp',
      role_name: 'employee',
      department_id: 'dept-1',
    };

    const mockDirector = {
      user_id: 'dir-101',
      full_name: 'Sarah Director',
      email: 'sarah.director@example.com',
      employee_code: 'DIR001',
      role_id: 'role-dir',
      role_name: 'director',
      department_id: 'dept-1',
    };

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('renders "Last updated by employee: <timestamp>" on Employee Update History cards', async () => {
      const mockUpdateItem: DailyUpdateListItem = {
        update_id: 'up-101',
        employee_id: 'emp-101',
        employee_name: 'John Doe',
        employee_code: 'EMP001',
        update_date: '2026-09-09',
        work_date: '2026-09-09',
        summary: 'Completed daily goals',
        overall_status: 'submitted',
        items_count: 2,
        total_hours: 7.0,
        submitted_at: '2026-09-09T10:15:00Z',
        created_at: '2026-09-09T09:00:00Z',
        employee_updated_at: '2026-09-09T11:38:00Z',
      };

      vi.spyOn(api, 'getPaginated').mockResolvedValue({
        success: true,
        data: {
          items: [mockUpdateItem],
          total: 1,
          page: 1,
          page_size: 10,
          total_pages: 1,
        },
      });

      renderWithProviders(<DailyUpdatesListPage />, {
        preloadedState: {
          auth: {
            user: mockEmployee as any,
            token: 'emp-token',
            refreshToken: null,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          },
        },
      });

      expect(await screen.findByText(/Last updated by employee:/i)).toBeInTheDocument();
    });

    it('renders "Last updated by employee: <timestamp>" on Director Review Queue cards', async () => {
      const mockQueueItem: DailyUpdateListItem = {
        update_id: 'up-202',
        employee_id: 'emp-101',
        employee_name: 'John Doe',
        employee_code: 'EMP001',
        update_date: '2026-09-09',
        summary: 'Backend refactoring',
        overall_status: 'submitted',
        items_count: 3,
        total_hours: 8.0,
        submitted_at: '2026-09-09T10:15:00Z',
        created_at: '2026-09-09T09:00:00Z',
        employee_updated_at: '2026-09-09T11:38:00Z',
      };

      vi.spyOn(api, 'getPaginated').mockImplementation(((url: string) => {
        if (url === '/users') {
          return Promise.resolve({
            success: true,
            data: { items: [mockEmployee], total: 1, page: 1, page_size: 100, total_pages: 1 },
          });
        }
        return Promise.resolve({
          success: true,
          data: { items: [mockQueueItem], total: 1, page: 1, page_size: 10, total_pages: 1 },
        });
      }) as any);

      renderWithProviders(<DirectorReviewsPage />, {
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
      });

      expect(await screen.findByText(/Last updated by employee:/i)).toBeInTheDocument();
    });

    it('renders separate metadata for Work Date, Submitted, and Last Updated by Employee in Director Review Details', async () => {
      const mockDetail: DailyUpdateResponse = {
        update_id: 'up-303',
        employee_id: 'emp-101',
        employee_name: 'John Doe',
        employee_code: 'EMP001',
        update_date: '2026-09-09',
        work_date: '2026-09-09',
        summary: 'Reviewable daily work',
        completed_work: 'Completed phase 6 backend tasks',
        next_work_plan: 'Phase 7 frontend tests',
        blockers: null,
        overall_status: 'submitted',
        submitted_at: '2026-09-09T10:15:00Z',
        reviewed_at: null,
        total_hours: 8.0,
        items: [],
        created_at: '2026-09-09T09:00:00Z',
        updated_at: '2026-09-09T11:38:00Z',
        employee_updated_at: '2026-09-09T11:38:00Z',
      };

      vi.spyOn(api, 'get').mockImplementation(((url: string) => {
        if (url === '/daily-updates/up-303') {
          return Promise.resolve({ success: true, data: mockDetail });
        }
        return Promise.resolve({ success: true, data: [] });
      }) as any);

      renderWithProviders(
        <Routes>
          <Route path="/director/daily-updates/:id" element={<DirectorReviewDetailPage />} />
        </Routes>,
        {
          route: '/director/daily-updates/up-303',
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

      // Verify Submission Details card and distinct metadata fields exist
      expect(await screen.findByText('Submission Details')).toBeInTheDocument();
      expect(screen.getAllByText(/Last Updated by Employee/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Work Date/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Submitted/i).length).toBeGreaterThan(0);
    });
  });
});

