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

export type TaskLifecycleStatus = 'pending' | 'in_progress' | 'completed' | 'dropped' | 'cancelled';

/**
 * Normalizes any task status string or variant to standard lowercase format.
 */
export const normalizeStatusString = (status?: string | null): string => {
  if (!status) return '';
  return status.trim().toLowerCase().replace(/[-\s]+/g, '_');
};

/**
 * Determines the single canonical lifecycle status for a task assignment.
 * Considers assignment status, completion percentage, and parent task status.
 */
export const getAssignmentLifecycleStatus = (
  assignment: {
    status?: string | null;
    completion_percentage?: number | null;
    task_status?: string | null;
  }
): TaskLifecycleStatus => {
  const normAssignStatus = normalizeStatusString(assignment.status);
  const normTaskStatus = normalizeStatusString(assignment.task_status);

  if (normTaskStatus === 'cancelled') {
    return 'cancelled';
  }
  if (normAssignStatus === 'dropped') {
    return 'dropped';
  }
  const progress = Number(assignment.completion_percentage ?? 0);
  if (normAssignStatus === 'completed' || progress >= 100) {
    return 'completed';
  }
  if (progress > 0 && progress < 100) {
    return 'in_progress';
  }
  return 'pending';
};

/**
 * Checks whether a task assignment matches a given status filter.
 */
export const matchesStatusFilter = (
  assignment: {
    status?: string | null;
    completion_percentage?: number | null;
    task_status?: string | null;
  },
  filter: string
): boolean => {
  const normFilter = normalizeStatusString(filter);
  if (!normFilter || normFilter === 'all') {
    // "All" visible tasks excludes dropped and cancelled
    const lifecycle = getAssignmentLifecycleStatus(assignment);
    return lifecycle !== 'dropped' && lifecycle !== 'cancelled';
  }

  if (normFilter === 'active') {
    const lifecycle = getAssignmentLifecycleStatus(assignment);
    return lifecycle === 'pending' || lifecycle === 'in_progress';
  }

  const lifecycle = getAssignmentLifecycleStatus(assignment);
  return lifecycle === normFilter;
};

export interface TaskLifecycleMetrics {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  dropped: number;
  cancelled: number;
}

/**
 * Computes centralized, consistent lifecycle metrics from an array of assignments.
 */
export const calculateTaskLifecycleMetrics = (
  assignments: Array<{
    status?: string | null;
    completion_percentage?: number | null;
    task_status?: string | null;
  }>
): TaskLifecycleMetrics => {
  let pending = 0;
  let inProgress = 0;
  let completed = 0;
  let dropped = 0;
  let cancelled = 0;

  for (const a of assignments) {
    const lifecycle = getAssignmentLifecycleStatus(a);
    if (lifecycle === 'pending') pending++;
    else if (lifecycle === 'in_progress') inProgress++;
    else if (lifecycle === 'completed') completed++;
    else if (lifecycle === 'dropped') dropped++;
    else if (lifecycle === 'cancelled') cancelled++;
  }

  return {
    total: pending + inProgress + completed,
    pending,
    inProgress,
    completed,
    dropped,
    cancelled,
  };
};

