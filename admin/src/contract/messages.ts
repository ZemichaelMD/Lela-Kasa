import { z } from 'zod';

export const MessageThreadStatus = z.enum(['OPEN', 'CLOSED']);
export type MessageThreadStatus = z.infer<typeof MessageThreadStatus>;

export const MessageSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  senderId: z.string(),
  body: z.string(),
  isRead: z.boolean(),
  createdAt: z.string(),
  sender: z
    .object({
      id: z.string(),
      name: z.string().nullable().optional(),
      avatarUrl: z.string().nullable().optional(),
      role: z.string().optional(),
    })
    .optional(),
});
export type Message = z.infer<typeof MessageSchema>;

export const MessageThreadSchema = z.object({
  id: z.string(),
  subject: z.string(),
  status: MessageThreadStatus,
  restaurantId: z.number().int().positive().nullable().optional(),
  createdById: z.string(),
  assigneeId: z.string().nullable().optional(),
  unreadCount: z.number().int().nonnegative(),
  lastMessageAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z
    .object({
      id: z.string(),
      name: z.string().nullable().optional(),
      avatarUrl: z.string().nullable().optional(),
    })
    .optional(),
  restaurant: z
    .object({
      id: z.number().int().positive(),
      name: z.string(),
    })
    .optional(),
  assignee: z
    .object({
      id: z.string(),
      name: z.string().nullable().optional(),
    })
    .optional(),
  lastMessage: z
    .object({
      body: z.string(),
      createdAt: z.string(),
    })
    .optional(),
});
export type MessageThread = z.infer<typeof MessageThreadSchema>;

export const CreateThreadInputSchema = z.object({
  subject: z.string().min(1).max(300),
  body: z.string().min(1).max(5000),
  restaurantId: z.number().int().positive().optional(),
});
export type CreateThreadInput = z.infer<typeof CreateThreadInputSchema>;

export const MessageReplyInputSchema = z.object({
  body: z.string().min(1).max(5000),
});
export type MessageReplyInput = z.infer<typeof MessageReplyInputSchema>;

export const ThreadListQuerySchema = z.object({
  status: MessageThreadStatus.optional(),
  unreadOnly: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});
export type ThreadListQuery = z.infer<typeof ThreadListQuerySchema>;

export const AdminThreadListQuerySchema = z.object({
  status: MessageThreadStatus.optional(),
  assigneeId: z.string().optional(),
  unreadOnly: z.coerce.boolean().optional(),
  restaurantId: z.coerce.number().int().positive().optional(),
  userId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sort: z.enum(['last-activity', 'newest', 'oldest']).default('last-activity'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});
export type AdminThreadListQuery = z.infer<typeof AdminThreadListQuerySchema>;
