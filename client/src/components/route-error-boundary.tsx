import {
  isRouteErrorResponse,
  Link,
  useNavigate,
  useRouteError,
} from "react-router-dom";

/**
 * Friendly error screen rendered by react-router's `errorElement`. Replaces
 * the default "Hey developer 👋" page with something the team (and an
 * occasional end-user) won't be confused by, while still surfacing enough
 * detail to debug.
 */
export function RouteErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  const { title, subtitle, status } = describeError(error);
  const detail = formatDetail(error);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-2xl text-destructive">
            !
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {status ?? "Something went wrong"}
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-foreground">
              {title}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>

        {detail ? (
          <details className="mt-6 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <summary className="cursor-pointer select-none font-medium text-foreground">
              Technical details
            </summary>
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed">
              {detail}
            </pre>
          </details>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent"
          >
            Go back
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent"
          >
            Reload page
          </button>
          <Link
            to="/dashboard"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function describeError(error: unknown): {
  title: string;
  subtitle: string;
  status?: string;
} {
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return {
        status: "404",
        title: "Page not found",
        subtitle: "The page you tried to open doesn't exist or has moved.",
      };
    }
    if (error.status === 401 || error.status === 403) {
      return {
        status: String(error.status),
        title: "You don't have access",
        subtitle:
          "Your session may have expired. Try signing in again or contact a super admin.",
      };
    }
    return {
      status: String(error.status),
      title: error.statusText || "Request failed",
      subtitle:
        typeof error.data === "string"
          ? error.data
          : "The server returned an unexpected response.",
    };
  }
  if (error instanceof Error) {
    return {
      title: "Something went wrong",
      subtitle: error.message || "An unexpected error interrupted this page.",
    };
  }
  return {
    title: "Something went wrong",
    subtitle: "An unexpected error interrupted this page.",
  };
}

function formatDetail(error: unknown): string | null {
  if (isRouteErrorResponse(error)) {
    if (typeof error.data === "string") return error.data;
    try {
      return JSON.stringify(error.data, null, 2);
    } catch {
      return null;
    }
  }
  if (error instanceof Error && error.stack) {
    return error.stack;
  }
  if (typeof error === "string") return error;
  return null;
}
