import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ children, allowedRoles }) => {
  const { user, roleName } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isAllowed = allowedRoles.map((r) => r.toLowerCase()).includes(roleName);

  if (!isAllowed) {
    // Redirect to respective authorized dashboard
    if (roleName === 'director') return <Navigate to="/director/dashboard" replace />;
    if (roleName === 'admin') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/employee/dashboard" replace />;
  }

  return <>{children}</>;
};

export default RoleGuard;
