import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  ClipboardCheck,
  ListTodo,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { api } from '../../../services/api';
import { Card, CardHeader, CardContent } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Badge } from '../../../components/Badge';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { ErrorState } from '../../../components/Feedback';
import { formatDate } from '../../../utils/date';
import type { UserListItem } from '../../../types/user';
import type { TaskAssignmentResponse } from '../../../types/task';
import type { DailyUpdateListItem } from '../../../types/dailyUpdate';

export const DirectorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Aggregated Metric States
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [activeEmployees, setActiveEmployees] = useState(0);
  const [activeAssignments, setActiveAssignments] = useState(0);
  const [completedAssignments, setCompletedAssignments] = useState(0);
  const [pendingReviews, setPendingReviews] = useState(0);
  const [approvedUpdates, setApprovedUpdates] = useState(0);
  const [pendingUpdates, setPendingUpdates] = useState<DailyUpdateListItem[]>([]);

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
      // 1. Fetch managed employees (limit 100)
      const usersRes = await api.getPaginated<UserListItem>('/users', {
        page_size: 100,
      });
      const allUsers = usersRes.data?.items || [];
      // Filter out self
      const team = allUsers.filter(u => u.user_id !== user?.user_id);
      setTotalEmployees(team.length);
      setActiveEmployees(team.filter(u => u.status === 'active').length);

      // 2. Fetch all subordinate task assignments (limit 100)
      const tasksRes = await api.getPaginated<TaskAssignmentResponse>('/task-assignments', {
        page_size: 100,
      });
      const assignments = tasksRes.data?.items || [];
      setActiveAssignments(assignments.filter(t => t.status === 'active').length);
      setCompletedAssignments(assignments.filter(t => t.status === 'completed').length);

      // 3. Fetch subordinate daily updates (limit 100)
      const updatesRes = await api.getPaginated<DailyUpdateListItem>('/daily-updates', {
        page_size: 100,
      });
      const updates = updatesRes.data?.items || [];
      const pending = updates.filter(u => u.overall_status === 'submitted' && u.employee_id !== user?.user_id);
      setPendingUpdates(pending);
      setPendingReviews(pending.length);
      setApprovedUpdates(updates.filter(u => u.overall_status === 'reviewed').length);

    } catch (err: any) {
      setError(err.message || 'Failed to aggregate Director dashboard metrics.');
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
        <LoadingSpinner size="lg" text="Analyzing team metrics..." />
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
          <NavLink to="/director/daily-updates">
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

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Reviews */}
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 flex-shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Reviews</p>
              <h3 className="text-2xl font-bold text-amber-600 mt-0.5">{pendingReviews}</h3>
            </div>
          </CardContent>
        </Card>

        {/* Team Members */}
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">My Team ({activeEmployees} active)</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{totalEmployees}</h3>
            </div>
          </CardContent>
        </Card>

        {/* Reviewed/Approved Updates */}
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Approved Logs</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{approvedUpdates}</h3>
            </div>
          </CardContent>
        </Card>

        {/* Active Tasks */}
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-600 flex-shrink-0">
              <ListTodo className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Tasks ({completedAssignments} done)</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{activeAssignments}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Daily Updates Waiting for Review */}
      <Card>
        <CardHeader className="flex justify-between items-center">
          <div>
            <h3 className="text-base font-bold text-slate-900">Pending Reviews</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Daily updates submitted by your team waiting for review
            </p>
          </div>
          <NavLink
            to="/director/daily-updates"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            All Reviews <ArrowRight className="w-3.5 h-3.5" />
          </NavLink>
        </CardHeader>
        <CardContent className="p-0">
          {pendingUpdates.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No daily updates are waiting for review.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pendingUpdates.slice(0, 5).map((item) => (
                <div
                  key={item.update_id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800">
                        {item.employee_name || 'Team Member'}
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs font-medium text-slate-500">
                        {formatDate(item.update_date)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {item.summary || (item.items_count ? `${item.items_count} tasks logged • ${item.total_hours}h` : 'Daily update submitted')}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <Badge variant="warning" className="uppercase text-[10px]">
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
    </div>
  );
};

export default DirectorDashboard;
