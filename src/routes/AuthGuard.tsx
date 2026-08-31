import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { fetchCurrentUser } from '../features/auth/slices/authSlice';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user, isLoading, token } = useAuth();
  const dispatch = useAppDispatch();
  const location = useLocation();

  useEffect(() => {
    if (token && !user && !isLoading) {
      dispatch(fetchCurrentUser());
    }
  }, [token, user, isLoading, dispatch]);

  if (!token && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (token && !user) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner size="lg" text="Authenticating session..." />
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthGuard;
