import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Plus, Edit2, ShieldAlert, CheckCircle, AlertTriangle, Save } from 'lucide-react';
import { api } from '../../../services/api';
import { PageHeader } from '../../../components/PageHeader';
import { Card, CardContent, CardHeader } from '../../../components/Card';
import { Badge } from '../../../components/Badge';
import { Button } from '../../../components/Button';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import type { UserListItem, Role, Department } from '../../../types/user';

export const AdminUsersPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

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
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state
  const [showModal, setShowModal] = useState<'create' | 'edit' | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

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
  const [address, setAddress] = useState('');
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
    setAddress('');
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
    
    // Find matching role & department objects
    const rMatch = roles.find(r => r.role_name === userItem.role_name);
    setSelectedRole(rMatch ? rMatch.role_id : '');
    
    const dMatch = departments.find(d => d.department_name === userItem.department_name);
    setSelectedDept(dMatch ? dMatch.department_id : '');
    
    const mMatch = allActiveUsers.find(u => u.full_name === userItem.manager_name);
    setSelectedManager(mMatch ? mMatch.user_id : '');
    
    setDesignation(userItem.designation || '');
    setJoiningDate(''); // Default placeholder
    setAddress(''); // Can load separately if detail API requested
    setStatus(userItem.status as any);
    setShowModal('edit');
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      employee_code: employeeCode,
      full_name: fullName,
      email,
      phone: phone || null,
      designation: designation || null,
      date_of_joining: joiningDate || null,
      address: address || null,
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

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Residential Address</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Address..."
                  className="block w-full p-3 text-xs border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowModal(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={saving} leftIcon={<Save className="w-4 h-4" />}>
                  Save Settings
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
              <Card key={item.user_id}>
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
                  <div className="flex flex-wrap gap-2 items-center">
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
    </div>
  );
};

export default AdminUsersPage;
