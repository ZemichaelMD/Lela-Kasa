import { z } from 'zod';

import { NotificationChannel, NotificationType } from './enums';

export const NotificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.nativeEnum(NotificationType),
  title: z.string(),
  body: z.string(),
  link: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  isRead: z.boolean(),
  readAt: z.string().nullable().optional(),
  deletedAt: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
  createdAt: z.string(),
});
export type Notification = z.infer<typeof NotificationSchema>;

export const NotificationPrefSchema = z.object({
  id: z.string(),
  userId: z.string(),
  category: z.string(),
  inApp: z.boolean(),
  email: z.boolean(),
  sms: z.boolean(),
  push: z.boolean(),
});
export type NotificationPref = z.infer<typeof NotificationPrefSchema>;

export const NotificationListQuerySchema = z.object({
  unreadOnly: z.coerce.boolean().optional(),
  category: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});
export type NotificationListQuery = z.infer<typeof NotificationListQuerySchema>;

export const UnreadCountSchema = z.object({
  count: z.number().int().nonnegative(),
});
export type UnreadCount = z.infer<typeof UnreadCountSchema>;

export const UpdateNotificationPrefsInputSchema = z.array(
  z.object({
    category: z.string().min(1),
    inApp: z.boolean().optional(),
    email: z.boolean().optional(),
    sms: z.boolean().optional(),
    push: z.boolean().optional(),
  }),
);
export type UpdateNotificationPrefsInput = z.infer<typeof UpdateNotificationPrefsInputSchema>;

export const NOTIFICATION_CATEGORIES = [
  'review_reply',
  'helpful_vote',
  'report_resolved',
  'message_reply',
  'system',
  'promo',
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export { NotificationChannel, NotificationType };
