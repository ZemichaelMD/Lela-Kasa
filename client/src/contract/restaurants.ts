import { z } from 'zod';

import { ApprovalStatus, HoursService, PaymentMethod, PriceRange } from './enums';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const RestaurantOpeningHoursSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  opensAt: z.string().regex(TIME_PATTERN, 'Expected HH:mm'),
  closesAt: z.string().regex(TIME_PATTERN, 'Expected HH:mm'),
  isClosed: z.boolean().optional(),
  service: z.nativeEnum(HoursService).optional(),
});

export type RestaurantOpeningHours = z.infer<typeof RestaurantOpeningHoursSchema>;

export const RestaurantSpecialHoursSchema = z
  .object({
    date: z.string().regex(DATE_PATTERN, 'Expected YYYY-MM-DD'),
    isClosed: z.boolean().default(false),
    opensAt: z.string().regex(TIME_PATTERN, 'Expected HH:mm').optional(),
    closesAt: z.string().regex(TIME_PATTERN, 'Expected HH:mm').optional(),
    service: z.nativeEnum(HoursService).optional(),
    note: z.string().trim().max(240).optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.isClosed && (!value.opensAt || !value.closesAt)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'opensAt and closesAt are required when isClosed=false',
      });
    }
  });

export type RestaurantSpecialHours = z.infer<typeof RestaurantSpecialHoursSchema>;

export const RestaurantCuisineRefSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  slug: z.string().min(1),
  iconUrl: z.string().nullable().optional(),
  isPrimary: z.boolean().default(false),
});

export type RestaurantCuisineRef = z.infer<typeof RestaurantCuisineRefSchema>;

export const RestaurantPublicSummarySchema = z.object({
  id: z.number().int().positive(),
  slug: z.string().min(1),
  name: z.string().min(1),
  shortDescription: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  neighborhood: z.string().nullable().optional(),
  priceRange: z.nativeEnum(PriceRange).nullable().optional(),
  ratingAvg: z.number(),
  ratingCount: z.number().int().nonnegative(),
  coverImageUrl: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  cuisineTypes: z.array(z.string()),
  cuisines: z.array(RestaurantCuisineRefSchema).default([]),
  isVerified: z.boolean(),
  isFeatured: z.boolean(),
  deliveryAvailable: z.boolean(),
});

export type RestaurantPublicSummary = z.infer<typeof RestaurantPublicSummarySchema>;

export const RestaurantPublicDetailSchema = RestaurantPublicSummarySchema.extend({
  description: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  whatsapp: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  addressLine2: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  googleMapsUrl: z.string().nullable().optional(),
  timezone: z.string(),
  images: z.array(z.string()),
  socialLinks: z.record(z.string(), z.string()).nullable().optional(),
  amenities: z.array(z.string()),
  paymentMethodsAccepted: z.array(z.nativeEnum(PaymentMethod)),
  openingHours: z.array(RestaurantOpeningHoursSchema),
  specialHours: z.array(RestaurantSpecialHoursSchema),
});

export type RestaurantPublicDetail = z.infer<typeof RestaurantPublicDetailSchema>;

export const RestaurantListQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  city: z.string().trim().min(1).optional(),
  region: z.string().trim().min(1).optional(),
  featured: z.coerce.boolean().optional(),
  verified: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type RestaurantListQuery = z.infer<typeof RestaurantListQuerySchema>;

export const CreateRestaurantInputSchema = z.object({
  /**
   * Required when an admin creates a restaurant on behalf of an owner.
   * Ignored for non-admin creators (they always become the owner themselves).
   */
  ownerId: z.string().min(1).optional(),
  name: z.string().trim().min(2).max(160),
  shortDescription: z.string().trim().max(240).optional(),
  description: z.string().trim().max(10000).optional(),
  phone: z.string().trim().max(32).optional(),
  whatsapp: z.string().trim().max(32).optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  address: z.string().trim().max(240).optional(),
  addressLine2: z.string().trim().max(240).optional(),
  city: z.string().trim().max(100).optional(),
  region: z.string().trim().max(100).optional(),
  postalCode: z.string().trim().max(20).optional(),
  country: z.string().trim().max(100).optional(),
  neighborhood: z.string().trim().max(100).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  googleMapsUrl: z.string().url().optional(),
  timezone: z.string().min(1).max(80).optional(),
  priceRange: z.nativeEnum(PriceRange).optional(),
  coverImageUrl: z.string().url().optional(),
  logoUrl: z.string().url().optional(),
  images: z.array(z.string()).optional(),
  cuisineTypes: z.array(z.string()).optional(),
  cuisineIds: z.array(z.number().int().positive()).optional(),
  amenities: z.array(z.string()).optional(),
  socialLinks: z.record(z.string(), z.string()).optional(),
  paymentMethodsAccepted: z.array(z.nativeEnum(PaymentMethod)).optional(),
  deliveryAvailable: z.boolean().optional(),
  takeoutAvailable: z.boolean().optional(),
  reservationsAvailable: z.boolean().optional(),
  parkingAvailable: z.boolean().optional(),
  openingHours: z.array(RestaurantOpeningHoursSchema).optional(),
  specialHours: z.array(RestaurantSpecialHoursSchema).optional(),
});

export type CreateRestaurantInput = z.infer<typeof CreateRestaurantInputSchema>;

export const UpdateRestaurantInputSchema = CreateRestaurantInputSchema.partial().extend({
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isVerified: z.boolean().optional(),
});

export type UpdateRestaurantInput = z.infer<typeof UpdateRestaurantInputSchema>;

export const ApproveRestaurantInputSchema = z.object({
  approved: z.boolean(),
  rejectionReason: z.string().trim().max(500).optional(),
});

export type ApproveRestaurantInput = z.infer<typeof ApproveRestaurantInputSchema>;

export const RestaurantAdminSchema = RestaurantPublicDetailSchema.extend({
  approvalStatus: z.nativeEnum(ApprovalStatus),
  rejectionReason: z.string().nullable().optional(),
  claimStatus: z.string(),
  isActive: z.boolean(),
});

export type RestaurantAdmin = z.infer<typeof RestaurantAdminSchema>;
