import { z } from 'zod';

import { ApprovalStatus, ModifierSelectionType } from './enums';

// ---------------------------------------------------------------------------
// Menu Sections
// ---------------------------------------------------------------------------

export const MenuSectionSchema = z.object({
  id: z.string(),
  restaurantId: z.number().int().positive(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  sortOrder: z.number().int().nonnegative(),
  isActive: z.boolean(),
  availableFrom: z.string().nullable().optional(),
  availableUntil: z.string().nullable().optional(),
  availableDays: z.array(z.number().int()),
  imageUrl: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type MenuSection = z.infer<typeof MenuSectionSchema>;

export const CreateMenuSectionInputSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(1000).optional(),
  availableFrom: z.string().optional(),
  availableUntil: z.string().optional(),
  availableDays: z.array(z.number().int().min(0).max(6)).optional(),
  imageUrl: z.string().url().optional(),
});

export type CreateMenuSectionInput = z.infer<typeof CreateMenuSectionInputSchema>;

export const UpdateMenuSectionInputSchema = CreateMenuSectionInputSchema.partial().extend({
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});

export type UpdateMenuSectionInput = z.infer<typeof UpdateMenuSectionInputSchema>;

export const ReorderMenuSectionsInputSchema = z.object({
  sectionIds: z.array(z.string()),
});

export type ReorderMenuSectionsInput = z.infer<typeof ReorderMenuSectionsInputSchema>;

// ---------------------------------------------------------------------------
// Modifier Options (defined before groups so they can be embedded)
// ---------------------------------------------------------------------------

export const ModifierOptionSchema = z.object({
  id: z.string(),
  modifierGroupId: z.string(),
  name: z.string().min(1),
  priceDeltaCents: z.number().int(),
  isDefault: z.boolean(),
  isAvailable: z.boolean(),
  sortOrder: z.number().int().nonnegative(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type ModifierOption = z.infer<typeof ModifierOptionSchema>;

export const CreateModifierOptionInputSchema = z.object({
  name: z.string().min(1).max(120),
  priceDeltaCents: z.number().int().default(0),
  isDefault: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});

export type CreateModifierOptionInput = z.infer<typeof CreateModifierOptionInputSchema>;

export const UpdateModifierOptionInputSchema = CreateModifierOptionInputSchema.partial();

export type UpdateModifierOptionInput = z.infer<typeof UpdateModifierOptionInputSchema>;

// ---------------------------------------------------------------------------
// Modifier Groups
// ---------------------------------------------------------------------------

export const ModifierGroupSchema = z.object({
  id: z.string(),
  restaurantId: z.number().int().positive(),
  name: z.string().min(1),
  minSelections: z.number().int().nonnegative(),
  maxSelections: z.number().int().positive().nullable().optional(),
  isRequired: z.boolean(),
  selectionType: z.nativeEnum(ModifierSelectionType),
  sortOrder: z.number().int().nonnegative(),
  options: z.array(ModifierOptionSchema),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type ModifierGroup = z.infer<typeof ModifierGroupSchema>;

export const CreateModifierGroupInputSchema = z.object({
  name: z.string().min(1).max(120),
  selectionType: z.nativeEnum(ModifierSelectionType),
  minSelections: z.number().int().nonnegative().default(0),
  maxSelections: z.number().int().positive().optional(),
  isRequired: z.boolean().default(false),
  sortOrder: z.number().int().nonnegative().optional(),
  options: z.array(CreateModifierOptionInputSchema),
});

export type CreateModifierGroupInput = z.infer<typeof CreateModifierGroupInputSchema>;

export const UpdateModifierGroupInputSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  selectionType: z.nativeEnum(ModifierSelectionType).optional(),
  minSelections: z.number().int().nonnegative().optional(),
  maxSelections: z.number().int().positive().optional(),
  isRequired: z.boolean().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});

export type UpdateModifierGroupInput = z.infer<typeof UpdateModifierGroupInputSchema>;

// ---------------------------------------------------------------------------
// MenuItem <-> ModifierGroup link
// ---------------------------------------------------------------------------

export const MenuItemModifierGroupSchema = z.object({
  modifierGroupId: z.string(),
  sortOrder: z.number().int().nonnegative(),
  isRequiredOverride: z.boolean().nullable().optional(),
  group: ModifierGroupSchema,
});

export type MenuItemModifierGroup = z.infer<typeof MenuItemModifierGroupSchema>;

export const LinkModifierGroupInputSchema = z.object({
  modifierGroupId: z.string(),
  sortOrder: z.number().int().nonnegative().optional(),
  isRequiredOverride: z.boolean().optional(),
});

export type LinkModifierGroupInput = z.infer<typeof LinkModifierGroupInputSchema>;

// ---------------------------------------------------------------------------
// Menu Items
// ---------------------------------------------------------------------------

export const MenuItemSchema = z.object({
  id: z.number().int().positive(),
  restaurantId: z.number().int().positive(),
  menuSectionId: z.string().nullable().optional(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  priceCents: z.number().int().nonnegative(),
  compareAtPriceCents: z.number().int().nonnegative().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  images: z.array(z.string()),
  sortOrder: z.number().int().nonnegative(),
  isAvailable: z.boolean(),
  isOutOfStock: z.boolean(),
  stockQuantity: z.number().int().nonnegative().nullable().optional(),
  isFeatured: z.boolean(),
  isVegetarian: z.boolean(),
  isVegan: z.boolean(),
  isGlutenFree: z.boolean(),
  isHalal: z.boolean(),
  isSpicy: z.boolean(),
  spiceLevel: z.number().int().min(0).max(5).nullable().optional(),
  preparationTime: z.number().int().positive().nullable().optional(),
  calories: z.number().int().nonnegative().nullable().optional(),
  servingSize: z.string().nullable().optional(),
  allergens: z.array(z.string()),
  dietaryTags: z.array(z.string()),
  approvalStatus: z.nativeEnum(ApprovalStatus),
  rejectionReason: z.string().nullable().optional(),
  ratingAvg: z.number(),
  ratingCount: z.number().int().nonnegative(),
  orderCount: z.number().int().nonnegative(),
  metadata: z.unknown().nullable().optional(),
  modifierGroups: z.array(MenuItemModifierGroupSchema),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type MenuItem = z.infer<typeof MenuItemSchema>;

export const CreateMenuItemInputSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  priceCents: z.number().int().nonnegative(),
  compareAtPriceCents: z.number().int().nonnegative().optional(),
  menuSectionId: z.string().optional(),
  imageUrl: z.string().url().optional(),
  images: z.array(z.string()).optional(),
  sortOrder: z.number().int().nonnegative().optional(),
  isVegetarian: z.boolean().optional().default(false),
  isVegan: z.boolean().optional().default(false),
  isGlutenFree: z.boolean().optional().default(false),
  isHalal: z.boolean().optional().default(false),
  isSpicy: z.boolean().optional().default(false),
  spiceLevel: z.number().int().min(0).max(5).optional(),
  preparationTime: z.number().int().positive().optional(),
  calories: z.number().int().nonnegative().optional(),
  servingSize: z.string().max(80).optional(),
  allergens: z.array(z.string()).optional(),
  dietaryTags: z.array(z.string()).optional(),
  stockQuantity: z.number().int().nonnegative().optional(),
  categoryIds: z.array(z.number().int().positive()).optional(),
  tagIds: z.array(z.number().int().positive()).optional(),
  modifierGroupIds: z.array(z.string()).optional(),
  metadata: z.unknown().optional(),
});

export type CreateMenuItemInput = z.infer<typeof CreateMenuItemInputSchema>;

export const UpdateMenuItemInputSchema = CreateMenuItemInputSchema.partial().extend({
  isAvailable: z.boolean().optional(),
  isOutOfStock: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

export type UpdateMenuItemInput = z.infer<typeof UpdateMenuItemInputSchema>;

export const MenuItemListQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  menuSectionId: z.string().optional(),
  approvalStatus: z.nativeEnum(ApprovalStatus).optional(),
  isAvailable: z.coerce.boolean().optional(),
  isFeatured: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type MenuItemListQuery = z.infer<typeof MenuItemListQuerySchema>;

export const ApproveMenuItemInputSchema = z.object({
  approved: z.boolean(),
  rejectionReason: z.string().trim().max(500).optional(),
});

export type ApproveMenuItemInput = z.infer<typeof ApproveMenuItemInputSchema>;

export const BulkMenuItemInputSchema = z.object({
  ids: z.array(z.number().int().positive()),
  action: z.enum(['set-available', 'set-unavailable', 'set-featured', 'set-unfeatured', 'set-section', 'delete']),
  sectionId: z.string().optional(),
});

export type BulkMenuItemInput = z.infer<typeof BulkMenuItemInputSchema>;

// ---------------------------------------------------------------------------
// Category (supports recursive self-reference via z.lazy)
// ---------------------------------------------------------------------------

export type Category = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  iconUrl?: string | null;
  parentId?: number | null;
  isApproved: boolean;
  sortOrder: number;
  mergedIntoId?: number | null;
  children?: Category[];
};

export const CategorySchema: z.ZodType<Category> = z.lazy(() =>
  z.object({
    id: z.number().int().positive(),
    name: z.string().min(1),
    slug: z.string().min(1),
    description: z.string().nullable().optional(),
    iconUrl: z.string().nullable().optional(),
    parentId: z.number().int().positive().nullable().optional(),
    isApproved: z.boolean(),
    sortOrder: z.number().int().nonnegative(),
    mergedIntoId: z.number().int().positive().nullable().optional(),
    children: z.array(CategorySchema).optional(),
  }),
);

export const CreateCategoryInputSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  iconUrl: z.string().url().optional(),
  parentId: z.number().int().positive().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});

export type CreateCategoryInput = z.infer<typeof CreateCategoryInputSchema>;

export const UpdateCategoryInputSchema = CreateCategoryInputSchema.partial().extend({
  isApproved: z.boolean().optional(),
});

export type UpdateCategoryInput = z.infer<typeof UpdateCategoryInputSchema>;

export const MergeCategoryInputSchema = z.object({
  intoId: z.number().int().positive(),
});

export type MergeCategoryInput = z.infer<typeof MergeCategoryInputSchema>;

// ---------------------------------------------------------------------------
// Tag
// ---------------------------------------------------------------------------

export const TagSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  slug: z.string().min(1),
  type: z.string().min(1),
  color: z.string().nullable().optional(),
  isApproved: z.boolean(),
});

export type Tag = z.infer<typeof TagSchema>;

export const CreateTagInputSchema = z.object({
  name: z.string().min(1).max(80),
  type: z.string().min(1).max(80),
  color: z.string().max(32).optional(),
});

export type CreateTagInput = z.infer<typeof CreateTagInputSchema>;

export const UpdateTagInputSchema = CreateTagInputSchema.partial().extend({
  isApproved: z.boolean().optional(),
});

export type UpdateTagInput = z.infer<typeof UpdateTagInputSchema>;

// ---------------------------------------------------------------------------
// Cuisine
// ---------------------------------------------------------------------------

export const CuisineSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  slug: z.string().min(1),
  iconUrl: z.string().nullable().optional(),
  isApproved: z.boolean(),
});

export type Cuisine = z.infer<typeof CuisineSchema>;

export const CreateCuisineInputSchema = z.object({
  name: z.string().min(1).max(120),
  iconUrl: z.string().url().optional(),
});

export type CreateCuisineInput = z.infer<typeof CreateCuisineInputSchema>;

export const UpdateCuisineInputSchema = CreateCuisineInputSchema.partial().extend({
  isApproved: z.boolean().optional(),
});

export type UpdateCuisineInput = z.infer<typeof UpdateCuisineInputSchema>;
