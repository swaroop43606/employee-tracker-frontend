import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { api } from '../../../services/api';
import { PageHeader } from '../../../components/PageHeader';
import { Card, CardHeader, CardContent } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Badge } from '../../../components/Badge';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import {
  User,
  Lock,
  CheckCircle,
  AlertTriangle,
  Building,
  Mail,
  Save,
} from 'lucide-react';
import type { NotificationPreferenceResponse } from '../../../types/notification';
import type { CurrentUser } from '../../../types/user';

export const ProfilePage: React.FC = () => {
  const { user, roleName } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'notifications'>('profile');

  // Loading / saving states
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Profile forms
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');

  // Password change forms
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Notification Preferences states
  const [prefs, setPrefs] = useState<NotificationPreferenceResponse | null>(null);

  const fetchPreferences = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<NotificationPreferenceResponse>('/notification-preferences');
      if (res.success && res.data) {
        setPrefs(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch notification preferences.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'notifications') {
      fetchPreferences();
    }
  }, [activeTab]);

  // Update profile
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(null);
    setError(null);
    try {
      const payload = {
        full_name: fullName,
        phone: phone || null,
        address: address || null,
      };

      const res = await api.patch<CurrentUser>('/users/profile', payload);
      if (res.success) {
        setSuccess('Profile updated successfully!');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  // Change password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Confirm password doesn't match new password.");
      return;
    }

    setSaving(true);
    setSuccess(null);
    setError(null);
    try {
      const payload = {
        current_password: currentPassword,
        new_password: newPassword,
      };

      const res = await api.post('/users/change-password', payload);
      if (res.success) {
        setSuccess('Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setSaving(false);
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
    } catch (err: any) {
      alert(err.message || 'Failed to update preference.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="My Profile Workspace"
        subtitle="Manage your personal details, secure your password, and control notifications."
        badgeText="Account Workspace"
      />

      {success && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200/80 rounded-xl flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <p className="text-xs font-semibold text-emerald-700">{success}</p>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200/80 rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <p className="text-xs font-semibold text-rose-700">{error}</p>
        </div>
      )}

      {/* Tabs Row */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => {
            setActiveTab('profile');
            setError(null);
            setSuccess(null);
          }}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'profile'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Profile Details
        </button>
        <button
          onClick={() => {
            setActiveTab('password');
            setError(null);
            setSuccess(null);
          }}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'password'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Change Password
        </button>
        <button
          onClick={() => {
            setActiveTab('notifications');
            setError(null);
            setSuccess(null);
          }}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'notifications'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Notification Settings
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Static Info Profile Card */}
          <Card className="md:col-span-1">
            <CardHeader className="flex flex-col items-center justify-center p-6 text-center border-b-0">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-extrabold text-2xl text-white shadow-md mb-3">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <h3 className="text-base font-bold text-slate-800 leading-tight">{user?.full_name}</h3>
              <p className="text-xs text-slate-400 mt-1 font-semibold">{user?.designation || 'Specialist'}</p>
              <Badge variant="brand" className="uppercase font-bold mt-2.5">
                {roleName}
              </Badge>
            </CardHeader>
            <CardContent className="border-t border-slate-100/80 pt-4 space-y-3.5 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-slate-400" />
                <span>Department: {user?.department?.department_name || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                <span>Employee Code: {user?.employee_code || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                <span>Email: {user?.email}</span>
              </div>
            </CardContent>
          </Card>

          {/* Edit profile Details */}
          <Card className="md:col-span-2">
            <CardHeader>
              <h3 className="text-sm font-bold text-slate-900">Personal Information</h3>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="block w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="block w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Address
                  </label>
                  <textarea
                    rows={3}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="block w-full p-3.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  isLoading={saving}
                  leftIcon={<Save className="w-4 h-4" />}
                >
                  Save Profile Settings
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'password' && (
        <Card>
          <CardHeader>
            <h3 className="text-sm font-bold text-slate-900">Security Credentials</h3>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="block w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="block w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                isLoading={saving}
                leftIcon={<Lock className="w-4 h-4" />}
              >
                Change Password
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {activeTab === 'notifications' && (
        <Card>
          <CardHeader>
            <h3 className="text-sm font-bold text-slate-900">Notification Channels & Delivery Preferences</h3>
          </CardHeader>
          <CardContent>
            {loading && !prefs ? (
              <LoadingSpinner size="md" text="Loading preferences..." />
            ) : !prefs ? (
              <p className="text-xs text-slate-400 text-center py-4">Failed to load preferences.</p>
            ) : (
              <div className="space-y-6">
                {/* Channels Switches */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Delivery Channels
                  </h4>
                  <div className="space-y-4">
                    <label className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/60 cursor-pointer">
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">In-App Notifications</span>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          Receive notifications in your portal header inbox.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={prefs.in_app_enabled}
                        onChange={(e) => handleUpdatePreference('in_app_enabled', e.target.checked)}
                        className="w-4 h-4 accent-indigo-600"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/60 cursor-pointer">
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">Email Alerts</span>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          Receive email notifications for major task assignments and updates.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={prefs.email_enabled}
                        onChange={(e) => handleUpdatePreference('email_enabled', e.target.checked)}
                        className="w-4 h-4 accent-indigo-600"
                      />
                    </label>
                  </div>
                </div>

                {/* Subscriptions Switches */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Trigger Subscriptions
                  </h4>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between py-2 text-xs cursor-pointer">
                      <span>Task Assignments</span>
                      <input
                        type="checkbox"
                        checked={prefs.task_assignment}
                        onChange={(e) => handleUpdatePreference('task_assignment', e.target.checked)}
                        className="w-4 h-4 accent-indigo-600"
                      />
                    </label>
                    <label className="flex items-center justify-between py-2 text-xs cursor-pointer">
                      <span>Daily Update Reminders</span>
                      <input
                        type="checkbox"
                        checked={prefs.daily_update_reminder}
                        onChange={(e) => handleUpdatePreference('daily_update_reminder', e.target.checked)}
                        className="w-4 h-4 accent-indigo-600"
                      />
                    </label>
                    <label className="flex items-center justify-between py-2 text-xs cursor-pointer">
                      <span>Director Reviews</span>
                      <input
                        type="checkbox"
                        checked={prefs.review_notification}
                        onChange={(e) => handleUpdatePreference('review_notification', e.target.checked)}
                        className="w-4 h-4 accent-indigo-600"
                      />
                    </label>
                    <label className="flex items-center justify-between py-2 text-xs cursor-pointer">
                      <span>Director Comments</span>
                      <input
                        type="checkbox"
                        checked={prefs.director_comment}
                        onChange={(e) => handleUpdatePreference('director_comment', e.target.checked)}
                        className="w-4 h-4 accent-indigo-600"
                      />
                    </label>
                    <label className="flex items-center justify-between py-2 text-xs cursor-pointer">
                      <span>Subordinate Replies</span>
                      <input
                        type="checkbox"
                        checked={prefs.employee_reply}
                        onChange={(e) => handleUpdatePreference('employee_reply', e.target.checked)}
                        className="w-4 h-4 accent-indigo-600"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProfilePage;
