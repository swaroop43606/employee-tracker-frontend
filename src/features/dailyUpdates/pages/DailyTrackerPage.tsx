import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Save,
  CheckCircle,
  Paperclip,
  Check,
  AlertCircle,
  FileText,
  Trash2,
  Lock,
  CalendarDays,
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { api } from '../../../services/api';
import { PageHeader } from '../../../components/PageHeader';
import { Card, CardHeader, CardContent } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { ErrorState } from '../../../components/Feedback';
import type { TaskAssignmentResponse } from '../../../types/task';
import type { DailyUpdateResponse, DailyUpdateItemCreate, DailyUpdateItemStatus } from '../../../types/dailyUpdate';
import type { AttachmentResponse } from '../../../types/attachment';

export const DailyTrackerPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Today's date info
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // State
  const [assignments, setAssignments] = useState<TaskAssignmentResponse[]>([]);
  const [todayUpdate, setTodayUpdate] = useState<DailyUpdateResponse | null>(null);
  const [attachments, setAttachments] = useState<AttachmentResponse[]>([]);

  // Form Fields
  const [summary, setSummary] = useState('');
  const [selectedAssignments, setSelectedAssignments] = useState<string[]>([]);
  const [itemForms, setItemForms] = useState<Record<string, {
    work_description: string;
    hours_spent: number;
    progress_percentage: number;
    status: DailyUpdateItemStatus;
  }>>({});

  // File Upload State
  const [uploading, setUploading] = useState(false);

  const loadTrackerData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch active task assignments for current employee
      const activeRes = await api.getPaginated<TaskAssignmentResponse>('/task-assignments', {
        employee_id: user?.user_id,
        status_filter: 'active',
        page_size: 100,
      });
      const activeItems = activeRes.data?.items || [];
      setAssignments(activeItems);

      // Initialize forms for all active assignments
      const initialForms: typeof itemForms = {};
      activeItems.forEach(item => {
        initialForms[item.assignment_id] = {
          work_description: '',
          hours_spent: 0,
          progress_percentage: item.completion_percentage || 0,
          status: 'in_progress',
        };
      });
      setItemForms(initialForms);

      // 2. Fetch today's update (if it exists)
      try {
        const updateRes = await api.get<DailyUpdateResponse>(`/daily-updates/date/${todayDateStr}`);
        if (updateRes.success && updateRes.data) {
          const update = updateRes.data;
          setTodayUpdate(update);
          setSummary(update.summary || '');

          // Pre-select tasks from existing update
          const existingIds = update.items.map(i => i.assignment_id);
          setSelectedAssignments(existingIds);

          // Populate item forms with existing update data
          const updatedForms = { ...initialForms };
          update.items.forEach(item => {
            updatedForms[item.assignment_id] = {
              work_description: item.work_description || '',
              hours_spent: item.hours_spent,
              progress_percentage: item.progress_percentage,
              status: item.status as DailyUpdateItemStatus,
            };
          });
          setItemForms(updatedForms);

          // Load attachments for this update
          const attachRes = await api.get<AttachmentResponse[]>(`/daily-updates/${update.update_id}/attachments`);
          if (attachRes.success && attachRes.data) {
            setAttachments(attachRes.data);
          }
        }
      } catch (err: any) {
        if (err.response?.status !== 404) {
          throw err;
        }
        // 404 means no update exists for today yet, which is normal.
      }
    } catch (err: any) {
      setError(err.message || 'Unable to load today\'s daily tracker data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrackerData();
  }, [user]);

  // Handle checking/unchecking a task
  const handleToggleAssignment = (assignmentId: string) => {
    if (todayUpdate && todayUpdate.overall_status !== 'draft') return; // Read-only

    if (selectedAssignments.includes(assignmentId)) {
      setSelectedAssignments(selectedAssignments.filter(id => id !== assignmentId));
    } else {
      setSelectedAssignments([...selectedAssignments, assignmentId]);
    }
  };

  const handleItemFormChange = (
    assignmentId: string,
    field: keyof typeof itemForms[string],
    value: any
  ) => {
    setItemForms(prev => ({
      ...prev,
      [assignmentId]: {
        ...prev[assignmentId],
        [field]: value,
      },
    }));
  };

  // Helper to build payload
  const buildItemsPayload = (): DailyUpdateItemCreate[] => {
    return selectedAssignments.map(id => {
      const form = itemForms[id] || {
        work_description: '',
        hours_spent: 0,
        progress_percentage: 0,
        status: 'in_progress' as DailyUpdateItemStatus,
      };
      return {
        assignment_id: id,
        work_description: form.work_description || '',
        hours_spent: Number(form.hours_spent) || 0,
        progress_percentage: Number(form.progress_percentage) || 0,
        status: form.status || 'in_progress',
      };
    });
  };

  // Save as Draft
  const handleSaveDraft = async () => {
    setSaving(true);
    setSuccess(null);
    setError(null);

    const itemsPayload = buildItemsPayload();

    try {
      if (todayUpdate) {
        // Update existing update draft
        const res = await api.patch<DailyUpdateResponse>(`/daily-updates/${todayUpdate.update_id}`, {
          summary,
          status: 'draft',
          items: itemsPayload,
        });
        if (res.success && res.data) {
          setTodayUpdate(res.data);
          setSuccess('Draft saved successfully!');
        }
      } else {
        // Create new daily update draft
        const res = await api.post<DailyUpdateResponse>('/daily-updates', {
          update_date: todayDateStr,
          summary,
          status: 'draft',
          items: itemsPayload,
        });
        if (res.success && res.data) {
          setTodayUpdate(res.data);
          setSuccess('Draft saved successfully!');
        }
      }
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save draft update.');
    } finally {
      setSaving(false);
    }
  };

  // Submit Daily Update
  const handleSubmitUpdate = async () => {
    setSaving(true);
    setSuccess(null);
    setError(null);

    const itemsPayload = buildItemsPayload();

    try {
      let currentUpdate = todayUpdate;

      if (!currentUpdate) {
        // Create draft first
        const createRes = await api.post<DailyUpdateResponse>('/daily-updates', {
          update_date: todayDateStr,
          summary,
          status: 'draft',
          items: itemsPayload,
        });
        currentUpdate = createRes.data;
      } else {
        // Save latest updates to draft first
        const patchRes = await api.patch<DailyUpdateResponse>(`/daily-updates/${currentUpdate.update_id}`, {
          summary,
          status: 'draft',
          items: itemsPayload,
        });
        if (patchRes.data) {
          currentUpdate = patchRes.data;
        }
      }

      // Submit update
      if (currentUpdate) {
        const submitRes = await api.post<DailyUpdateResponse>(`/daily-updates/${currentUpdate.update_id}/submit`);
        if (submitRes.success && submitRes.data) {
          setTodayUpdate(submitRes.data);
          setSuccess('Daily update submitted successfully for Director review!');
          setTimeout(() => {
            navigate('/employee/daily-updates');
          }, 1200);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit daily update.');
    } finally {
      setSaving(false);
    }
  };

  // File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setSuccess(null);
    setError(null);

    try {
      let updateId = todayUpdate?.update_id;

      // Auto-save draft if update doesn't exist yet
      if (!updateId) {
        const itemsPayload = buildItemsPayload();
        const createRes = await api.post<DailyUpdateResponse>('/daily-updates', {
          update_date: todayDateStr,
          summary,
          status: 'draft',
          items: itemsPayload,
        });
        if (createRes.success && createRes.data) {
          setTodayUpdate(createRes.data);
          updateId = createRes.data.update_id;
        } else {
          throw new Error('Failed to create daily update before uploading attachment.');
        }
      }

      const formData = new FormData();
      formData.append('file', files[0]);
      formData.append('update_id', updateId);

      const res = await api.upload<AttachmentResponse>('/attachments/upload', formData);
      if (res.success && res.data) {
        setAttachments(prev => [...prev, res.data]);
        setSuccess('Attachment uploaded successfully!');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload attachment.');
    } finally {
      setUploading(false);
      // Reset input value so same file can be re-selected if needed
      e.target.value = '';
    }
  };

  // File Delete
  const handleDeleteAttachment = async (attachmentId: string) => {
    if (todayUpdate && todayUpdate.overall_status !== 'draft') return;

    try {
      const res = await api.delete(`/attachments/${attachmentId}`);
      if (res.success) {
        setAttachments(attachments.filter(a => a.attachment_id !== attachmentId));
        setSuccess('Attachment deleted successfully.');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete attachment.');
    }
  };

  if (loading) {
    return (
      <div className="h-[75vh] flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading today's workspace..." />
      </div>
    );
  }

  if (error && assignments.length === 0 && !todayUpdate) {
    return <ErrorState message={error} onRetry={loadTrackerData} />;
  }

  const isReadOnly = !!(todayUpdate && todayUpdate.overall_status !== 'draft');

  return (
    <div className="space-y-6 max-w-6xl">
      {/* 1. TOP HEADER */}
      <PageHeader
        title="Today's Daily Tracker"
        subtitle={`Date: ${todayFormatted}`}
        badgeText="Daily Workflow"
      />

      {/* Success Notification */}
      {success && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200/80 rounded-2xl flex items-center gap-2.5 shadow-sm animate-in fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <p className="text-xs font-semibold text-emerald-800">{success}</p>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200/80 rounded-2xl flex items-center gap-2.5 shadow-sm animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <p className="text-xs font-semibold text-rose-800">{error}</p>
        </div>
      )}

      {/* 2. DAILY UPDATE STATUS BANNER */}
      {isReadOnly && (
        <div className="p-4 bg-[#fff3ea] border border-[#ffe1c5] rounded-2xl flex items-center gap-3 shadow-sm">
          <div className="p-2 bg-[#991b1f] text-white rounded-xl flex-shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#991b1f] uppercase tracking-wide">
              Update Status: {todayUpdate?.overall_status?.toUpperCase()}
            </p>
            <p className="text-xs text-stone-600 mt-0.5">
              Today&apos;s daily update has been submitted for review and is locked as read-only according to workflow rules.
            </p>
          </div>
        </div>
      )}

      {/* 3 & 4. OVERALL DAILY SUMMARY AND ATTACHMENTS (Side-by-Side on Desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overall Daily Summary */}
        <Card className="flex flex-col">
          <CardHeader>
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[#991b1f]" />
              Overall Daily Summary
            </h3>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <textarea
              rows={4}
              disabled={isReadOnly}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief summary of today's work accomplishments, overall status, blockers..."
              className="block w-full flex-1 p-3.5 text-xs bg-[#faf7f5] border border-[#efe7e1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ffe1c5] focus:border-[#991b1f] transition-all placeholder:text-stone-400 disabled:opacity-75 disabled:cursor-not-allowed text-stone-900 resize-y min-h-[100px]"
            />
          </CardContent>
        </Card>

        {/* Attachments */}
        <Card className="flex flex-col">
          <CardHeader>
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-[#991b1f]" />
              Attachments
            </h3>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between space-y-4">
            {/* File Upload Drop Area */}
            {!isReadOnly && (
              <div>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#efe7e1] hover:border-[#991b1f]/40 hover:bg-[#fff8f3] rounded-xl p-4 cursor-pointer transition-colors">
                  <Paperclip className="w-5 h-5 text-stone-400 mb-1" />
                  <span className="text-xs font-semibold text-stone-600">Choose File to Attach</span>
                  <span className="text-[10px] text-stone-400 mt-0.5">Images, documents, PDF, code files</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                </label>
                {uploading && <LoadingSpinner size="sm" text="Uploading attachment..." className="mt-2" />}
              </div>
            )}

            {/* Attachments List */}
            {attachments.length === 0 ? (
              <p className="text-xs text-stone-400 text-center py-3">No attachments added yet.</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {attachments.map((a) => (
                  <div
                    key={a.attachment_id}
                    className="flex items-center justify-between p-2.5 bg-[#fff8f3] border border-[#efe7e1] rounded-xl text-xs gap-2"
                  >
                    <a
                      href={`${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/attachments/${a.attachment_id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 font-semibold text-stone-800 hover:text-[#991b1f] truncate flex-1"
                    >
                      <FileText className="w-4 h-4 text-[#991b1f] flex-shrink-0" />
                      <span className="truncate">{a.file_name}</span>
                    </a>
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={() => handleDeleteAttachment(a.attachment_id)}
                        className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors flex-shrink-0"
                        title="Delete attachment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 5. TASKS WORKED ON TODAY */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-900">Tasks Worked On Today</h3>
            <span className="text-xs font-semibold text-stone-500">
              {selectedAssignments.length} selected
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {assignments.length === 0 ? (
            <div className="p-6 text-center text-stone-500">
              <p className="text-xs">No active task assignments found. Please contact your Director to assign tasks.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {assignments.map((assign) => {
                const isSelected = selectedAssignments.includes(assign.assignment_id);
                return (
                  <button
                    key={assign.assignment_id}
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => handleToggleAssignment(assign.assignment_id)}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-[#991b1f] bg-[#fff3ea] shadow-sm'
                        : 'border-[#efe7e1] hover:border-stone-300 bg-white'
                    } disabled:opacity-75 disabled:cursor-not-allowed`}
                  >
                    <div
                      className={`w-5 h-5 rounded-lg border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                        isSelected
                          ? 'bg-[#991b1f] border-[#991b1f] text-white'
                          : 'border-stone-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] font-mono font-bold text-[#991b1f] block">
                        {assign.task_code}
                      </span>
                      <span className="text-xs font-bold text-stone-800 block truncate mt-0.5">
                        {assign.task_title}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 6. LOG DETAILS FOR SELECTED TASKS */}
      {selectedAssignments.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">
              LOG DETAILS FOR SELECTED TASKS
            </h3>
          </div>

          <div className="space-y-4">
            {selectedAssignments.map((assignId) => {
              const assign = assignments.find(a => a.assignment_id === assignId);
              const form = itemForms[assignId];
              if (!assign || !form) return null;

              return (
                <Card key={assignId} className="overflow-hidden">
                  {/* Task Header */}
                  <CardHeader className="py-3 bg-[#fff8f3] border-b border-[#efe7e1]">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-mono font-bold text-[#991b1f] bg-[#fff3ea] px-2 py-0.5 rounded-md border border-[#ffe1c5]">
                        {assign.task_code}
                      </span>
                      <h4 className="text-xs font-bold text-stone-900 truncate">
                        {assign.task_title}
                      </h4>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 sm:p-5 space-y-4">
                    {/* Work Description */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                        WORK DESCRIPTION
                      </label>
                      <textarea
                        rows={2}
                        disabled={isReadOnly}
                        value={form.work_description}
                        onChange={(e) => handleItemFormChange(assignId, 'work_description', e.target.value)}
                        placeholder="Detail what specific work was done on this task today..."
                        className="block w-full p-3 text-xs bg-[#faf7f5] border border-[#efe7e1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ffe1c5] focus:border-[#991b1f] placeholder:text-stone-400 disabled:opacity-75 text-stone-900"
                      />
                    </div>

                    {/* Hours Spent, Task Progress (%), and Status */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                          HOURS SPENT
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="24"
                          disabled={isReadOnly}
                          value={form.hours_spent}
                          onChange={(e) => handleItemFormChange(assignId, 'hours_spent', Number(e.target.value))}
                          className="block w-full p-2.5 text-xs bg-[#faf7f5] border border-[#efe7e1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ffe1c5] focus:border-[#991b1f] disabled:opacity-75 text-stone-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                          TASK PROGRESS (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          disabled={isReadOnly}
                          value={form.progress_percentage}
                          onChange={(e) => handleItemFormChange(assignId, 'progress_percentage', Number(e.target.value))}
                          className="block w-full p-2.5 text-xs bg-[#faf7f5] border border-[#efe7e1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ffe1c5] focus:border-[#991b1f] disabled:opacity-75 text-stone-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                          STATUS
                        </label>
                        <select
                          disabled={isReadOnly}
                          value={form.status}
                          onChange={(e) => handleItemFormChange(assignId, 'status', e.target.value as DailyUpdateItemStatus)}
                          className="block w-full p-2.5 text-xs bg-[#faf7f5] border border-[#efe7e1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ffe1c5] focus:border-[#991b1f] disabled:opacity-75 text-stone-900"
                        >
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="blocked">Blocked</option>
                        </select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* 7. ACTIONS (Save Draft & Submit) */}
      {!isReadOnly && (
        <div className="pt-2 pb-6 flex flex-col sm:flex-row items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            size="md"
            className="w-full sm:w-auto px-6"
            onClick={handleSaveDraft}
            isLoading={saving}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Save as Draft
          </Button>

          <Button
            type="button"
            variant="primary"
            size="md"
            className="w-full sm:w-auto px-8 shadow-md"
            onClick={handleSubmitUpdate}
            isLoading={saving}
            leftIcon={<CheckCircle className="w-4 h-4" />}
          >
            Submit Daily Update
          </Button>
        </div>
      )}
    </div>
  );
};

export default DailyTrackerPage;
