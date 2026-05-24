import { z } from 'zod';

// ─── Template ─────────────────────────────────────────────────────────────────

export const TemplateSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  previewImageUrl: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  htmlContent: z.string(),
  cssContent: z.string().nullable().optional(),
  configSchema: z.record(z.unknown()).nullable().optional(),
  isActive: z.boolean(),
  isDefault: z.boolean(),
  version: z.number().int().nonnegative(),
  sanitizedAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Template = z.infer<typeof TemplateSchema>;

// ─── Create / Update ──────────────────────────────────────────────────────────

export const CreateTemplateInputSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  previewImageUrl: z.string().url().optional(),
  category: z.string().max(100).optional(),
  htmlContent: z.string().min(1),
  cssContent: z.string().optional(),
  configSchema: z.record(z.unknown()).optional(),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});

export type CreateTemplateInput = z.infer<typeof CreateTemplateInputSchema>;

export const UpdateTemplateInputSchema = CreateTemplateInputSchema.partial();
export type UpdateTemplateInput = z.infer<typeof UpdateTemplateInputSchema>;

// ─── Preview ──────────────────────────────────────────────────────────────────

export const TemplatePreviewInputSchema = z.object({
  restaurantId: z.number().int().positive().optional(),
  overrides: z.record(z.unknown()).optional(),
});

export type TemplatePreviewInput = z.infer<typeof TemplatePreviewInputSchema>;

// ─── Assignment ───────────────────────────────────────────────────────────────

export const AssignTemplateInputSchema = z.object({
  templateId: z.number().int().positive().nullable(),
  templateDataOverrides: z.record(z.unknown()).optional(),
});

export type AssignTemplateInput = z.infer<typeof AssignTemplateInputSchema>;

// ─── Template data (for SSR rendering) ───────────────────────────────────────

export const TemplateDataSchema = z.object({
  restaurant: z.record(z.unknown()),
  sections: z.array(z.record(z.unknown())),
  menu: z.array(z.record(z.unknown())),
  config: z.record(z.unknown()).optional(),
});

export type TemplateData = z.infer<typeof TemplateDataSchema>;
