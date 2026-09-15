import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders } from './test-utils';
import { DirectorDashboard } from '../features/dashboard/pages/DirectorDashboard';
import { api } from '../services/api';
import type { CurrentUser } from '../types/user';
import type { DirectorDashboardResponse } from '../types/director';

const mockDirector: CurrentUser = {
  user_id: 'dir-101',
  full_name: 'Director Boss',
  email: 'director@example.com',
  employee_code: 'DIR001',
  role_id: 'role-2',
  role_name: 'director',
  department_id: 'dept-1',
};

const mockDashboardWith3Alerts: DirectorDashboardResponse = {
  summary: {
    pending_reviews: 4,
    total_team: 8,
    active_team: 7,
    approved_logs: 15,
    open_tasks: 12,
    active_tasks: 12,
    completed_tasks: 25,
    in_progress_tasks: 7,
    overdue_tasks: 3,
  },
  alerts: {
    overdue_tasks_count: 3,
    pending_reviews_count: 4,
    missing_updates_count: 2,
    missing_employees: [
      { user_id: 'emp-1', full_name: 'Alice Smith', employee_code: 'EMP001' },
      { user_id: 'emp-2', full_name: 'Bob Jones', employee_code: 'EMP002' },
    ],
  },
  recent_activity: [
    {
      activity_id: 'act-1',
      activity_type: 'daily_update_submitted',
      title: 'Alice Smith submitted a daily update',
      description: 'Alice Smith submitted their daily work log for review.',
      employee_name: 'Alice Smith',
      timestamp: new Date().toISOString(),
      link: '/director/daily-updates/du-101',
    },
    {
      activity_id: 'act-2',
      activity_type: 'task_completed',
      title: 'Bob Jones completed a task',
      description: 'Bob Jones marked TSK-004 as completed.',
      employee_name: 'Bob Jones',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      link: '/director/tasks/tsk-104',
    },
    {
      activity_id: 'act-3',
      activity_type: 'task_assigned',
      title: 'Task assigned to Charlie Brown',
      description: 'TSK-005 was assigned to Charlie Brown.',
      employee_name: 'Director Boss',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      link: '/director/tasks/tsk-105',
    },
    {
      activity_id: 'act-4',
      activity_type: 'review_actioned',
      title: 'Review Approved',
      description: 'Director Boss approved daily update.',
      employee_name: 'Director Boss',
      timestamp: new Date(Date.now() - 10800000).toISOString(),
      link: '/director/daily-updates/du-099',
    },
    {
      activity_id: 'act-5',
      activity_type: 'comment_added',
      title: 'Alice Smith posted a comment',
      description: 'Alice Smith commented on a daily update.',
      employee_name: 'Alice Smith',
      timestamp: new Date(Date.now() - 14400000).toISOString(),
      link: '/director/daily-updates/du-101',
    },
    {
      activity_id: 'act-6',
      activity_type: 'task_updated',
      title: 'Bob Jones updated task progress',
      description: 'Bob Jones updated progress to 80%.',
      employee_name: 'Bob Jones',
      timestamp: new Date(Date.now() - 18000000).toISOString(),
      link: '/director/tasks/tsk-104',
    },
  ],
  pending_updates: [
    {
      update_id: 'du-101',
      employee_id: 'emp-1',
      employee_name: 'Alice Smith',
      employee_code: 'EMP001',
      update_date: '2026-09-09',
      summary: 'Completed frontend authentication flow',
      overall_status: 'submitted',
      total_hours: 7.5,
      items_count: 3,
      submitted_at: '2026-09-09T10:00:00Z',
      employee_updated_at: '2026-09-09T10:05:00Z',
      created_at: '2026-09-09T09:00:00Z',
    },
    {
      update_id: 'du-draft-999',
      employee_id: 'emp-2',
      employee_name: 'Bob Jones',
      employee_code: 'EMP002',
      update_date: '2026-09-09',
      summary: 'Draft update that should be excluded from pending reviews',
      overall_status: 'draft',
      total_hours: 2.0,
      items_count: 1,
      submitted_at: null,
      created_at: '2026-09-09T08:00:00Z',
    },
  ],
};

