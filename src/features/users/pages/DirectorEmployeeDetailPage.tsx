import React, { useEffect, useState } from 'react';
import { useParams, NavLink } from 'react-router-dom';
import {
  ArrowLeft,
  Building,
  Mail,
  User,
  ListTodo,
  Clock,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import { api } from '../../../services/api';
import { PageHeader } from '../../../components/PageHeader';
import { Card, CardHeader, CardContent } from '../../../components/Card';
import { Badge } from '../../../components/Badge';
import { Button } from '../../../components/Button';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { ErrorState } from '../../../components/Feedback';
import { formatDate, formatDateTime } from '../../../utils/date';
import type { UserListItem } from '../../../types/user';
import type { TaskAssignmentResponse } from '../../../types/task';
import type { DailyUpdateListItem } from '../../../types/dailyUpdate';

export const DirectorEmployeeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // States
  const [employee, setEmployee] = useState<UserListItem | null>(null);
  const [assignments, setAssignments] = useState<TaskAssignmentResponse[]>([]);
  const [updates, setUpdates] = useState<DailyUpdateListItem[]>([]);

  const loadEmployeeDetails = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch employee details
      const userRes = await api.get<UserListItem>(`/users/${id}`);
      if (userRes.success && userRes.data) {
        setEmployee(userRes.data);
      }

      // 2. Fetch employee task assignments (limit 50)
      const tasksRes = await api.getPaginated<TaskAssignmentResponse>('/task-assignments', {
        employee_id: id,
        page_size: 50,
      });
      setAssignments(tasksRes.data?.items || []);

      // 3. Fetch employee daily updates (limit 50)
      const updatesRes = await api.getPaginated<DailyUpdateListItem>('/daily-updates', {
        employee_id: id,
        page_size: 50,
      });
      setUpdates(updatesRes.data?.items || []);

    } catch (err: any) {
      setError(err.message || 'Failed to retrieve employee detail logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployeeDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="h-[75vh] flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading employee workspace profile..." />
      </div>
    );
  }

  if (error && !employee) {
    return <ErrorState message={error} onRetry={loadEmployeeDetails} />;
  }

  if (!employee) {
    return <ErrorState message="Employee profile not found." />;
  }

  return (
    <div className="space-y-6">
      <NavLink
        to="/director/employees"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Directory
      </NavLink>

      <PageHeader
        title={employee.full_name}
        subtitle={`${employee.designation || 'Staff Employee'} • ${employee.employee_code}`}
        badgeText="Employee Profile Detail"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Card: Profile & Metrics */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader className="flex flex-col items-center justify-center p-6 text-center border-b-0">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center font-extrabold text-xl text-white shadow-md mb-3">
                {employee.full_name.charAt(0)}
              </div>
              <h3 className="text-base font-bold text-slate-800 leading-tight">{employee.full_name}</h3>
              <p className="text-xs text-slate-400 mt-1 font-semibold">{employee.designation || 'Specialist'}</p>
              <Badge
                variant={employee.status === 'active' ? 'success' : 'neutral'}
                className="uppercase font-bold mt-2.5"
              >
                {employee.status}
              </Badge>
            </CardHeader>

            <CardContent className="border-t border-slate-100 pt-4 space-y-3.5 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-slate-400" />
                <span>Department: {employee.department_name || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                <span>Code: {employee.employee_code}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                <span>Email: {employee.email}</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Subordinate stats summary */}
          <Card>
            <CardHeader>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Workload Metrics</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Active Tasks Assigned</span>
                <span className="font-bold text-indigo-600 text-sm">
                  {assignments.filter(t => t.status === 'active').length}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Completed Tasks</span>
                <span className="font-bold text-slate-700 text-sm">
                  {assignments.filter(t => t.status === 'completed').length}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Total Updates Logged</span>
                <span className="font-bold text-slate-700 text-sm">{updates.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Cards: Task assignments & Daily Updates */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Assignments */}
          <Card>
            <CardHeader>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ListTodo className="w-4.5 h-4.5 text-indigo-600" />
                Assigned Tasks ({assignments.length})
              </h3>
            </CardHeader>
            <CardContent className="p-0">
              {assignments.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No task assignments found for this employee.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {assignments.map((item) => (
                    <div key={item.assignment_id} className="p-4 flex items-center justify-between text-xs gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            {item.task_code}
                          </span>
                          <h4 className="font-bold text-slate-800">{item.task_title}</h4>
                          <Badge
                            variant={item.status === 'completed' ? 'success' : item.status === 'dropped' ? 'danger' : 'warning'}
                            className="uppercase text-[9px]"
                          >
                            {item.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-400">
                          <span>Progress: {item.completion_percentage}%</span>
                          {item.due_date && <span>• Due: {new Date(item.due_date).toLocaleDateString()}</span>}
                        </div>
                      </div>

                      <NavLink to={`/director/tasks/${item.task_id}`}>
                        <Button variant="outline" size="sm" className="p-2 rounded-xl">
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </NavLink>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Daily updates log */}
          <Card>
            <CardHeader>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4.5 h-4.5 text-indigo-600" />
                Daily Logs History
              </h3>
            </CardHeader>
            <CardContent className="p-0">
              {updates.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No daily updates submitted by this employee yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {updates.map((up) => (
                    <div key={up.update_id} className="p-4 flex items-center justify-between text-xs gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span className="font-bold text-slate-800">
                            <span className="text-slate-500 font-semibold text-xs mr-1">Work Date:</span>
                            {formatDate(up.work_date || up.update_date)}
                          </span>
                          <Badge
                            variant={up.overall_status === 'reviewed' ? 'success' : up.overall_status === 'submitted' ? 'info' : 'neutral'}
                            className="uppercase text-[9px]"
                          >
                            {up.overall_status}
                          </Badge>
                        </div>
                        <p className="text-slate-500 line-clamp-1 text-[11px] max-w-lg">
                          {up.summary || 'No summary comments recorded.'}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span>Total Hours: {up.total_hours} hrs</span>
                          {up.submitted_at && (
                            <>
                              <span>•</span>
                              <span>Submitted: {formatDateTime(up.submitted_at)}</span>
                            </>
                          )}
                          <span>•</span>
                          <span>Last updated: {formatDateTime(up.employee_updated_at || up.created_at)}</span>
                        </div>
                      </div>

                      <NavLink to={`/director/daily-updates/${up.update_id}`}>
                        <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                          Review details
                        </Button>
                      </NavLink>
                    </div>
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

export default DirectorEmployeeDetailPage;
