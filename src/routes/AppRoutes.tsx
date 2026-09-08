import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AuthGuard from './AuthGuard';
import GuestGuard from './GuestGuard';
import RoleGuard from './RoleGuard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';

// Layout
const DashboardLayout = lazy(() => import('../layouts/DashboardLayout'));

// Auth Page
const Login = lazy(() => import('../features/auth/pages/Login'));

// Employee Pages
const EmployeeDashboard = lazy(() => import('../features/dashboard/pages/EmployeeDashboard'));
const DailyTrackerPage = lazy(() => import('../features/dailyUpdates/pages/DailyTrackerPage'));
const DailyUpdatesListPage = lazy(() => import('../features/dailyUpdates/pages/DailyUpdatesListPage'));
const DailyUpdateDetailPage = lazy(() => import('../features/dailyUpdates/pages/DailyUpdateDetailPage'));
const TasksListPage = lazy(() => import('../features/tasks/pages/TasksListPage'));
const TaskDetailPage = lazy(() => import('../features/tasks/pages/TaskDetailPage'));

// Director Pages
const DirectorDashboard = lazy(() => import('../features/dashboard/pages/DirectorDashboard'));
const DirectorReviewsPage = lazy(() => import('../features/reviews/pages/DirectorReviewsPage'));
const DirectorReviewDetailPage = lazy(() => import('../features/reviews/pages/DirectorReviewDetailPage'));
const DirectorTasksPage = lazy(() => import('../features/tasks/pages/DirectorTasksPage'));
const DirectorTaskDetailPage = lazy(() => import('../features/tasks/pages/DirectorTaskDetailPage'));
const DirectorTeamPage = lazy(() => import('../features/users/pages/DirectorTeamPage'));
const DirectorEmployeeDetailPage = lazy(() => import('../features/users/pages/DirectorEmployeeDetailPage'));

// Admin Pages
const AdminDashboard = lazy(() => import('../features/dashboard/pages/AdminDashboard'));
const AdminUsersPage = lazy(() => import('../features/users/pages/AdminUsersPage'));
const AdminDepartmentsPage = lazy(() => import('../features/departments/pages/AdminDepartmentsPage'));
const AdminRolesPage = lazy(() => import('../features/admin/pages/AdminRolesPage'));
const AdminAuditLogsPage = lazy(() => import('../features/admin/pages/AdminAuditLogsPage'));

// Shared Pages
const NotificationsPage = lazy(() => import('../features/notifications/pages/NotificationsPage'));
const ProfilePage = lazy(() => import('../features/profile/pages/ProfilePage'));

// Role-aware root redirector: authenticated users go straight to their dashboard
const RootRedirect: React.FC = () => {
  const { isAuthenticated, roleName } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roleName === 'director') return <Navigate to="/director/dashboard" replace />;
  if (roleName === 'admin') return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/employee/dashboard" replace />;
};

export const AppRoutes: React.FC = () => {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
          <LoadingSpinner size="lg" text="Loading TaskTracker..." />
        </div>
      }
    >
      <Routes>
        {/* Guest Routes */}
        <Route
          path="/login"
          element={
            <GuestGuard>
              <Login />
            </GuestGuard>
          }
        />

        {/* Authenticated Application Shell */}
        <Route
          element={
            <AuthGuard>
              <DashboardLayout />
            </AuthGuard>
          }
        >
          {/* Default Route */}
          <Route index element={<RootRedirect />} />

          {/* ── Employee Routes ── */}
          <Route
            path="employee/dashboard"
            element={
              <RoleGuard allowedRoles={['employee']}>
                <EmployeeDashboard />
              </RoleGuard>
            }
          />
          <Route
            path="employee/daily-update"
            element={
              <RoleGuard allowedRoles={['employee']}>
                <DailyTrackerPage />
              </RoleGuard>
            }
          />
          <Route
            path="employee/daily-updates"
            element={
              <RoleGuard allowedRoles={['employee']}>
                <DailyUpdatesListPage />
              </RoleGuard>
            }
          />
          <Route
            path="employee/daily-updates/:id"
            element={
              <RoleGuard allowedRoles={['employee']}>
                <DailyUpdateDetailPage />
              </RoleGuard>
            }
          />
          <Route
            path="employee/tasks"
            element={
              <RoleGuard allowedRoles={['employee']}>
                <TasksListPage />
              </RoleGuard>
            }
          />
          <Route
            path="employee/tasks/:id"
            element={
              <RoleGuard allowedRoles={['employee']}>
                <TaskDetailPage />
              </RoleGuard>
            }
          />

          {/* ── Director Routes ── */}
          <Route
            path="director/dashboard"
            element={
              <RoleGuard allowedRoles={['director']}>
                <DirectorDashboard />
              </RoleGuard>
            }
          />
          <Route
            path="director/daily-updates"
            element={
              <RoleGuard allowedRoles={['director']}>
                <DirectorReviewsPage />
              </RoleGuard>
            }
          />
          <Route
            path="director/daily-updates/:id"
            element={
              <RoleGuard allowedRoles={['director']}>
                <DirectorReviewDetailPage />
              </RoleGuard>
            }
          />
          <Route
            path="director/tasks"
            element={
              <RoleGuard allowedRoles={['director']}>
                <DirectorTasksPage />
              </RoleGuard>
            }
          />
          <Route
            path="director/tasks/:id"
            element={
              <RoleGuard allowedRoles={['director']}>
                <DirectorTaskDetailPage />
              </RoleGuard>
            }
          />
          <Route
            path="director/employees"
            element={
              <RoleGuard allowedRoles={['director']}>
                <DirectorTeamPage />
              </RoleGuard>
            }
          />
          <Route
            path="director/employees/:id"
            element={
              <RoleGuard allowedRoles={['director']}>
                <DirectorEmployeeDetailPage />
              </RoleGuard>
            }
          />

          {/* ── Admin Routes ── */}
          <Route
            path="admin/dashboard"
            element={
              <RoleGuard allowedRoles={['admin']}>
                <AdminDashboard />
              </RoleGuard>
            }
          />
          <Route
            path="admin/users"
            element={
              <RoleGuard allowedRoles={['admin']}>
                <AdminUsersPage />
              </RoleGuard>
            }
          />
          <Route
            path="admin/departments"
            element={
              <RoleGuard allowedRoles={['admin']}>
                <AdminDepartmentsPage />
              </RoleGuard>
            }
          />
          <Route
            path="admin/roles"
            element={
              <RoleGuard allowedRoles={['admin']}>
                <AdminRolesPage />
              </RoleGuard>
            }
          />
          <Route
            path="admin/audit-logs"
            element={
              <RoleGuard allowedRoles={['admin']}>
                <AdminAuditLogsPage />
              </RoleGuard>
            }
          />

          {/* ── Shared Authenticated Routes ── */}
          <Route
            path="notifications"
            element={
              <RoleGuard allowedRoles={['employee', 'director']}>
                <NotificationsPage />
              </RoleGuard>
            }
          />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
