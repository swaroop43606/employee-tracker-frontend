import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarPlus,
  History,
  CheckSquare,
  ClipboardCheck,
  ListTodo,
  Users,
  Building2,
  ShieldAlert,
  Bell,
  Briefcase,
  Layers,
  X,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const { user, roleName } = useAuth();

  const getNavigationForRole = () => {
    switch (roleName) {
      case 'director':
        return [
          { name: 'Dashboard', href: '/director/dashboard', icon: LayoutDashboard },
          { name: 'Daily Update Reviews', href: '/director/daily-updates', icon: ClipboardCheck },
          { name: 'Tasks', href: '/director/tasks', icon: ListTodo },
          { name: 'Team', href: '/director/employees', icon: Users },
          { name: 'Notifications', href: '/notifications', icon: Bell },
        ];
      case 'admin':
        return [
          { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
          { name: 'Users', href: '/admin/users', icon: Users },
          { name: 'Departments', href: '/admin/departments', icon: Building2 },
          { name: 'Roles', href: '/admin/roles', icon: Layers },
          { name: 'Audit Logs', href: '/admin/audit-logs', icon: ShieldAlert },
        ];
      case 'employee':
      default:
        return [
          { name: 'Dashboard', href: '/employee/dashboard', icon: LayoutDashboard },
          { name: 'My Tasks', href: '/employee/tasks', icon: CheckSquare },
          { name: 'Daily Tracker', href: '/employee/daily-update', icon: CalendarPlus },
          { name: 'Feedback & Reviews', href: '/employee/daily-updates', icon: History },
          { name: 'Notifications', href: '/notifications', icon: Bell },
        ];
    }
  };

  const navItems = getNavigationForRole();

  const sidebarContent = (
    <div className="flex flex-col h-full w-full bg-[#991b1f] text-white border-r border-[#7f161a]">
      {/* Brand Header */}
      <div className="flex items-center justify-between h-14 px-4 bg-[#7f161a] border-b border-[#6b1215] flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center shadow-xs text-white">
            <Briefcase className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight text-white block leading-tight">
              TaskTracker
            </span>
            <span className="text-[9px] font-semibold text-[#ffe1c5] uppercase tracking-wider block">
              {roleName || 'Portal'}
            </span>
          </div>
        </div>
        {mobileOpen && (
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1 rounded-md text-white/70 hover:text-white hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav Links */}
      <div className="flex-1 overflow-y-auto px-2.5 py-4">
        <div className="px-2.5 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#ffe1c5]/75">
          Navigation
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `group flex items-center px-3 py-2 text-xs font-medium rounded-lg transition-all duration-150 ${
                  isActive
                    ? 'bg-white/20 text-white font-semibold shadow-xs border border-white/15 backdrop-blur-xs'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={`mr-2.5 flex-shrink-0 h-4 w-4 transition-colors ${
                      isActive ? 'text-white' : 'text-white/70 group-hover:text-white'
                    }`}
                    aria-hidden="true"
                  />
                  <span>{item.name}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* User Footer Card */}
      <div className="p-2.5 bg-[#7f161a]/95 border-t border-[#6b1215] flex-shrink-0">
        <NavLink
          to="/profile"
          className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-white/20 border border-white/25 flex items-center justify-center font-bold text-xs text-white shadow-xs">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate leading-tight">
              {user?.full_name || 'User'}
            </p>
            <p className="text-[10px] text-[#ffe1c5]/90 truncate mt-0.5">
              {user?.designation || (user?.role_name || user?.role?.role_name || '').toUpperCase()}
            </p>
          </div>
        </NavLink>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-shrink-0 w-64 h-full">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full h-full z-10">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
