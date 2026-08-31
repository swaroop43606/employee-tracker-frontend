import React, { useEffect, useState } from 'react';
import { Search, Plus, Edit2, CheckCircle, AlertCircle, Save } from 'lucide-react';
import { api } from '../../../services/api';
import { PageHeader } from '../../../components/PageHeader';
import { Card, CardContent, CardHeader } from '../../../components/Card';
import { Badge } from '../../../components/Badge';
import { Button } from '../../../components/Button';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import type { Role } from '../../../types/user';

export const AdminRolesPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // States
  const [roles, setRoles] = useState<Role[]>([]);
  const [searchVal, setSearchVal] = useState('');
  const [showModal, setShowModal] = useState<'create' | 'edit' | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  const fetchRoles = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Role[]>('/roles');
      if (res.success && res.data) {
        setRoles(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve system roles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleOpenCreate = () => {
    setError(null);
    setSuccess(null);
    setSelectedRoleId(null);
    setName('');
    setDescription('');
    setIsActive(true);
    setShowModal('create');
  };

  const handleOpenEdit = (role: Role) => {
    setError(null);
    setSuccess(null);
    setSelectedRoleId(role.role_id);
    setName(role.role_name);
    setDescription(role.description || '');
    setIsActive(role.is_active);
    setShowModal('edit');
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    const payload = {
      role_name: name,
      description: description || null,
      is_active: isActive,
    };

    try {
      if (showModal === 'create') {
        const res = await api.post<Role>('/roles', payload);
        if (res.success) {
          setSuccess('Role created successfully!');
          setShowModal(null);
          fetchRoles();
          setTimeout(() => setSuccess(null), 3000);
        }
      } else {
        const res = await api.patch<Role>(`/roles/${selectedRoleId}`, payload);
        if (res.success) {
          setSuccess('Role details updated successfully!');
          setShowModal(null);
          fetchRoles();
          setTimeout(() => setSuccess(null), 3000);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save access role settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (role: Role) => {
    const confirmMsg = `Are you sure you want to ${role.is_active ? 'deactivate' : 'activate'} the role '${role.role_name}'?`;
    if (!window.confirm(confirmMsg)) return;

    setError(null);
    setSuccess(null);
    try {
      const res = await api.patch(`/roles/${role.role_id}`, {
        is_active: !role.is_active,
      });
      if (res.success) {
        setSuccess(`Role access status changed successfully!`);
        fetchRoles();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update access role status.');
    }
  };

  const filteredRoles = roles.filter((r) =>
    r.role_name.toLowerCase().includes(searchVal.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Role Configurations (RBAC)"
        subtitle="Manage access roles, operational description ledgers, and active statuses."
        badgeText="Administration"
        action={
          <Button variant="primary" size="sm" onClick={handleOpenCreate} leftIcon={<Plus className="w-4 h-4" />}>
            Create Role
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
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <p className="text-xs font-semibold text-rose-700">{error}</p>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex gap-4 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search roles..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </CardContent>
      </Card>

      {/* Modal overlay */}
      {showModal && (
        <Card className="border border-indigo-200 bg-indigo-50/10 max-w-xl">
          <CardHeader>
            <h3 className="text-sm font-bold text-slate-900">
              {showModal === 'create' ? 'Create Access Role' : 'Edit Access Role Details'}
            </h3>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 mb-4">
                <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                <p className="text-xs font-semibold text-rose-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Role Name</label>
                <input
                  type="text"
                  required
                  placeholder="admin, director, employee"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Role privileges description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="block w-full p-3 text-xs border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Status</label>
                <select
                  value={isActive ? 'true' : 'false'}
                  onChange={(e) => setIsActive(e.target.value === 'true')}
                  className="block w-full p-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
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

      {/* Listing */}
      {loading ? (
        <LoadingSpinner size="lg" text="Loading access roles..." />
      ) : filteredRoles.length === 0 ? (
        <Card className="p-8 text-center text-slate-400 text-xs">
          No access roles registered.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRoles.map((role) => (
            <Card key={role.role_id} hoverEffect className="flex flex-col justify-between">
              <CardContent className="p-5 space-y-3">
                <div className="flex justify-between items-start">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">{role.role_name}</h4>
                  <Badge variant={role.is_active ? 'success' : 'neutral'} className="uppercase text-[9px] font-bold">
                    {role.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <p className="text-xs text-slate-500 line-clamp-2">
                  {role.description || 'No description comments registered.'}
                </p>

                <div className="pt-2 border-t border-slate-100 flex gap-2 justify-end">
                  <Button variant="outline" size="sm" leftIcon={<Edit2 className="w-3.5 h-3.5" />} onClick={() => handleOpenEdit(role)}>
                    Edit settings
                  </Button>
                  <Button
                    variant={role.is_active ? 'danger' : 'primary'}
                    size="sm"
                    className="py-1 px-3 text-[10px] font-bold"
                    onClick={() => handleToggleStatus(role)}
                  >
                    {role.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminRolesPage;
