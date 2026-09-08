import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from './test-utils';
import { RoleGuard } from '../routes/RoleGuard';
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

describe('RBAC Route Protection (RoleGuard)', () => {
  it('allows employee into employee-only route', () => {
    const user = makeUser('employee', '3');

    renderWithProviders(
      <RoleGuard allowedRoles={['employee']}>
        <div>Employee Area</div>
      </RoleGuard>,
      {
        preloadedState: {
          auth: {
            user,
            token: 'valid-token',
            refreshToken: null,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          },
        },
      }
    );

    expect(screen.getByText('Employee Area')).toBeInTheDocument();
  });

  it('blocks employee from director route and redirects to /employee/dashboard', () => {
    const user = makeUser('employee', '3');

    renderWithProviders(
      <Routes>
        <Route
          path="/director/dashboard"
          element={
            <RoleGuard allowedRoles={['director']}>
              <div>Director Area</div>
            </RoleGuard>
          }
        />
        <Route path="/employee/dashboard" element={<div>Employee Dashboard Redirected</div>} />
      </Routes>,
      {
        route: '/director/dashboard',
        preloadedState: {
          auth: {
            user,
            token: 'valid-token',
            refreshToken: null,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          },
        },
      }
    );

    expect(screen.queryByText('Director Area')).not.toBeInTheDocument();
    expect(screen.getByText('Employee Dashboard Redirected')).toBeInTheDocument();
  });

  it('blocks employee from admin route and redirects to /employee/dashboard', () => {
    const user = makeUser('employee', '3');

    renderWithProviders(
      <Routes>
        <Route
          path="/admin/users"
          element={
            <RoleGuard allowedRoles={['admin']}>
              <div>Admin Area</div>
            </RoleGuard>
          }
        />
        <Route path="/employee/dashboard" element={<div>Employee Dashboard Redirected</div>} />
      </Routes>,
      {
        route: '/admin/users',
        preloadedState: {
          auth: {
            user,
            token: 'valid-token',
            refreshToken: null,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          },
        },
      }
    );

    expect(screen.queryByText('Admin Area')).not.toBeInTheDocument();
    expect(screen.getByText('Employee Dashboard Redirected')).toBeInTheDocument();
  });

  it('allows director into director route', () => {
    const user = makeUser('director', '2');

    renderWithProviders(
      <RoleGuard allowedRoles={['director']}>
        <div>Director Area</div>
      </RoleGuard>,
      {
        preloadedState: {
          auth: {
            user,
            token: 'valid-token',
            refreshToken: null,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          },
        },
      }
    );

    expect(screen.getByText('Director Area')).toBeInTheDocument();
  });

  it('blocks director from admin route and redirects to /director/dashboard', () => {
    const user = makeUser('director', '2');

    renderWithProviders(
      <Routes>
        <Route
          path="/admin/departments"
          element={
            <RoleGuard allowedRoles={['admin']}>
              <div>Admin Area</div>
            </RoleGuard>
          }
        />
        <Route path="/director/dashboard" element={<div>Director Dashboard Redirected</div>} />
      </Routes>,
      {
        route: '/admin/departments',
        preloadedState: {
          auth: {
            user,
            token: 'valid-token',
            refreshToken: null,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          },
        },
      }
    );

    expect(screen.queryByText('Admin Area')).not.toBeInTheDocument();
    expect(screen.getByText('Director Dashboard Redirected')).toBeInTheDocument();
  });

  it('allows admin into admin route', () => {
    const user = makeUser('admin', '1');

    renderWithProviders(
      <RoleGuard allowedRoles={['admin']}>
        <div>Admin Area</div>
      </RoleGuard>,
      {
        preloadedState: {
          auth: {
            user,
            token: 'valid-token',
            refreshToken: null,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          },
        },
      }
    );

    expect(screen.getByText('Admin Area')).toBeInTheDocument();
  });

  it('safely redirects admin from /notifications to /admin/dashboard', () => {
    const user = makeUser('admin', '1');

    renderWithProviders(
      <Routes>
        <Route
          path="/notifications"
          element={
            <RoleGuard allowedRoles={['employee', 'director']}>
              <div>Notifications Area</div>
            </RoleGuard>
          }
        />
        <Route path="/admin/dashboard" element={<div>Admin Dashboard Redirected</div>} />
      </Routes>,
      {
        route: '/notifications',
        preloadedState: {
          auth: {
            user,
            token: 'valid-token',
            refreshToken: null,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          },
        },
      }
    );

    expect(screen.queryByText('Notifications Area')).not.toBeInTheDocument();
    expect(screen.getByText('Admin Dashboard Redirected')).toBeInTheDocument();
  });
});
