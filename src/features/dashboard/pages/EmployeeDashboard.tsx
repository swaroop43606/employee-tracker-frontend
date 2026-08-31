import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  CalendarPlus,
  CheckSquare,
  Clock,
  ArrowRight,
  Sparkles,
  Bell,
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { api } from '../../../services/api';
import { Card, CardHeader, CardContent } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Badge } from '../../../components/Badge';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { ErrorState } from '../../../components/Feedback';
import type { TaskAssignmentResponse } from '../../../types/task';
import type { DailyUpdateListItem } from '../../../types/dailyUpdate';
import type { UnreadCountResponse } from '../../../types/notification';

export const EmployeeDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // States for stats
  const [activeTasks, setActiveTasks] = useState<TaskAssignmentResponse[]>([]);
  const [todayUpdate, setTodayUpdate] = useState<DailyUpdateListItem | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
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
      const todayDateStr = new Date().toISOString().split('T')[0];

      // Fetch active task assignments
      const tasksRes = await api.getPaginated<TaskAssignmentResponse>('/task-assignments', {
        employee_id: user?.user_id,
        status_filter: 'active',
        page_size: 50,
      });

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

      // Fetch unread notifications count
      let unreadCount = 0;
      try {
        const unreadRes = await api.get<UnreadCountResponse>('/notifications/unread-count');
        if (unreadRes.success && unreadRes.data) {
          unreadCount = unreadRes.data.unread_count;
        }
      } catch {
        // Ignore notification errors
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

      setActiveTasks(tasksRes.data?.items || []);
      setTodayUpdate(todayUpdateItem);
      setUnreadNotifications(unreadCount);
      setRecentUpdates(recentList);
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

  // Count task status types
  const activeCount = activeTasks.length;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
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
          <p className="text-xs text-white/85 mt-0.5 max-w-lg">
            Track your assigned daily tasks, record hours spent, and submit your daily update for Director review.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0">
          <NavLink to="/employee/daily-update">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<CalendarPlus className="w-3.5 h-3.5 text-[#991b1f]" />}
              className="bg-white hover:bg-[#fff8f3] text-[#991b1f] font-bold shadow-sm border border-white/20 text-xs py-1.5 px-3"
            >
              Fill Today's Update
            </Button>
          </NavLink>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
              <CheckSquare className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Assignments</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{activeCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Today's Hours</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
                {todayUpdate ? todayUpdate.total_hours : 0} hrs
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 flex-shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Today's Update</p>
              <div className="mt-1">
                {todayUpdate ? (
                  <Badge variant={todayUpdate.overall_status === 'submitted' ? 'success' : 'warning'} className="uppercase">
                    {todayUpdate.overall_status}
                  </Badge>
                ) : (
                  <Badge variant="neutral" className="uppercase">
                    Not Started
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 flex-shrink-0">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Inbox Alerts</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{unreadNotifications}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: My Active Tasks + Submissions History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Active Tasks */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <h3 className="text-base font-bold text-slate-900">My Active Task List</h3>
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
                  {activeTasks.slice(0, 5).map((assignment) => (
                    <NavLink
                      key={assignment.assignment_id}
                      to={`/employee/tasks/${assignment.assignment_id}`}
                      className="block p-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono font-bold text-slate-400">
                              {assignment.task_code}
                            </span>
                            <span className="text-sm font-semibold text-slate-800 truncate">
                              {assignment.task_title}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 truncate mt-1">
                            {assignment.employee_notes || 'No notes added'}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                            {assignment.completion_percentage}%
                          </span>
                          <ChevronRightIcon className="w-4 h-4 text-slate-400" />
                        </div>
                      </div>
                    </NavLink>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Column: Recent Daily Updates */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h3 className="text-base font-bold text-slate-900">Recent Submissions</h3>
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
                  {recentUpdates.map((update) => (
                    <NavLink
                      key={update.update_id}
                      to={`/employee/daily-updates/${update.update_id}`}
                      className="block p-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-slate-700">
                            {new Date(update.update_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                          <p className="text-xs text-slate-500 truncate max-w-[150px] mt-0.5">
                            {update.summary || 'No summary'}
                          </p>
                        </div>
                        <Badge
                          variant={
                            update.overall_status === 'reviewed'
                              ? 'success'
                              : update.overall_status === 'submitted'
                              ? 'info'
                              : 'neutral'
                          }
                          className="uppercase sm:text-[10px]"
                        >
                          {update.overall_status}
                        </Badge>
                      </div>
                    </NavLink>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
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
