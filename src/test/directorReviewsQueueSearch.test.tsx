import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders } from './test-utils';
import { DirectorReviewsPage } from '../features/reviews/pages/DirectorReviewsPage';
import { DirectorTasksPage } from '../features/tasks/pages/DirectorTasksPage';
import { api } from '../services/api';
import type { CurrentUser } from '../types/user';
import type { DailyUpdateListItem } from '../types/dailyUpdate';

const mockDirector: CurrentUser = {
  user_id: 'dir-101',
  full_name: 'Director Boss',
  email: 'director@example.com',
  employee_code: 'DIR001',
  role_id: 'role-2',
  role_name: 'director',
  department_id: 'dept-1',
};

const mockTeamUsers = [
  {
    user_id: 'emp-1',
    full_name: 'Alice Subordinate',
    email: 'alice@example.com',
    employee_code: 'EMP001',
    role_name: 'employee',
    status: 'active',
  },
  {
    user_id: 'emp-2',
    full_name: 'Bob Subordinate',
    email: 'bob@example.com',
    employee_code: 'EMP002',
    role_name: 'employee',
    status: 'active',
  },
];

const mockDailyUpdates: DailyUpdateListItem[] = [
  {
    update_id: 'du-1',
    employee_id: 'emp-1',
    employee_name: 'Alice Subordinate',
    employee_code: 'EMP001',
    update_date: '2026-09-10',
    summary: 'Finished sprint authentication task',
    completed_work: 'Built token rotation',
    next_work_plan: 'Review pull requests',
    blockers: null,
    overall_status: 'submitted',
    items_count: 2,
    total_hours: 7.5,
    submitted_at: '2026-09-10T16:00:00Z',
    created_at: '2026-09-10T09:00:00Z',
    employee_updated_at: '2026-09-10T16:00:00Z',
  },
  {
    update_id: 'du-2',
    employee_id: 'emp-2',
    employee_name: 'Bob Subordinate',
    employee_code: 'EMP002',
    update_date: '2026-09-10',
    summary: 'Refactored reporting database schema',
    completed_work: 'Optimized SQL indices',
    next_work_plan: 'Run load testing',
    blockers: 'Waiting for database dump',
    overall_status: 'reviewed',
    items_count: 1,
    total_hours: 6.0,
    submitted_at: '2026-09-10T15:00:00Z',
    created_at: '2026-09-10T08:30:00Z',
    employee_updated_at: '2026-09-10T15:00:00Z',
  },
];