const mockDashboardWith2Alerts: DirectorDashboardResponse = {
  ...mockDashboardWith3Alerts,
  alerts: {
    overdue_tasks_count: 5,
    pending_reviews_count: 0,
    missing_updates_count: 2,
    missing_employees: [{ user_id: 'emp-1', full_name: 'Alice Smith' }],
  },
};

const mockDashboardWith1Alert: DirectorDashboardResponse = {
  ...mockDashboardWith3Alerts,
  alerts: {
    overdue_tasks_count: 4,
    pending_reviews_count: 0,
    missing_updates_count: 0,
    missing_employees: [],
  },
};

const mockDashboardAllCaughtUp: DirectorDashboardResponse = {
  summary: {
    pending_reviews: 0,
    total_team: 8,
    active_team: 8,
    approved_logs: 20,
    open_tasks: 5,
    active_tasks: 5,
    completed_tasks: 30,
    in_progress_tasks: 5,
    overdue_tasks: 0,
  },
  alerts: {
    overdue_tasks_count: 0,
    pending_reviews_count: 0,
    missing_updates_count: 0,
    missing_employees: [],
  },
  recent_activity: [],
  pending_updates: [],
};

const mockAuthState = {
  user: mockDirector,
  token: 'mock-token',
  refreshToken: 'mock-refresh',
  isAuthenticated: true as const,
  isLoading: false,
  error: null,
};

