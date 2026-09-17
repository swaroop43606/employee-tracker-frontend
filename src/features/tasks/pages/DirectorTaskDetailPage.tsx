import React, { useEffect, useState } from 'react';
import { useParams, NavLink, useSearchParams } from 'react-router-dom';
import { ArrowLeft, UserPlus, Save, CheckSquare, AlertCircle, History, Clock } from 'lucide-react';
import { api } from '../../../services/api';
import { PageHeader } from '../../../components/PageHeader';
import { Card, CardHeader, CardContent } from '../../../components/Card';
import { Badge } from '../../../components/Badge';
import { Button } from '../../../components/Button';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { ErrorState } from '../../../components/Feedback';
import type { TaskResponse, TaskHistoryResponse, TaskAssignmentResponse } from '../../../types/task';
import type { UserListItem } from '../../../types/user';

export const DirectorTaskDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // States
  const [task, setTask] = useState<TaskResponse | null>(null);
  const [history, setHistory] = useState<TaskHistoryResponse[]>([]);
  const [assignments, setAssignments] = useState<TaskAssignmentResponse[]>([]);
  const [team, setTeam] = useState<UserListItem[]>([]);

  // Task edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPriority, setEditPriority] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editDueDate, setEditDueDate] = useState('');

  // Task assignment form state
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [assignStartDate, setAssignStartDate] = useState('');
  const [assignDueDate, setAssignDueDate] = useState('');

  const loadTaskData = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch task details
      const taskRes = await api.get<TaskResponse>(`/tasks/${id}`);
      if (taskRes.success && taskRes.data) {
        const t = taskRes.data;
        setTask(t);
        setEditTitle(t.title);
        setEditDesc(t.description || '');
        setEditPriority(t.priority);
        setEditStatus(t.status);
        setEditDueDate(t.due_date ? t.due_date.split('T')[0] : '');
      }

      // 2. Fetch task change history
      try {
        const historyRes = await api.get<TaskHistoryResponse[]>(`/tasks/${id}/history`);
        if (historyRes.success && historyRes.data) {
          setHistory(historyRes.data);
        }
      } catch {
        // Ignore history loading errors
      }

      // 3. Fetch active task assignments
      try {
        const assignmentsRes = await api.getPaginated<TaskAssignmentResponse>('/task-assignments', {
          task_id: id,
          page_size: 100,
        });
        setAssignments(assignmentsRes.data?.items || []);
      } catch {
        // Ignore assignments loading errors
      }

      // 4. Fetch list of potential assignable team employees (limit 100)
      try {
        const teamRes = await api.getPaginated<UserListItem>('/users', {
          page_size: 100,
          status_filter: 'active',
        });
        // Filter out manager/admin if necessary, keeping 'employee' role only
        const employeesOnly = (teamRes.data?.items || []).filter(u => u.role_name === 'employee');
        setTeam(employeesOnly);
      } catch {
        // Ignore team load errors
      }

    } catch (err: any) {
      setError(err.message || 'Failed to load task details workspace.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTaskData();
  }, [id]);

  useEffect(() => {
    if (searchParams.get('edit') === 'true') {
      setIsEditing(true);
    }
  }, [searchParams]);

  // Update task details
  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !editTitle.trim()) return;

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.patch<TaskResponse>(`/tasks/${id}`, {
        title: editTitle,
        description: editDesc || null,
        priority: editPriority,
        status: editStatus,
        due_date: editDueDate || null,
      });

      if (res.success && res.data) {
        setTask(res.data);
        setSuccess('Task details updated successfully!');
        setIsEditing(false);
        // Refresh history
        const historyRes = await api.get<TaskHistoryResponse[]>(`/tasks/${id}/history`);
        setHistory(historyRes.data || []);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update task.');
    } finally {
      setSaving(false);
    }
  };

  // Assign task to selected employee
  const handleAssignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !selectedEmployee) return;

    setAssigning(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.post<TaskAssignmentResponse>(`/tasks/${id}/assign`, {
        employee_id: selectedEmployee,
        start_date: assignStartDate || null,
        due_date: assignDueDate || null,
      });

      if (res.success && res.data) {
        setSuccess('Task assigned to employee successfully!');
        setSelectedEmployee('');
        setAssignStartDate('');
        setAssignDueDate('');

        // Refresh assignments list
        const assignmentsRes = await api.getPaginated<TaskAssignmentResponse>('/task-assignments', {
          task_id: id,
          page_size: 100,
        });
        setAssignments(assignmentsRes.data?.items || []);

        // Refresh task change history
        try {
          const historyRes = await api.get<TaskHistoryResponse[]>(`/tasks/${id}/history`);
          if (historyRes.success && historyRes.data) {
            setHistory(historyRes.data);
          }
        } catch {
          // Ignore history loading error
        }

        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to allocate task assignment.');
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[75vh] flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading task workstation..." />
      </div>
    );
  }

  if (error && !task) {
    return <ErrorState message={error} onRetry={loadTaskData} />;
  }

  if (!task) {
    return <ErrorState message="Task details not found." />;
  }

  return (
    <div className="space-y-6">
      <NavLink
        to="/director/tasks"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Tasks
      </NavLink>

      <PageHeader
        title={`${task.task_code}: ${task.title}`}
        subtitle={task.description || 'No description comments registered.'}
        badgeText="Task Detail Workspace"
        action={
          <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
            {isEditing ? 'Cancel Edit' : 'Edit Details'}
          </Button>
        }
      />

      {success && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200/80 rounded-xl flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <p className="text-xs font-semibold text-emerald-700">{success}</p>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200/80 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <p className="text-xs font-semibold text-rose-700">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details form / info & assignments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Edit Task details Form */}
          {isEditing ? (
            <Card>
              <CardHeader>
                <h3 className="text-sm font-bold text-slate-900">Edit Task Specification</h3>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateTask} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Title</label>
                    <input
                      type="text"
                      required
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="block w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Description</label>
                    <textarea
                      rows={3}
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      className="block w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Priority</label>
                      <select
                        value={editPriority}
                        onChange={(e) => setEditPriority(e.target.value)}
                        className="block w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Status</label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                        className="block w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Due Date</label>
                      <input
                        type="date"
                        value={editDueDate}
                        onChange={(e) => setEditDueDate(e.target.value)}
                        className="block w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" size="sm" isLoading={saving} leftIcon={<Save className="w-4 h-4" />}>
                      Save Changes
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            /* Details card representation */
            <Card>
              <CardHeader>
                <h3 className="text-base font-bold text-slate-900">Task Information</h3>
                <div className="flex gap-2">
                  <Badge
                    variant={
                      task.status === 'completed'
                        ? 'success'
                        : task.status === 'cancelled' || task.status === 'archived'
                        ? 'neutral'
                        : 'info'
                    }
                    className="uppercase font-bold"
                  >
                    {task.status}
                  </Badge>
                  <Badge variant="brand" className="uppercase font-bold">
                    Priority: {task.priority}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 whitespace-pre-wrap">
                  {task.description || 'No detailed specifications entered.'}
                </p>
                <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-500 pt-2">
                  <span>Start Date: {task.start_date ? new Date(task.start_date).toLocaleDateString() : 'N/A'}</span>
                  <span>Due Date: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Task history timeline */}
          <Card>
            <CardHeader>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <History className="w-4.5 h-4.5 text-indigo-600" />
                Change Timeline Log
              </h3>
            </CardHeader>
            <CardContent className="p-0">
              {history.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No modification history logged.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {history.map((log) => (
                    <div key={log.history_id} className="p-4 space-y-2">
                      <div className="flex justify-between items-start text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                        <span>BY: {log.changed_by_name || 'System Admin'}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(log.changed_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="font-semibold text-slate-700">
                        Action: <span className="text-indigo-600 uppercase font-mono font-bold text-[10px] bg-indigo-50 px-1.5 py-0.5 rounded">{log.action_type}</span>
                      </div>
                      {log.remarks && (
                        <p className="text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          Remarks: {log.remarks}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Allocation & Active assignments */}
        <div className="space-y-6">
          {/* Assignment form or Archived Banner */}
          {task.status === 'archived' ? (
            <div className="p-4 bg-amber-50 border border-amber-200/80 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-900">Task Archived</h4>
                <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                  This task is archived and cannot be assigned to new employees.
                </p>
              </div>
            </div>
          ) : task.status !== 'completed' && task.status !== 'cancelled' ? (
            <Card>
              <CardHeader>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-indigo-600" />
                  Assign Task Delegations
                </h3>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAssignTask} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Select Employee</label>
                    <select
                      required
                      value={selectedEmployee}
                      onChange={(e) => setSelectedEmployee(e.target.value)}
                      className="block w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                    >
                      <option value="">Choose reporting member...</option>
                      {team.map(emp => {
                        const isAlreadyAssigned = assignments.some(
                          a => a.employee_id === emp.user_id && a.status === 'active'
                        );
                        return (
                          <option key={emp.user_id} value={emp.user_id}>
                            {emp.full_name} ({emp.employee_code}){isAlreadyAssigned ? ' — Already Assigned' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={assignStartDate}
                      onChange={(e) => setAssignStartDate(e.target.value)}
                      className="block w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Due Date</label>
                    <input
                      type="date"
                      value={assignDueDate}
                      onChange={(e) => setAssignDueDate(e.target.value)}
                      className="block w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    className="w-full justify-center"
                    isLoading={assigning}
                    leftIcon={<UserPlus className="w-4 h-4" />}
                  >
                    Assign Employee
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {/* Active Assignments List */}
          <Card>
            <CardHeader>
              <h3 className="text-sm font-bold text-slate-900">Current Allocations</h3>
            </CardHeader>
            <CardContent className="p-0">
              {assignments.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">No active employee allocations.</div>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {assignments.map(ass => (
                    <div key={ass.assignment_id} className="p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <NavLink
                          to={`/director/employees/${ass.employee_id}`}
                          className="font-bold text-slate-700 hover:text-indigo-600 truncate max-w-[150px]"
                        >
                          {ass.employee_name}
                        </NavLink>
                        <Badge
                          variant={ass.status === 'completed' ? 'success' : ass.status === 'dropped' ? 'danger' : 'warning'}
                          className="uppercase text-[9px]"
                        >
                          {ass.status}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>Progress: {ass.completion_percentage}%</span>
                        {ass.due_date && <span>Due: {new Date(ass.due_date).toLocaleDateString()}</span>}
                      </div>
                      {ass.employee_notes && (
                        <p className="text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
                          "{ass.employee_notes}"
                        </p>
                      )}
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

export default DirectorTaskDetailPage;
