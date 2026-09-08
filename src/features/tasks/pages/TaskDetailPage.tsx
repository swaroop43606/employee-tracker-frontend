import React, { useEffect, useState } from 'react';
import { useParams, NavLink } from 'react-router-dom';
import { ArrowLeft, Save, History, CheckCircle, AlertTriangle } from 'lucide-react';
import { api } from '../../../services/api';
import { PageHeader } from '../../../components/PageHeader';
import { Card, CardHeader, CardContent } from '../../../components/Card';
import { Badge } from '../../../components/Badge';
import { Button } from '../../../components/Button';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { ErrorState } from '../../../components/Feedback';
import { getErrorMessage } from '../../../utils/errorHandling';
import type { TaskAssignmentResponse, AssignmentStatus, TaskHistoryResponse } from '../../../types/task';

export const TaskDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Core assignment & history state
  const [assignment, setAssignment] = useState<TaskAssignmentResponse | null>(null);
  const [history, setHistory] = useState<TaskHistoryResponse[]>([]);

  // Form states
  const [status, setStatus] = useState<AssignmentStatus>('active');
  const [completionPercentage, setCompletionPercentage] = useState<number>(0);
  const [employeeNotes, setEmployeeNotes] = useState<string>('');

  const loadDetails = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Get task assignment details
      const assignRes = await api.get<TaskAssignmentResponse>(`/task-assignments/${id}`);
      if (assignRes.success && assignRes.data) {
        const data = assignRes.data;
        setAssignment(data);
        setStatus(data.status);
        setCompletionPercentage(data.completion_percentage);
        setEmployeeNotes(data.employee_notes || '');

        // 2. Fetch history if available
        try {
          const histRes = await api.get<TaskHistoryResponse[]>(`/tasks/${data.task_id}/history`);
          if (histRes.success && histRes.data) {
            setHistory(histRes.data);
          }
        } catch {
          // Ignore history load failures if employee is not authorized or no logs exist
        }
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to fetch task assignment details.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setSaving(true);
    setSuccess(null);
    setError(null);

    try {
      const updatePayload = {
        status,
        completion_percentage: Number(completionPercentage),
        employee_notes: employeeNotes,
      };

      const res = await api.patch<TaskAssignmentResponse>(`/task-assignments/${id}`, updatePayload);
      if (res.success && res.data) {
        setAssignment(res.data);
        setSuccess('Task assignment updated successfully!');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to update assignment.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[75vh] flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading task workspace..." />
      </div>
    );
  }

  if (error && !assignment) {
    return <ErrorState message={error} onRetry={loadDetails} />;
  }

  if (!assignment) {
    return <ErrorState message="Task assignment not found." />;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <NavLink
        to="/employee/tasks"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to My Tasks
      </NavLink>

      <PageHeader
        title={assignment.task_title || 'Task Details'}
        subtitle={`Task Code: ${assignment.task_code}`}
        badgeText="Task Assignment"
      />

      {success && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200/80 rounded-xl flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <p className="text-xs font-semibold text-emerald-700">{success}</p>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200/80 rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <p className="text-xs font-semibold text-rose-700">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Columns: Info & History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Detailed Task Description */}
          <Card>
            <CardHeader>
              <h3 className="text-base font-bold text-slate-900">Task Information</h3>
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
                Priority: {assignment.task_priority || 'medium'}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 font-bold block">START DATE</span>
                  <span className="text-slate-700 font-semibold mt-0.5 block">
                    {assignment.start_date ? new Date(assignment.start_date).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">DUE DATE</span>
                  <span className="text-slate-700 font-semibold mt-0.5 block">
                    {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-400 font-bold block mb-1">DELEGATED BY</span>
                <span className="text-sm text-slate-700 font-medium bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1">
                  {assignment.assigned_by_name || 'System'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* History Timeline */}
          {history.length > 0 && (
            <Card>
              <CardHeader>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-600" />
                  Task Action History
                </h3>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {history.map((log) => (
                    <div key={log.history_id} className="p-4 text-xs space-y-1">
                      <div className="flex justify-between text-slate-400">
                        <span className="font-bold text-slate-600 uppercase tracking-wide">
                          {log.action_type}
                        </span>
                        <span>{new Date(log.changed_at).toLocaleString()}</span>
                      </div>
                      <p className="text-slate-700 font-medium">
                        Changed by: {log.changed_by_name || 'Manager'}
                      </p>
                      {log.remarks && (
                        <p className="text-[11px] text-slate-500 italic bg-slate-50/50 p-1.5 rounded">
                          "{log.remarks}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Update Action Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h3 className="text-base font-bold text-slate-900">Task Workspace</h3>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-5">
                {/* Status Dropdown */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Assignment Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => {
                      const newStatus = e.target.value as AssignmentStatus;
                      setStatus(newStatus);
                      if (newStatus === 'completed') {
                        setCompletionPercentage(100);
                      } else if (newStatus === 'active' && completionPercentage === 100) {
                        setCompletionPercentage(90);
                      }
                    }}
                    className="block w-full py-2.5 px-3.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-semibold"
                  >
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="dropped">Dropped</option>
                  </select>
                </div>

                {/* Progress Percentage */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Completion Progress
                    </label>
                    <span className="text-xs font-extrabold text-slate-800">
                      {completionPercentage}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={completionPercentage}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setCompletionPercentage(val);
                      if (val === 100) {
                        setStatus('completed');
                      } else if (val < 100 && status === 'completed') {
                        setStatus('active');
                      }
                    }}
                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>

                {/* Employee Notes */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    My Work Notes
                  </label>
                  <textarea
                    rows={4}
                    value={employeeNotes}
                    onChange={(e) => setEmployeeNotes(e.target.value)}
                    placeholder="Describe progress, current obstacles, or status notes..."
                    className="block w-full p-3.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full justify-center"
                  isLoading={saving}
                  leftIcon={<Save className="w-4 h-4" />}
                >
                  Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailPage;
