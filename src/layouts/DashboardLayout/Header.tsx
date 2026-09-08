import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import {
  Menu,
  Bell,
  LogOut,
  User as UserIcon,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { logoutUser } from '../../features/auth/slices/authSlice';
import { api } from '../../services/api';
import { GlobalSearch } from '../../components/GlobalSearch';
import { NotificationPopover } from '../../components/NotificationPopover';

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const { user, roleName, isEmployee, isAdmin } = useAuth();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setDropdownOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(target)) {
        setNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch unread count initially, poll periodically, and refresh on user actions (Employee & Director only)
  useEffect(() => {
    if (isAdmin) return;

    let isMounted = true;

    const fetchUnreadCount = () => {
      api
        .get<{ unread_count: number }>('/notifications/unread-count')
        .then((res) => {
          if (isMounted && res.success && res.data) {
            setUnreadCount(res.data.unread_count);
          }
        })
        .catch(() => {
          // Ignore header unread poll errors
        });
    };

    fetchUnreadCount();

    // Periodic lightweight poll every 45 seconds
    const intervalId = setInterval(fetchUnreadCount, 45000);

    // Refresh immediately when important actions occur in the app
    const handleActionRefresh = () => {
      fetchUnreadCount();
    };
    window.addEventListener('notification-refresh', handleActionRefresh);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      window.removeEventListener('notification-refresh', handleActionRefresh);
    };
  }, [isAdmin]);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/login');
  };

  const handleToggleNotifications = () => {
    setNotificationOpen((prev) => !prev);
    if (dropdownOpen) {
      setDropdownOpen(false);
    }
  };

  const handleToggleUserDropdown = () => {
    setDropdownOpen((prev) => !prev);
    if (notificationOpen) {
      setNotificationOpen(false);
    }
  };

  return (
    <header className="h-14 bg-[#7f161a] border-b border-[#6b1215] px-4 sm:px-6 flex items-center justify-between flex-shrink-0 z-20 text-white w-full">
      {/* Left section: mobile hamburger & search */}
      <div className="flex items-center gap-3 flex-1">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Global Search Bar (Hidden for Employee workspace) */}
        {!isEmployee && (
          <div className="hidden sm:flex flex-1 max-w-md">
            <GlobalSearch />
          </div>
        )}
      </div>

      {/* Right section: notification bell & user menu */}
      <div className="flex items-center gap-3">
        {/* Notification Bell Dropdown Trigger (Hidden for Admin workspace) */}
        {!isAdmin && (
          <>
            <div className="relative" ref={notificationRef}>
              <button
                type="button"
                onClick={handleToggleNotifications}
                className={`relative p-2 rounded-xl text-white/90 hover:text-white transition-all flex items-center justify-center ${
                  notificationOpen ? 'bg-white/20 text-white' : 'hover:bg-white/10'
                }`}
                aria-label="Notifications"
                aria-expanded={notificationOpen}
                aria-haspopup="dialog"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-[#ffe1c5] text-[#991b1f] text-[10px] font-black rounded-full flex items-center justify-center shadow-xs ring-2 ring-[#7f161a]">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover Dropdown */}
              <NotificationPopover
                isOpen={notificationOpen}
                onClose={() => setNotificationOpen(false)}
                onUnreadCountChange={(count) => setUnreadCount(count)}
              />
            </div>

            <div className="h-6 w-px bg-white/20 mx-0.5" />
          </>
        )}

        {/* User Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={handleToggleUserDropdown}
            className={`flex items-center gap-2.5 p-1.5 pr-2.5 rounded-xl transition-all select-none ${
              dropdownOpen ? 'bg-white/20' : 'hover:bg-white/10'
            }`}
            aria-expanded={dropdownOpen}
            aria-haspopup="menu"
          >
            <div className="w-8 h-8 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center font-bold text-xs text-white shadow-xs">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-white leading-tight">
                {user?.full_name || 'Account'}
              </p>
              <p className="text-[10px] font-medium text-[#ffe1c5] capitalize">
                {roleName || 'User'}
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-white/70 hidden md:block" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-[#efe7e1] py-2 z-50 text-stone-900 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-4 py-2.5 border-b border-[#f5ede7]">
                <p className="text-xs font-bold text-stone-900 leading-tight">
                  {user?.full_name}
                </p>
                <p className="text-[11px] text-stone-500 truncate mt-0.5">{user?.email}</p>
                <div className="mt-2 inline-flex items-center px-2 py-0.5 text-[10px] font-semibold bg-[#fff8f3] text-[#991b1f] rounded-full border border-[#efe7e1] uppercase">
                  {roleName}
                </div>
              </div>

              <div className="py-1">
                <NavLink
                  to="/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-stone-700 hover:bg-[#fff8f3] hover:text-[#991b1f] transition-colors"
                >
                  <UserIcon className="w-4 h-4 text-stone-400" />
                  My Profile
                </NavLink>
                <NavLink
                  to="/notifications"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-stone-700 hover:bg-[#fff8f3] hover:text-[#991b1f] transition-colors"
                >
                  <Bell className="w-4 h-4 text-stone-400" />
                  Notification Preferences
                </NavLink>
              </div>

              <div className="pt-1 border-t border-[#f5ede7]">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
