import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Search, Plus, ArrowRight, Save, Calendar, CheckSquare, AlertCircle } from 'lucide-react';
import { api } from '../../../services/api';
import { PageHeader } from '../../../components/PageHeader';
import { Card, CardContent, CardHeader } from '../../../components/Card';
import { Badge } from '../../../components/Badge';
import { Button } from '../../../components/Button';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { getDueDateIndicator } from '../../../utils/taskStatus';
import type { TaskResponse } from '../../../types/task';

export const DirectorTasksPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // States
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [searchVal, setSearchVal] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Task creation form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getPaginated<TaskResponse>('/tasks', {
        search: searchVal || undefined,
        status_filter: statusFilter || undefined,
        priority_filter: priorityFilter || undefined,
        page,
        page_size: 10,
      });

      if (res.success && res.data) {
        setTasks(res.data.items || []);
        setTotalPages(res.data.total_pages || 1);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve task directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [page, statusFilter, priorityFilter, searchVal]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await api.post<TaskResponse>('/tasks', {
        title,
        description: description || null,
        priority,
        start_date: startDate || null,
        due_date: dueDate || null,
      });

      if (res.success && res.data) {
        setSuccess('Task created successfully!');
        setShowCreateModal(false);
        // Clear forms
        setTitle('');
        setDescription('');
        setPriority('medium');
        setStartDate('');
        setDueDate('');
        // Refresh
        fetchTasks();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create new task.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks Management Hub"
        subtitle="Review task lists, allocate assignments, and create new departmental deliverables."
        badgeText="Department Deliverables"
        action={
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setShowCreateModal(true);
              setError(null);
              setSuccess(null);
            }}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Create New Task
          </Button>
        }
      />

      {success && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200/80 rounded-xl flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <p className="text-xs font-semibold text-emerald-700">{success}</p>
        </div>
      )}

      {error && !showCreateModal && (
        <div className="p-3.5 bg-rose-50 border border-rose-200/80 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <p className="text-xs font-semibold text-rose-700">{error}</p>
        </div>
      )}

      {/* Filters Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-60">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchVal}
                onChange={(e) => {
                  setSearchVal(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 focus:outline-none"
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchVal('');
              setStatusFilter('');
              setPriorityFilter('');
              setPage(1);
            }}
          >
            Clear Filters
          </Button>
        </CardContent>
      </Card>

      {/* Task Creation Modal/Card */}
      {showCreateModal && (
        <Card className="border border-indigo-200 bg-indigo-50/10 max-w-2xl">
          <CardHeader>
            <h3 className="text-sm font-bold text-slate-900">Create Department Deliverable</h3>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 mb-4">
                <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                <p className="text-xs font-semibold text-rose-700">{error}</p>
              </div>
            )}
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="Task title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="block w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Task context, requirements, criteria..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="block w-full p-3 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="block w-full p-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="block w-full p-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="block w-full p-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={saving} leftIcon={<Save className="w-4 h-4" />}>
                  Save Task
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Task table list */}
      {loading ? (
        <LoadingSpinner size="lg" text="Loading deliverables..." />
      ) : tasks.length === 0 ? (
        <Card className="p-8 text-center text-slate-400 text-xs">
          No tasks found matching your filter selections.
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {tasks.map((task) => (
              <Card key={task.task_id} hoverEffect>
                <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        {task.task_code}
                      </span>
                      <h4 className="text-sm font-bold text-slate-800 leading-snug">
                        {task.title}
                      </h4>
                      <Badge
                        variant={
                          task.priority === 'critical' || task.priority === 'high'
                            ? 'danger'
                            : task.priority === 'medium'
                            ? 'warning'
                            : 'neutral'
                        }
                        className="uppercase text-[9px] py-0 px-2 font-bold"
                      >
                        {task.priority}
                      </Badge>
                      <Badge
                        variant={
                          task.status === 'completed'
                            ? 'success'
                            : task.status === 'cancelled'
                            ? 'neutral'
                            : 'info'
                        }
                        className="uppercase text-[9px] py-0 px-2 font-bold"
                      >
                        {task.status}
                      </Badge>
                      {(() => {
                        const dueInfo = getDueDateIndicator(
                          task.due_date,
                          task.status
                        );
                        return dueInfo ? (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${dueInfo.className}`}>
                            {dueInfo.label}
                          </span>
                        ) : null;
                      })()}
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-1 max-w-xl">
                      {task.description || 'No description provided.'}
                    </p>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400 font-semibold pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}
                      </span>
                      <span>•</span>
                      <span>Assignments Count: {task.assignments_count || 0}</span>
                    </div>
                  </div>

                  <NavLink to={`/director/tasks/${task.task_id}`}>
                    <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                      View & Assign
                    </Button>
                  </NavLink>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
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

export default DirectorTasksPage;
