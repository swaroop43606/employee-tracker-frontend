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

  // States
  const [update, setUpdate] = useState<DailyUpdateResponse | null>(null);
  const [reviews, setReviews] = useState<ReviewResponse[]>([]);
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [attachments, setAttachments] = useState<AttachmentResponse[]>([]);

  // Review Form States
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
      }

      // 2. Fetch reviews history
      try {
        const reviewRes = await api.get<ReviewResponse[]>(`/daily-updates/${id}/reviews`);
        if (reviewRes.success && reviewRes.data) {
          setReviews(reviewRes.data);
        }
      } catch {
        // Ignore reviews errors
      }

      // 3. Fetch comments
      try {
        const commentRes = await api.get<CommentResponse[]>(`/daily-updates/${id}/comments`);
        if (commentRes.success && commentRes.data) {
          setComments(commentRes.data);
        }
      } catch {
        // Ignore comments errors
      }

      // 4. Fetch attachments
      try {
        const attachRes = await api.get<AttachmentResponse[]>(`/daily-updates/${id}/attachments`);
        if (attachRes.success && attachRes.data) {
          setAttachments(attachRes.data);
        }
      } catch {
        // Ignore attachments errors
      }
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve daily update logs.');
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
    if (status === 'rejected' && !window.confirm('Are you sure you want to REJECT this daily update? Rejections require final review approval.')) {
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
        setSuccess(`Review submitted successfully as '${status}'!`);
        setReviewComment('');
        triggerNotificationRefresh();
        // Refresh details & reviews
        await loadUpdateDetails();
        setTimeout(() => setSuccess(null), 3000);
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
        // Refresh comments list
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
        // Refresh comments list
        const commentRes = await api.get<CommentResponse[]>(`/daily-updates/${id}/comments`);
        setComments(commentRes.data || []);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to edit comment.');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    try {
      const res = await api.delete(`/comments/${commentId}`);
      if (res.success) {
        // Refresh comments list
        const commentRes = await api.get<CommentResponse[]>(`/daily-updates/${id}/comments`);
        setComments(commentRes.data || []);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete comment.');
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

  // Recursive Comments Renderer
  const renderComments = (commentList: CommentResponse[]) => {
    return (
      <div className="space-y-4">
        {commentList.map((c) => {
          const isOwn = c.user_id === user?.user_id;
          return (
            <div key={c.comment_id} className="pl-4 border-l-2 border-slate-100 mt-2">
              <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-200/60 text-xs">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wide">
                  <span>
                    {c.user_name} ({c.user_role})
                  </span>
                  <span>{new Date(c.created_at).toLocaleString()}</span>
                </div>
                {c.is_deleted ? (
                  <p className="text-slate-400 italic">This comment was deleted.</p>
                ) : (
                  <p className="text-slate-700 font-medium whitespace-pre-wrap">{c.comment_text}</p>
                )}

                <div className="mt-2.5 flex items-center gap-3 text-[10px] font-bold text-slate-400">
                  {!c.is_deleted && (
                    <button
                      onClick={() => {
                        setReplyTarget(c);
                        setNewCommentText('');
                        setEditTarget(null);
                      }}
                      className="hover:text-indigo-600 uppercase"
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
                        className="hover:text-amber-600 uppercase flex items-center gap-0.5"
                      >
                        <Edit2 className="w-2.5 h-2.5" /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteComment(c.comment_id)}
                        className="hover:text-rose-600 uppercase flex items-center gap-0.5"
                      >
                        <Trash2 className="w-2.5 h-2.5" /> Delete
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Render replies */}
              {c.replies && c.replies.length > 0 && (
                <div className="ml-3 mt-3">{renderComments(c.replies)}</div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <NavLink
        to="/director/daily-updates"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Queue
      </NavLink>

      <PageHeader
        title={`Review Update: ${update.employee_name}`}
        subtitle={`Submitted on: ${new Date(update.update_date).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })}`}
        badgeText="Review Workspace"
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
        {/* Left Column: Work items & Summary */}
        <div className="lg:col-span-2 space-y-6">
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <h3 className="text-base font-bold text-slate-900">Subordinate Summary Remarks</h3>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100 whitespace-pre-wrap leading-relaxed">
                {update.summary || 'No comments written by employee.'}
              </p>
            </CardContent>
          </Card>

          {/* Work Progress & Next Steps (Optional Fields) */}
          {(update.completed_work || update.next_work_plan || update.blockers) && (
            <Card>
              <CardHeader>
                <h3 className="text-base font-bold text-slate-900">Work Progress & Next Steps</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                {update.completed_work && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Completed Work</h4>
                    <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 whitespace-pre-wrap">{update.completed_work}</p>
                  </div>
                )}
                {update.next_work_plan && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Next Work Plan</h4>
                    <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 whitespace-pre-wrap">{update.next_work_plan}</p>
                  </div>
                )}
                {update.blockers && (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-xs font-bold text-rose-700 uppercase tracking-wider">Blockers</h4>
                      <Badge variant="danger" className="text-[10px]">Attention Required</Badge>
                    </div>
                    <p className="text-xs text-rose-800 bg-rose-50 p-3 rounded-xl border border-rose-100 whitespace-pre-wrap">{update.blockers}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Daily Update Items Logged */}
          <Card>
            <CardHeader>
              <h3 className="text-base font-bold text-slate-900">Work Logs List</h3>
              <Badge variant="brand" className="uppercase font-bold">
                Total hours: {update.total_hours} hrs
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4 p-0 divide-y divide-slate-100">
              {update.items.map((item) => (
                <div key={item.item_id} className="p-5 space-y-3">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                        {item.task_code}
                      </span>
                      <h4 className="text-sm font-bold text-slate-800 mt-1">
                        {item.task_title}
                      </h4>
                    </div>
                    <Badge
                      variant={
                        item.status === 'completed'
                          ? 'success'
                          : item.status === 'blocked'
                          ? 'danger'
                          : 'warning'
                      }
                      className="uppercase text-[10px]"
                    >
                      {item.status}
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed whitespace-pre-wrap">
                    {item.work_description || 'No description notes registered.'}
                  </p>

                  <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
                    <span>Hours spent: {item.hours_spent} hrs</span>
                    <span>•</span>
                    <span>Progress: {item.progress_percentage}%</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Discussion Thread comments */}
          <Card>
            <CardHeader>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-4.5 h-4.5 text-indigo-600" />
                Comments & Discussion
              </h3>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Comment input form */}
              <form onSubmit={handlePostComment} className="flex gap-2">
                <input
                  type="text"
                  placeholder={
                    replyTarget
                      ? `Replying to ${replyTarget.user_name}...`
                      : 'Type a comment or question...'
                  }
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  className="flex-1 px-4 py-2.5 text-xs bg-slate-50 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                {replyTarget && (
                  <Button type="button" variant="outline" size="sm" onClick={() => setReplyTarget(null)}>
                    Cancel
                  </Button>
                )}
                <Button type="submit" variant="primary" size="sm" rightIcon={<Send className="w-3.5 h-3.5" />}>
                  Post
                </Button>
              </form>

              {/* Edit Comment form inline */}
              {editTarget && (
                <form onSubmit={handleEditComment} className="bg-amber-50 p-4 border border-amber-200 rounded-xl space-y-3">
                  <span className="text-[10px] font-bold text-amber-700 uppercase">Edit Comment</span>
                  <input
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="block w-full p-2 text-xs bg-white border border-amber-300 rounded-xl focus:outline-none"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" size="sm" onClick={() => setEditTarget(null)}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="secondary" size="sm">
                      Save
                    </Button>
                  </div>
                </form>
              )}

              {/* Comment list */}
              {comments.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No comments logged on this workstation.</p>
              ) : (
                renderComments(comments)
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Review action box & attachments */}
        <div className="space-y-6">
          {/* Action: Review workspace */}
          <Card className="border border-indigo-200">
            <CardHeader>
              <h3 className="text-sm font-bold text-slate-900">Review Feedback Workspace</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Review Comment
                </label>
                <textarea
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Feedback, approval comments, changes needed..."
                  className="block w-full p-3 text-xs bg-slate-50 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-2 pt-2">
                <Button
                  type="button"
                  variant="primary"
                  className="w-full justify-center bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 shadow-md"
                  onClick={() => handleSubmitReview('approved')}
                  isLoading={saving}
                  leftIcon={<CheckCircle className="w-4 h-4" />}
                >
                  Approve Log
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  className="w-full justify-center bg-amber-500 hover:bg-amber-400 text-white"
                  onClick={() => handleSubmitReview('changes_requested')}
                  isLoading={saving}
                  leftIcon={<AlertTriangle className="w-4 h-4" />}
                >
                  Request Changes
                </Button>

                <Button
                  type="button"
                  variant="danger"
                  className="w-full justify-center bg-rose-600 hover:bg-rose-500 text-white"
                  onClick={() => handleSubmitReview('rejected')}
                  isLoading={saving}
                  leftIcon={<XCircle className="w-4 h-4" />}
                >
                  Reject Log
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Review History Logs */}
          <Card>
            <CardHeader>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Review History</h3>
            </CardHeader>
            <CardContent className="p-0">
              {reviews.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">No previous reviews logged.</div>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {reviews.map((rev) => (
                    <div key={rev.review_id} className="p-4 space-y-2">
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                        <span>BY: {rev.reviewer_name || 'Director'}</span>
                        <span>{new Date(rev.reviewed_at).toLocaleDateString()}</span>
                      </div>
                      <Badge
                        variant={
                          rev.review_status === 'approved'
                            ? 'success'
                            : rev.review_status === 'changes_requested'
                            ? 'warning'
                            : 'danger'
                        }
                        className="uppercase"
                      >
                        {rev.review_status}
                      </Badge>
                      {rev.review_comment && (
                        <p className="text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 font-medium">
                          "{rev.review_comment}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attachments Section */}
          <Card>
            <CardHeader>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-indigo-600" />
                Attachments
              </h3>
            </CardHeader>
            <CardContent className="p-0">
              {attachments.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">No attachments found on this log.</div>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {attachments.map((a) => (
                    <div key={a.attachment_id} className="p-4 flex items-center justify-between gap-3">
                      <a
                        href={`${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/attachments/${a.attachment_id}/download`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 font-semibold text-slate-700 hover:text-indigo-600 truncate flex-1"
                      >
                        <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="truncate max-w-[150px]">{a.file_name}</span>
                      </a>
                      <span className="text-[10px] text-slate-400">{Math.round(a.file_size / 1024)} KB</span>
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

export default DirectorReviewDetailPage;
