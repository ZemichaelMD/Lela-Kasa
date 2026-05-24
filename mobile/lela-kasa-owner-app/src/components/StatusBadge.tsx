import React from 'react';

import { Pill, type PillTone } from './Pill';

export function StatusBadge({ status }: { status: string }) {
  const tone: PillTone =
    status === 'VOIDED' ? 'danger' : status === 'DRAFT' ? 'warning' : 'success';

  return <Pill label={status} tone={tone} />;
}
