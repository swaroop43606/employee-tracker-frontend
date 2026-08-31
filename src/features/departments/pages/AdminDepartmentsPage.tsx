import React, { useEffect, useState } from 'react';
import { Search, Plus, Edit2, CheckCircle, AlertCircle, Save } from 'lucide-react';
import { api } from '../../../services/api';
import { PageHeader } from '../../../components/PageHeader';
import { Card, CardContent, CardHeader } from '../../../components/Card';
import { Badge } from '../../../components/Badge';
import { Button } from '../../../components/Button';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import type { Department } from '../../../types/user';

export const AdminDepartmentsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // States
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchVal, setSearchVal] = useState('');
  const [showModal, setShowModal] = useState<'create' | 'edit' | null>(null);
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);

  // Form states
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  const fetchDepartments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Department[]>('/departments');
      if (res.success && res.data) {
        setDepartments(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve departments list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleOpenCreate = () => {
    setError(null);
    setSuccess(null);
    setSelectedDeptId(null);
    setCode('');
    setName('');
    setDescription('');
    setIsActive(true);
    setShowModal('create');
  };

  const handleOpenEdit = (dept: Department) => {
    setError(null);
    setSuccess(null);
    setSelectedDeptId(dept.department_id);
    setCode(dept.department_code);
    setName(dept.department_name);
    setDescription(dept.description || '');
    setIsActive(dept.is_active);
    setShowModal('edit');
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    const payload = {
      department_code: code,
      department_name: name,
      description: description || null,
      is_active: isActive,
    };

    try {
      if (showModal === 'create') {
        const res = await api.post<Department>('/departments', payload);
        if (res.success) {
          setSuccess('Department created successfully!');
          setShowModal(null);
          fetchDepartments();
          setTimeout(() => setSuccess(null), 3000);
        }
      } else {
        const res = await api.patch<Department>(`/departments/${selectedDeptId}`, payload);
        if (res.success) {
          setSuccess('Department updated successfully!');
          setShowModal(null);
          fetchDepartments();
          setTimeout(() => setSuccess(null), 3000);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save department configurations.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (dept: Department) => {
    const confirmMsg = `Are you sure you want to ${dept.is_active ? 'deactivate' : 'activate'} the department '${dept.department_name}'?`;
    if (!window.confirm(confirmMsg)) return;

    setError(null);
    setSuccess(null);
    try {
      const res = await api.patch(`/departments/${dept.department_id}`, {
        is_active: !dept.is_active,
        // Require fields matching Pydantic validation if needed (backend PATCH fields are all optional)
      });
      if (res.success) {
        setSuccess(`Department ${!dept.is_active ? 'activated' : 'deactivated'} successfully!`);
        fetchDepartments();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update department status.');
    }
  };

  const filteredDepts = departments.filter((d) =>
    d.department_name.toLowerCase().includes(searchVal.toLowerCase()) ||
    d.department_code.toLowerCase().includes(searchVal.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments Management"
        subtitle="Configure organizational business units, codes, and operational status."
        badgeText="Administration"
        action={
          <Button variant="primary" size="sm" onClick={handleOpenCreate} leftIcon={<Plus className="w-4 h-4" />}>
            Create Department
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
              placeholder="Search departments..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      {showModal && (
        <Card className="border border-indigo-200 bg-indigo-50/10 max-w-xl">
          <CardHeader>
            <h3 className="text-sm font-bold text-slate-900">
              {showModal === 'create' ? 'Create Organisational Unit' : 'Edit Department Configurations'}
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
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Department Code</label>
                <input
                  type="text"
                  required
                  placeholder="DEPT-ENG"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Department Name</label>
                <input
                  type="text"
                  required
                  placeholder="Engineering"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Department details..."
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
        <LoadingSpinner size="lg" text="Loading departments..." />
      ) : filteredDepts.length === 0 ? (
        <Card className="p-8 text-center text-slate-400 text-xs">
          No departments registered under this organization.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDepts.map((dept) => (
            <Card key={dept.department_id} hoverEffect className="flex flex-col justify-between">
              <CardContent className="p-5 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      {dept.department_code}
                    </span>
                    <h4 className="text-sm font-bold text-slate-800 mt-1">{dept.department_name}</h4>
                  </div>
                  <Badge variant={dept.is_active ? 'success' : 'neutral'} className="uppercase text-[9px] font-bold">
                    {dept.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <p className="text-xs text-slate-500 line-clamp-2">
                  {dept.description || 'No description comments registered.'}
                </p>

                <div className="pt-2 border-t border-slate-100 flex gap-2 justify-end">
                  <Button variant="outline" size="sm" leftIcon={<Edit2 className="w-3.5 h-3.5" />} onClick={() => handleOpenEdit(dept)}>
                    Edit settings
                  </Button>
                  <Button
                    variant={dept.is_active ? 'danger' : 'primary'}
                    size="sm"
                    className="py-1 px-3 text-[10px] font-bold"
                    onClick={() => handleToggleStatus(dept)}
                  >
                    {dept.is_active ? 'Deactivate' : 'Activate'}
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

export default AdminDepartmentsPage;
