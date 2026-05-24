import { z } from 'zod';

import { ReportStatus, ReportType } from './enums';

export const ReportTargetType = z.enum(['RESTAURANT', 'MENU_ITEM', 'REVIEW', 'USER']);
export type ReportTargetType = z.infer<typeof ReportTargetType>;

export const ReportSchema = z.object({
  id: z.string(),
  targetType: ReportTargetType,
  targetId: z.string(),
  reason: z.nativeEnum(ReportType),
  description: z.string().nullable().optional(),
  evidence: z.array(z.string()),
  status: z.nativeEnum(ReportStatus),
  resolutionNote: z.string().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  reporterId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  reporter: z
    .object({
      id: z.string(),
      name: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
    })
    .optional(),
  assignee: z
    .object({
      id: z.string(),
      name: z.string().nullable().optional(),
    })
    .optional(),
});
export type Report = z.infer<typeof ReportSchema>;

export const CreateReportInputSchema = z.object({
  targetType: ReportTargetType,
  targetId: z.string(),
  reason: z.nativeEnum(ReportType),
  description: z.string().max(2000).optional(),
  evidence: z.array(z.string().url()).max(5).optional(),
});
export type CreateReportInput = z.infer<typeof CreateReportInputSchema>;

export const UpdateReportInputSchema = z.object({
  status: z.nativeEnum(ReportStatus).optional(),
  resolutionNote: z.string().max(1000).optional(),
  assigneeId: z.string().optional(),
});
export type UpdateReportInput = z.infer<typeof UpdateReportInputSchema>;

export const AdminReportListQuerySchema = z.object({
  q: z.string().optional(),
  status: z.nativeEnum(ReportStatus).optional(),
  targetType: ReportTargetType.optional(),
  reason: z.nativeEnum(ReportType).optional(),
  assigneeId: z.string().optional(),
  isUnassigned: z.coerce.boolean().optional(),
  reporterId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sort: z.enum(['newest', 'oldest', 'most-reports', 'priority']).default('newest'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});
export type AdminReportListQuery = z.infer<typeof AdminReportListQuerySchema>;

export const ReportStatsSchema = z.object({
  total: z.number().int().nonnegative(),
  byStatus: z.object({
    PENDING: z.number().int().nonnegative(),
    UNDER_REVIEW: z.number().int().nonnegative(),
    RESOLVED: z.number().int().nonnegative(),
    DISMISSED: z.number().int().nonnegative(),
  }),
  byTargetType: z.object({
    RESTAURANT: z.number().int().nonnegative(),
    MENU_ITEM: z.number().int().nonnegative(),
    REVIEW: z.number().int().nonnegative(),
    USER: z.number().int().nonnegative(),
  }),
  unassigned: z.number().int().nonnegative(),
});
export type ReportStats = z.infer<typeof ReportStatsSchema>;

export const MyReportsListQuerySchema = z.object({
  status: z.nativeEnum(ReportStatus).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});
export type MyReportsListQuery = z.infer<typeof MyReportsListQuerySchema>;
