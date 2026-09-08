import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from './test-utils';
import authReducer, {
  resetAuthState,
  clearAuthError,
} from '../features/auth/slices/authSlice';
import { AuthGuard } from '../routes/AuthGuard';
import { authStorage } from '../services/authStorage';
import type { CurrentUser } from '../types/user';

describe('Auth Redux & Guard', () => {
  beforeEach(() => {
    authStorage.clearAll();
  });

  it('should have initial unauthenticated state when storage is empty', () => {
    const state = authReducer(undefined, { type: '@@INIT' });
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
  });

  it('should clear error on clearAuthError action', () => {
    const modifiedState = {
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: 'Invalid credentials',
    };
    const state = authReducer(modifiedState, clearAuthError());
    expect(state.error).toBeNull();
  });

  it('should reset all auth state on resetAuthState action', () => {
    const loggedInUser: CurrentUser = {
      user_id: '1',
      full_name: 'John Doe',
      email: 'john.doe@example.com',
      employee_code: 'EMP001',
      role_id: '3',
      role_name: 'employee',
      department_id: '1',
      designation: 'Software Engineer',
    };

    const loggedInState = {
      user: loggedInUser,
      token: 'jwt-access-token',
      refreshToken: 'jwt-refresh-token',
      isAuthenticated: true,
      isLoading: false,
      error: null,
    };

    const state = authReducer(loggedInState, resetAuthState());
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
  });

  it('AuthGuard redirects unauthenticated visitors to /login', () => {
    renderWithProviders(
      <Routes>
        <Route
          path="/"
          element={
            <AuthGuard>
              <div>Protected Content</div>
            </AuthGuard>
          }
        />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>,
      {
        route: '/',
        preloadedState: {
          auth: {
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          },
        },
      }
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('AuthGuard renders children when user and token are present', () => {
    const user: CurrentUser = {
      user_id: '1',
      full_name: 'John Doe',
      email: 'john.doe@example.com',
      employee_code: 'EMP001',
      role_id: '3',
      role_name: 'employee',
      department_id: '1',
      designation: 'Software Engineer',
    };

    renderWithProviders(
      <Routes>
        <Route
          path="/"
          element={
            <AuthGuard>
              <div>Protected Content</div>
            </AuthGuard>
          }
        />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>,
      {
        route: '/',
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

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});