describe('Director Workspace Dashboard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders top summary metrics with updated clear terminology and mathematical consistency', async () => {
    vi.spyOn(api, 'get').mockResolvedValueOnce({
      success: true,
      data: mockDashboardWith3Alerts,
    });

    renderWithProviders(<DirectorDashboard />, {
      preloadedState: { auth: mockAuthState },
    });

    await waitFor(() => {
      expect(screen.getByText('Director Workspace: Director Boss')).toBeInTheDocument();
    });

    // Top metrics labels
    expect(screen.getByLabelText('Pending Reviews metric')).toHaveTextContent('Pending Reviews');
    expect(screen.getByLabelText('My Team metric')).toHaveTextContent('My Team');
    expect(screen.getByLabelText('Approved Updates metric')).toHaveTextContent('Approved Updates');
    expect(screen.getByLabelText('Open Tasks metric')).toHaveTextContent('Open Tasks');

    // Values within cards
    expect(screen.getByLabelText('Pending Reviews metric')).toHaveTextContent('4');
    expect(screen.getByLabelText('My Team metric')).toHaveTextContent('8');
    expect(screen.getByLabelText('Approved Updates metric')).toHaveTextContent('15');
    expect(screen.getByLabelText('Open Tasks metric')).toHaveTextContent('12');

    // Secondary information
    expect(screen.getByText('4 updates awaiting review')).toBeInTheDocument();
    expect(screen.getByText('7 active members')).toBeInTheDocument();
    expect(screen.getByText('Reviewed work logs')).toBeInTheDocument();
    expect(screen.getByText(/7 in progress • 25 completed/)).toBeInTheDocument();
  });

  it('supports clicking and keyboard navigation on top summary metric cards', async () => {
    vi.spyOn(api, 'get').mockResolvedValueOnce({
      success: true,
      data: mockDashboardWith3Alerts,
    });

    renderWithProviders(<DirectorDashboard />, {
      preloadedState: { auth: mockAuthState },
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Pending Reviews metric')).toBeInTheDocument();
    });

    const pendingCard = screen.getByLabelText('Pending Reviews metric');
    const teamCard = screen.getByLabelText('My Team metric');
    const approvedCard = screen.getByLabelText('Approved Updates metric');
    const openTasksCard = screen.getByLabelText('Open Tasks metric');

    expect(pendingCard).toBeInTheDocument();
    expect(teamCard).toBeInTheDocument();
    expect(approvedCard).toBeInTheDocument();
    expect(openTasksCard).toBeInTheDocument();

    // Keyboard navigation (Enter and Space keys)
    fireEvent.keyDown(pendingCard, { key: 'Enter', code: 'Enter' });
    fireEvent.keyDown(teamCard, { key: ' ', code: 'Space' });
    fireEvent.keyDown(approvedCard, { key: 'Enter', code: 'Enter' });
    fireEvent.keyDown(openTasksCard, { key: ' ', code: 'Space' });

    // Click
    fireEvent.click(pendingCard);
    fireEvent.click(openTasksCard);
  });

  it('renders 3-alert layout when all 3 alerts are active', async () => {
    vi.spyOn(api, 'get').mockResolvedValueOnce({
      success: true,
      data: mockDashboardWith3Alerts,
    });

    renderWithProviders(<DirectorDashboard />, {
      preloadedState: { auth: mockAuthState },
    });

    await waitFor(() => {
      expect(screen.getByText('Needs Attention')).toBeInTheDocument();
      expect(screen.getByText('Items that may require your immediate attention')).toBeInTheDocument();
    });

    expect(screen.getByText('OVERDUE TASKS')).toBeInTheDocument();
    expect(screen.getByText('PENDING REVIEWS')).toBeInTheDocument();
    expect(screen.getByText('MISSING DAILY UPDATES')).toBeInTheDocument();

    expect(screen.getByLabelText('View overdue tasks')).toBeInTheDocument();
    expect(screen.getByLabelText('View pending reviews')).toBeInTheDocument();
    expect(screen.getByLabelText('View missing daily updates')).toBeInTheDocument();
  });

  it('renders 2-alert layout when only 2 alerts are active', async () => {
    vi.spyOn(api, 'get').mockResolvedValueOnce({
      success: true,
      data: mockDashboardWith2Alerts,
    });

    renderWithProviders(<DirectorDashboard />, {
      preloadedState: { auth: mockAuthState },
    });

    await waitFor(() => {
      expect(screen.getByText('Needs Attention')).toBeInTheDocument();
    });

    expect(screen.getByText('OVERDUE TASKS')).toBeInTheDocument();
    expect(screen.getByText('MISSING DAILY UPDATES')).toBeInTheDocument();
    expect(screen.queryByText('PENDING REVIEWS')).not.toBeInTheDocument();
  });

  it('renders 1-alert compact layout when only 1 alert is active', async () => {
    vi.spyOn(api, 'get').mockResolvedValueOnce({
      success: true,
      data: mockDashboardWith1Alert,
    });

    renderWithProviders(<DirectorDashboard />, {
      preloadedState: { auth: mockAuthState },
    });

    await waitFor(() => {
      expect(screen.getByText('Needs Attention')).toBeInTheDocument();
    });

    expect(screen.getByText('OVERDUE TASKS')).toBeInTheDocument();
    expect(screen.queryByText('PENDING REVIEWS')).not.toBeInTheDocument();
    expect(screen.queryByText('MISSING DAILY UPDATES')).not.toBeInTheDocument();
  });

  it('renders compact zero-alert state when no items require attention', async () => {
    vi.spyOn(api, 'get').mockResolvedValueOnce({
      success: true,
      data: mockDashboardAllCaughtUp,
    });

    renderWithProviders(<DirectorDashboard />, {
      preloadedState: { auth: mockAuthState },
    });

    await waitFor(() => {
      expect(screen.getAllByText('✓ All caught up').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('There are no items requiring your immediate attention.')).toBeInTheDocument();
    });

    expect(screen.queryByText('OVERDUE TASKS')).not.toBeInTheDocument();
    expect(screen.queryByText('PENDING REVIEWS')).not.toBeInTheDocument();
    expect(screen.queryByText('MISSING DAILY UPDATES')).not.toBeInTheDocument();
  });

  it('supports click and keyboard navigation on alert cards', async () => {
    vi.spyOn(api, 'get').mockResolvedValueOnce({
      success: true,
      data: mockDashboardWith3Alerts,
    });

    renderWithProviders(<DirectorDashboard />, {
      preloadedState: { auth: mockAuthState },
    });

    await waitFor(() => {
      expect(screen.getByLabelText('View overdue tasks')).toBeInTheDocument();
    });

    const overdueCard = screen.getByLabelText('View overdue tasks');
    const pendingCard = screen.getByLabelText('View pending reviews');
    const missingCard = screen.getByLabelText('View missing daily updates');

    // Click
    fireEvent.click(overdueCard);
    fireEvent.click(pendingCard);
    fireEvent.click(missingCard);

    // Keyboard Tab / Enter / Space
    fireEvent.keyDown(overdueCard, { key: 'Enter', code: 'Enter' });
    fireEvent.keyDown(pendingCard, { key: ' ', code: 'Space' });
    fireEvent.keyDown(missingCard, { key: 'Enter', code: 'Enter' });
  });

  it('renders submitted pending reviews and strictly excludes DRAFT updates', async () => {
    vi.spyOn(api, 'get').mockResolvedValueOnce({
      success: true,
      data: mockDashboardWith3Alerts,
    });

    renderWithProviders(<DirectorDashboard />, {
      preloadedState: { auth: mockAuthState },
    });

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });

    // Submitted update details
    expect(screen.getByText('EMP001')).toBeInTheDocument();
    expect(screen.getByText('Completed frontend authentication flow')).toBeInTheDocument();
    expect(screen.getByText('Pending Review')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();

    // DRAFT update must NOT appear in pending review queue
    expect(screen.queryByText('Draft update that should be excluded from pending reviews')).not.toBeInTheDocument();
  });

  it('renders compact empty state for Pending Reviews when queue is empty', async () => {
    vi.spyOn(api, 'get').mockResolvedValueOnce({
      success: true,
      data: mockDashboardAllCaughtUp,
    });

    renderWithProviders(<DirectorDashboard />, {
      preloadedState: { auth: mockAuthState },
    });

    await waitFor(() => {
      expect(screen.getByText('No daily updates are waiting for your review.')).toBeInTheDocument();
    });
  });

  it('limits recent team activity to initial 5 activities', async () => {
    vi.spyOn(api, 'get').mockResolvedValueOnce({
      success: true,
      data: mockDashboardWith3Alerts,
    });

    renderWithProviders(<DirectorDashboard />, {
      preloadedState: { auth: mockAuthState },
    });

    await waitFor(() => {
      expect(screen.getByText('Alice Smith submitted a daily update')).toBeInTheDocument();
    });

    // First 5 activities should be present
    expect(screen.getByText('Alice Smith submitted a daily update')).toBeInTheDocument();
    expect(screen.getByText('Bob Jones completed a task')).toBeInTheDocument();
    expect(screen.getByText('Task assigned to Charlie Brown')).toBeInTheDocument();
    expect(screen.getByText('Review Approved')).toBeInTheDocument();
    expect(screen.getByText('Alice Smith posted a comment')).toBeInTheDocument();

    // 6th activity should be sliced out of initial display
    expect(screen.queryByText('Bob Jones updated task progress')).not.toBeInTheDocument();
  });

  it('renders professional loading skeleton state while fetching data', () => {
    vi.spyOn(api, 'get').mockReturnValue(new Promise(() => {})); // never resolves

    renderWithProviders(<DirectorDashboard />, {
      preloadedState: { auth: mockAuthState },
    });

    expect(screen.getByTestId('dashboard-loading-skeleton')).toBeInTheDocument();
  });

  it('renders clean error state and allows retrying fetch', async () => {
    const getSpy = vi.spyOn(api, 'get')
      .mockRejectedValueOnce(new Error('Network connection failure'))
      .mockResolvedValueOnce({
        success: true,
        data: mockDashboardWith3Alerts,
      });

    renderWithProviders(<DirectorDashboard />, {
      preloadedState: { auth: mockAuthState },
    });

    await waitFor(() => {
      expect(screen.getByText('Unable to load dashboard data.')).toBeInTheDocument();
    });

    expect(screen.getByText('Try again')).toBeInTheDocument();

    // Click retry
    fireEvent.click(screen.getByText('Try again'));

    await waitFor(() => {
      expect(screen.getByText('Director Workspace: Director Boss')).toBeInTheDocument();
    });

    expect(getSpy).toHaveBeenCalledTimes(2);
  });
});
