import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Plus,
  Edit2,
  CheckCircle,
  AlertTriangle,
  Save,
  MoreVertical,
  Eye,
  UserCheck,
  UserX,
  PauseCircle,
  Trash2,
  X,
  Building2,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  User as UserIcon,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../../../services/api';
import { useAuth } from '../../../hooks/useAuth';
import { PageHeader } from '../../../components/PageHeader';
import { Card, CardContent, CardHeader } from '../../../components/Card';
import { Badge } from '../../../components/Badge';
import { Button } from '../../../components/Button';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import type { UserListItem, Role, Department } from '../../../types/user';

export const AdminUsersPage: React.FC = () => {
  const { user: currentAuthUser } = useAuth();
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const initialStatus = searchParams.get('status') || searchParams.get('status_filter') || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Lists
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allActiveUsers, setAllActiveUsers] = useState<UserListItem[]>([]); // For Manager Selector

  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchVal, setSearchVal] = useState(initialSearch);
  const [roleFilter, setRoleFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialStatus);

  // Modals state
  const [showModal, setShowModal] = useState<'create' | 'edit' | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Action Menu & Deletion / Profile Modals state
  const [activeMenuUserId, setActiveMenuUserId] = useState<string | null>(null);
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number; placement: 'top' | 'bottom' } | null>(null);
  const triggerRefs = useRef<{ [userId: string]: HTMLButtonElement | null }>({});
  const menuRef = useRef<HTMLDivElement>(null);
  const [viewProfileUser, setViewProfileUser] = useState<UserListItem | null>(null);
  const [deleteTargetUser, setDeleteTargetUser] = useState<UserListItem | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Form Fields
  const [employeeCode, setEmployeeCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedManager, setSelectedManager] = useState('');
  const [designation, setDesignation] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | 'suspended'>('active');

  const fetchFiltersAndLists = async () => {
    try {
      // Fetch Roles list
      const rolesRes = await api.get<Role[]>('/roles');
      setRoles(rolesRes.data || []);

      // Fetch Departments list
      const deptsRes = await api.get<Department[]>('/departments');
      setDepartments(deptsRes.data || []);

      // Fetch active users for Manager Selection
      const activeUsersRes = await api.getPaginated<UserListItem>('/users', {
        page_size: 150,
        status_filter: 'active',
      });
      setAllActiveUsers(activeUsersRes.data?.items || []);
    } catch {
      // Fail silently for supporting dropdown lists
    }
  };

  const fetchUsersList = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getPaginated<UserListItem>('/users', {
        search: searchVal || undefined,
        role_id: roleFilter || undefined,
        department_id: deptFilter || undefined,
        status_filter: statusFilter || undefined,
        page,
        page_size: 10,
      });

      if (res.success && res.data) {
        setUsers(res.data.items || []);
        setTotalPages(res.data.total_pages || 1);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve system users directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiltersAndLists();
  }, []);

  useEffect(() => {
    const q = searchParams.get('search');
    if (q !== null && q !== searchVal) {
      setSearchVal(q);
      setPage(1);
    }
    const s = searchParams.get('status') || searchParams.get('status_filter');
    if (s !== null && s !== statusFilter) {
      setStatusFilter(s);
      setPage(1);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchUsersList();
  }, [page, searchVal, roleFilter, deptFilter, statusFilter]);

  const handleOpenCreate = () => {
    setError(null);
    setSuccess(null);
    setSelectedUserId(null);
    setEmployeeCode('');
    setFullName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setSelectedRole(roles[0]?.role_id || '');
    setSelectedDept('');
    setSelectedManager('');
    setDesignation('');
    setJoiningDate('');
    setStatus('active');
    setShowModal('create');
  };

  const handleOpenEdit = (userItem: UserListItem) => {
    setError(null);
    setSuccess(null);
    setSelectedUserId(userItem.user_id);
    setEmployeeCode(userItem.employee_code);
    setFullName(userItem.full_name);
    setEmail(userItem.email);
    setPhone(userItem.phone || '');
    setPassword(''); // Never populate passwords
    
    // Find matching role & department objects (case-insensitive)
    const rMatch = roles.find(r => r.role_name.toLowerCase() === (userItem.role_name || '').toLowerCase());
    setSelectedRole(rMatch ? rMatch.role_id : '');
    
    const dMatch = departments.find(d => d.department_name.toLowerCase() === (userItem.department_name || '').toLowerCase());
    setSelectedDept(dMatch ? dMatch.department_id : '');
    
    const mMatch = allActiveUsers.find(u => u.full_name.toLowerCase() === (userItem.manager_name || '').toLowerCase());
    setSelectedManager(mMatch ? mMatch.user_id : '');
    
    setDesignation(userItem.designation || '');
    setJoiningDate(userItem.date_of_joining ? userItem.date_of_joining.slice(0, 10) : '');
    setStatus(userItem.status as any);
    setShowModal('edit');
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!fullName.trim() || !email.trim() || !employeeCode.trim()) return;

    if (selectedManager && selectedManager === selectedUserId) {
      setError('A user cannot report to themselves. Please select a different manager.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const payload: any = {
      role_id: selectedRole || null,
      department_id: selectedDept || null,
      manager_id: selectedManager || null,
      employee_code: employeeCode.trim(),
      full_name: fullName.trim(),
      email: email.trim(),
      phone: phone.trim() || null,
      designation: designation.trim() || null,
      date_of_joining: joiningDate || null,
      status,
    };

    try {
      if (showModal === 'create') {
        payload.password = password || 'User@123'; // Default fallback password if empty
        const res = await api.post('/users', payload);
        if (res.success) {
          setSuccess('User registered successfully!');
          setShowModal(null);
          fetchUsersList();
          setTimeout(() => setSuccess(null), 3000);
        }
      } else {
        const res = await api.patch(`/users/${selectedUserId}`, payload);
        if (res.success) {
          setSuccess('User details updated successfully!');
          setShowModal(null);
          fetchUsersList();
          setTimeout(() => setSuccess(null), 3000);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save user account.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (userId: string, newStatus: 'active' | 'inactive' | 'suspended') => {
    const actionLabels: Record<string, string> = {
      active: 'activate',
      inactive: 'deactivate',
      suspended: 'suspend',
    };
    const confirmMsg = `Are you sure you want to ${actionLabels[newStatus]} this user account?`;
    if (!window.confirm(confirmMsg)) return;

    setError(null);
    setSuccess(null);
    try {
      // Use dedicated admin endpoints to ensure self-deactivation protection
      // and generate correct audit log actions (USER_ACTIVATED, USER_DEACTIVATED, USER_SUSPENDED)
      const endpoint = `/admin/users/${userId}/${actionLabels[newStatus]}`;
      const res = await api.post(endpoint);
      if (res.success) {
        setSuccess(`User account ${actionLabels[newStatus]}d successfully!`);
        fetchUsersList();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update user account status.');
    }
  };

  const calculateMenuPosition = useCallback((triggerEl: HTMLElement) => {
    const rect = triggerEl.getBoundingClientRect();
    const menuEl = menuRef.current;
    const menuWidth = menuEl ? menuEl.offsetWidth : 224;
    const menuHeight = menuEl ? menuEl.offsetHeight : 216;
    const GAP = 6;
    const MARGIN = 12;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    let placement: 'top' | 'bottom' = 'bottom';
    let top = rect.bottom + GAP;

    // If insufficient space below AND more space above, flip upward
    if (spaceBelow < menuHeight + GAP + MARGIN && spaceAbove > spaceBelow) {
      placement = 'top';
      top = Math.max(MARGIN, rect.top - menuHeight - GAP);
    } else {
      placement = 'bottom';
      if (top + menuHeight > viewportHeight - MARGIN) {
        top = Math.max(MARGIN, viewportHeight - menuHeight - MARGIN);
      }
    }

    // Default: align right edge of menu with right edge of button
    let left = rect.right - menuWidth;

    // Clamp within viewport horizontally with safe margins
    if (left < MARGIN) {
      left = MARGIN;
    }
    if (left + menuWidth > viewportWidth - MARGIN) {
      left = Math.max(MARGIN, viewportWidth - menuWidth - MARGIN);
    }

    return { top, left, placement };
  }, []);

  const handleToggleMenu = (userId: string, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (activeMenuUserId === userId) {
      setActiveMenuUserId(null);
      setMenuCoords(null);
    } else {
      const coords = calculateMenuPosition(e.currentTarget);
      setMenuCoords(coords);
      setActiveMenuUserId(userId);
    }
  };

  useEffect(() => {
    if (!activeMenuUserId) return;

    const triggerEl = triggerRefs.current[activeMenuUserId];
    if (triggerEl) {
      const coords = calculateMenuPosition(triggerEl);
      setMenuCoords(coords);
    }

    const handleReposition = () => {
      const el = triggerRefs.current[activeMenuUserId];
      if (!el) {
        setActiveMenuUserId(null);
        setMenuCoords(null);
        return;
      }
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) {
        setActiveMenuUserId(null);
        setMenuCoords(null);
        return;
      }
      setMenuCoords(calculateMenuPosition(el));
    };

    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [activeMenuUserId, calculateMenuPosition]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current && menuRef.current.contains(target)) {
        return;
      }
      if (activeMenuUserId && triggerRefs.current[activeMenuUserId]?.contains(target)) {
        return;
      }
      setActiveMenuUserId(null);
      setMenuCoords(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (activeMenuUserId) {
          const triggerEl = triggerRefs.current[activeMenuUserId];
          setActiveMenuUserId(null);
          setMenuCoords(null);
          triggerEl?.focus();
          return;
        }
        if (viewProfileUser) setViewProfileUser(null);
        if (deleteTargetUser && !isDeleting) {
          setDeleteTargetUser(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeMenuUserId, viewProfileUser, deleteTargetUser, isDeleting]);

  const handleMenuKeyDown = (e: React.KeyboardEvent) => {
    if (!menuRef.current) return;
    const items = Array.from(
      menuRef.current.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]:not([disabled])')
    );
    if (!items.length) return;

    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
      items[nextIndex]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
      items[prevIndex]?.focus();
    } else if (e.key === 'Tab') {
      setActiveMenuUserId(null);
      setMenuCoords(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTargetUser) return;
    if (deleteConfirmText !== 'DELETE') return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await api.delete(`/users/${deleteTargetUser.user_id}`);
      if (res.success) {
        setUsers(prev => prev.filter(u => u.user_id !== deleteTargetUser.user_id));
        setSuccess('User deleted successfully.');
        setDeleteTargetUser(null);
        setDeleteConfirmText('');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to delete user account.';
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const activeUser = users.find(u => u.user_id === activeMenuUserId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Accounts Control"
        subtitle="Provision user accounts, configure department assignments, managers, and access roles."
        badgeText="Administration"
        action={
          <Button variant="primary" size="sm" onClick={handleOpenCreate} leftIcon={<Plus className="w-4 h-4" />}>
            Register New User
          </Button>
        }
      />

      {success && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200/80 rounded-xl flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <p className="text-xs font-semibold text-emerald-700">{success}</p>
        </div>
      )}

      {error && !showModal && (
        <div className="p-3.5 bg-rose-50 border border-rose-200/80 rounded-xl flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <p className="text-xs font-semibold text-rose-700">{error}</p>
        </div>
      )}

      {/* Filters Card */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Search */}
            <div className="relative w-full sm:w-60">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, email, code..."
                value={searchVal}
                onChange={(e) => {
                  setSearchVal(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 focus:outline-none"
            >
              <option value="">All Roles</option>
              {roles.map(r => (
                <option key={r.role_id} value={r.role_id}>
                  {r.role_name}
                </option>
              ))}
            </select>

            {/* Department Filter */}
            <select
              value={deptFilter}
              onChange={(e) => {
                setDeptFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 focus:outline-none"
            >
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d.department_id} value={d.department_id}>
                  {d.department_name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchVal('');
              setRoleFilter('');
              setDeptFilter('');
              setStatusFilter('');
              setPage(1);
            }}
          >
            Reset
          </Button>
        </CardContent>
      </Card>

      {/* Modal overlays */}
      {showModal && (
        <Card className="border border-indigo-200 bg-indigo-50/10 max-w-3xl">
          <CardHeader>
            <h3 className="text-sm font-bold text-slate-900">
              {showModal === 'create' ? 'Register System Account' : 'Edit Account Specifications'}
            </h3>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                <p className="text-xs font-semibold text-rose-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Employee Code</label>
                  <input
                    type="text"
                    required
                    value={employeeCode}
                    onChange={(e) => setEmployeeCode(e.target.value)}
                    placeholder="EMP-0123"
                    className="block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className="block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 555-1234"
                    className="block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>

                {showModal === 'create' && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Password</label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 6 characters..."
                      className="block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Access Role</label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="block w-full p-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
                  >
                    {roles.map(r => (
                      <option key={r.role_id} value={r.role_id}>
                        {r.role_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Department</label>
                  <select
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    className="block w-full p-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
                  >
                    <option value="">No Department</option>
                    {departments.map(d => (
                      <option key={d.department_id} value={d.department_id}>
                        {d.department_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Reporting Manager</label>
                  <select
                    value={selectedManager}
                    onChange={(e) => setSelectedManager(e.target.value)}
                    className="block w-full p-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
                  >
                    <option value="">No Manager</option>
                    {allActiveUsers
                      .filter(u => u.user_id !== selectedUserId)
                      .map(u => (
                        <option key={u.user_id} value={u.user_id}>
                          {u.full_name} ({u.role_name})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Designation</label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="Senior Developer"
                    className="block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="block w-full p-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Date of Joining</label>
                  <input
                    type="date"
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                    className="block w-full p-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
              </div>



              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowModal(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={saving}
                  disabled={saving}
                  leftIcon={<Save className="w-4 h-4" />}
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* User listing */}
      {loading ? (
        <LoadingSpinner size="lg" text="Loading users directory..." />
      ) : users.length === 0 ? (
        <Card className="p-8 text-center text-slate-400 text-xs">
          No user accounts found matching selected filters.
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {users.map((item) => (
              <Card key={item.user_id} className="overflow-visible">
                <CardContent className="p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        {item.employee_code}
                      </span>
                      <h4 className="text-sm font-bold text-slate-800 leading-snug truncate">
                        {item.full_name}
                      </h4>
                      <Badge variant="brand" className="uppercase text-[9px] font-bold py-0.5">
                        {item.role_name}
                      </Badge>
                      <Badge
                        variant={item.status === 'active' ? 'success' : item.status === 'suspended' ? 'danger' : 'neutral'}
                        className="uppercase text-[9px] font-bold py-0.5"
                      >
                        {item.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold text-slate-500">
                      <span>Designation: {item.designation || 'Staff'}</span>
                      <span>Department: {item.department_name || 'N/A'}</span>
                      <span>Manager: {item.manager_name || 'N/A'}</span>
                      <span className="truncate">Email: {item.email}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 items-center flex-shrink-0">
                    <Button variant="outline" size="sm" leftIcon={<Edit2 className="w-3.5 h-3.5" />} onClick={() => handleOpenEdit(item)}>
                      Edit specs
                    </Button>

                    <select
                      value={item.status}
                      onChange={(e) => handleStatusChange(item.user_id, e.target.value as any)}
                      className="text-xs bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-2 focus:outline-none"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                    </select>

                    {/* More Actions (⋮) Menu Button */}
                    <div className="relative inline-flex items-center">
                      <button
                        id={`more-actions-btn-${item.user_id}`}
                        type="button"
                        ref={(el) => {
                          triggerRefs.current[item.user_id] = el;
                        }}
                        aria-label={`More actions for ${item.full_name}`}
                        aria-haspopup="true"
                        aria-expanded={activeMenuUserId === item.user_id}
                        onClick={(e) => handleToggleMenu(item.user_id, e)}
                        className={`p-2 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500/20 ${
                          activeMenuUserId === item.user_id
                            ? 'text-slate-800 bg-slate-100'
                            : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center pt-4">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                Previous Page
              </Button>
              <span className="text-xs text-slate-500 font-medium">
                Page {page} of {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                Next Page
              </Button>
            </div>
          )}
        </div>
      )}

      {/* View Profile Modal */}
      {viewProfileUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setViewProfileUser(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="view-profile-modal-title"
        >
          <div
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600">
                  <UserIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 id="view-profile-modal-title" className="text-sm font-bold text-slate-900">
                    User Profile
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">Read-only account specifications</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewProfileUser(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Profile Content */}
            <div className="p-6 space-y-4">
              {/* Top Highlight Card */}
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                    {viewProfileUser.employee_code}
                  </span>
                  <h4 className="text-base font-bold text-slate-900">{viewProfileUser.full_name}</h4>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {viewProfileUser.email}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <Badge variant="brand" className="uppercase text-[9px] font-bold py-0.5">
                    {viewProfileUser.role_name}
                  </Badge>
                  <Badge
                    variant={
                      viewProfileUser.status === 'active'
                        ? 'success'
                        : viewProfileUser.status === 'suspended'
                        ? 'danger'
                        : 'neutral'
                    }
                    className="uppercase text-[9px] font-bold py-0.5"
                  >
                    {viewProfileUser.status}
                  </Badge>
                </div>
              </div>

              {/* Grid of details */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white border border-slate-100 rounded-xl space-y-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Designation
                  </span>
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    {viewProfileUser.designation || 'Staff'}
                  </span>
                </div>

                <div className="p-3 bg-white border border-slate-100 rounded-xl space-y-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Department
                  </span>
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    {viewProfileUser.department_name || 'N/A'}
                  </span>
                </div>

                <div className="p-3 bg-white border border-slate-100 rounded-xl space-y-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Reporting Manager
                  </span>
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    {viewProfileUser.manager_name || 'None'}
                  </span>
                </div>

                <div className="p-3 bg-white border border-slate-100 rounded-xl space-y-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Date of Joining
                  </span>
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    {viewProfileUser.date_of_joining || 'Not recorded'}
                  </span>
                </div>

                {viewProfileUser.phone && (
                  <div className="p-3 bg-white border border-slate-100 rounded-xl space-y-1 col-span-2">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Phone Number
                    </span>
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      {viewProfileUser.phone}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setViewProfileUser(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => {
            if (!isDeleting) {
              setDeleteTargetUser(null);
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-rose-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-rose-100 bg-rose-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 id="delete-modal-title" className="text-sm font-bold text-slate-900">
                    Delete User Account
                  </h3>
                  <p className="text-[11px] text-rose-600 font-medium">Irreversible Administrative Action</p>
                </div>
              </div>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTargetUser(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Target User Info Summary */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                    {deleteTargetUser.employee_code}
                  </span>
                  <Badge variant="brand" className="uppercase text-[9px] font-bold py-0.5">
                    {deleteTargetUser.role_name}
                  </Badge>
                </div>
                <h4 className="text-sm font-bold text-slate-900 leading-snug">{deleteTargetUser.full_name}</h4>
                <p className="text-xs text-slate-500 font-medium">{deleteTargetUser.email}</p>
              </div>

              {/* Warning Text */}
              <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  Permanent deletion cannot be undone. The user's login credentials and active sessions will be erased.
                  Business records (tasks, reviews, comments) authored by this user will be preserved with their authorship anonymised.
                </p>
              </div>

              {/* Confirmation Input Field and Buttons */}
              <div className="space-y-4 pt-1">
                {deleteError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs font-semibold text-rose-700 leading-relaxed">{deleteError}</p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    To confirm permanent deletion, type <span className="font-mono font-bold text-rose-600">DELETE</span> below:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Type DELETE to confirm"
                    autoFocus
                    disabled={isDeleting}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isDeleting}
                    onClick={() => setDeleteTargetUser(null)}
                  >
                    Cancel
                  </Button>
                  <button
                    type="button"
                    disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                    onClick={handleDeleteUser}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-rose-600/20"
                  >
                    {isDeleting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Permanently</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Portaled More Actions Menu */}
      {activeUser && menuCoords && createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-orientation="vertical"
          aria-labelledby={`more-actions-btn-${activeUser.user_id}`}
          onKeyDown={handleMenuKeyDown}
          style={{
            position: 'fixed',
            top: `${menuCoords.top}px`,
            left: `${menuCoords.left}px`,
            zIndex: 9999,
          }}
          className={`w-56 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-1.5 animate-in fade-in zoom-in-95 duration-100 ${
            menuCoords.placement === 'top' ? 'origin-bottom-right' : 'origin-top-right'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              const target = activeUser;
              setActiveMenuUserId(null);
              setMenuCoords(null);
              setViewProfileUser(target);
            }}
            className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2.5 transition-colors focus:outline-none focus:bg-slate-100 focus:text-slate-900"
          >
            <Eye className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="whitespace-nowrap">View Profile</span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              const target = activeUser;
              setActiveMenuUserId(null);
              setMenuCoords(null);
              handleOpenEdit(target);
            }}
            className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2.5 transition-colors focus:outline-none focus:bg-slate-100 focus:text-slate-900"
          >
            <Edit2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="whitespace-nowrap">Edit User</span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              const target = activeUser;
              setActiveMenuUserId(null);
              setMenuCoords(null);
              handleStatusChange(target.user_id, target.status === 'inactive' ? 'active' : 'inactive');
            }}
            className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2.5 transition-colors focus:outline-none focus:bg-slate-100 focus:text-slate-900"
          >
            {activeUser.status === 'inactive' ? (
              <>
                <UserCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <span className="whitespace-nowrap">Activate Account</span>
              </>
            ) : (
              <>
                <UserX className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <span className="whitespace-nowrap">Deactivate Account</span>
              </>
            )}
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              const target = activeUser;
              setActiveMenuUserId(null);
              setMenuCoords(null);
              handleStatusChange(target.user_id, target.status === 'suspended' ? 'active' : 'suspended');
            }}
            className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2.5 transition-colors focus:outline-none focus:bg-slate-100 focus:text-slate-900"
          >
            {activeUser.status === 'suspended' ? (
              <>
                <UserCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <span className="whitespace-nowrap">Activate Account</span>
              </>
            ) : (
              <>
                <PauseCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <span className="whitespace-nowrap">Suspend Account</span>
              </>
            )}
          </button>

          <div className="my-1.5 border-t border-slate-100" />

          <button
            type="button"
            role="menuitem"
            disabled={currentAuthUser?.user_id === activeUser.user_id}
            title={currentAuthUser?.user_id === activeUser.user_id ? 'You cannot delete your own administrator account.' : undefined}
            onClick={() => {
              if (currentAuthUser?.user_id === activeUser.user_id) return;
              const target = activeUser;
              setActiveMenuUserId(null);
              setMenuCoords(null);
              setDeleteTargetUser(target);
              setDeleteConfirmText('');
              setDeleteError(null);
            }}
            className={`w-full text-left px-3.5 py-2 text-xs font-medium flex items-center gap-2.5 transition-colors focus:outline-none ${
              currentAuthUser?.user_id === activeUser.user_id
                ? 'text-slate-300 cursor-not-allowed bg-transparent'
                : 'text-rose-600 hover:bg-rose-50 hover:text-rose-700 focus:bg-rose-50 focus:text-rose-700'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="whitespace-nowrap">Delete User</span>
          </button>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AdminUsersPage;
