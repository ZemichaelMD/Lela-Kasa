/**
 * Pagination helpers — supports both offset-based and cursor-based pagination.
 */

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export interface OffsetPaginationParams {
  page?: number;
  limit?: number;
}

export interface OffsetPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface CursorPaginationParams {
  cursor?: string;
  limit?: number;
  direction?: 'forward' | 'backward';
}

export interface CursorPaginationMeta {
  nextCursor: string | null;
  prevCursor: string | null;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  limit: number;
}

export function clampLimit(limit?: number, max = MAX_LIMIT, defaultVal = DEFAULT_LIMIT): number {
  if (limit === undefined || limit === null) return defaultVal;
  return Math.max(1, Math.min(max, Math.floor(limit)));
}

export function offsetPaginationParams(params: OffsetPaginationParams): {
  skip: number;
  take: number;
  page: number;
  limit: number;
} {
  const limit = clampLimit(params.limit);
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const skip = (page - 1) * limit;
  return { skip, take: limit, page, limit };
}

export function buildOffsetMeta(
  total: number,
  page: number,
  limit: number,
): OffsetPaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

export function buildCursorMeta<T extends { id: string }>(
  items: T[],
  limit: number,
  hasPrev = false,
): CursorPaginationMeta {
  const hasNextPage = items.length > limit;
  const page = hasNextPage ? items.slice(0, limit) : items;
  return {
    nextCursor: hasNextPage ? (page[page.length - 1]?.id ?? null) : null,
    prevCursor: hasPrev ? (page[0]?.id ?? null) : null,
    hasNextPage,
    hasPrevPage: hasPrev,
    limit,
  };
}
