import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  CalendarPlus,
  CheckSquare,
  Clock,
  ArrowRight,
  ListTodo,
  CheckCircle2,
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
import { getLocalDate } from '../../../utils/date';
import { getDueDateIndicator } from '../../../utils/taskStatus';

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
      setTotalTasks(allTasks.length);

      const completed = allTasks.filter(t => t.status === 'completed' || t.completion_percentage === 100);
      const inProg = allTasks.filter(t => t.status === 'active' && t.completion_percentage > 0 && t.completion_percentage < 100);
      const pending = allTasks.filter(t => t.status === 'active' && t.completion_percentage === 0);

      setCompletedTasks(completed.length);
      setInProgressTasks(inProg.length);
      setPendingTasks(pending.length);

      // Active tasks for the table view (open & in progress)
      const activeList = allTasks.filter(t => t.status !== 'completed' && t.completion_percentage < 100);
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

      setTodayUpdate(todayUpdateItem);
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
            {todayUpdate?.overall_status === 'submitted'
              ? "Today's update has been submitted for Director review."
              : todayUpdate?.overall_status === 'reviewed'
              ? "Today's update has been reviewed by your Director."
              : "Today's update is pending. Record your hours and submit your daily update."}
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
              {todayUpdate?.overall_status === 'submitted' || todayUpdate?.overall_status === 'reviewed'
                ? "View Today's Update"
                : "Fill Today's Update"}
            </Button>
          </NavLink>
        </div>
      </div>

      {/* Task Lifecycle Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tasks */}
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
              <CheckSquare className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Tasks</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{totalTasks}</h3>
            </div>
          </CardContent>
        </Card>

        {/* Pending Tasks */}
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 flex-shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending</p>
              <h3 className="text-2xl font-bold text-amber-600 mt-0.5">{pendingTasks}</h3>
            </div>
          </CardContent>
        </Card>

        {/* In Progress */}
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-600 flex-shrink-0">
              <ListTodo className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">In Progress</p>
              <h3 className="text-2xl font-bold text-sky-600 mt-0.5">{inProgressTasks}</h3>
            </div>
          </CardContent>
        </Card>

        {/* Completed */}
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completed</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-0.5">{completedTasks}</h3>
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
                        <div className="flex items-center gap-2">
                          {(() => {
                            const dueInfo = getDueDateIndicator(
                              assignment.due_date,
                              assignment.status,
                              assignment.completion_percentage
                            );
                            return dueInfo ? (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${dueInfo.className}`}>
                                {dueInfo.label}
                              </span>
                            ) : null;
                          })()}
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
