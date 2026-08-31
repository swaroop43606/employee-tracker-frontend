import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  ExternalLink,
  Loader2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import type { NotificationResponse } from '../types/notification';

interface NotificationPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange: (count: number) => void;
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return dateString;
  }
}

export const NotificationPopover: React.FC<NotificationPopoverProps> = ({
  isOpen,
  onClose,
  onUnreadCountChange,
}) => {
  const { roleName } = useAuth();
  const navigate = useNavigate();
  const popoverRef = useRef<HTMLDivElement>(null);

  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [clearing, setClearing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch notifications when opened
  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getPaginated<NotificationResponse>('/notifications', {
        page: 1,
        page_size: 10,
      });
      if (res.success && res.data) {
        const items = res.data.items || [];
        setNotifications(items);
        const unread = items.filter((n) => !n.is_read).length;
        // Also fetch accurate unread count from server
        try {
          const countRes = await api.get<{ unread_count: number }>('/notifications/unread-count');
          if (countRes.success && countRes.data) {
            onUnreadCountChange(countRes.data.unread_count);
          }
        } catch {
          onUnreadCountChange(unread);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Mark single as read and navigate
  const handleItemClick = async (n: NotificationResponse) => {
    if (!n.is_read) {
      try {
        await api.patch(`/notifications/${n.notification_id}/read`);
        setNotifications((prev) =>
          prev.map((item) =>
            item.notification_id === n.notification_id ? { ...item, is_read: true } : item
          )
        );
        // Refresh unread count
        try {
          const countRes = await api.get<{ unread_count: number }>('/notifications/unread-count');
          if (countRes.success && countRes.data) {
            onUnreadCountChange(countRes.data.unread_count);
          }
        } catch {
          // ignore
        }
      } catch {
        // Continue navigation even if read status network request fails
      }
    }

    onClose();

    // Determine target route
    if (n.reference_id && n.reference_type) {
      const refType = n.reference_type.toLowerCase();
      if (refType === 'daily_update') {
        if (roleName === 'director') {
          navigate(`/director/daily-updates/${n.reference_id}`);
        } else {
          navigate(`/employee/daily-updates/${n.reference_id}`);
        }
      } else if (refType === 'task_assignment') {
        if (roleName === 'director') {
          navigate(`/director/tasks/${n.reference_id}`);
        } else {
          navigate(`/employee/tasks/${n.reference_id}`);
        }
      } else if (refType === 'user' && roleName === 'admin') {
        navigate('/admin/users');
      }
    }
  };

  // Mark all as read (Clear All)
  const handleClearAll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setClearing(true);
    try {
      const res = await api.patch('/notifications/read-all');
      if (res.success) {
        setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
        onUnreadCountChange(0);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to mark all as read.');
    } finally {
      setClearing(false);
    }
  };

  if (!isOpen) return null;

  const unreadItems = notifications.filter((n) => !n.is_read);

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-[#efe7e1] z-50 text-stone-900 animate-in fade-in zoom-in-95 duration-100 overflow-hidden"
      role="region"
      aria-label="Notification Popover"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#faf7f5] border-b border-[#efe7e1]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-stone-900">Notifications</span>
          {unreadItems.length > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-extrabold bg-[#ffe1c5] text-[#991b1f] rounded-full border border-[#f5d5b5]">
              {unreadItems.length} new
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {unreadItems.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              disabled={clearing}
              className="text-[11px] font-semibold text-[#991b1f] hover:text-[#7f161a] hover:underline transition-colors flex items-center gap-1 disabled:opacity-50"
            >
              {clearing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <CheckCheck className="w-3.5 h-3.5" />
              )}
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-[360px] overflow-y-auto divide-y divide-[#f5ede7]">
        {loading ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-stone-400">
            <Loader2 className="w-5 h-5 animate-spin text-[#991b1f]" />
            <span className="text-xs font-medium">Loading notifications...</span>
          </div>
        ) : error ? (
          <div className="p-4 text-center text-xs text-rose-600 flex items-center justify-center gap-1.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-10 px-4 text-center">
            <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-[#fff8f3] border border-[#efe7e1] flex items-center justify-center text-[#991b1f]">
              <Bell className="w-5 h-5 opacity-60" />
            </div>
            <p className="text-xs font-bold text-stone-800">No notifications</p>
            <p className="text-[11px] text-stone-400 mt-0.5">You're completely caught up!</p>
          </div>
        ) : (
          notifications.map((item) => (
            <button
              key={item.notification_id}
              type="button"
              onClick={() => handleItemClick(item)}
              className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors ${
                item.is_read
                  ? 'bg-white hover:bg-[#faf7f5]'
                  : 'bg-[#fff8f3] hover:bg-[#ffeadb]/60'
              }`}
            >
              {/* Unread indicator / Icon */}
              <div className="mt-0.5 flex-shrink-0">
                {!item.is_read ? (
                  <span className="w-2 h-2 rounded-full bg-[#991b1f] block ring-4 ring-[#ffe1c5]/50 mt-1" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-stone-300 block mt-1" />
                )}
              </div>

              {/* Text content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={`text-xs truncate ${
                      item.is_read ? 'font-medium text-stone-700' : 'font-bold text-stone-900'
                    }`}
                  >
                    {item.title}
                  </p>
                  <span className="text-[10px] text-stone-400 flex-shrink-0 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {formatRelativeTime(item.created_at)}
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 line-clamp-2 mt-0.5 leading-relaxed">
                  {item.message}
                </p>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Footer link to full notification center */}
      <div className="p-2.5 bg-[#faf7f5] border-t border-[#efe7e1] text-center">
        <NavLink
          to="/notifications"
          onClick={onClose}
          className="text-xs font-bold text-[#991b1f] hover:text-[#7f161a] inline-flex items-center gap-1.5 transition-colors"
        >
          View all notifications
          <ExternalLink className="w-3 h-3" />
        </NavLink>
      </div>
    </div>
  );
};
