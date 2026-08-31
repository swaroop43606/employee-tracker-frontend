import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Users,
  Building2,
  Layers,
  ShieldAlert,
  ArrowRight,
  UserCheck,
  UserMinus,
  UserX,
  Clock,
  RefreshCw,
  ListTodo,
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { api } from '../../../services/api';
import { Card, CardHeader, CardContent } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Badge } from '../../../components/Badge';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { ErrorState } from '../../../components/Feedback';
import type { AuditLogResponse } from '../../../types/auditLog';

// Shape of GET /api/v1/admin/dashboard response data
interface DashboardStats {
  total_users: number;
  active_users: number;
  inactive_users: number;
  suspended_users: number;
  total_departments: number;
  active_departments: number;
  total_roles: number;
  active_roles: number;
  total_tasks: number;
  total_daily_updates: number;
  total_audit_logs: number;
  users_by_role: Array<{ role_name: string; count: number }>;
  users_by_department: Array<{ department_name: string; count: number }>;
}

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentAudits, setRecentAudits] = useState<AuditLogResponse[]>([]);

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Single optimized endpoint for all admin dashboard stats
      const dashRes = await api.get<DashboardStats>('/admin/dashboard');
      if (dashRes.success && dashRes.data) {
        setStats(dashRes.data);
      }

      // Fetch recent 5 audit logs for the activity feed
      const auditsRes = await api.getPaginated<AuditLogResponse>('/audit-logs', {
        page_size: 5,
      });
      setRecentAudits(auditsRes.data?.items || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load Admin Dashboard operational metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user]);


  if (loading) {
    return (
      <div className="h-[75vh] flex items-center justify-center">
        <LoadingSpinner size="lg" text="Aggregating operational metrics..." />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadDashboardData} />;
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#991b1f] via-[#85161a] to-[#6b1215] text-white p-4 sm:p-5 rounded-2xl shadow-md shadow-[#991b1f]/15 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[#7f161a]">
        <div>
          <div className="flex items-center space-x-2.5 mb-1.5">
            <Badge variant="brand" className="bg-white/20 text-[#ffe1c5] border-white/15 font-bold text-[10px] px-2 py-0.5">
              System Administration
            </Badge>
            <span className="text-[11px] text-[#ffe1c5]/80">{todayFormatted}</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
            Admin Control Center: {user?.full_name}
          </h1>
          <p className="text-xs text-white/85 mt-0.5 max-w-lg">
            Manage organization hierarchy, departments, user roles, and monitor enterprise audit logs.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0">
          <NavLink to="/admin/users">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Users className="w-3.5 h-3.5 text-[#991b1f]" />}
              className="bg-white hover:bg-[#fff8f3] text-[#991b1f] font-bold shadow-sm border border-white/20 text-xs py-1.5 px-3"
            >
              Manage Users
            </Button>
          </NavLink>
          <Button
            variant="outline"
            size="sm"
            className="text-white border-white/25 bg-white/10 hover:bg-white/20 text-xs py-1.5 px-3"
            onClick={loadDashboardData}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Main metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Users</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{stats?.total_users ?? 0}</h3>
              <p className="text-[10px] text-slate-500 font-semibold mt-1">
                {(stats?.users_by_role?.find(r => r.role_name === 'director')?.count ?? 0)} Directors •{' '}
                {(stats?.users_by_role?.find(r => r.role_name === 'employee')?.count ?? 0)} Employees
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Departments</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{stats?.total_departments ?? 0}</h3>
              <p className="text-[10px] text-slate-500 font-semibold mt-1">{stats?.active_departments ?? 0} Active Units</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 flex-shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">System Roles</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{stats?.total_roles ?? 0}</h3>
              <p className="text-[10px] text-slate-500 font-semibold mt-1">{stats?.active_roles ?? 0} Active RBAC Levels</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 flex-shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Audit Records</p>
              <h3 className="text-2xl font-bold text-rose-600 mt-0.5">{stats?.total_audit_logs ?? 0}</h3>
              <p className="text-[10px] text-slate-500 font-semibold mt-1">Immutable Ledger Logs</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User status breakdown cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold text-slate-500">Active Accounts</span>
            </div>
            <span className="font-bold text-emerald-600 text-sm">{stats?.active_users ?? 0}</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <UserMinus className="w-4 h-4 text-slate-500" />
              <span className="font-semibold text-slate-500">Inactive Accounts</span>
            </div>
            <span className="font-bold text-slate-600 text-sm">{stats?.inactive_users ?? 0}</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <UserX className="w-4 h-4 text-rose-600" />
              <span className="font-semibold text-slate-500">Suspended Accounts</span>
            </div>
            <span className="font-bold text-rose-600 text-sm">{stats?.suspended_users ?? 0}</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <ListTodo className="w-4 h-4 text-indigo-600" />
              <span className="font-semibold text-slate-500">Total Tasks</span>
            </div>
            <span className="font-bold text-indigo-600 text-sm">{stats?.total_tasks ?? 0}</span>
          </CardContent>
        </Card>
      </div>

      {/* Recent audits & Actions grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Audit Logs (Left) */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900">Recent Audit Trail</h3>
              <NavLink to="/admin/audit-logs" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                Full Trail &rarr;
              </NavLink>
            </CardHeader>
            <CardContent className="p-0">
              {recentAudits.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No system audit records registered yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {recentAudits.map((log) => (
                    <div key={log.log_id} className="p-4 space-y-1.5 hover:bg-slate-50/50 transition-colors">
                      <div className="flex justify-between items-start text-[10px] text-slate-400 font-bold uppercase">
                        <span>BY: {log.user_name || 'System / Cron'}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">
                          {log.action}
                        </span>
                        <Badge variant="neutral" className="font-mono text-[9px] lowercase">
                          {log.entity_type}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Navigations */}
        <div className="space-y-6">
          <Card hoverEffect>
            <CardHeader>
              <h3 className="text-sm font-bold text-slate-900">Organization Settings</h3>
            </CardHeader>
            <CardContent className="space-y-3">
              <NavLink to="/admin/departments" className="block">
                <Button variant="outline" size="sm" className="w-full justify-between" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Manage Departments
                </Button>
              </NavLink>
              <NavLink to="/admin/roles" className="block">
                <Button variant="outline" size="sm" className="w-full justify-between" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Access Roles (RBAC)
                </Button>
              </NavLink>
              <NavLink to="/admin/users" className="block">
                <Button variant="outline" size="sm" className="w-full justify-between" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Employee Accounts
                </Button>
              </NavLink>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
