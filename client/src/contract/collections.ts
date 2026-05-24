import { z } from 'zod';

export const CollectionSchema = z.object({
  id: z.string(),
  userId: z.string().nullable().optional(),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().nullable().optional(),
  coverImageUrl: z.string().nullable().optional(),
  isPublic: z.boolean(),
  showOnHome: z.boolean(),
  itemCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Collection = z.infer<typeof CollectionSchema>;

export const CollectionItemSchema = z.object({
  id: z.string(),
  collectionId: z.string(),
  restaurantId: z.number().int().positive().nullable().optional(),
  menuItemId: z.number().int().positive().nullable().optional(),
  note: z.string().nullable().optional(),
  sortOrder: z.number().int().nonnegative(),
  createdAt: z.string(),
  restaurant: z
    .object({
      id: z.number().int().positive(),
      name: z.string(),
      slug: z.string(),
      coverImageUrl: z.string().nullable().optional(),
    })
    .optional(),
  menuItem: z
    .object({
      id: z.number().int().positive(),
      name: z.string(),
      imageUrl: z.string().nullable().optional(),
      priceCents: z.number().int().nonnegative(),
    })
    .optional(),
});
export type CollectionItem = z.infer<typeof CollectionItemSchema>;

export const CreateCollectionInputSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  coverImageUrl: z.string().url().optional(),
  isPublic: z.boolean().default(false),
  showOnHome: z.boolean().default(false),
});
export type CreateCollectionInput = z.infer<typeof CreateCollectionInputSchema>;

export const UpdateCollectionInputSchema = CreateCollectionInputSchema.partial();
export type UpdateCollectionInput = z.infer<typeof UpdateCollectionInputSchema>;

export const AddCollectionItemInputSchema = z.object({
  restaurantId: z.number().int().positive().optional(),
  menuItemId: z.number().int().positive().optional(),
  note: z.string().max(500).optional(),
});
export type AddCollectionItemInput = z.infer<typeof AddCollectionItemInputSchema>;

export const ReorderCollectionInputSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      sortOrder: z.number().int().nonnegative(),
    }),
  ),
});
export type ReorderCollectionInput = z.infer<typeof ReorderCollectionInputSchema>;

export const CollectionListQuerySchema = z.object({
  isPublic: z.coerce.boolean().optional(),
  showOnHome: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});
export type CollectionListQuery = z.infer<typeof CollectionListQuerySchema>;
