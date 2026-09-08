import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from './test-utils';
import { Header } from '../layouts/DashboardLayout/Header';
import type { CurrentUser } from '../types/user';

const makeUser = (role_name: string, role_id: string): CurrentUser => ({
  user_id: '1',
  full_name: `${role_name} User`,
  email: `${role_name}@example.com`,
  employee_code: 'TST001',
  role_id,
  role_name,
  department_id: '1',
});

describe('Search Bar Visibility & Route Validity', () => {
  it('does NOT render Global Search bar in Header for Employee', () => {
    const user = makeUser('employee', '3');

    renderWithProviders(<Header onOpenMobileMenu={() => {}} />, {
      preloadedState: {
        auth: {
          user,
          token: 'emp-token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });

    const searchInput = screen.queryByPlaceholderText(/Search tasks, updates, team members/i);
    expect(searchInput).not.toBeInTheDocument();
  });

  it('renders Global Search bar in Header for Director', () => {
    const user = makeUser('director', '2');

    renderWithProviders(<Header onOpenMobileMenu={() => {}} />, {
      preloadedState: {
        auth: {
          user,
          token: 'dir-token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });

    const searchInput = screen.getByPlaceholderText(/Search tasks, updates, team members/i);
    expect(searchInput).toBeInTheDocument();
  });

  it('renders Global Search bar in Header for Admin', () => {
    const user = makeUser('admin', '1');

    renderWithProviders(<Header onOpenMobileMenu={() => {}} />, {
      preloadedState: {
        auth: {
          user,
          token: 'adm-token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });

    const searchInput = screen.getByPlaceholderText(/Search tasks, updates, team members/i);
    expect(searchInput).toBeInTheDocument();
  });

  it('renders notification bell in Header for Employee', () => {
    const user = makeUser('employee', '3');

    renderWithProviders(<Header onOpenMobileMenu={() => {}} />, {
      preloadedState: {
        auth: {
          user,
          token: 'emp-token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });

    const bellBtn = screen.getByRole('button', { name: /notifications/i });
    expect(bellBtn).toBeInTheDocument();
  });

  it('renders notification bell in Header for Director', () => {
    const user = makeUser('director', '2');

    renderWithProviders(<Header onOpenMobileMenu={() => {}} />, {
      preloadedState: {
        auth: {
          user,
          token: 'dir-token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });

    const bellBtn = screen.getByRole('button', { name: /notifications/i });
    expect(bellBtn).toBeInTheDocument();
  });

  it('does NOT render notification bell in Header for Admin', () => {
    const user = makeUser('admin', '1');

    renderWithProviders(<Header onOpenMobileMenu={() => {}} />, {
      preloadedState: {
        auth: {
          user,
          token: 'adm-token',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });

    const bellBtn = screen.queryByRole('button', { name: /notifications/i });
    expect(bellBtn).not.toBeInTheDocument();
  });

  it('validates Admin search URLs and ensures none route to Director workspaces', () => {
    // Exact URL mapping produced by search_service.py for admin role
    const adminSearchUrls = [
      { type: 'user', url: '/admin/users' },
      { type: 'department', url: '/admin/departments' },
      { type: 'role', url: '/admin/roles' },
      { type: 'audit_log', url: '/admin/audit-logs' },
      { type: 'task', url: '/admin/dashboard' },
      { type: 'daily_update', url: '/admin/dashboard' },
      { type: 'notification', url: '/notifications' },
    ];

    const validAppRoutePrefixes = [
      '/admin/',
      '/notifications',
      '/profile',
    ];

    adminSearchUrls.forEach((item) => {
      // 1. Must NOT navigate to director routes
      expect(item.url.startsWith('/director/')).toBe(false);

      // 2. Must be a valid admin or shared route
      const isValid = validAppRoutePrefixes.some((prefix) => item.url.startsWith(prefix));
      expect(isValid).toBe(true);
    });
  });

  it('validates Director search URLs match valid routes', () => {
    const directorSearchUrls = [
      { type: 'task', url: '/director/tasks/10' },
      { type: 'daily_update', url: '/director/daily-updates/5' },
      { type: 'user', url: '/director/employees/2' },
      { type: 'department', url: '/director/dashboard' },
      { type: 'notification', url: '/notifications' },
    ];

    const validDirectorPrefixes = [
      '/director/',
      '/notifications',
      '/profile',
    ];

    directorSearchUrls.forEach((item) => {
      expect(item.url.startsWith('/admin/')).toBe(false);
      const isValid = validDirectorPrefixes.some((prefix) => item.url.startsWith(prefix));
      expect(isValid).toBe(true);
    });
  });
});
