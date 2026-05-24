import React, { useRef, useState, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText, ChevronDown, X } from 'lucide-react';

export type ExportFormat = 'excel' | 'pdf';

export interface ExportButtonProps {
  onExport: (format: ExportFormat) => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  label?: string;
}

export function ExportButton({ onExport, disabled, loading, label }: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSelect = async (format: ExportFormat) => {
    setOpen(false);
    await onExport(format);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={disabled || loading}
        className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
      >
        <Download className="h-3.5 w-3.5" />
        {loading ? 'Exporting...' : label ?? 'Export'}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-48 rounded-lg border border-border bg-popover p-1 shadow-lg">
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            Export as
          </div>
          <button
            type="button"
            onClick={() => handleSelect('excel')}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
          >
            <FileSpreadsheet className="h-4 w-4 text-green-600" />
            <span>Excel (.xlsx)</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelect('pdf')}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
          >
            <FileText className="h-4 w-4 text-red-600" />
            <span>PDF</span>
          </button>
        </div>
      )}
    </div>
  );
}
