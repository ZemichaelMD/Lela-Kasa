import { Navigate, useLocation } from "react-router-dom";
import type { ReactElement } from "react";

import { useAuthContext } from "@/lib/auth-context";

export function RequireAuth({
  children,
}: {
  children: ReactElement;
}): ReactElement {
  const { user, isLoading, isVerified } = useAuthContext();
  const loc = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-r-transparent" />
      </div>
    );
  }

  if (!user) {
    const redirect = encodeURIComponent(`${loc.pathname}${loc.search}`);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  // Verification wall · require at least one channel verified
  if (!isVerified && loc.pathname !== "/verify") {
    return <Navigate to="/verify" replace />;
  }

  return children;
}
