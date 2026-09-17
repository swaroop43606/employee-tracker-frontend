import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Plus,
  ArrowRight,
  Save,
  Calendar,
  CheckSquare,
  AlertCircle,
  MoreVertical,
  Edit,
  Archive,
  X,
} from 'lucide-react';
import { api } from '../../../services/api';
import { PageHeader } from '../../../components/PageHeader';
import { Card, CardContent, CardHeader } from '../../../components/Card';
import { Badge } from '../../../components/Badge';
import { Button } from '../../../components/Button';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { getDueDateIndicator } from '../../../utils/taskStatus';
import type { TaskResponse } from '../../../types/task';

export const DirectorTasksPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlStatus = searchParams.get('status') || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // States
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // More Actions menu and Archive modal state
  const [activeMenuTaskId, setActiveMenuTaskId] = useState<string | null>(null);
  const [archiveTargetTask, setArchiveTargetTask] = useState<TaskResponse | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  // Filters
  const [searchVal, setSearchVal] = useState('');
  const [statusFilter, setStatusFilter] = useState(urlStatus);
  const [priorityFilter, setPriorityFilter] = useState('');

  useEffect(() => {
    if (urlStatus && urlStatus !== statusFilter) {
      setStatusFilter(urlStatus);
      setPage(1);
    }
  }, [urlStatus]);

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

  useEffect(() => {
    const handleGlobalClick = () => setActiveMenuTaskId(null);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveMenuTaskId(null);
        if (!archiving) setArchiveTargetTask(null);
      }
    };
    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [archiving]);

  const handleArchiveTask = async () => {
    if (!archiveTargetTask) return;
    setArchiving(true);
    setArchiveError(null);
    try {
      const res = await api.post(`/tasks/${archiveTargetTask.task_id}/archive`);
      if (res.success) {
        setSuccess('Task archived successfully');
        setArchiveTargetTask(null);
        await fetchTasks();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setArchiveError(res.message || 'Failed to archive task.');
      }
    } catch (err: any) {
      setArchiveError(err.message || 'Failed to archive task.');
    } finally {
      setArchiving(false);
    }
  };

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
              data-testid="status-filter-select"
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
              <option value="overdue">Overdue</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="archived">Archived</option>
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
                            : task.status === 'cancelled' || task.status === 'archived'
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

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <NavLink to={`/director/tasks/${task.task_id}`}>
                      <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                        View & Assign
                      </Button>
                    </NavLink>
                    <div className="relative inline-flex items-center">
                      <button
                        id={`task-actions-btn-${task.task_id}`}
                        type="button"
                        data-testid={`task-actions-btn-${task.task_id}`}
                        aria-label={`More actions for ${task.title}`}
                        aria-haspopup="true"
                        aria-expanded={activeMenuTaskId === task.task_id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuTaskId(activeMenuTaskId === task.task_id ? null : task.task_id);
                        }}
                        className={`p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 hover:border-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500/20 ${
                          activeMenuTaskId === task.task_id ? 'bg-slate-100 text-slate-800 border-slate-300' : 'bg-white'
                        }`}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {activeMenuTaskId === task.task_id && (
                        <div
                          data-testid={`task-menu-${task.task_id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100"
                        >
                          <button
                            type="button"
                            data-testid={`task-edit-btn-${task.task_id}`}
                            onClick={() => {
                              setActiveMenuTaskId(null);
                              navigate(`/director/tasks/${task.task_id}?edit=true`);
                            }}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors text-left"
                          >
                            <Edit className="w-3.5 h-3.5 text-slate-500" />
                            Edit Task
                          </button>
                          {task.status === 'archived' ? (
                            <button
                              type="button"
                              disabled
                              title="Already archived"
                              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-400 cursor-not-allowed text-left opacity-60"
                            >
                              <Archive className="w-3.5 h-3.5 text-slate-400" />
                              Archive Task
                            </button>
                          ) : (
                            <button
                              type="button"
                              data-testid={`task-archive-btn-${task.task_id}`}
                              onClick={() => {
                                setActiveMenuTaskId(null);
                                setArchiveTargetTask(task);
                              }}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 hover:text-amber-800 transition-colors text-left"
                            >
                              <Archive className="w-3.5 h-3.5 text-amber-600" />
                              Archive Task
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
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

      {/* Archive Task Confirmation Modal */}
      {archiveTargetTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => {
            if (!archiving) setArchiveTargetTask(null);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="archive-modal-title"
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-amber-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-amber-100 bg-amber-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700">
                  <Archive className="w-4 h-4" />
                </div>
                <div>
                  <h3 id="archive-modal-title" className="text-sm font-bold text-slate-900">
                    Archive Task?
                  </h3>
                  <p className="text-[11px] text-amber-700 font-medium">{archiveTargetTask.task_code}</p>
                </div>
              </div>
              <button
                type="button"
                disabled={archiving}
                onClick={() => setArchiveTargetTask(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                <h4 className="text-sm font-bold text-slate-900 leading-snug">{archiveTargetTask.title}</h4>
                <p className="text-xs text-slate-500 font-medium">
                  {archiveTargetTask.description || 'No description provided.'}
                </p>
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-900 leading-relaxed">
                  This task will no longer appear in active task lists or be available for new assignments. Existing assignments, daily updates, reviews, comments, attachments, task history, and audit records will be preserved.
                </p>
              </div>

              {archiveError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold text-rose-700 leading-relaxed">{archiveError}</p>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={archiving}
                  onClick={() => setArchiveTargetTask(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  isLoading={archiving}
                  disabled={archiving}
                  onClick={handleArchiveTask}
                  className="bg-amber-600 hover:bg-amber-700 text-white shadow-xs focus:ring-amber-500"
                  leftIcon={<Archive className="w-4 h-4" />}
                >
                  Archive Task
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DirectorTasksPage;
