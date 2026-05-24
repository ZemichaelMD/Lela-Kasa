import * as React from 'react';
import { cn } from '../lib/cn';

/** A pulsing placeholder block — use while content loads. */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />;
}
