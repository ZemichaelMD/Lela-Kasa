import type { ReactNode } from 'react';

export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumb?: string[];
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:mb-8">
      {breadcrumb && breadcrumb.length > 0 && (
        <nav className="text-xs text-muted-foreground" aria-label="Breadcrumb">
          {breadcrumb.map((crumb, i) => (
            <span key={`${crumb}-${i}`}>
              {i > 0 && <span className="mx-1.5 text-muted-foreground/50">/</span>}
              <span className={i === breadcrumb.length - 1 ? 'text-foreground' : ''}>{crumb}</span>
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/** A neutral notice strip · used on the skeleton pages to point at the plan. */
export function PlanNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card/60 px-4 py-3 text-sm text-muted-foreground">
      {children}
    </div>
  );
}
