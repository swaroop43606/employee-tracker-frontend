import { useAppSelector } from './useAppSelector';

export const useAuth = () => {
  const auth = useAppSelector((state) => state.auth);
  const user = auth.user;
  // Backend /auth/me returns role_name as a flat field (CurrentUserResponse).
  // The optional nested role?.role_name is a backward-compat fallback.
  const roleName = (user?.role_name || user?.role?.role_name || '').toLowerCase();

  return {
    ...auth,
    user,
    roleName,
    isAdmin: roleName === 'admin',
    isDirector: roleName === 'director',
    isEmployee: roleName === 'employee',
  };
};
