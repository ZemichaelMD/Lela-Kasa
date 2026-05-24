/**
 * Pagination query parameter schemas.
 */

import { z } from 'zod';

export const OffsetPaginationQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .pipe(z.number().int().positive().default(1)),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 20))
    .pipe(z.number().int().min(1).max(100).default(20)),
});

export type OffsetPaginationQuery = z.infer<typeof OffsetPaginationQuerySchema>;

export const CursorPaginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 20))
    .pipe(z.number().int().min(1).max(100).default(20)),
  direction: z.enum(['forward', 'backward']).optional().default('forward'),
});

export type CursorPaginationQuery = z.infer<typeof CursorPaginationQuerySchema>;
