import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Bell, Check, CheckCheck, Clock, ExternalLink } from 'lucide-react';
import { api } from '../../../services/api';
import { useAuth } from '../../../hooks/useAuth';
import { PageHeader } from '../../../components/PageHeader';
import { Card, CardContent } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { ErrorState } from '../../../components/Feedback';
import type { NotificationResponse } from '../../../types/notification';

export const NotificationsPage: React.FC = () => {
  const { roleName } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // States
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchInbox = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getPaginated<NotificationResponse>('/notifications', {
        page,
        page_size: 15,
      });
      if (res.success && res.data) {
        setNotifications(res.data.items || []);
        setTotalPages(res.data.total_pages || 1);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch notification inbox.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox();
  }, [page]);

  // Mark single as read
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const res = await api.patch<NotificationResponse>(`/notifications/${notificationId}/read`);
      if (res.success && res.data) {
        setNotifications(prev =>
          prev.map(n => (n.notification_id === notificationId ? { ...n, is_read: true } : n))
        );
      }
    } catch (err: any) {
      alert(err.message || 'Failed to mark notification as read.');
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      const res = await api.patch('/notifications/read-all');
      if (res.success) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to mark all notifications as read.');
    }
  };

  // Maps reference_type to role-specific route
  const getReferenceLink = (n: NotificationResponse) => {
    if (!n.reference_id) return null;
    const refType = n.reference_type?.toLowerCase();

    if (refType === 'daily_update') {
      // Directors should be routed to their review detail page, not the employee view
      if (roleName === 'director') {
        return `/director/daily-updates/${n.reference_id}`;
      }
      return `/employee/daily-updates/${n.reference_id}`;
    }
    if (refType === 'task_assignment') {
      // Directors may also receive task-related notifications (e.g., progress updates)
      if (roleName === 'director') {
        return `/director/tasks/${n.reference_id}`;
      }
      return `/employee/tasks/${n.reference_id}`;
    }
    return null;
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Notification Center"
        subtitle="Manage your recent updates, alerts, review comments, and feedback logs."
        badgeText="Inbox"
        action={
          notifications.some(n => !n.is_read) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              leftIcon={<CheckCheck className="w-4 h-4 text-indigo-600" />}
            >
              Mark all as read
            </Button>
          )
        }
      />

      {loading ? (
        <LoadingSpinner size="lg" text="Loading notifications..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchInbox} />
      ) : notifications.length === 0 ? (
        <Card className="p-8 text-center text-slate-500 text-sm">
          Your inbox is currently empty.
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="space-y-3">
            {notifications.map((n) => {
              const refLink = getReferenceLink(n);
              return (
                <Card
                  key={n.notification_id}
                  className={`border-l-4 transition-all ${
                    n.is_read
                      ? 'border-l-slate-200 bg-white/60'
                      : 'border-l-indigo-600 bg-white shadow-xs'
                  }`}
                >
                  <CardContent className="p-4 flex gap-4 items-start justify-between">
                    <div className="flex gap-3 items-start min-w-0">
                      <div className={`p-2 rounded-xl flex-shrink-0 mt-0.5 ${
                        n.is_read ? 'bg-slate-100 text-slate-400' : 'bg-indigo-50 text-indigo-600'
                      }`}>
                        <Bell className="w-4.5 h-4.5" />
                      </div>
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className={`text-sm truncate ${n.is_read ? 'text-slate-600 font-medium' : 'text-slate-900 font-bold'}`}>
                            {n.title}
                          </h4>
                          {!n.is_read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 inline-block flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-wrap">
                          {n.message}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 pt-1">
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(n.created_at).toLocaleString()}
                          </span>
                          {refLink && (
                            <NavLink
                              to={refLink}
                              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5"
                            >
                              Go to details <ExternalLink className="w-3 h-3" />
                            </NavLink>
                          )}
                        </div>
                      </div>
                    </div>

                    {!n.is_read && (
                      <button
                        onClick={() => handleMarkAsRead(n.notification_id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/50 flex-shrink-0 transition-colors"
                        title="Mark as read"
                      >
                        <Check className="w-4.5 h-4.5" />
                      </button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
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

export default NotificationsPage;
