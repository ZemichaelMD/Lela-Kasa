import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { Card } from '@/ui';

export interface Column<T> {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  searchPlaceholder?: string;
  /** Controlled search value. If omitted, the search box is uncontrolled and
   *  the parent can rely on the rows it passes in to already be filtered. */
  search?: string;
  onSearchChange?: (value: string) => void;
  toolbar?: ReactNode;
  /** Optional row of chips / dropdowns rendered under the search bar. */
  filterBar?: ReactNode;
  /** Renders a "X filters applied · Clear" line beneath the filter bar. */
  activeFilterCount?: number;
  onClearFilters?: () => void;
  empty?: ReactNode;
  total?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({
  columns,
  rows,
  searchPlaceholder = 'Search…',
  search,
  onSearchChange,
  toolbar,
  filterBar,
  activeFilterCount = 0,
  onClearFilters,
  empty = 'Nothing to show.',
  total,
  page = 1,
  pageSize,
  onPageChange,
  onRowClick,
}: DataTableProps<T>) {
  const inputId = useId();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const isControlledSearch = search !== undefined;
  const totalShown = total ?? rows.length;
  const start = totalShown === 0 ? 0 : (page - 1) * (pageSize ?? rows.length) + 1;
  const end = pageSize ? Math.min(page * pageSize, totalShown) : totalShown;
  const hasPrev = !!onPageChange && page > 1;
  const hasNext = !!onPageChange && pageSize !== undefined && end < totalShown;

  return (
    <Card className="overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
        <label
          htmlFor={inputId}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground sm:max-w-xs focus-within:ring-2 focus-within:ring-primary/40"
        >
          <Search className="h-4 w-4 shrink-0" />
          <input
            id={inputId}
            placeholder={searchPlaceholder}
            value={isControlledSearch ? search : undefined}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
            aria-label="Search table"
          />
          {isControlledSearch && search && (
            <button
              type="button"
              onClick={() => onSearchChange?.('')}
              className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </label>
        {toolbar}
        {filterBar && (
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                {activeFilterCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Filter panel */}
      {filterBar && filtersOpen && (
        <div className="space-y-3 border-b border-border bg-muted/30 px-3 py-3">
          {filterBar}
          {activeFilterCount > 0 && onClearFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="text-xs font-medium text-primary hover:underline"
            >
              Clear {activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'}
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              {columns.map((col) => (
                <th key={col.key} className={`whitespace-nowrap px-4 py-3 font-medium ${col.className ?? ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-muted-foreground">
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={i}
                  className={`border-b border-border last:border-0 hover:bg-accent/40 ${onRowClick ? 'cursor-pointer' : ''}`}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 align-middle ${col.className ?? ''}`}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer / pagination */}
      <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3 text-xs text-muted-foreground">
        <span>
          {totalShown === 0
            ? 'No results'
            : pageSize
              ? `Showing ${start}–${end} of ${totalShown}`
              : `${totalShown} result${totalShown === 1 ? '' : 's'}`}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!hasPrev}
            onClick={() => hasPrev && onPageChange?.(page - 1)}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 disabled:opacity-50"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Prev
          </button>
          <button
            type="button"
            disabled={!hasNext}
            onClick={() => hasNext && onPageChange?.(page + 1)}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 disabled:opacity-50"
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </Card>
  );
}

const STATUS_TONES = {
  neutral: 'bg-muted text-muted-foreground',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-destructive/15 text-destructive',
  info: 'bg-primary/10 text-primary',
} as const;

export type StatusTone = keyof typeof STATUS_TONES;

/** Small coloured status chip used in table cells. */
export function StatusChip({ label, tone = 'neutral' }: { label: string; tone?: StatusTone }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONES[tone]}`}
    >
      {label}
    </span>
  );
}
