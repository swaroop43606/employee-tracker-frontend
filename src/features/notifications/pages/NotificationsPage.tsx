import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { NavLink } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  ExternalLink,
  Trash2,
  AlertTriangle,
  MoreVertical,
  ArrowLeft,
} from 'lucide-react';
import { api } from '../../../services/api';
import { useAuth } from '../../../hooks/useAuth';
import { PageHeader } from '../../../components/PageHeader';
import { Card, CardContent } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { ErrorState } from '../../../components/Feedback';
import { triggerNotificationRefresh } from '../../../utils/notifications';
import type { NotificationResponse } from '../../../types/notification';

interface DeleteTarget {
  ids: string[];
  isSingle: boolean;
  hadUnread: boolean;
}

interface MenuPosition {
  top?: number;
  bottom?: number;
  left: number;
}

const calculateMenuPosition = (rect: DOMRect): MenuPosition => {
  const menuWidth = 176; // w-44 (11rem)
  const estimatedHeight = 96; // ~2 items + padding
  const gap = 4;

  const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

  // Horizontal position: align right edge of menu with right edge of button
  let left = rect.right - menuWidth;
  if (left < 10) {
    left = 10;
  } else if (left + menuWidth > viewportWidth - 10) {
    left = Math.max(10, viewportWidth - menuWidth - 10);
  }

  // Vertical position: smart positioning (open downward normally, upward if space below is tight)
  const spaceBelow = viewportHeight - rect.bottom;
  const openUpward = spaceBelow < estimatedHeight && rect.top > spaceBelow;

  if (openUpward) {
    return {
      bottom: Math.max(10, viewportHeight - rect.top + gap),
      left,
    };
  } else {
    return {
      top: Math.max(10, rect.bottom + gap),
      left,
    };
  }
};