describe('Director Daily Updates Review Queue Search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupMocks = (updates = mockDailyUpdates, totalPages = 2) => {
    return vi.spyOn(api, 'getPaginated').mockImplementation(async (url: string, params?: any) => {
      if (url === '/users') {
        return {
          success: true,
          data: {
            items: mockTeamUsers,
            total: mockTeamUsers.length,
            page: 1,
            page_size: 100,
            total_pages: 1,
          },
          message: 'Users fetched',
        };
      }
      if (url === '/daily-updates') {
        return {
          success: true,
          data: {
            items: updates,
            total: updates.length,
            page: params?.page || 1,
            page_size: 10,
            total_pages: totalPages,
          },
          message: 'Daily updates fetched',
        };
      }
      return {
        success: true,
        data: { items: [], total: 0, page: 1, page_size: 10, total_pages: 1 },
        message: 'OK',
      };
    });
  };

  const renderPage = () => {
    return renderWithProviders(<DirectorReviewsPage />, {
      preloadedState: {
        auth: {
          user: mockDirector,
          token: 'dir-token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });
  };

  // 1. Compact search input renders
  it('renders the compact search input in the filter bar', async () => {
    setupMocks();
    renderPage();

    const searchInput = await screen.findByPlaceholderText('Search employees or updates...');
    expect(searchInput).toBeInTheDocument();
    // Compact width class: sm:w-64 (~256px)
    expect(searchInput.parentElement).toHaveClass('sm:w-64');
  });

  // 2. Correct placeholder is displayed
  it('displays the exact placeholder "Search employees or updates..."', async () => {
    setupMocks();
    renderPage();

    const searchInput = await screen.findByPlaceholderText('Search employees or updates...');
    expect(searchInput).toHaveAttribute('placeholder', 'Search employees or updates...');
  });

  // 3. Search value is accepted
  it('accepts text input in the search field', async () => {
    setupMocks();
    renderPage();

    const searchInput = await screen.findByPlaceholderText('Search employees or updates...') as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'Alice' } });
    expect(searchInput.value).toBe('Alice');
  });

  // 4. Search parameter is sent to the API after debounce
  it('sends the search query parameter to the API after debounce timeout', async () => {
    const mockGet = setupMocks();
    renderPage();

    const searchInput = await screen.findByPlaceholderText('Search employees or updates...');
    
    // Type in search
    fireEvent.change(searchInput, { target: { value: 'authentication' } });

    // Wait for the 350ms debounce
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        '/daily-updates',
        expect.objectContaining({
          search: 'authentication',
          page: 1,
        })
      );
    }, { timeout: 1000 });
  });

  // 5. Search resets pagination to page 1
  it('resets pagination to page 1 when search input changes', async () => {
    const mockGet = setupMocks();
    renderPage();

    // Click next page first
    const nextBtn = await screen.findByRole('button', { name: /next page/i });
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        '/daily-updates',
        expect.objectContaining({ page: 2 })
      );
    });

    // Now type search
    const searchInput = screen.getByPlaceholderText('Search employees or updates...');
    fireEvent.change(searchInput, { target: { value: 'Bob' } });

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        '/daily-updates',
        expect.objectContaining({
          search: 'Bob',
          page: 1,
        })
      );
    }, { timeout: 1000 });
  });

  // 6. Debounce prevents an API call for every keystroke
  it('debounces rapid keystrokes to prevent multiple API requests', async () => {
    const mockGet = setupMocks();
    renderPage();

    const searchInput = await screen.findByPlaceholderText('Search employees or updates...');

    // Record calls before typing
    const initialCalls = mockGet.mock.calls.filter(call => call[0] === '/daily-updates').length;

    // Type rapidly: A, Al, Ali, Alic, Alice
    fireEvent.change(searchInput, { target: { value: 'A' } });
    fireEvent.change(searchInput, { target: { value: 'Al' } });
    fireEvent.change(searchInput, { target: { value: 'Ali' } });
    fireEvent.change(searchInput, { target: { value: 'Alic' } });
    fireEvent.change(searchInput, { target: { value: 'Alice' } });

    // After debounce finishes
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        '/daily-updates',
        expect.objectContaining({ search: 'Alice' })
      );
    }, { timeout: 1000 });

    // Ensure we didn't make 5 separate calls for each letter
    const dailyCalls = mockGet.mock.calls.filter(call => call[0] === '/daily-updates');
    // Initial call + at most 1 debounced call
    expect(dailyCalls.length).toBeLessThanOrEqual(initialCalls + 1);
  });

  // 7. Search works with Team Member filter
  it('combines search with Team Member filter in API request', async () => {
    const mockGet = setupMocks();
    renderPage();

    const searchInput = await screen.findByPlaceholderText('Search employees or updates...');
    const memberSelect = screen.getByLabelText(/filter by team member/i);

    fireEvent.change(memberSelect, { target: { value: 'emp-1' } });
    fireEvent.change(searchInput, { target: { value: 'login' } });

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        '/daily-updates',
        expect.objectContaining({
          employee_id: 'emp-1',
          search: 'login',
          page: 1,
        })
      );
    }, { timeout: 1000 });
  });

  // 8. Search works with Status filter
  it('combines search with Status filter in API request', async () => {
    const mockGet = setupMocks();
    renderPage();

    const searchInput = await screen.findByPlaceholderText('Search employees or updates...');
    const statusSelect = screen.getByLabelText(/filter by update status/i);

    fireEvent.change(statusSelect, { target: { value: 'submitted' } });
    fireEvent.change(searchInput, { target: { value: 'sprint' } });

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        '/daily-updates',
        expect.objectContaining({
          status_filter: 'submitted',
          search: 'sprint',
          page: 1,
        })
      );
    }, { timeout: 1000 });
  });

  // 9. Search works with From Date filter
  it('combines search with From Date filter in API request', async () => {
    const mockGet = setupMocks();
    renderPage();

    const searchInput = await screen.findByPlaceholderText('Search employees or updates...');
    const fromDateInput = screen.getByLabelText(/from date/i);

    fireEvent.change(fromDateInput, { target: { value: '2026-09-01' } });
    fireEvent.change(searchInput, { target: { value: 'Alice' } });

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        '/daily-updates',
        expect.objectContaining({
          date_from: '2026-09-01',
          search: 'Alice',
          page: 1,
        })
      );
    }, { timeout: 1000 });
  });

  // 10. Search works with To Date filter
  it('combines search with To Date filter in API request', async () => {
    const mockGet = setupMocks();
    renderPage();

    const searchInput = await screen.findByPlaceholderText('Search employees or updates...');
    const toDateInput = screen.getByLabelText(/to date/i);

    fireEvent.change(toDateInput, { target: { value: '2026-09-11' } });
    fireEvent.change(searchInput, { target: { value: 'Alice' } });

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        '/daily-updates',
        expect.objectContaining({
          date_to: '2026-09-11',
          search: 'Alice',
          page: 1,
        })
      );
    }, { timeout: 1000 });
  });

  // 11. Reset Filters clears search
  it('clears search input and debounced search when Reset Filters is clicked', async () => {
    const mockGet = setupMocks();
    renderPage();

    const searchInput = await screen.findByPlaceholderText('Search employees or updates...') as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'authentication' } });

    await waitFor(() => {
      expect(searchInput.value).toBe('authentication');
    });

    const resetBtn = screen.getByRole('button', { name: /reset filters/i });
    fireEvent.click(resetBtn);

    expect(searchInput.value).toBe('');

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        '/daily-updates',
        expect.objectContaining({
          search: undefined,
          employee_id: undefined,
          status_filter: undefined,
          date_from: undefined,
          date_to: undefined,
          page: 1,
        })
      );
    });
  });

  // 12. Reset Filters resets pagination
  it('resets pagination to page 1 upon Reset Filters click', async () => {
    setupMocks();
    renderPage();

    const nextBtn = await screen.findByRole('button', { name: /next page/i });
    fireEvent.click(nextBtn);

    const resetBtn = screen.getByRole('button', { name: /reset filters/i });
    fireEvent.click(resetBtn);

    // Page indicator should say Page 1 of 2
    await waitFor(() => {
      expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();
    });
  });

  // 13. Empty search results display correctly
  it('displays "No daily updates match your search or filters." when search yields 0 items', async () => {
    setupMocks([], 1);
    renderPage();

    const searchInput = await screen.findByPlaceholderText('Search employees or updates...');
    fireEvent.change(searchInput, { target: { value: 'NonexistentKeyword12345' } });

    await waitFor(() => {
      expect(screen.getByText('No daily updates match your search or filters.')).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  // 14. Existing Director Tasks search remains unaffected
  it('preserves the Director Tasks search bar style and placeholder untouched', async () => {
    vi.spyOn(api, 'getPaginated').mockResolvedValue({
      success: true,
      data: { items: [], total: 0, page: 1, page_size: 10, total_pages: 1 },
      message: 'Tasks fetched',
    });

    renderWithProviders(<DirectorTasksPage />, {
      preloadedState: {
        auth: {
          user: mockDirector,
          token: 'dir-token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });

    // Director Tasks placeholder must remain "Search tasks..."
    const taskSearch = await screen.findByPlaceholderText('Search tasks...');
    expect(taskSearch).toBeInTheDocument();
    expect(taskSearch.parentElement).toHaveClass('sm:w-60');
  });
});
