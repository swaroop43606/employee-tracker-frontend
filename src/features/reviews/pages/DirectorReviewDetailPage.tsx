import React, { useEffect, useState } from 'react';
import { useParams, NavLink } from 'react-router-dom';
import {
  ArrowLeft,
  MessageSquare,
  Paperclip,
  Send,
  Trash2,
  Edit2,
  FileText,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Calendar,
  ChevronDown,
  ChevronRight,
  Download,
  TrendingUp,
  History,
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { api } from '../../../services/api';
import { PageHeader } from '../../../components/PageHeader';
import { Card, CardHeader, CardContent } from '../../../components/Card';
import { Badge } from '../../../components/Badge';
import { Button } from '../../../components/Button';
import { triggerNotificationRefresh } from '../../../utils/notifications';
import { getErrorMessage } from '../../../utils/errorHandling';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { ErrorState } from '../../../components/Feedback';
import { formatDate, formatDateTime } from '../../../utils/date';
import type { DailyUpdateResponse } from '../../../types/dailyUpdate';
import type { ReviewResponse, ReviewStatus } from '../../../types/review';
import type { CommentResponse } from '../../../types/comment';
import type { AttachmentResponse } from '../../../types/attachment';

export const DirectorReviewDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Core Data States
  const [update, setUpdate] = useState<DailyUpdateResponse | null>(null);
  const [reviews, setReviews] = useState<ReviewResponse[]>([]);
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [attachments, setAttachments] = useState<AttachmentResponse[]>([]);

  // Expanded Work Log Item IDs
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Review Form State
  const [reviewComment, setReviewComment] = useState('');

  // Comment Form States
  const [newCommentText, setNewCommentText] = useState('');
  const [replyTarget, setReplyTarget] = useState<CommentResponse | null>(null);
  const [editTarget, setEditTarget] = useState<CommentResponse | null>(null);
  const [editText, setEditText] = useState('');

  const loadUpdateDetails = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch daily update detail
      const updateRes = await api.get<DailyUpdateResponse>(`/daily-updates/${id}`);
      if (updateRes.success && updateRes.data) {
        setUpdate(updateRes.data);
        // By default, expand all items if 3 or fewer; otherwise let user expand
        if (updateRes.data.items && updateRes.data.items.length <= 3) {
          setExpandedItems(new Set(updateRes.data.items.map((i) => i.item_id)));
        }
      }

      // 2. Fetch reviews history
      try {
        const reviewRes = await api.get<ReviewResponse[]>(`/daily-updates/${id}/reviews`);
        if (reviewRes.success && reviewRes.data) {
          setReviews(reviewRes.data);
        }
      } catch {
        // Non-blocking
      }

      // 3. Fetch comments
      try {
        const commentRes = await api.get<CommentResponse[]>(`/daily-updates/${id}/comments`);
        if (commentRes.success && commentRes.data) {
          setComments(commentRes.data);
        }
      } catch {
        // Non-blocking
      }

      // 4. Fetch attachments
      try {
        const attachRes = await api.get<AttachmentResponse[]>(`/daily-updates/${id}/attachments`);
        if (attachRes.success && attachRes.data) {
          setAttachments(attachRes.data);
        }
      } catch {
        // Non-blocking
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to retrieve daily update logs.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUpdateDetails();
  }, [id]);

  // Submit Review Action
  const handleSubmitReview = async (status: ReviewStatus) => {
    if (!id) return;
    if (
      status === 'rejected' &&
      !window.confirm('Are you sure you want to REJECT this daily update? Rejections require final review approval.')
    ) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.post<ReviewResponse>(`/daily-updates/${id}/reviews`, {
        review_status: status,
        review_comment: reviewComment || null,
      });

      if (res.success && res.data) {
        const statusLabel =
          status === 'approved'
            ? 'Approved'
            : status === 'changes_requested'
            ? 'Changes Requested'
            : 'Rejected';
        setSuccess(`Review submitted successfully as '${statusLabel}'!`);
        setReviewComment('');
        triggerNotificationRefresh();
        // Refresh details & reviews
        await loadUpdateDetails();
        setTimeout(() => setSuccess(null), 4000);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to submit review action.'));
    } finally {
      setSaving(false);
    }
  };

  // Comments Actions
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newCommentText.trim()) return;

    try {
      const payload = {
        comment_text: newCommentText,
        parent_comment_id: replyTarget ? replyTarget.comment_id : null,
      };

      const res = await api.post<CommentResponse>(`/daily-updates/${id}/comments`, payload);
      if (res.success && res.data) {
        setNewCommentText('');
        setReplyTarget(null);
        triggerNotificationRefresh();
        const commentRes = await api.get<CommentResponse[]>(`/daily-updates/${id}/comments`);
        setComments(commentRes.data || []);
      }
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to post comment.'));
    }
  };

  const handleEditComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget || !editText.trim()) return;

    try {
      const res = await api.patch<CommentResponse>(`/comments/${editTarget.comment_id}`, {
        comment_text: editText,
      });
      if (res.success) {
        setEditTarget(null);
        setEditText('');
        const commentRes = await api.get<CommentResponse[]>(`/daily-updates/${id}/comments`);
        setComments(commentRes.data || []);
      }
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to edit comment.'));
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    try {
      const res = await api.delete(`/comments/${commentId}`);
      if (res.success) {
        const commentRes = await api.get<CommentResponse[]>(`/daily-updates/${id}/comments`);
        setComments(commentRes.data || []);
      }
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to delete comment.'));
    }
  };

  const toggleItemExpansion = (itemId: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const toggleAllExpansion = () => {
    if (!update || !update.items) return;
    if (expandedItems.size === update.items.length) {
      setExpandedItems(new Set());
    } else {
      setExpandedItems(new Set(update.items.map((i) => i.item_id)));
    }
  };

  if (loading) {
    return (
      <div className="h-[75vh] flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading review workspace..." />
      </div>
    );
  }

  if (error && !update) {
    return <ErrorState message={error} onRetry={loadUpdateDetails} />;
  }

  if (!update) {
    return <ErrorState message="Daily update details not found." />;
  }

  // Determine current review status badge
  const getReviewStatusInfo = () => {
    if (reviews.length > 0) {
      const latestStatus = reviews[0].review_status;
      if (latestStatus === 'approved') {
        return { label: 'APPROVED', variant: 'success' as const };
      }
      if (latestStatus === 'changes_requested') {
        return { label: 'CHANGES REQUESTED', variant: 'warning' as const };
      }
      if (latestStatus === 'rejected') {
        return { label: 'REJECTED', variant: 'danger' as const };
      }
    }
    if (update.overall_status === 'submitted') {
      return { label: 'PENDING REVIEW', variant: 'warning' as const };
    }
    if (update.overall_status === 'reviewed') {
      return { label: 'APPROVED', variant: 'success' as const };
    }
    return { label: 'DRAFT', variant: 'neutral' as const };
  };

  const statusInfo = getReviewStatusInfo();

  // Average progress calculation
  const avgProgress =
    update.items && update.items.length > 0
      ? Math.round(
          update.items.reduce((acc, item) => acc + (item.progress_percentage || 0), 0) /
            update.items.length
        )
      : 0;

  // Recursive Comments Renderer
  const renderComments = (commentList: CommentResponse[]) => {
    return (
      <div className="space-y-3">
        {commentList.map((c) => {
          const isOwn = c.user_id === user?.user_id;
          return (
            <div key={c.comment_id} className="pl-3.5 border-l-2 border-stone-200 mt-2">
              <div className="bg-stone-50/70 p-3 rounded-xl border border-stone-200/60 text-xs">
                <div className="flex items-center justify-between text-[10px] text-stone-400 font-bold mb-1 uppercase tracking-wide">
                  <span className="text-stone-700">
                    {c.user_name}{' '}
                    <span className="text-stone-400 font-normal">({c.user_role})</span>
                  </span>
                  <span>{new Date(c.created_at).toLocaleString()}</span>
                </div>
                {c.is_deleted ? (
                  <p className="text-stone-400 italic">This comment was deleted.</p>
                ) : (
                  <p className="text-stone-700 font-medium whitespace-pre-wrap leading-relaxed">
                    {c.comment_text}
                  </p>
                )}

                <div className="mt-2 flex items-center gap-3 text-[10px] font-bold text-stone-400">
                  {!c.is_deleted && (
                    <button
                      onClick={() => {
                        setReplyTarget(c);
                        setNewCommentText('');
                        setEditTarget(null);
                      }}
                      className="hover:text-[#991b1f] uppercase tracking-wider transition-colors"
                    >
                      Reply
                    </button>
                  )}
                  {isOwn && !c.is_deleted && (
                    <>
                      <button
                        onClick={() => {
                          setEditTarget(c);
                          setEditText(c.comment_text);
                          setReplyTarget(null);
                        }}
                        className="hover:text-amber-600 uppercase tracking-wider flex items-center gap-0.5 transition-colors"
                      >
                        <Edit2 className="w-2.5 h-2.5" /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteComment(c.comment_id)}
                        className="hover:text-rose-600 uppercase tracking-wider flex items-center gap-0.5 transition-colors"
                      >
                        <Trash2 className="w-2.5 h-2.5" /> Delete
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Render replies */}
              {c.replies && c.replies.length > 0 && (
                <div className="ml-2 mt-2">{renderComments(c.replies)}</div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Navigation & Back Link */}
      <NavLink
        to="/director/daily-updates"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Review Queue
      </NavLink>

      {/* Page Header */}
      <PageHeader
        title={`Review Update: ${update.employee_name || 'Employee'}`}
        subtitle={`${update.employee_code ? `${update.employee_code} • ` : ''}Daily Update Log: ${formatDate(update.work_date || update.update_date, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })}`}
        action={
          <Badge
            variant={statusInfo.variant}
            size="md"
            className="font-bold uppercase tracking-wider text-xs px-3 py-1"
          >
            {statusInfo.label}
          </Badge>
        }
      />

      {/* Date Context Header Bar */}
      <div className="bg-stone-50/90 border border-stone-200/70 rounded-xl p-3.5 text-xs">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#991b1f] shrink-0" />
            <span className="text-stone-500 font-medium">Daily Update Log:</span>
            <span className="font-bold text-stone-900">
              {formatDate(update.work_date || update.update_date, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>

          <span className="text-stone-300 hidden sm:inline">•</span>

          <div className="flex items-center gap-1.5">
            <span className="text-stone-500 font-medium">Work Date:</span>
            <span className="font-semibold text-stone-800">
              {formatDate(update.work_date || update.update_date)}
            </span>
          </div>

          <span className="text-stone-300 hidden sm:inline">•</span>

          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span className="text-stone-500 font-medium">Last updated by employee:</span>
            <span className="font-semibold text-stone-800">
              {formatDateTime(update.employee_updated_at || update.created_at)}
            </span>
          </div>

          <span className="text-stone-300 hidden sm:inline">•</span>

          <div className="flex items-center gap-1.5">
            <span className="text-stone-500 font-medium">Submitted:</span>
            <span className="font-semibold text-stone-800">
              {update.submitted_at ? formatDateTime(update.submitted_at) : 'Not Submitted'}
            </span>
          </div>

          {update.reviewed_at && (
            <>
              <span className="text-stone-300 hidden sm:inline">•</span>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="text-stone-500 font-medium">Director Reviewed:</span>
                <span className="font-semibold text-stone-800">
                  {formatDateTime(update.reviewed_at)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Success Feedback Alert */}
      {success && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200/80 rounded-xl flex items-center gap-2.5">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <p className="text-xs font-semibold text-emerald-800">{success}</p>
        </div>
      )}

      {/* Error Feedback Alert */}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200/80 rounded-xl flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <p className="text-xs font-semibold text-rose-800">{error}</p>
        </div>
      )}

      {/* Main 2-Column Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column (Main Content): Priority 1-4, then Secondary */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. DAILY SUMMARY CARD (Near Top) */}
          <Card>
            <CardHeader className="pb-3 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-stone-900">Daily Summary</h3>
                <p className="text-xs text-stone-500">Employee summary remarks & progress overview</p>
              </div>
              {/* Quick Metrics */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-stone-100 text-stone-700">
                  <Clock className="w-3.5 h-3.5 text-stone-500" />
                  Total: <strong className="text-stone-900">{update.total_hours} hrs</strong>
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#fff8f3] border border-[#efe7e1] text-[#991b1f]">
                  <TrendingUp className="w-3.5 h-3.5 text-[#991b1f]" />
                  Progress: <strong className="text-[#991b1f]">{avgProgress}%</strong>
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* Summary Remarks */}
              <div>
                <h4 className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                  Summary Remarks
                </h4>
                <p className="text-xs text-stone-800 bg-stone-50/80 p-3 rounded-xl border border-stone-200/60 whitespace-pre-wrap leading-relaxed">
                  {update.summary || 'No summary comments recorded by employee.'}
                </p>
              </div>

              {/* Completed Work & Next Work Plan in Compact Grid */}
              {(update.completed_work || update.next_work_plan) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {update.completed_work && (
                    <div>
                      <h4 className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Completed Work
                      </h4>
                      <p className="text-xs text-stone-700 bg-emerald-50/40 p-2.5 rounded-xl border border-emerald-100 whitespace-pre-wrap leading-relaxed">
                        {update.completed_work}
                      </p>
                    </div>
                  )}
                  {update.next_work_plan && (
                    <div>
                      <h4 className="text-[11px] font-bold text-sky-800 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-sky-600" /> Next Work Plan
                      </h4>
                      <p className="text-xs text-stone-700 bg-sky-50/40 p-2.5 rounded-xl border border-sky-100 whitespace-pre-wrap leading-relaxed">
                        {update.next_work_plan}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Blockers Alert if Present */}
              {update.blockers && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                  <div className="flex items-center gap-1.5 mb-1 text-rose-800 font-bold text-xs uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <span>Blockers / Attention Required</span>
                  </div>
                  <p className="text-xs text-rose-900 whitespace-pre-wrap leading-relaxed">
                    {update.blockers}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2. WORK LOGS LIST / TABLE (Compact & Expandable) */}
          <Card>
            <CardHeader className="pb-3 border-b border-stone-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-stone-900">Work Logs</h3>
                <p className="text-xs text-stone-500">
                  {update.items?.length || 0} task {update.items?.length === 1 ? 'entry' : 'entries'} logged ({update.total_hours} hrs total)
                </p>
              </div>
              {update.items && update.items.length > 0 && (
                <button
                  type="button"
                  onClick={toggleAllExpansion}
                  className="text-xs font-semibold text-stone-500 hover:text-[#991b1f] transition-colors"
                >
                  {expandedItems.size === update.items.length ? 'Collapse All' : 'Expand All'}
                </button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {(!update.items || update.items.length === 0) ? (
                <div className="p-6 text-center text-xs text-stone-400">
                  No individual task entries logged on this daily update.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-stone-50/80 border-b border-stone-200/70 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                        <th className="py-2.5 px-4">Task</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Hours</th>
                        <th className="py-2.5 px-4">Progress</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {update.items.map((item) => {
                        const isExpanded = expandedItems.has(item.item_id);
                        return (
                          <React.Fragment key={item.item_id}>
                            <tr
                              onClick={() => toggleItemExpansion(item.item_id)}
                              className="hover:bg-stone-50/70 cursor-pointer transition-colors"
                            >
                              {/* Task Title & Code */}
                              <td className="py-3 px-4">
                                <div className="flex items-start gap-2">
                                  <span className="mt-0.5 text-stone-400">
                                    {isExpanded ? (
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    ) : (
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    )}
                                  </span>
                                  <div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {item.task_code && (
                                        <span className="text-[10px] font-mono font-bold text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200/60">
                                          {item.task_code}
                                        </span>
                                      )}
                                      <span className="font-semibold text-stone-900">
                                        {item.task_title || 'Untitled Task'}
                                      </span>
                                      {item.task_due_date && (
                                        <span className="text-[10px] font-semibold text-stone-500 bg-stone-100/70 px-1.5 py-0.5 rounded border border-stone-200/50">
                                          Task Due Date: <strong className="text-stone-700">{formatDate(item.task_due_date)}</strong>
                                        </span>
                                      )}
                                    </div>
                                    {!isExpanded && item.work_description && (
                                      <p className="text-[11px] text-stone-500 truncate max-w-sm mt-0.5">
                                        {item.work_description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Status */}
                              <td className="py-3 px-3 whitespace-nowrap">
                                <Badge
                                  variant={
                                    item.status === 'completed'
                                      ? 'success'
                                      : item.status === 'blocked'
                                      ? 'danger'
                                      : 'warning'
                                  }
                                  size="sm"
                                  className="uppercase font-bold text-[10px]"
                                >
                                  {item.status === 'in_progress'
                                    ? 'In Progress'
                                    : item.status === 'completed'
                                    ? 'Completed'
                                    : 'Blocked'}
                                </Badge>
                              </td>

                              {/* Hours */}
                              <td className="py-3 px-3 whitespace-nowrap font-semibold text-stone-700">
                                {item.hours_spent} hrs
                              </td>

                              {/* Progress */}
                              <td className="py-3 px-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <div className="w-16 bg-stone-100 rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className={`h-1.5 rounded-full ${
                                        item.status === 'completed'
                                          ? 'bg-emerald-500'
                                          : item.status === 'blocked'
                                          ? 'bg-rose-500'
                                          : 'bg-amber-500'
                                      }`}
                                      style={{ width: `${Math.min(item.progress_percentage || 0, 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-semibold text-stone-600 min-w-[32px]">
                                    {item.progress_percentage}%
                                  </span>
                                </div>
                              </td>
                            </tr>

                            {/* Expanded Work Description Row */}
                            {isExpanded && (
                              <tr className="bg-stone-50/50 border-b border-stone-100">
                                <td colSpan={4} className="px-4 py-3 text-xs text-stone-700">
                                  <div className="pl-6 border-l-2 border-[#991b1f]/30 space-y-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                                      Work Notes / Description
                                    </span>
                                    <p className="whitespace-pre-wrap leading-relaxed text-stone-800">
                                      {item.work_description || 'No detailed description notes recorded for this item.'}
                                    </p>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* SECONDARY SECTIONS (Placed Below Primary Review Content) */}

          {/* 3. COMMENTS & DISCUSSION */}
          <Card>
            <CardHeader className="pb-3 border-b border-stone-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#991b1f]" />
                Comments & Discussion
              </h3>
              <span className="text-xs text-stone-400 font-medium">
                {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
              </span>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* Comment Input Form */}
              <form onSubmit={handlePostComment} className="flex gap-2">
                <input
                  type="text"
                  placeholder={
                    replyTarget
                      ? `Replying to ${replyTarget.user_name}...`
                      : 'Type a comment or question for employee...'
                  }
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  className="flex-1 px-3.5 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#991b1f]/20 focus:bg-white transition-all"
                />
                {replyTarget && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setReplyTarget(null)}
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  rightIcon={<Send className="w-3.5 h-3.5" />}
                >
                  Post
                </Button>
              </form>

              {/* Edit Comment Inline Form */}
              {editTarget && (
                <form
                  onSubmit={handleEditComment}
                  className="bg-amber-50 p-3.5 border border-amber-200 rounded-xl space-y-2.5"
                >
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                    Edit Comment
                  </span>
                  <input
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="block w-full p-2 text-xs bg-white border border-amber-300 rounded-xl focus:outline-none"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditTarget(null)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" variant="secondary" size="sm">
                      Save Changes
                    </Button>
                  </div>
                </form>
              )}

              {/* Comment List */}
              {comments.length === 0 ? (
                <p className="text-xs text-stone-400 text-center py-3">
                  No comments logged on this daily update.
                </p>
              ) : (
                renderComments(comments)
              )}
            </CardContent>
          </Card>

          {/* 4. REVIEW HISTORY */}
          <Card>
            <CardHeader className="pb-3 border-b border-stone-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <History className="w-4 h-4 text-stone-500" />
                Review History
              </h3>
              <span className="text-xs text-stone-400 font-medium">
                {reviews.length} {reviews.length === 1 ? 'action' : 'actions'}
              </span>
            </CardHeader>
            <CardContent className="p-0">
              {reviews.length === 0 ? (
                <div className="p-6 text-center text-xs text-stone-400">
                  No previous reviews recorded for this update.
                </div>
              ) : (
                <div className="divide-y divide-stone-100 text-xs">
                  {reviews.map((rev) => (
                    <div key={rev.review_id} className="p-4 space-y-2">
                      <div className="flex justify-between items-center text-[10px] text-stone-400 font-bold">
                        <span className="text-stone-700">
                          Reviewed by: {rev.reviewer_name || 'Director'}
                          {rev.reviewer_code ? ` (${rev.reviewer_code})` : ''}
                        </span>
                        <span>{formatDateTime(rev.reviewed_at)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            rev.review_status === 'approved'
                              ? 'success'
                              : rev.review_status === 'changes_requested'
                              ? 'warning'
                              : 'danger'
                          }
                          size="sm"
                          className="uppercase font-bold text-[10px]"
                        >
                          {rev.review_status === 'changes_requested'
                            ? 'Changes Requested'
                            : rev.review_status}
                        </Badge>
                      </div>
                      {rev.review_comment && (
                        <p className="text-stone-700 bg-stone-50 p-2.5 rounded-lg border border-stone-200/60 leading-relaxed whitespace-pre-wrap">
                          "{rev.review_comment}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 5. ATTACHMENTS */}
          <Card>
            <CardHeader className="pb-3 border-b border-stone-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-stone-500" />
                Attachments
              </h3>
              <span className="text-xs text-stone-400 font-medium">
                {attachments.length} {attachments.length === 1 ? 'file' : 'files'}
              </span>
            </CardHeader>
            <CardContent className="p-0">
              {attachments.length === 0 ? (
                <div className="p-6 text-center text-xs text-stone-400">
                  No attachments associated with this update.
                </div>
              ) : (
                <div className="divide-y divide-stone-100 text-xs">
                  {attachments.map((a) => {
                    const downloadUrl = `${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/attachments/${a.attachment_id}/download`;
                    return (
                      <div
                        key={a.attachment_id}
                        className="p-3.5 flex items-center justify-between gap-3 hover:bg-stone-50/50 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <FileText className="w-4 h-4 text-stone-400 flex-shrink-0" />
                          <div className="truncate">
                            <a
                              href={downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-stone-800 hover:text-[#991b1f] truncate block transition-colors"
                            >
                              {a.file_name}
                            </a>
                            <div className="flex items-center gap-2 text-[10px] text-stone-400 mt-0.5">
                              <span>{Math.round(a.file_size / 1024)} KB</span>
                              {a.uploader_name && (
                                <>
                                  <span>•</span>
                                  <span>Uploaded by: {a.uploader_name}</span>
                                </>
                              )}
                              <span>•</span>
                              <span>{formatDate(a.created_at)}</span>
                            </div>
                          </div>
                        </div>
                        <a
                          href={downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
                          title="Download attachment"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Sticky Review Action Panel & Submission Details */}
        <div className="space-y-6 lg:sticky lg:top-6">
          {/* REVIEW ACTION PANEL */}
          <Card className="border-2 border-[#991b1f]/20 shadow-sm">
            <CardHeader className="pb-3 border-b border-stone-100">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-stone-900">
                  Review Update
                </h3>
                <Badge
                  variant={statusInfo.variant}
                  size="sm"
                  className="uppercase font-bold text-[10px]"
                >
                  {statusInfo.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1.5">
                  Feedback / Comment
                </label>
                <textarea
                  rows={4}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Provide feedback, approval notes, or required changes..."
                  className="block w-full p-3 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#991b1f]/20 focus:bg-white transition-all resize-y"
                />
              </div>

              {/* Action Buttons with Distinct Styling */}
              <div className="space-y-2.5 pt-1">
                {/* Approve Update - Success/Positive Styling */}
                <Button
                  type="button"
                  variant="primary"
                  className="w-full justify-center bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs focus:ring-emerald-500 font-semibold"
                  onClick={() => handleSubmitReview('approved')}
                  isLoading={saving}
                  leftIcon={<CheckCircle className="w-4 h-4" />}
                >
                  Approve Update
                </Button>

                {/* Request Changes - Warning Styling */}
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full justify-center bg-amber-600 hover:bg-amber-700 text-white shadow-xs focus:ring-amber-500 font-semibold"
                  onClick={() => handleSubmitReview('changes_requested')}
                  isLoading={saving}
                  leftIcon={<AlertTriangle className="w-4 h-4" />}
                >
                  Request Changes
                </Button>

                {/* Reject Update - Danger Styling */}
                <Button
                  type="button"
                  variant="danger"
                  className="w-full justify-center font-semibold"
                  onClick={() => handleSubmitReview('rejected')}
                  isLoading={saving}
                  leftIcon={<XCircle className="w-4 h-4" />}
                >
                  Reject Update
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* SUBMISSION DETAILS CARD */}
          <Card>
            <CardHeader className="pb-3 border-b border-stone-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                Submission Details
              </h3>
              <Badge
                variant={statusInfo.variant}
                size="sm"
                className="uppercase text-[10px] font-bold"
              >
                {statusInfo.label}
              </Badge>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-0.5">
                  Work Date
                </span>
                <div className="flex items-center gap-1.5 font-semibold text-stone-800">
                  <Calendar className="w-3.5 h-3.5 text-stone-500" />
                  <span>{formatDate(update.work_date || update.update_date)}</span>
                </div>
              </div>

              {update.items?.length === 1 && update.items[0].task_due_date && (
                <div className="pt-2.5 border-t border-stone-100">
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-0.5">
                    Task Due Date
                  </span>
                  <span className="font-semibold text-stone-800">
                    {formatDate(update.items[0].task_due_date)}
                  </span>
                </div>
              )}

              <div className="pt-2.5 border-t border-stone-100">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-0.5">
                  Submitted
                </span>
                <span className="font-semibold text-stone-800">
                  {update.submitted_at ? formatDateTime(update.submitted_at) : 'Not Submitted'}
                </span>
              </div>

              <div className="pt-2.5 border-t border-stone-100">
                <span className="text-[10px] font-bold text-[#991b1f] uppercase tracking-wider flex items-center gap-1 mb-0.5">
                  <Clock className="w-3 h-3 text-[#991b1f] shrink-0" />
                  Last Updated by Employee
                </span>
                <span className="font-semibold text-stone-800">
                  {formatDateTime(
                    update.employee_updated_at || update.submitted_at || update.created_at
                  )}
                </span>
              </div>

              <div className="pt-2.5 border-t border-stone-100 flex items-center justify-between text-stone-600">
                <span>Total Work Logged</span>
                <strong className="text-stone-900">
                  {update.total_hours} hrs ({update.items?.length || 0} tasks)
                </strong>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DirectorReviewDetailPage;
