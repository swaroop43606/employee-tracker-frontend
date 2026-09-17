import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  ClipboardCheck,
  ListTodo,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  AlertCircle,
  UserX,
  FileText,
  Edit3,
  MessageSquare,
  Activity,
  ChevronRight,
  RotateCw,
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { api } from '../../../services/api';
import { Card, CardHeader, CardContent } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Badge } from '../../../components/Badge';
import { formatDate, formatDateTime } from '../../../utils/date';
import type { DirectorDashboardResponse } from '../../../types/director';

export const DirectorDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Live Director Dashboard Data State
  const [dashboardData, setDashboardData] = useState<DirectorDashboardResponse | null>(null);

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
      const res = await api.get<DirectorDashboardResponse>('/director/dashboard');
      if (res.success && res.data) {
        setDashboardData(res.data);
      } else {
        setError(res.message || 'Unable to load dashboard data.');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const formatRelativeTime = (timestamp: string): string => {
    if (!timestamp) return '';
    try {
      const now = new Date();
      const date = new Date(timestamp);
      const diffMs = now.getTime() - date.getTime();
      if (isNaN(diffMs)) return formatDateTime(timestamp);

      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);

      if (diffSec < 60) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHour < 24) return `${diffHour}h ago`;
      if (diffDay === 1) return 'Yesterday';
      if (diffDay < 7) return `${diffDay}d ago`;
      return formatDateTime(timestamp);
    } catch {
      return timestamp;
    }
  };

  const renderActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'daily_update_submitted':
        return (
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4" />
          </div>
        );
      case 'daily_update_updated':
        return (
          <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center flex-shrink-0">
            <Edit3 className="w-4 h-4" />
          </div>
        );
      case 'task_completed':
        return (
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        );
      case 'task_assigned':
        return (
          <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center flex-shrink-0">
            <ListTodo className="w-4 h-4" />
          </div>
        );
      case 'review_actioned':
        return (
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
            <ClipboardCheck className="w-4 h-4" />
          </div>
        );
      case 'comment_added':
        return (
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0">
            <Activity className="w-4 h-4" />
          </div>
        );
    }
  };

  // ── 1. LOADING SKELETON STATE ──
  if (loading) {
    return (
      <div className="space-y-6" data-testid="dashboard-loading-skeleton">
        {/* Header Skeleton */}
        <div className="h-28 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 animate-pulse rounded-2xl border border-slate-200" />

        {/* 4 Summary Cards Skeletons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-slate-100 animate-pulse rounded-2xl border border-slate-200/80 p-4" />
          ))}
        </div>

        {/* Needs Attention Skeleton */}
        <div className="space-y-3">
          <div className="h-5 w-40 bg-slate-200 animate-pulse rounded-md" />
          <div className="h-28 bg-slate-100 animate-pulse rounded-2xl border border-slate-200/80" />
        </div>

        {/* Lower Two Columns Skeletons */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 bg-slate-100 animate-pulse rounded-2xl border border-slate-200/80" />
          <div className="h-72 bg-slate-100 animate-pulse rounded-2xl border border-slate-200/80" />
        </div>
      </div>
    );
  }

  // ── 2. ERROR STATE ──
  if (error || !dashboardData) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 text-center border border-rose-200 bg-rose-50/30 rounded-2xl shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3.5">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Unable to load dashboard data.</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {error || 'Failed to retrieve Director dashboard metrics.'}
          </p>
          <div className="mt-5 flex justify-center">
            <Button
              variant="primary"
              size="sm"
              onClick={loadDashboardData}
              leftIcon={<RotateCw className="w-3.5 h-3.5" />}
              className="bg-[#991b1f] hover:bg-[#85161a] text-white"
            >
              Try again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const { summary, alerts, recent_activity, pending_updates } = dashboardData;

  // Alert flags
  const hasOverdueAlert = alerts.overdue_tasks_count > 0;
  const hasPendingAlert = alerts.pending_reviews_count > 0;
  const hasMissingAlert = alerts.missing_updates_count > 0;
  const activeAlertsCount =
    (hasOverdueAlert ? 1 : 0) + (hasPendingAlert ? 1 : 0) + (hasMissingAlert ? 1 : 0);

  // Strictly filter out draft updates from review queue
  const submittedPendingUpdates = (pending_updates || []).filter(
    (item) => item.overall_status === 'submitted'
  );

  // Initial display limit of 5 for recent activity
  const displayedActivities = (recent_activity || []).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* ── SECTION 1: DIRECTOR OVERVIEW HEADER ── */}
      <div className="bg-gradient-to-r from-[#991b1f] via-[#85161a] to-[#6b1215] text-white p-4 sm:p-5 rounded-2xl shadow-md shadow-[#991b1f]/15 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[#7f161a]">
        <div>
          <div className="flex items-center space-x-2.5 mb-1.5">
            <Badge
              variant="brand"
              className="bg-white/20 text-[#ffe1c5] border-white/15 font-bold text-[10px] px-2 py-0.5"
            >
              Director Overview
            </Badge>
            <span className="text-[11px] text-[#ffe1c5]/80">{todayFormatted}</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
            Director Workspace: {user?.full_name}
          </h1>
          <p className="text-xs text-white/85 mt-0.5 max-w-lg">
            Review team submissions, manage departmental tasks, and provide review feedback.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0">
          <NavLink to="/director/daily-updates?status=submitted">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<ClipboardCheck className="w-3.5 h-3.5 text-[#991b1f]" />}
              className="bg-white hover:bg-[#fff8f3] text-[#991b1f] font-bold shadow-sm border border-white/20 text-xs py-1.5 px-3"
            >
              Open Review Queue
            </Button>
          </NavLink>
        </div>
      </div>

      {/* ── SECTION 2: TOP SUMMARY METRICS (4 CARDS) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Pending Reviews */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Pending Reviews metric"
          onClick={() => navigate('/director/daily-updates?status=submitted')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigate('/director/daily-updates?status=submitted');
            }
          }}
          className="group p-4 sm:p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs hover:shadow-md hover:border-amber-300 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 flex items-center gap-4"
        >
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0 group-hover:scale-105 transition-transform">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pending Reviews
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{summary.pending_reviews}</h3>
            <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
              {summary.pending_reviews === 1 ? '1 update awaiting review' : `${summary.pending_reviews} updates awaiting review`}
            </p>
          </div>
        </div>

        {/* 2. My Team */}
        <div
          role="button"
          tabIndex={0}
          aria-label="My Team metric"
          onClick={() => navigate('/director/team')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigate('/director/team');
            }
          }}
          className="group p-4 sm:p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs hover:shadow-md hover:border-indigo-300 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 flex items-center gap-4"
        >
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0 group-hover:scale-105 transition-transform">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              My Team
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{summary.total_team}</h3>
            <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
              {summary.active_team} active members
            </p>
          </div>
        </div>

        {/* 3. Approved Updates */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Approved Updates metric"
          onClick={() => navigate('/director/daily-updates?status=reviewed')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigate('/director/daily-updates?status=reviewed');
            }
          }}
          className="group p-4 sm:p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs hover:shadow-md hover:border-emerald-300 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 flex items-center gap-4"
        >
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0 group-hover:scale-105 transition-transform">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Approved Updates
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{summary.approved_logs}</h3>
            <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
              Reviewed work logs
            </p>
          </div>
        </div>

        {/* 4. Open Tasks */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Open Tasks metric"
          onClick={() => navigate('/director/tasks')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigate('/director/tasks');
            }
          }}
          className="group p-4 sm:p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs hover:shadow-md hover:border-sky-300 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 flex items-center gap-4"
        >
          <div className="w-11 h-11 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 flex-shrink-0 group-hover:scale-105 transition-transform">
            <ListTodo className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Open Tasks
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
              {summary.open_tasks !== undefined ? summary.open_tasks : summary.active_tasks}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
              {summary.in_progress_tasks} in progress • {summary.completed_tasks} completed
            </p>
          </div>
        </div>
      </div>

      {/* ── SECTION 3: NEEDS ATTENTION ── */}
      <div className="space-y-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Needs Attention</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Items that may require your immediate attention
          </p>
        </div>

        {activeAlertsCount === 0 ? (
          /* ZERO ALERT STATE: Compact professional state */
          <div className="p-3.5 sm:p-4 bg-emerald-50/40 border border-emerald-200/80 rounded-xl shadow-2xs max-w-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-emerald-950">✓ All caught up</h3>
                <p className="text-xs text-emerald-800/80 mt-0.5">
                  There are no items requiring your immediate attention.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* ACTIVE ALERTS: Responsive balanced layout (1-alert, 2-alert, 3-alert) */
          <div
            className={`grid gap-4 ${
              activeAlertsCount === 1
                ? 'grid-cols-1 max-w-md w-full'
                : activeAlertsCount === 2
                ? 'grid-cols-1 md:grid-cols-2 max-w-3xl w-full'
                : 'grid-cols-1 md:grid-cols-3 w-full'
            }`}
          >
            {/* 🔴 Overdue Tasks Alert Card */}
            {hasOverdueAlert && (
              <div
                role="button"
                tabIndex={0}
                aria-label="View overdue tasks"
                onClick={() => navigate('/director/tasks?status=overdue')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate('/director/tasks?status=overdue');
                  }
                }}
                className="group p-4 sm:p-5 bg-gradient-to-br from-rose-50/60 via-white to-white border border-rose-200 hover:border-rose-300 rounded-2xl shadow-2xs hover:shadow-md hover:shadow-rose-500/10 transition-all duration-200 cursor-pointer flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <Badge variant="danger" className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5">
                      Action Required
                    </Badge>
                  </div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    OVERDUE TASKS
                  </h3>
                  <div className="text-2xl font-bold text-slate-900 group-hover:text-rose-700 transition-colors mt-0.5">
                    {alerts.overdue_tasks_count}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Tasks requiring immediate attention
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-rose-100 flex items-center justify-between text-xs font-semibold text-rose-700">
                  <span>View overdue tasks</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            )}

            {/* 🟠 Pending Reviews Alert Card */}
            {hasPendingAlert && (
              <div
                role="button"
                tabIndex={0}
                aria-label="View pending reviews"
                onClick={() => navigate('/director/daily-updates?status=submitted')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate('/director/daily-updates?status=submitted');
                  }
                }}
                className="group p-4 sm:p-5 bg-gradient-to-br from-amber-50/60 via-white to-white border border-amber-200 hover:border-amber-300 rounded-2xl shadow-2xs hover:shadow-md hover:shadow-amber-500/10 transition-all duration-200 cursor-pointer flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <Badge variant="warning" className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5">
                      Review Needed
                    </Badge>
                  </div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    PENDING REVIEWS
                  </h3>
                  <div className="text-2xl font-bold text-slate-900 group-hover:text-amber-800 transition-colors mt-0.5">
                    {alerts.pending_reviews_count}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Daily updates waiting for your review
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-amber-100 flex items-center justify-between text-xs font-semibold text-amber-800">
                  <span>View review queue</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            )}

            {/* 🟡 Missing Daily Updates Alert Card */}
            {hasMissingAlert && (
              <div
                role="button"
                tabIndex={0}
                aria-label="View missing daily updates"
                onClick={() => navigate('/director/team?filter=missing_update')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate('/director/team?filter=missing_update');
                  }
                }}
                className="group p-4 sm:p-5 bg-gradient-to-br from-orange-50/60 via-white to-white border border-orange-200 hover:border-orange-300 rounded-2xl shadow-2xs hover:shadow-md hover:shadow-orange-500/10 transition-all duration-200 cursor-pointer flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center flex-shrink-0">
                      <UserX className="w-4 h-4" />
                    </div>
                    <Badge
                      variant="warning"
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-orange-100 text-orange-800 border-orange-200"
                    >
                      Pending Submission
                    </Badge>
                  </div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    MISSING DAILY UPDATES
                  </h3>
                  <div className="text-2xl font-bold text-slate-900 group-hover:text-orange-800 transition-colors mt-0.5">
                    {alerts.missing_updates_count}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Daily updates have not been submitted for today
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-orange-100 flex items-center justify-between text-xs font-semibold text-orange-800">
                  <span>View missing updates</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── SECTION 4: LOWER DASHBOARD CONTENT (PENDING REVIEWS + RECENT TEAM ACTIVITY) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left: Pending Daily Updates Waiting for Review */}
        <Card className="flex flex-col">
          <CardHeader className="flex justify-between items-center pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Pending Reviews</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Submitted daily updates waiting for your review
              </p>
            </div>
            <NavLink
              to="/director/daily-updates?status=submitted"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 focus-visible:outline-none focus-visible:underline"
            >
              All Reviews <ArrowRight className="w-3.5 h-3.5" />
            </NavLink>
          </CardHeader>
          <CardContent className="p-0">
            {submittedPendingUpdates.length === 0 ? (
              /* Compact empty state (does not create huge vertical whitespace) */
              <div className="py-7 px-4 text-center flex flex-col items-center justify-center">
                <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-slate-800">✓ All caught up</h4>
                <p className="text-xs text-slate-400 mt-0.5 max-w-xs">
                  No daily updates are waiting for your review.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {submittedPendingUpdates.slice(0, 5).map((item) => (
                  <div
                    key={item.update_id}
                    className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800 truncate">
                          {item.employee_name || 'Team Member'}
                        </span>
                        {item.employee_code && (
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            {item.employee_code}
                          </span>
                        )}
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs font-medium text-slate-600">
                          {formatDate(item.work_date || item.update_date)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {item.summary ||
                          (item.items_count
                            ? `${item.items_count} tasks logged • ${item.total_hours}h`
                            : 'Daily update submitted')}
                      </p>
                      <div className="flex flex-wrap items-center gap-2.5 text-[10px] text-slate-400 mt-1 font-medium">
                        {item.submitted_at && (
                          <span>Submitted {formatRelativeTime(item.submitted_at)}</span>
                        )}
                        {item.employee_updated_at && (
                          <>
                            <span>•</span>
                            <span>
                              Last updated {formatRelativeTime(item.employee_updated_at)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      <Badge variant="warning" className="uppercase text-[9px] px-2 py-0.5 font-bold">
                        Pending Review
                      </Badge>
                      <NavLink to={`/director/daily-updates/${item.update_id}`}>
                        <Button variant="primary" size="sm" className="text-xs py-1 px-3">
                          Review
                        </Button>
                      </NavLink>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Recent Team Activity */}
        <Card className="flex flex-col">
          <CardHeader className="flex justify-between items-center pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent Team Activity</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Latest submissions and actions from your reporting team
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {displayedActivities.length === 0 ? (
              <div className="py-7 px-4 text-center text-slate-400 text-xs">
                No recent team activity logged.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {displayedActivities.map((item) => (
                  <div
                    key={item.activity_id}
                    onClick={() => {
                      if (item.link) navigate(item.link);
                    }}
                    role={item.link ? 'button' : undefined}
                    tabIndex={item.link ? 0 : undefined}
                    onKeyDown={
                      item.link
                        ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              navigate(item.link!);
                            }
                          }
                        : undefined
                    }
                    className={`p-3 sm:p-3.5 flex items-start gap-3 transition-colors ${
                      item.link
                        ? 'hover:bg-slate-50/70 cursor-pointer group focus-visible:outline-none focus-visible:bg-slate-50'
                        : ''
                    }`}
                  >
                    {renderActivityIcon(item.activity_type)}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-bold text-slate-800 leading-snug truncate group-hover:text-indigo-600 transition-colors">
                          {item.title}
                        </h4>
                        <span className="text-[10px] text-slate-400 flex-shrink-0">
                          {formatRelativeTime(item.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                        {item.description}
                      </p>
                    </div>
                    {item.link && (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all flex-shrink-0 self-center" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DirectorDashboard;
