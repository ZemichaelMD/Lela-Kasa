import { z } from 'zod';

export const BookmarkedRestaurantSchema = z.object({
  id: z.string(),
  userId: z.string(),
  restaurantId: z.number().int().positive(),
  createdAt: z.string(),
  restaurant: z
    .object({
      id: z.number().int().positive(),
      name: z.string(),
      slug: z.string(),
      coverImageUrl: z.string().nullable().optional(),
      ratingAvg: z.number(),
      ratingCount: z.number().int().nonnegative(),
      city: z.string().nullable().optional(),
    })
    .optional(),
});
export type BookmarkedRestaurant = z.infer<typeof BookmarkedRestaurantSchema>;

export const BookmarkedMenuItemSchema = z.object({
  id: z.string(),
  userId: z.string(),
  menuItemId: z.number().int().positive(),
  createdAt: z.string(),
  menuItem: z
    .object({
      id: z.number().int().positive(),
      name: z.string(),
      imageUrl: z.string().nullable().optional(),
      priceCents: z.number().int().nonnegative(),
      restaurant: z.object({ id: z.number().int().positive(), name: z.string(), slug: z.string() }).optional(),
    })
    .optional(),
});
export type BookmarkedMenuItem = z.infer<typeof BookmarkedMenuItemSchema>;

export const BookmarkStatusSchema = z.object({
  restaurant: z.boolean().optional(),
  menuItem: z.boolean().optional(),
});
export type BookmarkStatus = z.infer<typeof BookmarkStatusSchema>;

export const BookmarkListQuerySchema = z.object({
  sort: z.enum(['newest', 'name', 'rating']).default('newest'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});
export type BookmarkListQuery = z.infer<typeof BookmarkListQuerySchema>;
