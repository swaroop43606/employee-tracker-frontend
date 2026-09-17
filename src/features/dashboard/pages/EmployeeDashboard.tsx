import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  CheckSquare,
  Clock,
  ArrowRight,
  ListTodo,
  CheckCircle2,
  Calendar,
  Target,
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { api } from '../../../services/api';
import { Card, CardHeader, CardContent } from '../../../components/Card';
import { Badge } from '../../../components/Badge';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { ErrorState } from '../../../components/Feedback';
import type { TaskAssignmentResponse } from '../../../types/task';
import type { DailyUpdateListItem } from '../../../types/dailyUpdate';
import { getLocalDate, formatDate, formatHours } from '../../../utils/date';
import { getDueDateIndicator, calculateTaskLifecycleMetrics, matchesStatusFilter } from '../../../utils/taskStatus';

export const EmployeeDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // States for stats
  const [totalTasks, setTotalTasks] = useState(0);
  const [pendingTasks, setPendingTasks] = useState(0);
  const [inProgressTasks, setInProgressTasks] = useState(0);
  const [completedTasks, setCompletedTasks] = useState(0);
  const [activeTasks, setActiveTasks] = useState<TaskAssignmentResponse[]>([]);
  const [todayUpdate, setTodayUpdate] = useState<DailyUpdateListItem | null>(null);
  const [recentUpdates, setRecentUpdates] = useState<DailyUpdateListItem[]>([]);

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
      const todayDateStr = getLocalDate();

      // Fetch employee task assignments (limit 100 for lifecycle metrics)
      const tasksRes = await api.getPaginated<TaskAssignmentResponse>('/task-assignments', {
        employee_id: user?.user_id,
        page_size: 100,
      });
      const allTasks = tasksRes.data?.items || [];
      const metrics = calculateTaskLifecycleMetrics(allTasks);

      setTotalTasks(metrics.total);
      setPendingTasks(metrics.pending);
      setInProgressTasks(metrics.inProgress);
      setCompletedTasks(metrics.completed);

      // Active tasks for the list view (open & in progress, excluding dropped/cancelled)
      // Sorted in ASCENDING order (assigned_at ASC, stable assignment_id ASC tiebreaker)
      const activeList = allTasks
        .filter(t => matchesStatusFilter(t, 'active'))
        .sort((a, b) => {
          const timeA = a.assigned_at ? new Date(a.assigned_at).getTime() : 0;
          const timeB = b.assigned_at ? new Date(b.assigned_at).getTime() : 0;
          if (timeA !== timeB) return timeA - timeB;
          return (a.assignment_id || '').localeCompare(b.assignment_id || '');
        });
      setActiveTasks(activeList);

      // Fetch today's daily update
      let todayUpdateItem: DailyUpdateListItem | null = null;
      try {
        const todayUpdateRes = await api.getPaginated<DailyUpdateListItem>('/daily-updates', {
          employee_id: user?.user_id,
          date_from: todayDateStr,
          date_to: todayDateStr,
        });
        if (todayUpdateRes.success && todayUpdateRes.data?.items?.length > 0) {
          todayUpdateItem = todayUpdateRes.data.items[0];
        }
      } catch {
        // Fallback or ignore date check errors
      }

      // Fetch recent daily updates list
      let recentList: DailyUpdateListItem[] = [];
      try {
        const recentRes = await api.getPaginated<DailyUpdateListItem>('/daily-updates', {
          employee_id: user?.user_id,
          page_size: 5,
        });
        if (recentRes.success && recentRes.data) {
          recentList = recentRes.data.items;
        }
      } catch {
        // Ignore recent history errors
      }

      // 1. Determine the 5 most recent daily updates (descending by update_date, created_at, update_id)
      const mostRecentFive = [...recentList]
        .sort((a, b) => {
          const timeA = new Date(a.update_date).getTime();
          const timeB = new Date(b.update_date).getTime();
          if (timeB !== timeA) return timeB - timeA;
          const createdA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const createdB = b.created_at ? new Date(b.created_at).getTime() : 0;
          if (createdB !== createdA) return createdB - createdA;
          return (b.update_id || '').localeCompare(a.update_id || '');
        })
        .slice(0, 5);

      // 2. Display those 5 records in ASCENDING chronological order (Oldest -> Newest)
      const sortedRecent = mostRecentFive.sort((a, b) => {
        const timeA = new Date(a.update_date).getTime();
        const timeB = new Date(b.update_date).getTime();
        if (timeA !== timeB) return timeA - timeB;
        const createdA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const createdB = b.created_at ? new Date(b.created_at).getTime() : 0;
        if (createdA !== createdB) return createdA - createdB;
        return (a.update_id || '').localeCompare(b.update_id || '');
      });

      setTodayUpdate(todayUpdateItem);
      setRecentUpdates(sortedRecent);
    } catch (err: any) {
      setError(err.message || 'Unable to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  if (loading) {
    return (
      <div className="h-[70vh] flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading your dashboard..." />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadDashboardData} />;
  }

  // Derived data for Today's Focus section
  const urgentTasks = activeTasks.filter(t => {
    const dueInfo = getDueDateIndicator(t.due_date, t.status, t.completion_percentage);
    return dueInfo && (dueInfo.type === 'overdue' || dueInfo.type === 'due_today' || dueInfo.type === 'due_soon');
  });

  const inProgressList = activeTasks.filter(t => matchesStatusFilter(t, 'in_progress'));

  return (
    <div className="space-y-6">
      {/* 1. Improved Welcome Banner */}
      <div className="bg-gradient-to-r from-[#991b1f] via-[#85161a] to-[#6b1215] text-white p-4 sm:p-5 rounded-2xl shadow-md shadow-[#991b1f]/15 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[#7f161a]">
        <div>
          <div className="flex items-center space-x-2.5 mb-1.5">
            <Badge variant="brand" className="bg-white/20 text-[#ffe1c5] border-white/15 font-bold text-[10px] px-2 py-0.5">
              Employee Workspace
            </Badge>
            <span className="text-[11px] text-[#ffe1c5]/80">{todayFormatted}</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
            Welcome back, {user?.full_name?.split(' ')[0]}!
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/90 mt-1">
            <span>
              <strong className="text-white">{pendingTasks}</strong> pending {pendingTasks === 1 ? 'task' : 'tasks'}
              {' • '}
              <strong className="text-white">{inProgressTasks}</strong> in progress
            </span>
            <span className="text-white/40 hidden sm:inline">|</span>
            <span className="inline-flex items-center gap-1.5">
              {todayUpdate?.overall_status === 'submitted' ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 flex-shrink-0" />
                  <span className="text-[#ffe1c5]">Today's update: <strong className="text-white">Submitted</strong> (Awaiting review)</span>
                </>
              ) : todayUpdate?.overall_status === 'reviewed' ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 flex-shrink-0" />
                  <span className="text-[#ffe1c5]">Today's update: <strong className="text-white">Reviewed</strong></span>
                </>
              ) : todayUpdate?.overall_status === 'draft' ? (
                <>
                  <Clock className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" />
                  <span className="text-[#ffe1c5]">Today's update: <strong className="text-amber-200">Draft Saved</strong> (Not submitted)</span>
                </>
              ) : (
                <>
                  <Clock className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" />
                  <span className="text-[#ffe1c5]">Today's update: <strong className="text-amber-200">Pending</strong></span>
                </>
              )}
            </span>
          </div>
        </div>

      </div>

      {/* 2. Actionable Task Lifecycle Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tasks */}
        <NavLink to="/employee/tasks" className="block group">
          <Card className="h-full border-slate-200/80 group-hover:border-indigo-200 group-hover:shadow-md transition-all duration-150 cursor-pointer">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0 group-hover:scale-105 transition-transform">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Tasks</p>
                  <h3 className="text-xl font-bold text-slate-900 mt-0.5">{totalTasks}</h3>
                </div>
              </div>
              <div className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all">
                <ArrowRight className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
        </NavLink>

        {/* Pending Tasks */}
        <NavLink to="/employee/tasks?status=pending" className="block group">
          <Card className="h-full border-slate-200/80 group-hover:border-amber-200 group-hover:shadow-md transition-all duration-150 cursor-pointer">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Pending</p>
                  <h3 className="text-xl font-bold text-amber-600 mt-0.5">{pendingTasks}</h3>
                </div>
              </div>
              <div className="text-slate-300 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all">
                <ArrowRight className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
        </NavLink>

        {/* In Progress */}
        <NavLink to="/employee/tasks?status=in_progress" className="block group">
          <Card className="h-full border-slate-200/80 group-hover:border-sky-200 group-hover:shadow-md transition-all duration-150 cursor-pointer">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600 flex-shrink-0 group-hover:scale-105 transition-transform">
                  <ListTodo className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">In Progress</p>
                  <h3 className="text-xl font-bold text-sky-600 mt-0.5">{inProgressTasks}</h3>
                </div>
              </div>
              <div className="text-slate-300 group-hover:text-sky-600 group-hover:translate-x-0.5 transition-all">
                <ArrowRight className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
        </NavLink>

        {/* Completed */}
        <NavLink to="/employee/tasks?status=completed" className="block group">
          <Card className="h-full border-slate-200/80 group-hover:border-emerald-200 group-hover:shadow-md transition-all duration-150 cursor-pointer">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0 group-hover:scale-105 transition-transform">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Completed</p>
                  <h3 className="text-xl font-bold text-emerald-600 mt-0.5">{completedTasks}</h3>
                </div>
              </div>
              <div className="text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all">
                <ArrowRight className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
        </NavLink>
      </div>

      {/* 3 & 4. Main Grid: My Active Tasks + Submissions History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Active Tasks */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-slate-900">My Active Task List</h3>
                <p className="text-xs text-slate-500 mt-0.5">Tasks assigned to you that require attention or progress updates</p>
              </div>
              <NavLink
                to="/employee/tasks"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                All tasks <ArrowRight className="w-3.5 h-3.5" />
              </NavLink>
            </CardHeader>
            <CardContent className="p-0">
              {activeTasks.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-sm">
                  No active task assignments found.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {activeTasks.slice(0, 5).map((assignment) => {
                    const dueInfo = getDueDateIndicator(
                      assignment.due_date,
                      assignment.status,
                      assignment.completion_percentage
                    );
                    const isPending = assignment.completion_percentage === 0;

                    return (
                      <NavLink
                        key={assignment.assignment_id}
                        to={`/employee/tasks/${assignment.assignment_id}`}
                        className="block p-4 hover:bg-slate-50/80 transition-colors group"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60">
                                {assignment.task_code || 'TASK'}
                              </span>
                              <span className="text-sm font-semibold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                                {assignment.task_title}
                              </span>
                              {assignment.task_priority && (
                                <Badge
                                  variant={
                                    assignment.task_priority === 'critical' || assignment.task_priority === 'high'
                                      ? 'danger'
                                      : assignment.task_priority === 'medium'
                                      ? 'warning'
                                      : 'neutral'
                                  }
                                  className="text-[9px] uppercase px-1.5 py-0"
                                >
                                  {assignment.task_priority}
                                </Badge>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1.5">
                              {assignment.due_date ? (
                                <span className="flex items-center gap-1 text-[11px]">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  Due {formatDate(assignment.due_date)}
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-400">No due date</span>
                              )}
                              {assignment.employee_notes && (
                                <>
                                  <span className="text-slate-300 hidden sm:inline">•</span>
                                  <span className="truncate max-w-[280px] text-[11px] text-slate-500 italic">
                                    {assignment.employee_notes}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 flex-shrink-0 sm:self-center">
                            {dueInfo && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${dueInfo.className}`}>
                                {dueInfo.label}
                              </span>
                            )}

                            <Badge
                              variant={isPending ? 'warning' : 'info'}
                              className="text-[10px] uppercase font-semibold"
                            >
                              {isPending ? 'Pending' : 'In Progress'}
                            </Badge>

                            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/60 px-2 py-0.5 rounded-md">
                              <div className="w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden hidden sm:block">
                                <div
                                  className="h-full bg-indigo-600 rounded-full transition-all"
                                  style={{ width: `${assignment.completion_percentage}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-slate-700">
                                {assignment.completion_percentage}%
                              </span>
                            </div>

                            <ChevronRightIcon className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Column: Recent Submissions */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-slate-900">Recent Submissions</h3>
                <p className="text-xs text-slate-500 mt-0.5">Your recent daily tracker history</p>
              </div>
              <NavLink
                to="/employee/daily-updates"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                History <ArrowRight className="w-3.5 h-3.5" />
              </NavLink>
            </CardHeader>
            <CardContent className="p-0">
              {recentUpdates.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-sm">
                  No daily updates recorded.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentUpdates.map((update) => {
                    const isDraft = update.overall_status === 'draft';
                    const isToday = (update.work_date || update.update_date) === getLocalDate();
                    const targetUrl = isDraft && isToday
                      ? '/employee/daily-update'
                      : `/employee/daily-updates/${update.update_id}`;

                    return (
                      <NavLink
                        key={update.update_id}
                        to={targetUrl}
                        className="block p-3.5 hover:bg-slate-50/80 transition-colors group"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold text-slate-800">
                                {formatDate(update.work_date || update.update_date)}
                              </p>
                              <Badge
                                variant={
                                  update.overall_status === 'reviewed'
                                    ? 'success'
                                    : update.overall_status === 'submitted'
                                    ? 'info'
                                    : 'warning'
                                }
                                className="uppercase text-[9px] font-bold"
                              >
                                {isDraft ? 'Draft' : update.overall_status}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-500 truncate mt-1">
                              {update.summary
                                ? update.summary
                                : isDraft
                                ? 'Draft in progress — not yet submitted'
                                : `${update.items_count || 0} tasks logged • ${formatHours(update.total_hours)}`}
                            </p>
                          </div>

                          <div className="text-right flex-shrink-0">
                            <span className="text-[11px] font-semibold text-indigo-600 group-hover:text-indigo-800 flex items-center gap-0.5">
                              {isDraft ? 'Continue' : 'View'}
                              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                            </span>
                          </div>
                        </div>
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 5. Effective Space Use: Today's Focus & Action Items */}
      <Card>
        <CardHeader className="flex justify-between items-center pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Today's Focus & Action Items</h3>
              <p className="text-xs text-slate-500">Immediate priorities, active tasks in progress, and daily reporting status</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* 1. Urgency / Attention */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between space-y-2.5">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Urgent Priorities</span>
                  {urgentTasks.length > 0 ? (
                    <Badge variant="danger" className="text-[10px]">{urgentTasks.length} need attention</Badge>
                  ) : (
                    <Badge variant="success" className="text-[10px]">On track</Badge>
                  )}
                </div>
                {urgentTasks.length > 0 ? (
                  <div className="space-y-2 mt-2">
                    {urgentTasks.slice(0, 2).map(t => {
                      const ind = getDueDateIndicator(t.due_date, t.status, t.completion_percentage);
                      return (
                        <NavLink
                          key={t.assignment_id}
                          to={`/employee/tasks/${t.assignment_id}`}
                          className="block text-xs font-semibold text-slate-800 hover:text-indigo-600 truncate"
                        >
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded mr-1.5 border ${ind?.className}`}>
                            {ind?.label}
                          </span>
                          {t.task_title}
                        </NavLink>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    All active tasks are on track. No tasks overdue or due soon.
                  </p>
                )}
              </div>
              <NavLink to="/employee/tasks" className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 pt-1 border-t border-slate-200/60">
                View all tasks <ArrowRight className="w-3 h-3" />
              </NavLink>
            </div>

            {/* 2. Tasks in Progress */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between space-y-2.5">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active In-Flight</span>
                  <span className="text-xs font-bold text-sky-700">{inProgressList.length} active</span>
                </div>
                {inProgressList.length > 0 ? (
                  <div className="space-y-2 mt-2">
                    {inProgressList.slice(0, 2).map(t => (
                      <NavLink
                        key={t.assignment_id}
                        to={`/employee/tasks/${t.assignment_id}`}
                        className="block group text-xs text-slate-800 hover:text-sky-700"
                      >
                        <div className="flex justify-between items-center font-semibold truncate mb-1">
                          <span className="truncate">{t.task_title}</span>
                          <span className="text-[11px] text-sky-700 ml-2">{t.completion_percentage}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-sky-600 rounded-full" style={{ width: `${t.completion_percentage}%` }} />
                        </div>
                      </NavLink>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 mt-2">
                    No tasks currently in progress. Select a pending task to begin working.
                  </p>
                )}
              </div>
              <NavLink to="/employee/tasks?status=in_progress" className="text-[11px] font-bold text-sky-700 hover:text-sky-900 inline-flex items-center gap-1 pt-1 border-t border-slate-200/60">
                Open in-progress tasks <ArrowRight className="w-3 h-3" />
              </NavLink>
            </div>

            {/* 3. Daily Tracker Status */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between space-y-2.5">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Daily Tracker</span>
                  <Badge
                    variant={
                      todayUpdate?.overall_status === 'reviewed'
                        ? 'success'
                        : todayUpdate?.overall_status === 'submitted'
                        ? 'info'
                        : 'warning'
                    }
                    className="text-[10px] uppercase font-bold"
                  >
                    {todayUpdate?.overall_status || 'Pending'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  {todayUpdate?.overall_status === 'reviewed'
                    ? "Today's daily submission has been approved and reviewed by your Director."
                    : todayUpdate?.overall_status === 'submitted'
                    ? "Today's update is submitted and currently waiting for Director review."
                    : todayUpdate?.overall_status === 'draft'
                    ? "You have saved changes for today. Don't forget to submit before end of shift."
                    : "You haven't submitted today's daily update yet. Remember to log your hours."}
                </p>
              </div>
              <NavLink
                to={
                  todayUpdate?.overall_status === 'draft' || !todayUpdate
                    ? '/employee/daily-update'
                    : `/employee/daily-updates/${todayUpdate.update_id}`
                }
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 pt-1 border-t border-slate-200/60"
              >
                {todayUpdate?.overall_status === 'draft'
                  ? "Continue today's draft"
                  : todayUpdate?.overall_status === 'submitted' || todayUpdate?.overall_status === 'reviewed'
                  ? 'View submitted update'
                  : 'Fill daily update now'}
                <ArrowRight className="w-3 h-3" />
              </NavLink>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Internal icon helpers for visual aesthetics
const ChevronRightIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    className={props.className}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

export default EmployeeDashboard;
