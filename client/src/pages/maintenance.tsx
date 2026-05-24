import { Construction, Wrench } from 'lucide-react';

export default function MaintenancePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-500/10">
        <Construction className="h-10 w-10 text-amber-500" />
      </div>
      <h1 className="mb-2 text-2xl font-bold tracking-tight">Under Maintenance</h1>
      <p className="mx-auto mb-6 max-w-md text-muted-foreground">
        We're currently performing scheduled maintenance to improve your experience. The platform will be back shortly.
      </p>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Wrench className="h-4 w-4 animate-pulse" />
        Please check back later
      </div>
    </div>
  );
}
