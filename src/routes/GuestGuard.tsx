import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const GuestGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user, roleName } = useAuth();

  if (isAuthenticated && user) {
    if (roleName === 'director') return <Navigate to="/director/dashboard" replace />;
    if (roleName === 'admin') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/employee/dashboard" replace />;
  }

  return <>{children}</>;
};

export default GuestGuard;
