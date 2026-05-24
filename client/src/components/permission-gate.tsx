import { useAuthContext } from '@/lib/auth-context';

interface PermissionGateProps {
  permission: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionGate({ permission, fallback = null, children }: PermissionGateProps) {
  const { hasPermission } = useAuthContext();
  return hasPermission(permission) ? <>{children}</> : <>{fallback}</>;
}

export function usePermission(slug: string): boolean {
  const { hasPermission } = useAuthContext();
  return hasPermission(slug);
}
