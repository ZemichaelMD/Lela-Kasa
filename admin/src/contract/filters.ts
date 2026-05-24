import { z } from 'zod';

import { ApprovalStatus, ClaimStatus, PriceRange, UserRole } from './enums';

/**
 * Shared list/filter contracts used by:
 *   - admin Nest controllers (`AdminRestaurantsController`, `AdminUsersController`,
 *     `AdminMenuItemsController`, `AdminOwnerRequestsController`)
 *   - the SDK admin list resources (`sdk.restaurants.listAdmin`, ...)
 *   - the admin React filter bars (`/restaurants`, `/menu-items`, `/users`,
 *     `/owner-requests`)
 *
 * Query-string callers should send arrays as repeated keys (`?city=Bahir%20Dar&city=Hawassa`)
 * — the helpers in `apps/backend/src/common/util/parse-array-query.ts` accept
 * both repeated keys and comma-separated values.
 */

const csv = <T extends z.ZodTypeAny>(member: T) =>
  z
    .union([z.array(member), member])
    .optional()
    .transform((v): z.infer<T>[] | undefined => {
      if (v === undefined) return undefined;
      return Array.isArray(v) ? v : [v];
    });

const boolish = z
  .union([z.boolean(), z.string()])
  .optional()
  .transform((v): boolean | undefined => {
    if (v === undefined) return undefined;
    if (typeof v === 'boolean') return v;
    if (v === 'true' || v === '1') return true;
    if (v === 'false' || v === '0') return false;
    return undefined;
  });

const intCoerce = (def?: number) =>
  z
    .union([z.number(), z.string()])
    .optional()
    .transform((v): number | undefined => {
      if (v === undefined || v === '') return def;
      const n = typeof v === 'number' ? v : Number(v);
      return Number.isFinite(n) ? n : def;
    });

// ─── Restaurants (admin) ────────────────────────────────────────────────────

export const AdminRestaurantSortEnum = z.enum(['recent', 'name', 'rating', 'views', 'oldest']);
export type AdminRestaurantSort = z.infer<typeof AdminRestaurantSortEnum>;

export const AdminRestaurantFilterSchema = z.object({
  q: z.string().trim().min(1).optional(),
  approvalStatus: csv(z.nativeEnum(ApprovalStatus)),
  city: csv(z.string().trim().min(1)),
  region: csv(z.string().trim().min(1)),
  cuisine: csv(z.string().trim().min(1)),
  priceRange: csv(z.nativeEnum(PriceRange)),
  claimStatus: csv(z.nativeEnum(ClaimStatus)),
  featured: boolish,
  verified: boolish,
  hasMenu: boolish,
  ratingMin: intCoerce(),
  ownerId: z.string().trim().min(1).optional(),
  createdFrom: z.string().datetime().optional(),
  createdTo: z.string().datetime().optional(),
  sort: AdminRestaurantSortEnum.default('recent'),
  limit: intCoerce(20),
  offset: intCoerce(0),
  includeDeleted: boolish,
});
export type AdminRestaurantFilter = z.infer<typeof AdminRestaurantFilterSchema>;

// ─── Menu items (admin) ─────────────────────────────────────────────────────

export const AdminMenuItemSortEnum = z.enum(['recent', 'name', 'price', 'oldest']);
export type AdminMenuItemSort = z.infer<typeof AdminMenuItemSortEnum>;

export const AdminMenuItemFilterSchema = z.object({
  q: z.string().trim().min(1).optional(),
  restaurantId: intCoerce(),
  sectionId: z.string().trim().min(1).optional(),
  approvalStatus: csv(z.nativeEnum(ApprovalStatus)),
  isAvailable: boolish,
  dietary: csv(z.string().trim().min(1)),
  priceMinCents: intCoerce(),
  priceMaxCents: intCoerce(),
  sort: AdminMenuItemSortEnum.default('recent'),
  limit: intCoerce(20),
  offset: intCoerce(0),
});
export type AdminMenuItemFilter = z.infer<typeof AdminMenuItemFilterSchema>;

// ─── Users (admin) ──────────────────────────────────────────────────────────

export const AdminUserSortEnum = z.enum(['recent', 'name', 'oldest']);
export type AdminUserSort = z.infer<typeof AdminUserSortEnum>;

export const AdminUserFilterSchema = z.object({
  q: z.string().trim().min(1).optional(),
  role: csv(z.nativeEnum(UserRole)),
  isActive: boolish,
  emailVerified: boolish,
  hasOwnerRequest: boolish,
  createdFrom: z.string().datetime().optional(),
  createdTo: z.string().datetime().optional(),
  sort: AdminUserSortEnum.default('recent'),
  page: intCoerce(1),
  limit: intCoerce(20),
});
export type AdminUserFilter = z.infer<typeof AdminUserFilterSchema>;

// ─── Owner requests ─────────────────────────────────────────────────────────

export const OwnerRequestStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  WITHDRAWN: 'WITHDRAWN',
} as const;
export type OwnerRequestStatus = (typeof OwnerRequestStatus)[keyof typeof OwnerRequestStatus];

export const OwnerRequestStatusEnum = z.enum([
  OwnerRequestStatus.PENDING,
  OwnerRequestStatus.APPROVED,
  OwnerRequestStatus.REJECTED,
  OwnerRequestStatus.WITHDRAWN,
]);

export const OwnerRequestSchema = z.object({
  id: z.string(),
  userId: z.string(),
  userEmail: z.string().email(),
  userName: z.string().nullable().optional(),
  status: OwnerRequestStatusEnum,
  restaurantName: z.string(),
  city: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  reason: z.string(),
  rejectionReason: z.string().nullable().optional(),
  reviewerId: z.string().nullable().optional(),
  reviewedAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type OwnerRequest = z.infer<typeof OwnerRequestSchema>;

export const CreateOwnerRequestInputSchema = z.object({
  restaurantName: z.string().trim().min(2).max(160),
  city: z.string().trim().min(1).max(100).optional(),
  phone: z.string().trim().max(32).optional(),
  website: z
    .string()
    .url()
    .optional()
    .or(z.literal('').transform(() => undefined)),
  reason: z.string().trim().min(20).max(2000),
});
export type CreateOwnerRequestInput = z.infer<typeof CreateOwnerRequestInputSchema>;

export const ReviewOwnerRequestInputSchema = z.object({
  approve: z.boolean(),
  rejectionReason: z.string().trim().min(5).max(500).optional(),
  welcomeNote: z.string().trim().max(500).optional(),
});
export type ReviewOwnerRequestInput = z.infer<typeof ReviewOwnerRequestInputSchema>;

export const OwnerRequestFilterSchema = z.object({
  q: z.string().trim().min(1).optional(),
  status: csv(OwnerRequestStatusEnum),
  sort: z.enum(['recent', 'oldest']).default('recent'),
  page: intCoerce(1),
  limit: intCoerce(20),
});
export type OwnerRequestFilter = z.infer<typeof OwnerRequestFilterSchema>;
