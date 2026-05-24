import { z } from 'zod';

import { QrTargetType, QrThemeLayout } from './enums';

// ─── QR Theme ─────────────────────────────────────────────────────────────────

export const QrThemeSchema = z.object({
  id: z.string().cuid(),
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  previewImageUrl: z.string().nullable().optional(),
  layout: z.nativeEnum(QrThemeLayout),
  config: z.record(z.unknown()),
  isActive: z.boolean(),
  isSystem: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type QrTheme = z.infer<typeof QrThemeSchema>;

export const CreateQrThemeInputSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-_]+$/),
  name: z.string().min(1).max(200),
  description: z.string().max(500).default(''),
  previewImageUrl: z.string().url().optional(),
  layout: z.nativeEnum(QrThemeLayout),
  config: z.record(z.unknown()).default({}),
  isActive: z.boolean().default(true),
});

export type CreateQrThemeInput = z.infer<typeof CreateQrThemeInputSchema>;

export const UpdateQrThemeInputSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional(),
  previewImageUrl: z.string().url().nullable().optional(),
  layout: z.nativeEnum(QrThemeLayout).optional(),
  config: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateQrThemeInput = z.infer<typeof UpdateQrThemeInputSchema>;

// ─── QR Code ──────────────────────────────────────────────────────────────────

export const QrCodeSchema = z.object({
  id: z.string().cuid(),
  code: z.string().min(1),
  restaurantId: z.number().int().positive(),
  tableId: z.string().nullable().optional(),
  templateId: z.number().int().positive().nullable().optional(),
  label: z.string().nullable().optional(),
  targetType: z.nativeEnum(QrTargetType),
  themeKey: z.string().min(1),
  themeOverrides: z.record(z.unknown()).nullable().optional(),
  destinationUrl: z.string().url(),
  pngUrl: z.string().nullable().optional(),
  svgUrl: z.string().nullable().optional(),
  pdfUrl: z.string().nullable().optional(),
  scanCount: z.number().int().nonnegative(),
  lastScanAt: z.string().datetime().nullable().optional(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type QrCode = z.infer<typeof QrCodeSchema>;

export const CreateQrCodeInputSchema = z.object({
  label: z.string().max(200).optional(),
  targetType: z.nativeEnum(QrTargetType).default(QrTargetType.MENU),
  themeKey: z.string().min(1),
  themeOverrides: z.record(z.unknown()).optional(),
  tableId: z.string().optional(),
  templateId: z.number().int().positive().optional(),
});

export type CreateQrCodeInput = z.infer<typeof CreateQrCodeInputSchema>;

export const UpdateQrCodeInputSchema = z.object({
  label: z.string().max(200).nullable().optional(),
  themeKey: z.string().optional(),
  themeOverrides: z.record(z.unknown()).nullable().optional(),
  templateId: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional(),
});

// ─── Public scan resolve response ────────────────────────────────────────────

export const QrResolveResponseSchema = z.object({
  code: z.string(),
  restaurantId: z.number().int().positive(),
  restaurantSlug: z.string(),
  restaurantName: z.string(),
  templateId: z.number().int().positive().nullable(),
  destinationUrl: z.string().url(),
  targetType: z.nativeEnum(QrTargetType),
  label: z.string().nullable().optional(),
});

export type QrResolveResponse = z.infer<typeof QrResolveResponseSchema>;

export type UpdateQrCodeInput = z.infer<typeof UpdateQrCodeInputSchema>;

// ─── Scan event ───────────────────────────────────────────────────────────────

export const QrScanEventSchema = z.object({
  id: z.string().cuid(),
  qrCodeId: z.string(),
  restaurantId: z.number().int().positive(),
  scannedAt: z.string().datetime(),
  city: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  deviceType: z.string().nullable().optional(),
  isUnique: z.boolean(),
});

export type QrScanEvent = z.infer<typeof QrScanEventSchema>;

export const RecordQrScanInputSchema = z.object({
  userAgent: z.string().max(500).optional(),
  referrer: z.string().max(500).optional(),
  sessionId: z.string().optional(),
});

export type RecordQrScanInput = z.infer<typeof RecordQrScanInputSchema>;
