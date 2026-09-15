import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { updateUserSuccess } from '../../auth/slices/authSlice';
import { api } from '../../../services/api';
import { PageHeader } from '../../../components/PageHeader';
import { Card, CardHeader, CardContent } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Badge } from '../../../components/Badge';
import {
  User as UserIcon,
  CheckCircle,
  AlertTriangle,
  Building,
  Mail,
  Save,
  Phone,
  Shield,
} from 'lucide-react';
import type { NotificationPreferenceResponse } from '../../../types/notification';
import type { CurrentUser, Department, Role } from '../../../types/user';

export const ProfilePage: React.FC = () => {
  const { user, roleName, isAdmin } = useAuth();
  const dispatch = useAppDispatch();
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'notifications'>('profile');

  // Loading / saving states
  const [loadingPrefs, setLoadingPrefs] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Status feedback messages
  const [phoneSuccess, setPhoneSuccess] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [companySuccess, setCompanySuccess] = useState<string | null>(null);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Phone state
  const [initialPhone, setInitialPhone] = useState(user?.phone || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [phoneValidationMsg, setPhoneValidationMsg] = useState<string | null>(null);

  // Admin company info form state
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  const [companyForm, setCompanyForm] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    employee_code: user?.employee_code || '',
    department_id: user?.department_id || user?.department?.department_id || '',
    role_id: user?.role_id || user?.role?.role_id || '',
    designation: user?.designation || '',
    status: (user?.status as 'active' | 'inactive' | 'suspended') || 'active',
  });

  const [initialCompanyForm, setInitialCompanyForm] = useState(companyForm);

  // Synchronize state when user changes
  useEffect(() => {
    if (user) {
      const cleanedPhone = (user.phone || '').replace(/\D/g, '').slice(0, 10);
      setPhone(cleanedPhone);
      setInitialPhone(cleanedPhone);
      setPhoneValidationMsg(null);

      const comp = {
        full_name: user.full_name || '',
        email: user.email || '',
        employee_code: user.employee_code || '',
        department_id: user.department_id || user.department?.department_id || '',
        role_id: user.role_id || user.role?.role_id || '',
        designation: user.designation || '',
        status: (user.status as 'active' | 'inactive' | 'suspended') || 'active',
      };
      setCompanyForm(comp);
      setInitialCompanyForm(comp);
    }
  }, [user]);

  // Fetch departments and roles for Admin
  useEffect(() => {
    if (isAdmin) {
      api
        .get<Department[]>('/departments')
        .then((res) => {
          if (res.success && res.data) {
            setDepartments(res.data);
          }
        })
        .catch(() => {});
      api
        .get<Role[]>('/roles')
        .then((res) => {
          if (res.success && res.data) {
            setRoles(res.data);
          }
        })
        .catch(() => {});
    }
  }, [isAdmin]);

  // Validate phone number according to exact requirements
  const validatePhone = (val: string): string => {
    if (!val || !val.trim()) {
      return 'Phone number is required.';
    }
    if (!/^\d+$/.test(val.trim())) {
      return 'Phone number must contain only digits.';
    }
    if (val.trim().length !== 10) {
      return 'Phone number must be exactly 10 digits.';
    }
    return '';
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.slice(0, 10);
    setPhone(raw);

    if (raw === initialPhone) {
      setPhoneValidationMsg(null);
    } else {
      const err = validatePhone(raw);
      setPhoneValidationMsg(err || null);
    }
  };

  const hasPhoneChanged = phone !== initialPhone;
  const isPhoneValid = validatePhone(phone) === '';

  // Password change forms
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Notification Preferences states
  const [prefs, setPrefs] = useState<NotificationPreferenceResponse | null>(null);

  const fetchPreferences = async () => {
    setLoadingPrefs(true);
    try {
      const res = await api.get<NotificationPreferenceResponse>('/notification-preferences');
      if (res.success && res.data) {
        setPrefs(res.data);
      }
    } catch {
      // Ignore preference loading errors
    } finally {
      setLoadingPrefs(false);
    }
  };

  useEffect(() => {
    if (isAdmin && activeTab === 'notifications') {
      setActiveTab('profile');
      return;
    }
    if (activeTab === 'notifications' && !isAdmin) {
      fetchPreferences();
    }
  }, [activeTab, isAdmin]);

  // Update profile phone number
  const handleUpdatePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPhoneChanged || savingPhone) return;

    const validationErr = validatePhone(phone);
    if (validationErr) {
      setPhoneValidationMsg(validationErr);
      return;
    }

    setPhoneValidationMsg(null);
    setSavingPhone(true);
    setPhoneSuccess(null);
    setPhoneError(null);
    try {
      const payload = {
        phone: phone.trim(),
      };

      const res = await api.patch<CurrentUser>('/users/profile', payload);
      if (res.success && res.data) {
        setInitialPhone(phone.trim());
        dispatch(updateUserSuccess(res.data));
        setPhoneSuccess('Profile updated successfully!');
        setTimeout(() => setPhoneSuccess(null), 3500);
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to update phone number.';
      setPhoneError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSavingPhone(false);
    }
  };

  // Company Information changes detection for Admin
  const hasCompanyChanged =
    companyForm.full_name.trim() !== initialCompanyForm.full_name.trim() ||
    companyForm.email.trim() !== initialCompanyForm.email.trim() ||
    companyForm.employee_code.trim() !== initialCompanyForm.employee_code.trim() ||
    companyForm.department_id !== initialCompanyForm.department_id ||
    companyForm.role_id !== initialCompanyForm.role_id ||
    companyForm.designation.trim() !== initialCompanyForm.designation.trim() ||
    companyForm.status !== initialCompanyForm.status;

  const isCompanyValid =
    companyForm.full_name.trim() !== '' &&
    companyForm.email.trim() !== '' &&
    companyForm.employee_code.trim() !== '';

  // Admin company info update
  const handleUpdateCompanyInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasCompanyChanged || savingCompany || !user?.user_id) return;

    setSavingCompany(true);
    setCompanySuccess(null);
    setCompanyError(null);

    try {
      const payload: any = {};
      if (companyForm.full_name.trim() !== initialCompanyForm.full_name.trim()) {
        payload.full_name = companyForm.full_name.trim();
      }
      if (companyForm.email.trim() !== initialCompanyForm.email.trim()) {
        payload.email = companyForm.email.trim();
      }
      if (companyForm.employee_code.trim() !== initialCompanyForm.employee_code.trim()) {
        payload.employee_code = companyForm.employee_code.trim();
      }
      if (companyForm.department_id !== initialCompanyForm.department_id) {
        payload.department_id = companyForm.department_id || null;
      }
      if (companyForm.role_id !== initialCompanyForm.role_id) {
        payload.role_id = companyForm.role_id;
      }
      if (companyForm.designation.trim() !== initialCompanyForm.designation.trim()) {
        payload.designation = companyForm.designation.trim() || null;
      }
      if (companyForm.status !== initialCompanyForm.status) {
        payload.status = companyForm.status;
      }

      const res = await api.patch<CurrentUser>(`/users/${user.user_id}`, payload);
      if (res.success && res.data) {
        setInitialCompanyForm({
          full_name: res.data.full_name || '',
          email: res.data.email || '',
          employee_code: res.data.employee_code || '',
          department_id: res.data.department_id || res.data.department?.department_id || '',
          role_id: res.data.role_id || res.data.role?.role_id || '',
          designation: res.data.designation || '',
          status: (res.data.status as 'active' | 'inactive' | 'suspended') || 'active',
        });
        dispatch(updateUserSuccess(res.data));
        setCompanySuccess('Company information updated successfully!');
        setTimeout(() => setCompanySuccess(null), 3500);
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to update company information.';
      setCompanyError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSavingCompany(false);
    }
  };

  // Change password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Confirm password doesn't match new password.");
      return;
    }

    setSavingPassword(true);
    setPasswordSuccess(null);
    setPasswordError(null);
    try {
      const payload = {
        current_password: currentPassword,
        new_password: newPassword,
      };

      const res = await api.post('/users/change-password', payload);
      if (res.success) {
        setPasswordSuccess('Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPasswordSuccess(null), 3500);
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to update password.';
      setPasswordError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSavingPassword(false);
    }
  };

  // Update notification preferences
  const handleUpdatePreference = async (key: keyof NotificationPreferenceResponse, value: boolean) => {
    if (!prefs) return;
    try {
      const res = await api.patch<NotificationPreferenceResponse>('/notification-preferences', {
        [key]: value,
      });
      if (res.success && res.data) {
        setPrefs(res.data);
      }
    } catch {
      // Ignore preference error
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="My Profile Workspace"
        subtitle={
          isAdmin
            ? 'Manage official company information and your account credentials.'
            : 'View your official organization record and manage your personal contact information.'
        }
        badgeText="Account Workspace"
      />

      {/* Tabs Row */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'profile'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Profile Details
        </button>
        <button
          onClick={() => setActiveTab('password')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'password'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Change Password
        </button>
        {!isAdmin && (
          <button
            onClick={() => setActiveTab('notifications')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === 'notifications'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Notification Settings
          </button>
        )}
      </div>

      {/* Tab 1: Profile Details */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Identity Profile Summary Card */}
          <Card className="md:col-span-1 h-fit">
            <CardHeader className="flex flex-col items-center justify-center p-6 text-center border-b-0">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-extrabold text-2xl text-white shadow-md mb-3">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <h3 className="text-base font-bold text-slate-800 leading-tight">{user?.full_name}</h3>
              <p className="text-xs text-slate-400 mt-1 font-semibold">{user?.designation || 'Staff Member'}</p>
              <div className="flex items-center gap-2 mt-3">
                <Badge variant="brand" className="uppercase font-bold text-[10px]">
                  {roleName}
                </Badge>
                <Badge
                  variant={user?.status === 'active' || !user?.status ? 'success' : 'neutral'}
                  className="capitalize text-[10px]"
                >
                  {user?.status || 'Active'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="border-t border-slate-100/80 pt-4 space-y-3.5 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="truncate">
                  Department: {user?.department?.department_name || user?.department_name || 'N/A'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span>Code: {user?.employee_code || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="truncate">Email: {user?.email}</span>
              </div>
            </CardContent>
          </Card>

          {/* Company & Personal Info Cards */}
          <div className="md:col-span-2 space-y-6">
            {/* ── SECTION A: COMPANY INFORMATION ── */}
            <Card>
              <CardHeader className="border-b border-slate-100/80 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-900">Company Information</h3>
                  </div>
                  {isAdmin ? (
                    <Badge variant="brand" className="text-[10px] uppercase font-bold tracking-wider">
                      ADMIN ACCESS
                    </Badge>
                  ) : (
                    <Badge variant="neutral" className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                      READ-ONLY
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-medium">
                  {isAdmin
                    ? 'Manage official company information and account details.'
                    : 'Official employee record managed exclusively by the Administrator.'}
                </p>
              </CardHeader>
              <CardContent className="pt-4">
                {companySuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-xl flex items-center gap-2 mb-4">
                    <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <p className="text-xs font-semibold text-emerald-700">{companySuccess}</p>
                  </div>
                )}
                {companyError && (
                  <div className="p-3 bg-rose-50 border border-rose-200/80 rounded-xl flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <p className="text-xs font-semibold text-rose-700">{companyError}</p>
                  </div>
                )}

                {isAdmin ? (
                  /* ── ADMIN: EDITABLE COMPANY INFORMATION FORM ── */
                  <form onSubmit={handleUpdateCompanyInfo} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="company-fullname"
                          className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1"
                        >
                          Full Name
                        </label>
                        <input
                          id="company-fullname"
                          type="text"
                          required
                          value={companyForm.full_name}
                          onChange={(e) =>
                            setCompanyForm((prev) => ({ ...prev, full_name: e.target.value }))
                          }
                          className="block w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="company-email"
                          className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1"
                        >
                          Official Email
                        </label>
                        <input
                          id="company-email"
                          type="email"
                          required
                          value={companyForm.email}
                          onChange={(e) =>
                            setCompanyForm((prev) => ({ ...prev, email: e.target.value }))
                          }
                          className="block w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="company-code"
                          className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1"
                        >
                          Employee Code
                        </label>
                        <input
                          id="company-code"
                          type="text"
                          required
                          value={companyForm.employee_code}
                          onChange={(e) =>
                            setCompanyForm((prev) => ({ ...prev, employee_code: e.target.value }))
                          }
                          className="block w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="company-department"
                          className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1"
                        >
                          Department
                        </label>
                        <select
                          id="company-department"
                          value={companyForm.department_id}
                          onChange={(e) =>
                            setCompanyForm((prev) => ({ ...prev, department_id: e.target.value }))
                          }
                          className="block w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                          <option value="">Unassigned</option>
                          {departments.map((dept) => (
                            <option key={dept.department_id} value={dept.department_id}>
                              {dept.department_name} ({dept.department_code})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="company-role"
                          className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1"
                        >
                          Role
                        </label>
                        <select
                          id="company-role"
                          value={companyForm.role_id}
                          onChange={(e) =>
                            setCompanyForm((prev) => ({ ...prev, role_id: e.target.value }))
                          }
                          className="block w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                          {roles.map((r) => (
                            <option key={r.role_id} value={r.role_id}>
                              {r.role_name.charAt(0).toUpperCase() + r.role_name.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="company-designation"
                          className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1"
                        >
                          Designation
                        </label>
                        <input
                          id="company-designation"
                          type="text"
                          value={companyForm.designation}
                          onChange={(e) =>
                            setCompanyForm((prev) => ({ ...prev, designation: e.target.value }))
                          }
                          placeholder="e.g. Lead Specialist"
                          className="block w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label
                          htmlFor="company-status"
                          className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1"
                        >
                          Account Status
                        </label>
                        <select
                          id="company-status"
                          value={companyForm.status}
                          onChange={(e) =>
                            setCompanyForm((prev) => ({
                              ...prev,
                              status: e.target.value as 'active' | 'inactive' | 'suspended',
                            }))
                          }
                          className="block w-full max-w-xs px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="suspended">Suspended</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button
                        type="submit"
                        variant="primary"
                        disabled={!hasCompanyChanged || !isCompanyValid || savingCompany}
                        isLoading={savingCompany}
                        leftIcon={<Save className="w-4 h-4" />}
                      >
                        {savingCompany ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </form>
                ) : (
                  /* ── EMPLOYEE & DIRECTOR: READ-ONLY COMPANY INFORMATION ── */
                  <div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="bg-slate-50/90 p-3.5 rounded-xl border border-slate-200/60">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          Full Name
                        </span>
                        <span className="text-xs font-semibold text-slate-800 block">
                          {user?.full_name || '—'}
                        </span>
                      </div>

                      <div className="bg-slate-50/90 p-3.5 rounded-xl border border-slate-200/60">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          Official Email
                        </span>
                        <span className="text-xs font-semibold text-slate-800 block truncate">
                          {user?.email || '—'}
                        </span>
                      </div>

                      <div className="bg-slate-50/90 p-3.5 rounded-xl border border-slate-200/60">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          Employee Code
                        </span>
                        <span className="text-xs font-semibold text-slate-800 block">
                          {user?.employee_code || '—'}
                        </span>
                      </div>

                      <div className="bg-slate-50/90 p-3.5 rounded-xl border border-slate-200/60">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          Department
                        </span>
                        <span className="text-xs font-semibold text-slate-800 block">
                          {user?.department?.department_name || user?.department_name || 'N/A'}
                        </span>
                      </div>

                      <div className="bg-slate-50/90 p-3.5 rounded-xl border border-slate-200/60">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          Role / Designation
                        </span>
                        <span className="text-xs font-semibold text-slate-800 block">
                          {roleName ? roleName.charAt(0).toUpperCase() + roleName.slice(1) : 'Employee'}
                          {user?.designation ? ` • ${user.designation}` : ''}
                        </span>
                      </div>

                      <div className="bg-slate-50/90 p-3.5 rounded-xl border border-slate-200/60">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          Account Status
                        </span>
                        <div className="mt-0.5">
                          <Badge
                            variant={user?.status === 'active' || !user?.status ? 'success' : 'neutral'}
                            className="capitalize text-[10px] font-bold"
                          >
                            {user?.status || 'Active'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3.5 p-2.5 bg-slate-50 rounded-lg border border-slate-200/60 text-[11px] text-slate-600 flex items-center gap-2">
                      <span className="font-semibold text-slate-700">Note:</span>
                      <span>Official company information is managed by the Administrator.</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── SECTION B: PERSONAL CONTACT INFORMATION (All Roles) ── */}
            <Card>
              <CardHeader className="border-b border-slate-100/80 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-sm font-bold text-slate-900">Personal Contact Information</h3>
                  </div>
                  <Badge variant="brand" className="text-[10px] uppercase font-bold tracking-wider">
                    Editable
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-medium">
                  Manage your personal contact number.
                </p>
              </CardHeader>
              <CardContent className="pt-4">
                {phoneSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-xl flex items-center gap-2 mb-4">
                    <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <p className="text-xs font-semibold text-emerald-700">{phoneSuccess}</p>
                  </div>
                )}
                {phoneError && (
                  <div className="p-3 bg-rose-50 border border-rose-200/80 rounded-xl flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <p className="text-xs font-semibold text-rose-700">{phoneError}</p>
                  </div>
                )}

                <form onSubmit={handleUpdatePhone} className="space-y-4">
                  <div>
                    <label
                      htmlFor="profile-phone"
                      className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                    >
                      Phone Number
                    </label>
                    <input
                      id="profile-phone"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={phone}
                      onChange={handlePhoneChange}
                      placeholder="Enter 10-digit phone number"
                      className={`block w-full max-w-md px-3.5 py-2.5 text-xs rounded-xl focus:outline-none transition-all font-medium ${
                        phoneValidationMsg
                          ? 'bg-rose-50/40 border border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-rose-900 placeholder:text-rose-300'
                          : 'bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900'
                      }`}
                    />
                    {phoneValidationMsg ? (
                      <p className="text-xs font-semibold text-rose-600 mt-1.5 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-rose-500" />
                        <span>{phoneValidationMsg}</span>
                      </p>
                    ) : null}
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={!hasPhoneChanged || !isPhoneValid || savingPhone}
                      isLoading={savingPhone}
                      leftIcon={<Save className="w-4 h-4" />}
                    >
                      {savingPhone ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 2: Change Password */}
      {activeTab === 'password' && (
        <Card className="max-w-xl">
          <CardHeader className="border-b border-slate-100/80 pb-3">
            <h3 className="text-sm font-bold text-slate-900">Change Account Password</h3>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">
              Update your password to keep your account secure.
            </p>
          </CardHeader>
          <CardContent className="pt-4">
            {passwordSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-xl flex items-center gap-2 mb-4">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <p className="text-xs font-semibold text-emerald-700">{passwordSuccess}</p>
              </div>
            )}
            {passwordError && (
              <div className="p-3 bg-rose-50 border border-rose-200/80 rounded-xl flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <p className="text-xs font-semibold text-rose-700">{passwordError}</p>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label
                  htmlFor="current-password"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  Current Password
                </label>
                <input
                  id="current-password"
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label
                  htmlFor="new-password"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  New Password
                </label>
                <input
                  id="new-password"
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="block w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  Confirm New Password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="block w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={savingPassword}
                  isLoading={savingPassword}
                  leftIcon={<Save className="w-4 h-4" />}
                >
                  {savingPassword ? 'Updating...' : 'Update Password'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Notification Settings (Employee / Director Only) */}
      {activeTab === 'notifications' && !isAdmin && (
        <Card className="max-w-2xl">
          <CardHeader className="border-b border-slate-100/80 pb-3">
            <h3 className="text-sm font-bold text-slate-900">Notification Preferences</h3>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">
              Configure system alerts and notifications for your workflow.
            </p>
          </CardHeader>
          <CardContent className="pt-4 divide-y divide-slate-100">
            {loadingPrefs ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading preferences...</div>
            ) : prefs ? (
              <>
                <div className="py-3.5 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">In-App Notifications</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Receive alert notifications in the web portal.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={prefs.in_app_enabled}
                    onChange={(e) => handleUpdatePreference('in_app_enabled', e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-slate-300"
                  />
                </div>

                <div className="py-3.5 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Task Assignments</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Notify when a new departmental deliverable is assigned.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={prefs.task_assignment}
                    onChange={(e) => handleUpdatePreference('task_assignment', e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-slate-300"
                  />
                </div>

                <div className="py-3.5 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Director Reviews</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Notify when your daily work log review status is updated.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={prefs.review_notification}
                    onChange={(e) => handleUpdatePreference('review_notification', e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-slate-300"
                  />
                </div>

                <div className="py-3.5 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Director Feedback Comments</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Notify when feedback is commented on your daily update.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={prefs.director_comment}
                    onChange={(e) => handleUpdatePreference('director_comment', e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-slate-300"
                  />
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">Failed to load notification settings.</div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProfilePage;
