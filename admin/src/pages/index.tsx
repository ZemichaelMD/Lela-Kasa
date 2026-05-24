import { Navigate } from 'react-router-dom';
import { useAuthContext } from '@/lib/auth-context';
import HomePage from './home';

export default function IndexPage() {
  const { user, isLoading } = useAuthContext();

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-r-transparent" />
      </div>
    );
  }

  if (!user) {
    return <HomePage />;
  }

  return <Navigate to="/sales" replace />;
}