export const NotificationsPage: React.FC = () => {
  const { roleName } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Notifications & Pagination
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Manage Mode & Selection State
  const [isManageMode, setIsManageMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Individual 3-dot Menu State (Rendered via React Portal to prevent card clipping)
  const [activeNotification, setActiveNotification] = useState<NotificationResponse | null>(null);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const anchorElRef = useRef<HTMLElement | null>(null);

  // Delete Confirmation State
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
    setSelectedIds(new Set());
    setActiveNotification(null);
    setMenuPosition(null);
    anchorElRef.current = null;
    fetchInbox();
  }, [page]);

  // Close 3-dot menu on outside click, escape, or window resize/scroll
  useEffect(() => {
    if (!activeNotification) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest('[data-menu-portal]') ||
        target.closest('[data-menu-trigger]')
      ) {
        return;
      }
      setActiveNotification(null);
      setMenuPosition(null);
      anchorElRef.current = null;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveNotification(null);
        setMenuPosition(null);
        anchorElRef.current = null;
      }
    };

    const handleScrollOrResize = () => {
      if (!anchorElRef.current) return;
      const rect = anchorElRef.current.getBoundingClientRect();
      if (
        rect.bottom < 0 ||
        rect.top > window.innerHeight ||
        rect.right < 0 ||
        rect.left > window.innerWidth
      ) {
        setActiveNotification(null);
        setMenuPosition(null);
        anchorElRef.current = null;
        return;
      }
      setMenuPosition(calculateMenuPosition(rect));
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [activeNotification]);

  const handleToggleMenu = (notification: NotificationResponse, buttonEl: HTMLElement) => {
    if (activeNotification?.notification_id === notification.notification_id) {
      setActiveNotification(null);
      setMenuPosition(null);
      anchorElRef.current = null;
    } else {
      const rect = buttonEl.getBoundingClientRect();
      const pos = calculateMenuPosition(rect);
      anchorElRef.current = buttonEl;
      setActiveNotification(notification);
      setMenuPosition(pos);
    }
  };

  // Selection handlers
  const allCurrentSelected =
    notifications.length > 0 && notifications.every((n) => selectedIds.has(n.notification_id));

  const handleToggleSelectAll = () => {
    if (allCurrentSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifications.map((n) => n.notification_id)));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Mark single as read
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const res = await api.patch<NotificationResponse>(`/notifications/${notificationId}/read`);
      if (res.success && res.data) {
        setNotifications((prev) =>
          prev.map((n) => (n.notification_id === notificationId ? { ...n, is_read: true } : n))
        );
        triggerNotificationRefresh();
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
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        triggerNotificationRefresh();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to mark all notifications as read.');
    }
  };

  // Confirm delete (handles both single & bulk deletion)
  const handleConfirmDelete = async () => {
    if (!deleteTarget || deleteTarget.ids.length === 0 || isDeleting) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      let res;
      if (deleteTarget.isSingle) {
        res = await api.delete<{ message: string; deleted_count: number }>(
          `/notifications/${deleteTarget.ids[0]}`
        );
      } else {
        res = await api.delete<{ message: string; deleted_count: number }>('/notifications', {
          notification_ids: deleteTarget.ids,
        });
      }

      if (res.success) {
        const deletedIdSet = new Set(deleteTarget.ids);

        // Remove deleted items immediately from local state
        setNotifications((prev) => prev.filter((n) => !deletedIdSet.has(n.notification_id)));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          deleteTarget.ids.forEach((id) => next.delete(id));
          return next;
        });

        // Refresh badge if any deleted notification was unread
        if (deleteTarget.hadUnread) {
          triggerNotificationRefresh();
        }

        const countDeleted = deleteTarget.ids.length;
        setDeleteTarget(null);

        // If page becomes empty and page > 1, navigate back; if inbox empty, exit manage mode
        if (notifications.length === countDeleted) {
          if (page > 1) {
            setPage((p) => Math.max(1, p - 1));
          } else {
            setIsManageMode(false);
          }
        }
      } else {
        setDeleteError(res.message || 'Failed to delete notification(s).');
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete notification(s).');
    } finally {
      setIsDeleting(false);
    }
  };

  // Maps reference_type to role-specific route
  const getReferenceLink = (n: NotificationResponse) => {
    if (!n.reference_id) return null;
    const refType = n.reference_type?.toLowerCase();

    if (refType === 'daily_update') {
      if (roleName === 'director') {
        return `/director/daily-updates/${n.reference_id}`;
      }
      return `/employee/daily-updates/${n.reference_id}`;
    }
    if (refType === 'task_assignment') {
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
          <div className="flex items-center gap-2">
            {!isManageMode && notifications.some((n) => !n.is_read) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllRead}
                leftIcon={<CheckCheck className="w-4 h-4 text-indigo-600" />}
              >
                Mark all as read
              </Button>
            )}
            {!isManageMode && notifications.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsManageMode(true);
                  setActiveNotification(null);
                  setMenuPosition(null);
                  anchorElRef.current = null;
                }}
              >
                Manage
              </Button>
            )}
          </div>
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
          {/* Selection Mode Toolbar (Only visible in Manage Mode) */}
          {isManageMode && (
            <div className="bg-[#fff8f3] border border-[#efe7e1] rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in duration-150">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsManageMode(false);
                    setSelectedIds(new Set());
                  }}
                  leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
                >
                  Done managing
                </Button>

                <div className="h-4 w-px bg-stone-200" />

                <span className="font-semibold text-stone-800">
                  {selectedIds.size} selected
                </span>

                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="text-xs font-bold text-[#991b1f] hover:text-[#7f161a] hover:underline transition-colors"
                >
                  {allCurrentSelected ? 'Deselect all' : 'Select all'}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="danger"
                  size="sm"
                  disabled={selectedIds.size === 0 || isDeleting}
                  onClick={() => {
                    setDeleteError(null);
                    setDeleteTarget({
                      ids: Array.from(selectedIds),
                      isSingle: false,
                      hadUnread: notifications.some(
                        (n) => selectedIds.has(n.notification_id) && !n.is_read
                      ),
                    });
                  }}
                  leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                >
                  Delete selected
                </Button>
              </div>
            </div>
          )}

          {/* Notifications List */}
          <div className="space-y-3">
            {notifications.map((n) => {
              const refLink = getReferenceLink(n);
              const isSelected = selectedIds.has(n.notification_id);

              return (
                <Card
                  key={n.notification_id}
                  className={`border-l-4 transition-all ${
                    n.is_read
                      ? 'border-l-slate-200 bg-white/60'
                      : 'border-l-indigo-600 bg-white shadow-xs'
                  } ${isSelected ? 'ring-2 ring-[#991b1f]/30' : ''}`}
                >
                  <CardContent className="p-4 flex gap-3.5 items-start justify-between relative">
                    <div className="flex gap-3.5 items-start min-w-0 flex-1">
                      {/* Checkbox: ONLY visible in Manage Mode */}
                      {isManageMode && (
                        <div className="pt-1 flex-shrink-0 animate-in fade-in zoom-in-75 duration-100">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectOne(n.notification_id)}
                            className="w-4 h-4 rounded border-stone-300 text-[#991b1f] focus:ring-[#991b1f] cursor-pointer"
                            aria-label={`Select notification ${n.title}`}
                          />
                        </div>
                      )}

                      {/* Notification Icon */}
                      <div
                        className={`p-2 rounded-xl flex-shrink-0 mt-0.5 ${
                          n.is_read ? 'bg-slate-100 text-slate-400' : 'bg-indigo-50 text-indigo-600'
                        }`}
                      >
                        <Bell className="w-4.5 h-4.5" />
                      </div>

                      {/* Content */}
                      <div className="space-y-1 min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-2">
                          <h4
                            className={`text-sm truncate ${
                              n.is_read ? 'text-slate-600 font-medium' : 'text-slate-900 font-bold'
                            }`}
                          >
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

                    {/* Three-dot menu button in Normal Reading Mode */}
                    {!isManageMode && (
                      <div className="relative flex-shrink-0">
                        <button
                          type="button"
                          data-menu-trigger
                          onClick={(e) => handleToggleMenu(n, e.currentTarget)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            activeNotification?.notification_id === n.notification_id
                              ? 'text-stone-700 bg-stone-100'
                              : 'text-stone-400 hover:text-stone-700 hover:bg-stone-100'
                          }`}
                          aria-label={`Options for ${n.title}`}
                          aria-expanded={activeNotification?.notification_id === n.notification_id}
                          aria-haspopup="true"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
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

      {/* Delete Confirmation Modal (Handles Single & Bulk Delete) */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-[#efe7e1] max-w-md w-full p-6 text-stone-900 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 id="delete-dialog-title" className="text-base font-bold text-stone-900">
                  {deleteTarget.isSingle
                    ? 'Delete notification?'
                    : `Delete ${deleteTarget.ids.length} notification${
                        deleteTarget.ids.length === 1 ? '' : 's'
                      }?`}
                </h3>
                <p className="text-xs text-stone-500 leading-relaxed">
                  {deleteTarget.isSingle
                    ? 'This notification will be permanently deleted. This action cannot be undone.'
                    : `You are about to permanently delete ${deleteTarget.ids.length} notification${
                        deleteTarget.ids.length === 1 ? '' : 's'
                      }. This action cannot be undone.`}
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                {deleteError}
              </div>
            )}

            <div className="flex justify-end items-center gap-2.5 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={isDeleting}
                onClick={() => {
                  if (!isDeleting) {
                    setDeleteTarget(null);
                    setDeleteError(null);
                  }
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={isDeleting}
                disabled={isDeleting}
                onClick={handleConfirmDelete}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Three-Dot Menu Portal (Renders into document.body to prevent clipping by Card overflow-hidden) */}
      {activeNotification && menuPosition && typeof document !== 'undefined' && createPortal(
        <div
          data-menu-portal
          style={{
            position: 'fixed',
            top: menuPosition.top !== undefined ? `${menuPosition.top}px` : undefined,
            bottom: menuPosition.bottom !== undefined ? `${menuPosition.bottom}px` : undefined,
            left: `${menuPosition.left}px`,
            width: '11rem',
            zIndex: 60,
          }}
          className="bg-white rounded-xl shadow-xl border border-[#efe7e1] py-1 animate-in fade-in zoom-in-95 duration-100 text-xs"
        >
          {!activeNotification.is_read && (
            <button
              type="button"
              onClick={() => {
                handleMarkAsRead(activeNotification.notification_id);
                setActiveNotification(null);
                setMenuPosition(null);
                anchorElRef.current = null;
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-stone-700 hover:bg-[#fff8f3] hover:text-[#991b1f] text-left transition-colors font-medium cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 text-indigo-600" />
              Mark as read
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              const targetNotif = activeNotification;
              setActiveNotification(null);
              setMenuPosition(null);
              anchorElRef.current = null;
              setDeleteError(null);
              setDeleteTarget({
                ids: [targetNotif.notification_id],
                isSingle: true,
                hadUnread: !targetNotif.is_read,
              });
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 text-left transition-colors font-medium cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            Delete notification
          </button>
        </div>,
        document.body
      )}
    </div>
  );
};

export default NotificationsPage;
