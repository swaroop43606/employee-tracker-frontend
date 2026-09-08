import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Search, SlidersHorizontal, Clock, ArrowRight } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { api } from '../../../services/api';
import { PageHeader } from '../../../components/PageHeader';
import { Card, CardContent } from '../../../components/Card';
import { Badge } from '../../../components/Badge';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { ErrorState } from '../../../components/Feedback';
import { Button } from '../../../components/Button';
import { getDueDateIndicator } from '../../../utils/taskStatus';
import type { TaskAssignmentResponse } from '../../../types/task';

export const TasksListPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [assignments, setAssignments] = useState<TaskAssignmentResponse[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');

  const fetchMyAssignments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getPaginated<TaskAssignmentResponse>('/task-assignments', {
        employee_id: user?.user_id,
        status_filter: statusFilter || undefined,
        page,
        page_size: 10,
      });

      if (res.success && res.data) {
        let items = res.data.items || [];

        // Client-side filtering for priority and title search if backend does not fully support it
        if (search) {
          items = items.filter(
            (item) =>
              (item.task_title?.toLowerCase().includes(search.toLowerCase()) ||
                item.task_code?.toLowerCase().includes(search.toLowerCase()))
          );
        }
        if (priorityFilter) {
          items = items.filter((item) => item.task_priority === priorityFilter);
        }

        setAssignments(items);
        setTotalPages(res.data.total_pages || 1);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch task assignments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyAssignments();
  }, [user, page, statusFilter, priorityFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMyAssignments();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Assigned Tasks"
        subtitle="Browse and monitor tasks delegated to you, set completion levels, and update notes."
        badgeText="Task Workspace"
      />

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by code or title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Status Select */}
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="dropped">Dropped</option>
                </select>
              </div>

              {/* Priority Select */}
              <select
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value);
                  setPage(1);
                }}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>

              <Button type="submit" variant="outline" size="sm">
                Apply Search
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Tasks Content */}
      {loading ? (
        <LoadingSpinner size="lg" text="Loading assignments..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchMyAssignments} />
      ) : assignments.length === 0 ? (
        <Card className="p-8 text-center text-slate-500 text-sm">
          No task assignments match the selected filters.
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {assignments.map((assignment) => (
              <Card key={assignment.assignment_id} hoverEffect>
                <CardContent className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                        {assignment.task_code}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 truncate">
                        {assignment.task_title}
                      </h3>
                      <Badge
                        variant={
                          assignment.task_priority === 'critical' || assignment.task_priority === 'high'
                            ? 'danger'
                            : assignment.task_priority === 'medium'
                            ? 'warning'
                            : 'neutral'
                        }
                        className="uppercase"
                      >
                        {assignment.task_priority}
                      </Badge>
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
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Due:{' '}
                        {assignment.due_date
                          ? new Date(assignment.due_date).toLocaleDateString()
                          : 'No due date'}
                      </span>
                      <span>•</span>
                      <span>Assigned by: {assignment.assigned_by_name || 'System'}</span>
                    </div>

                    <p className="text-xs text-slate-500 max-w-2xl truncate mt-1">
                      {assignment.employee_notes || 'No custom employee notes recorded.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-400">Progress</p>
                      <p className="text-lg font-extrabold text-slate-800">
                        {assignment.completion_percentage}%
                      </p>
                    </div>

                    <NavLink to={`/employee/tasks/${assignment.assignment_id}`}>
                      <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                        Manage
                      </Button>
                    </NavLink>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous Page
              </Button>
              <span className="text-xs text-slate-500 font-medium">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next Page
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TasksListPage;
