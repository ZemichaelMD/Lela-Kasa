import { Navigate } from 'react-router-dom';
import { useAuthContext } from '../lib/auth-context';

export function RequireOwner({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthContext();
  if (isLoading) return null;
  if (!user || user.role !== 'OWNER') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
