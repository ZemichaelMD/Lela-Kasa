import { z } from 'zod';

export const ReviewSchema = z.object({
  id: z.string(),
  restaurantId: z.number().int().positive().nullable().optional(),
  menuItemId: z.number().int().positive().nullable().optional(),
  userId: z.string(),
  rating: z.number().int().min(1).max(5),
  title: z.string().nullable().optional(),
  body: z.string().nullable().optional(),
  images: z.array(z.string()),
  serviceRating: z.number().int().min(1).max(5).nullable().optional(),
  portionSize: z.enum(['SMALL', 'ADEQUATE', 'LARGE']).nullable().optional(),
  dietaryCompliance: z.enum(['ACCURATE', 'INACCURATE']).nullable().optional(),
  helpfulVotes: z.number().int().nonnegative(),
  unhelpfulVotes: z.number().int().nonnegative(),
  isHidden: z.boolean(),
  isVerified: z.boolean(),
  moderationNote: z.string().nullable().optional(),
  ownerReply: z.string().nullable().optional(),
  ownerRepliedAt: z.string().nullable().optional(),
  deletedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  reviewer: z
    .object({
      id: z.string(),
      name: z.string().nullable().optional(),
      avatarUrl: z.string().nullable().optional(),
    })
    .optional(),
});

export type Review = z.infer<typeof ReviewSchema>;

export const CreateReviewInputSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  body: z.string().max(4000).optional(),
  images: z.array(z.string().url()).max(5).optional(),
  serviceRating: z.number().int().min(1).max(5).optional(),
  portionSize: z.enum(['SMALL', 'ADEQUATE', 'LARGE']).optional(),
  dietaryCompliance: z.enum(['ACCURATE', 'INACCURATE']).optional(),
});

export type CreateReviewInput = z.infer<typeof CreateReviewInputSchema>;

export const UpdateReviewInputSchema = CreateReviewInputSchema.partial();
export type UpdateReviewInput = z.infer<typeof UpdateReviewInputSchema>;

export const ReviewListQuerySchema = z.object({
  sort: z.enum(['newest', 'oldest', 'highest', 'lowest', 'most-helpful']).default('newest'),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  hasReply: z.coerce.boolean().optional(),
  hasMedia: z.coerce.boolean().optional(),
  verified: z.coerce.boolean().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export type ReviewListQuery = z.infer<typeof ReviewListQuerySchema>;

export const ReviewReplyInputSchema = z.object({
  body: z.string().min(1).max(2000),
});
export type ReviewReplyInput = z.infer<typeof ReviewReplyInputSchema>;

export const ReviewVoteInputSchema = z.object({
  type: z.enum(['helpful', 'unhelpful']),
});
export type ReviewVoteInput = z.infer<typeof ReviewVoteInputSchema>;

export const AdminModerateReviewInputSchema = z.object({
  isHidden: z.boolean(),
  moderationNote: z.string().max(500).optional(),
});
export type AdminModerateReviewInput = z.infer<typeof AdminModerateReviewInputSchema>;

export const AdminBulkModerateReviewInputSchema = z.object({
  ids: z.array(z.string()).min(1),
  action: z.enum(['hide', 'unhide', 'delete']),
});
export type AdminBulkModerateReviewInput = z.infer<typeof AdminBulkModerateReviewInputSchema>;

export const ReviewSummarySchema = z.object({
  ratingAvg: z.number(),
  ratingCount: z.number().int().nonnegative(),
  histogram: z.object({
    1: z.number().int().nonnegative(),
    2: z.number().int().nonnegative(),
    3: z.number().int().nonnegative(),
    4: z.number().int().nonnegative(),
    5: z.number().int().nonnegative(),
  }),
  topKeywords: z.array(z.string()),
});
export type ReviewSummary = z.infer<typeof ReviewSummarySchema>;

export const AdminReviewListQuerySchema = z.object({
  q: z.string().optional(),
  restaurantId: z.coerce.number().int().positive().optional(),
  menuItemId: z.coerce.number().int().positive().optional(),
  kind: z.enum(['all', 'restaurant', 'menu-item']).default('all'),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  isHidden: z.coerce.boolean().optional(),
  hasReport: z.coerce.boolean().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sort: z.enum(['newest', 'oldest', 'highest', 'lowest', 'most-helpful', 'most-reports']).default('newest'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});
export type AdminReviewListQuery = z.infer<typeof AdminReviewListQuerySchema>;

export const AdminReviewStatsSchema = z.object({
  total: z.number().int().nonnegative(),
  hidden: z.number().int().nonnegative(),
  flagged: z.number().int().nonnegative(),
  ratingAvg: z.number(),
  byRating: z.object({
    1: z.number().int().nonnegative(),
    2: z.number().int().nonnegative(),
    3: z.number().int().nonnegative(),
    4: z.number().int().nonnegative(),
    5: z.number().int().nonnegative(),
  }),
});
export type AdminReviewStats = z.infer<typeof AdminReviewStatsSchema>;

export const MyReviewsListQuerySchema = z.object({
  kind: z.enum(['all', 'restaurant', 'menu-item']).default('all'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});
export type MyReviewsListQuery = z.infer<typeof MyReviewsListQuerySchema>;
