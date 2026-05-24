/**
 * Standard API response envelopes.
 * Every API response is wrapped in one of these shapes.
 */

import { z } from 'zod';

import type { ErrorCode } from './errors';

// ── Success envelope ──────────────────────────────────────────────────────────

export const SuccessEnvelopeSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    meta: z
      .object({
        requestId: z.string().optional(),
        timestamp: z.string().datetime().optional(),
      })
      .optional(),
  });

export type SuccessEnvelope<T> = {
  success: true;
  data: T;
  meta?: {
    requestId?: string;
    timestamp?: string;
  };
};

// ── Error envelope ────────────────────────────────────────────────────────────

export const ValidationFieldErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
});

export const ErrorEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string() as z.ZodType<ErrorCode>,
    message: z.string(),
    details: z.array(ValidationFieldErrorSchema).optional(),
    requestId: z.string().optional(),
  }),
});

export type ValidationFieldError = z.infer<typeof ValidationFieldErrorSchema>;

export type ErrorEnvelope = {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: ValidationFieldError[];
    requestId?: string;
  };
};

// ── Paginated list envelope ───────────────────────────────────────────────────

export const PaginationMetaSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  hasNextPage: z.boolean(),
  hasPrevPage: z.boolean(),
});

export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

export const PaginatedEnvelopeSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    success: z.literal(true),
    data: z.array(itemSchema),
    pagination: PaginationMetaSchema,
  });

export type PaginatedEnvelope<T> = {
  success: true;
  data: T[];
  pagination: PaginationMeta;
};

// ── Cursor-paginated envelope (for feeds / infinite scroll) ───────────────────

export const CursorMetaSchema = z.object({
  nextCursor: z.string().nullable(),
  prevCursor: z.string().nullable(),
  hasNextPage: z.boolean(),
  hasPrevPage: z.boolean(),
  limit: z.number().int().positive(),
});

export type CursorMeta = z.infer<typeof CursorMetaSchema>;

export type CursorEnvelope<T> = {
  success: true;
  data: T[];
  cursor: CursorMeta;
};
