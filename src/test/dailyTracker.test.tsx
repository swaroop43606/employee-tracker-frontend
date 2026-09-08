import { describe, it, expect } from 'vitest';
import { getLocalDate, formatDate, formatHours } from '../utils/date';
import {
  computeStatusFromProgress,
  computeProgressFromStatus,
  getDueDateIndicator,
} from '../utils/taskStatus';
import type { DailyUpdateCreatePayload } from '../types/dailyUpdate';

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
});
