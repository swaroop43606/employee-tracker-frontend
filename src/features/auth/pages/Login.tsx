import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Lock, Mail, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { loginUser, clearAuthError } from '../slices/authSlice';
import { Button } from '../../../components/Button';

interface FormErrors {
  email?: string;
  password?: string;
}

export const Login: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isLoading, error } = useAppSelector((state) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      newErrors.email = 'Please enter your work email.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      newErrors.password = 'Please enter your password.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isValid = validateForm();
    if (!isValid) return;

    dispatch(clearAuthError());
    const trimmedEmail = email.trim();
    const resultAction = await dispatch(loginUser({ email: trimmedEmail, password }));

    if (loginUser.fulfilled.match(resultAction)) {
      const user = resultAction.payload;
      // Backend /auth/me returns role_name as a flat string field
      const role = (user.role_name || user.role?.role_name || '').toLowerCase();
      if (role === 'director') {
        navigate('/director/dashboard');
      } else if (role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/employee/dashboard');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fff8f3] via-[#faf7f5] to-[#ffeadb] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorative Soft Warm Blobs */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#ffe1c5]/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#faf0ec]/80 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-[#991b1f] flex items-center justify-center shadow-lg shadow-[#991b1f]/25 text-white">
            <Briefcase className="w-8 h-8" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900">
          Employee Daily Task Tracker
        </h2>
        <p className="mt-2 text-center text-sm text-stone-600">
          Sign in to your enterprise workspace
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-xl shadow-stone-900/5 rounded-3xl sm:px-10 border border-[#efe7e1]">
          {error && (
            <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200/80 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs font-medium text-rose-700 leading-relaxed">{error}</p>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <div>
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) {
                      setErrors((prev) => ({ ...prev, email: undefined }));
                    }
                  }}
                  placeholder="name@company.com"
                  className={`block w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border rounded-xl focus:outline-none transition-all placeholder:text-stone-400 text-stone-900 ${
                    errors.email
                      ? 'border-rose-400 bg-rose-50/20 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500'
                      : 'border-[#efe7e1] focus:ring-2 focus:ring-[#991b1f]/20 focus:border-[#991b1f]'
                  }`}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                />
              </div>
              {errors.email && (
                <p id="email-error" className="mt-1.5 text-xs text-rose-600 font-medium">
                  {errors.email}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) {
                      setErrors((prev) => ({ ...prev, password: undefined }));
                    }
                  }}
                  placeholder="••••••••"
                  className={`block w-full pl-10 pr-10 py-2.5 text-sm bg-white border rounded-xl focus:outline-none transition-all placeholder:text-stone-400 text-stone-900 ${
                    errors.password
                      ? 'border-rose-400 bg-rose-50/20 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500'
                      : 'border-[#efe7e1] focus:ring-2 focus:ring-[#991b1f]/20 focus:border-[#991b1f]'
                  }`}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-600 transition-colors focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="mt-1.5 text-xs text-rose-600 font-medium">
                  {errors.password}
                </p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full justify-center bg-[#991b1f] hover:bg-[#7f161a] shadow-md shadow-[#991b1f]/20 text-white"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
