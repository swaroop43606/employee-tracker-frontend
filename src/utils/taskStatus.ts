/**
 * Task Status & Due Date Utilities
 * Computes clear visual status indicators based on due dates and completion state.
 */
import { getLocalDate } from './date';

export type DueIndicatorType = 'overdue' | 'due_today' | 'due_soon' | 'on_track';

export interface DueIndicatorInfo {
  type: DueIndicatorType;
  label: string;
  badgeVariant: 'danger' | 'warning' | 'info' | 'success';
  className: string;
}

/**
 * Returns a due date indicator for active tasks.
 * Completed, cancelled, or dropped tasks return null so they are never marked overdue.
 */
export const getDueDateIndicator = (
  dueDate: string | null | undefined,
  taskStatus?: string | null,
  completionPercentage?: number | null
): DueIndicatorInfo | null => {
  if (!dueDate) return null;

  const normalizedStatus = (taskStatus || '').toLowerCase();
  const isCompleted = normalizedStatus === 'completed' || completionPercentage === 100;
  if (isCompleted || normalizedStatus === 'dropped' || normalizedStatus === 'cancelled') {
    return null;
  }

  const todayStr = getLocalDate();
  const dueStr = dueDate.split('T')[0];

  if (dueStr < todayStr) {
    return {
      type: 'overdue',
      label: 'Overdue',
      badgeVariant: 'danger',
      className: 'bg-rose-100 text-rose-800 border-rose-200',
    };
  }

  if (dueStr === todayStr) {
    return {
      type: 'due_today',
      label: 'Due Today',
      badgeVariant: 'warning',
      className: 'bg-amber-100 text-amber-800 border-amber-200',
    };
  }

  // Calculate days remaining
  const [tY, tM, tD] = todayStr.split('-').map(Number);
  const [dY, dM, dD] = dueStr.split('-').map(Number);
  const todayDate = new Date(tY, tM - 1, tD);
  const targetDate = new Date(dY, dM - 1, dD);
  const diffTime = targetDate.getTime() - todayDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays > 0 && diffDays <= 3) {
    return {
      type: 'due_soon',
      label: 'Due Soon',
      badgeVariant: 'warning',
      className: 'bg-orange-100 text-orange-800 border-orange-200',
    };
  }

  return {
    type: 'on_track',
    label: 'On Track',
    badgeVariant: 'success',
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  };
};

/**
 * Computes status based on progress percentage.
 */
export const computeStatusFromProgress = (progress: number): 'pending' | 'in_progress' | 'completed' => {
  if (progress <= 0) return 'pending';
  if (progress >= 100) return 'completed';
  return 'in_progress';
};

/**
 * Computes progress based on status change.
 */
export const computeProgressFromStatus = (
  newStatus: string,
  currentProgress: number = 0
): number => {
  const norm = newStatus.toLowerCase();
  if (norm === 'completed') return 100;
  if (norm === 'pending') return 0;
  if (norm === 'in_progress') {
    return currentProgress > 0 && currentProgress < 100 ? currentProgress : 50;
  }
  return currentProgress;
};
