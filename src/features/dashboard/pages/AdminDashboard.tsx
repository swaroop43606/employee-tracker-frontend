import React, { useEffect, useState, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Users,
  Building2,
  Layers,
  ShieldAlert,
  ArrowRight,
  Clock,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { api } from '../../../services/api';
import { Card, CardHeader, CardContent } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Badge } from '../../../components/Badge';
import type { AuditLogResponse } from '../../../types/auditLog';
import type { UserListItem } from '../../../types/user';

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

const COMMON_AUDIT_ACTIONS = [
  'LOGIN',
  'LOGOUT',
  'USER_CREATED',
  'USER_UPDATED',
  'USER_ACTIVATED',
  'USER_DEACTIVATED',
  'USER_SUSPENDED',
  'DEPARTMENT_CREATED',
  'ROLE_CREATED',
];

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentAudits, setRecentAudits] = useState<AuditLogResponse[]>([]);
  const [systemUsers, setSystemUsers] = useState<UserListItem[]>([]);

  // Audit trail lightweight filters
  const [actionFilter, setActionFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Calculate date_from based on dateFilter
  const getDateFrom = (filter: string): string | undefined => {
    if (filter === 'today') {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      return startOfDay.toISOString();
    }
    if (filter === 'week') {
      const pastWeek = new Date();
      pastWeek.setDate(pastWeek.getDate() - 7);
      return pastWeek.toISOString();
    }
    return undefined;
  };

  const fetchAudits = useCallback(
    async (action?: string, userId?: string, dateRange?: string) => {
      try {
        const dateFrom = getDateFrom(dateRange ?? dateFilter);
        const auditsRes = await api.getPaginated<AuditLogResponse>('/audit-logs', {
          page_size: 5,
          action: (action ?? actionFilter) || undefined,
          user_id: (userId ?? userFilter) || undefined,
          date_from: dateFrom,
        });
        setRecentAudits(auditsRes.data?.items || []);
      } catch {
        // Silent catch for secondary filter requests
      }
    },
    [actionFilter, userFilter, dateFilter]
  );

  const loadDashboardData = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      // 1. Fetch Admin Dashboard stats
      const dashRes = await api.get<DashboardStats>('/admin/dashboard');
      if (dashRes.success && dashRes.data) {
        setStats(dashRes.data);
      }

      // 2. Fetch Recent 5 Audit Logs
      await fetchAudits(actionFilter, userFilter, dateFilter);

      // 3. Fetch lightweight user list for audit filter dropdown if not already loaded
      if (systemUsers.length === 0) {
        api
          .getPaginated<UserListItem>('/users', { page_size: 100 })
          .then((res) => {
            if (res.data?.items) {
              setSystemUsers(res.data.items);
            }
          })
          .catch(() => {});
      }
    } catch (err: any) {
      setError(err.message || 'Unable to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  // Refetch audits when filters change
  useEffect(() => {
    if (!loading) {
      fetchAudits();
    }
  }, [actionFilter, userFilter, dateFilter, fetchAudits, loading]);

  // Keyboard navigation handler for interactive cards
  const handleCardKeyDown = (e: React.KeyboardEvent, path: string) => {
    if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') {
      e.preventDefault();
      navigate(path);
    }
  };

  // ── SKELETON LOADING STATE ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6" data-testid="dashboard-skeleton">
        {/* Header Skeleton */}
        <div className="bg-slate-200 animate-pulse rounded-2xl h-28 w-full" />

        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-slate-100 animate-pulse rounded-2xl h-28 p-5 border border-slate-200/60" />
          ))}
        </div>

        {/* Needs Attention Skeleton */}
        <div className="space-y-3">
          <div className="h-4 bg-slate-200 animate-pulse rounded w-36" />
          <div className="h-16 bg-slate-100 animate-pulse rounded-xl border border-slate-200/60" />
        </div>

        {/* Audit Trail & Settings Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 bg-slate-100 animate-pulse rounded-2xl border border-slate-200/60" />
          <div className="h-72 bg-slate-100 animate-pulse rounded-2xl border border-slate-200/60" />
        </div>
      </div>
    );
  }

  // ── ERROR STATE ─────────────────────────────────────────────────────────────
  if (error && !stats) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 mb-3">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800 mb-1">Unable to load dashboard data.</h3>
        <p className="text-xs text-slate-500 mb-4 max-w-sm">
          {error.includes('Please try again') ? error : `${error} Please try again.`}
        </p>
        <Button
          variant="primary"
          size="sm"
          onClick={() => loadDashboardData()}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Try Again
        </Button>
      </div>
    );
  }

  // ── ATTENTION ITEMS COMPUTATION ─────────────────────────────────────────────
  const inactiveCount = stats?.inactive_users ?? 0;
  const suspendedCount = stats?.suspended_users ?? 0;
  const hasAttentionIssues = inactiveCount > 0 || suspendedCount > 0;

  return (
    <div className="space-y-6">
      {/* ── 1. HEADER / HERO BANNER ────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-[#991b1f] via-[#85161a] to-[#6b1215] text-white p-4 sm:p-5 rounded-2xl shadow-md shadow-[#991b1f]/15 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[#7f161a]">
        <div>
          <div className="flex items-center space-x-2.5 mb-1.5">
            <Badge
              variant="brand"
              className="bg-white/20 text-[#ffe1c5] border-white/15 font-bold text-[10px] px-2 py-0.5"
            >
              System Administration
            </Badge>
            <span className="text-[11px] text-[#ffe1c5]/80">{todayFormatted}</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
            Admin Control Center: {user?.full_name || 'System Administrator'}
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
            disabled={isRefreshing}
            className="text-white border-white/25 bg-white/10 hover:bg-white/20 text-xs py-1.5 px-3 disabled:opacity-60"
            onClick={() => loadDashboardData(true)}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* ── 2. TOP ACTIONABLE KPI CARDS ────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Users */}
        <NavLink
          to="/admin/users"
          tabIndex={0}
          onKeyDown={(e) => handleCardKeyDown(e, '/admin/users')}
          className="group block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#991b1f] transition-transform"
          aria-label="Users management: View all user accounts"
        >
          <Card className="h-full hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer">
            <CardContent className="p-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Users</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{stats?.total_users ?? 0}</h3>
                  <p className="text-[10px] text-slate-500 font-semibold mt-1">
                    {stats?.active_users ?? 0} active • {stats?.inactive_users ?? 0} inactive
                    {(stats?.suspended_users ?? 0) > 0 ? ` • ${stats?.suspended_users} suspended` : ''}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
            </CardContent>
          </Card>
        </NavLink>

        {/* Card 2: Departments */}
        <NavLink
          to="/admin/departments"
          tabIndex={0}
          onKeyDown={(e) => handleCardKeyDown(e, '/admin/departments')}
          className="group block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#991b1f] transition-transform"
          aria-label="Departments management: View all active departments"
        >
          <Card className="h-full hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer">
            <CardContent className="p-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Departments</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{stats?.total_departments ?? 0}</h3>
                  <p className="text-[10px] text-slate-500 font-semibold mt-1">
                    {stats?.active_departments ?? 0} Active Units
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
            </CardContent>
          </Card>
        </NavLink>

        {/* Card 3: Roles */}
        <NavLink
          to="/admin/roles"
          tabIndex={0}
          onKeyDown={(e) => handleCardKeyDown(e, '/admin/roles')}
          className="group block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#991b1f] transition-transform"
          aria-label="Roles management: View RBAC permission levels"
        >
          <Card className="h-full hover:shadow-md hover:border-amber-300 transition-all cursor-pointer">
            <CardContent className="p-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Roles</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{stats?.total_roles ?? 0}</h3>
                  <p className="text-[10px] text-slate-500 font-semibold mt-1">
                    {stats?.active_roles ?? 0} Active RBAC Levels
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
            </CardContent>
          </Card>
        </NavLink>

        {/* Card 4: Audit Logs */}
        <NavLink
          to="/admin/audit-logs"
          tabIndex={0}
          onKeyDown={(e) => handleCardKeyDown(e, '/admin/audit-logs')}
          className="group block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#991b1f] transition-transform"
          aria-label="Audit Logs: View enterprise ledger events"
        >
          <Card className="h-full hover:shadow-md hover:border-rose-300 transition-all cursor-pointer">
            <CardContent className="p-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 flex-shrink-0 group-hover:scale-105 transition-transform">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Audit Logs</p>
                  <h3 className="text-2xl font-bold text-rose-600 mt-0.5">
                    {(stats?.total_audit_logs ?? 0).toLocaleString()}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-semibold mt-1">Total Audit Events</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
            </CardContent>
          </Card>
        </NavLink>
      </div>

      {/* ── 3. COMPACT NEEDS ATTENTION SECTION ──────────────────────────────── */}
      <div className="space-y-2.5">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Needs Attention</h2>
          <p className="text-[11px] text-slate-500">Items that may require your attention</p>
        </div>

        {hasAttentionIssues ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {inactiveCount > 0 && (
              <NavLink
                to="/admin/users?status=inactive"
                tabIndex={0}
                onKeyDown={(e) => handleCardKeyDown(e, '/admin/users?status=inactive')}
                className="group block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                aria-label={`${inactiveCount} inactive accounts require review`}
              >
                <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl hover:bg-amber-100/60 hover:border-amber-300 transition-all flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 flex-shrink-0">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-amber-900 block">
                        {inactiveCount} Inactive Account{inactiveCount === 1 ? '' : 's'}
                      </span>
                      <span className="text-[11px] text-amber-700 font-medium block">
                        Review inactive employee accounts
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-amber-700 group-hover:translate-x-1 transition-transform flex-shrink-0" />
                </div>
              </NavLink>
            )}

            {suspendedCount > 0 && (
              <NavLink
                to="/admin/users?status=suspended"
                tabIndex={0}
                onKeyDown={(e) => handleCardKeyDown(e, '/admin/users?status=suspended')}
                className="group block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                aria-label={`${suspendedCount} suspended accounts require review`}
              >
                <div className="p-3.5 bg-rose-50/70 border border-rose-200/80 rounded-xl hover:bg-rose-100/60 hover:border-rose-300 transition-all flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700 flex-shrink-0">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-rose-900 block">
                        {suspendedCount} Suspended Account{suspendedCount === 1 ? '' : 's'}
                      </span>
                      <span className="text-[11px] text-rose-700 font-medium block">
                        Review account status
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-rose-700 group-hover:translate-x-1 transition-transform flex-shrink-0" />
                </div>
              </NavLink>
            )}
          </div>
        ) : (
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-center gap-3 text-emerald-800">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 flex-shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-emerald-900 block">All caught up</span>
              <span className="text-[11px] text-emerald-700 font-medium block">
                No administrative issues require your attention.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── 4. RECENT AUDITS & ORGANIZATION SETTINGS ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Audit Trail (Left - 2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100/80 pb-3.5">
              <div>
                <h3 className="text-base font-bold text-slate-900">Recent Audit Trail</h3>
                <p className="text-[11px] text-slate-400 font-medium">Real-time system actions ledger</p>
              </div>
              <NavLink
                to="/admin/audit-logs"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 self-start sm:self-auto"
              >
                <span>Full Trail</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </NavLink>
            </CardHeader>

            {/* Lightweight Audit Trail Filters */}
            <div className="p-3 bg-slate-50/80 border-b border-slate-100 flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-slate-500 font-semibold text-[11px]">
                <Filter className="w-3 h-3" />
                <span>Filter:</span>
              </div>

              {/* Action Filter */}
              <select
                aria-label="Filter audit logs by action"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 font-medium"
              >
                <option value="">All Actions</option>
                {COMMON_AUDIT_ACTIONS.map((act) => (
                  <option key={act} value={act}>
                    {act}
                  </option>
                ))}
              </select>

              {/* User Filter */}
              {systemUsers.length > 0 && (
                <select
                  aria-label="Filter audit logs by user"
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 font-medium max-w-[140px] truncate"
                >
                  <option value="">All Users</option>
                  {systemUsers.map((u, idx) => (
                    <option key={`${u.user_id}-${idx}`} value={u.user_id}>
                      {u.full_name}
                    </option>
                  ))}
                </select>
              )}

              {/* Date Filter */}
              <select
                aria-label="Filter audit logs by date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 font-medium"
              >
                <option value="">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
              </select>

              {(actionFilter || userFilter || dateFilter) && (
                <button
                  onClick={() => {
                    setActionFilter('');
                    setUserFilter('');
                    setDateFilter('');
                  }}
                  className="text-[11px] text-slate-400 hover:text-slate-700 underline ml-auto"
                >
                  Clear Filters
                </button>
              )}
            </div>

            <CardContent className="p-0">
              {recentAudits.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No system audit records match the current criteria.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {recentAudits.map((log) => (
                    <div
                      key={log.log_id}
                      className="p-3.5 space-y-1 hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="flex justify-between items-start text-[10px] text-slate-400 font-bold uppercase">
                        <span>BY: {log.user_name || 'System / Cron'}</span>
                        <span className="flex items-center gap-1 font-medium">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-800 tracking-tight">{log.action}</span>
                        <Badge variant="neutral" className="font-mono text-[9px] lowercase px-1.5 py-0.5">
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

        {/* Quick Organization Settings (Right - 1 Col) */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="border-b border-slate-100/80 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Organization Settings</h3>
              <p className="text-[11px] text-slate-400 font-medium">Administration shortcuts</p>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              <NavLink
                to="/admin/departments"
                tabIndex={0}
                onKeyDown={(e) => handleCardKeyDown(e, '/admin/departments')}
                className="group block p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200/80 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors block">
                      Manage Departments
                    </span>
                    <span className="text-[11px] text-slate-400 block font-medium">
                      Create and organize company departments
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </div>
              </NavLink>

              <NavLink
                to="/admin/roles"
                tabIndex={0}
                onKeyDown={(e) => handleCardKeyDown(e, '/admin/roles')}
                className="group block p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200/80 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors block">
                      Access Roles (RBAC)
                    </span>
                    <span className="text-[11px] text-slate-400 block font-medium">
                      Manage roles and access permissions
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </div>
              </NavLink>

              <NavLink
                to="/admin/users"
                tabIndex={0}
                onKeyDown={(e) => handleCardKeyDown(e, '/admin/users')}
                className="group block p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200/80 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors block">
                      Employee Accounts
                    </span>
                    <span className="text-[11px] text-slate-400 block font-medium">
                      Manage employee accounts and account status
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </div>
              </NavLink>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
