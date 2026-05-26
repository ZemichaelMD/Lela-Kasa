import { API_URL as SDK_API_URL } from "./sdk";

export const API_URL = SDK_API_URL;
export const APP_NAME: string = import.meta.env.VITE_APP_NAME ?? "LeLa Kasa";

export type ApprovalStatus = "APPROVED" | "PENDING" | "REJECTED";
export type PriceRange = "BUDGET" | "MODERATE" | "EXPENSIVE" | "LUXURY";

export interface AdminRestaurant {
  id: number;
  slug: string;
  name: string;
  city: string;
  neighborhood: string;
  shortDescription?: string | null;
  description?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  addressLine2?: string | null;
  region?: string | null;
  postalCode?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  googleMapsUrl?: string | null;
  timezone?: string | null;
  coverImageUrl?: string | null;
  logoUrl?: string | null;
  images?: string[];
  cuisines: string[];
  /** Model-backed cuisine refs (with ids), when present. Editors read this. */
  cuisineRefs?: Array<{
    id: number;
    name: string;
    slug: string;
    iconUrl?: string | null;
    isPrimary: boolean;
  }>;
  priceRange: PriceRange;
  cuisineTypes?: string[];
  amenities?: string[];
  paymentMethodsAccepted?: string[];
  socialLinks?: Record<string, string> | null;
  rating: number;
  ratingCount: number;
  menuItemCount: number;
  approvalStatus: ApprovalStatus;
  isFeatured: boolean;
  isVerified: boolean;
  deliveryAvailable?: boolean;
  takeoutAvailable?: boolean;
  reservationsAvailable?: boolean;
  parkingAvailable?: boolean;
  openingHours?: unknown[];
  specialHours?: unknown[];
  views30d: number;
  ownerId?: string;
  ownerName: string;
  tagIds?: number[];
  claimStatus?: string;
  rejectionReason?: string | null;
  isActive?: boolean;
  createdAt: string;
}

export interface AdminMenuItem {
  id: number;
  name: string;
  restaurant: string;
  section: string;
  priceCents: number;
  compareAtPriceCents?: number | null;
  imageUrl?: string | null;
  images?: string[];
  sortOrder?: number;
  approvalStatus: ApprovalStatus;
  isAvailable: boolean;
  isOutOfStock?: boolean;
  stockQuantity?: number | null;
  isFeatured?: boolean;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  isHalal?: boolean;
  isSpicy?: boolean;
  spiceLevel?: number | null;
  preparationTime?: number | null;
  calories?: number | null;
  servingSize?: string | null;
  allergens?: string[];
  dietaryTags?: string[];
  rejectionReason?: string | null;
  ratingAvg?: number;
  ratingCount?: number;
  orderCount?: number;
  dietary: string[];
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: "SUPER_ADMIN" | "OWNER" | "STAFF" | "USER" | "DRIVER";
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
}

// ─── Sample data (dashboard only) ───────────────────────────────────────────

export const SAMPLE_USERS: AdminUser[] = [
  {
    id: "usr_1",
    name: "Selam Tadesse",
    email: "selam@abyssinia.example",
    role: "OWNER",
    isActive: true,
    emailVerified: true,
    createdAt: "2025-09-12",
  },
  {
    id: "usr_2",
    name: "Dawit Bekele",
    email: "dawit@lucylounge.example",
    role: "OWNER",
    isActive: true,
    emailVerified: true,
    createdAt: "2025-10-03",
  },
  {
    id: "usr_3",
    name: "Hana Girma",
    email: "hana@tomoca.example",
    role: "OWNER",
    isActive: true,
    emailVerified: true,
    createdAt: "2025-08-21",
  },
  {
    id: "usr_4",
    name: "Bereket Solomon",
    email: "bereket@abyssinia.example",
    role: "STAFF",
    isActive: true,
    emailVerified: true,
    createdAt: "2025-09-20",
  },
  {
    id: "usr_5",
    name: "Tigist Fikru",
    email: "tigist.f@example.com",
    role: "USER",
    isActive: true,
    emailVerified: true,
    createdAt: "2025-12-01",
  },
  {
    id: "usr_6",
    name: "Robel Asfaw",
    email: "robel.driver@example.com",
    role: "DRIVER",
    isActive: true,
    emailVerified: true,
    createdAt: "2026-01-14",
  },
  {
    id: "usr_7",
    name: "Eden Tesfaye",
    email: "eden.t@example.com",
    role: "USER",
    isActive: false,
    emailVerified: false,
    createdAt: "2026-03-02",
  },
  {
    id: "usr_8",
    name: "Admin",
    email: "admin@kasa.example",
    role: "SUPER_ADMIN",
    isActive: true,
    emailVerified: true,
    createdAt: "2025-08-01",
  },
];

// Kept for dashboard activity feed only
export const SAMPLE_MENU_ITEMS: AdminMenuItem[] = [];

export const RECENT_ACTIVITY: Array<{
  when: string;
  actor: string;
  action: string;
}> = [
  {
    when: "2 min ago",
    actor: "Liya Worku",
    action: 'submitted "Enset Garden" for approval',
  },
  { when: "18 min ago", actor: "Hana Girma", action: "replied to a 4★ review" },
  {
    when: "1 h ago",
    actor: "Dawit Bekele",
    action: 'updated the menu for "Lucy Lounge & Grill"',
  },
  {
    when: "3 h ago",
    actor: "Admin",
    action: 'approved menu item "Cardamom Panna Cotta"',
  },
  {
    when: "Yesterday",
    actor: "Marta Alemu",
    action: 'created restaurant "Shola Street Food"',
  },
];

export function formatBirr(cents: number): string {
  return `Br ${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export const PRICE_LABEL: Record<PriceRange, string> = {
  BUDGET: "$",
  MODERATE: "$$",
  EXPENSIVE: "$$$",
  LUXURY: "$$$$",
};

// ─── API data fetchers ───────────────────────────────────────────────────────

export function mapApiRestaurant(r: Record<string, unknown>): AdminRestaurant {
  // `r.cuisines` is now the model-backed shape: `{id, name, slug, iconUrl, isPrimary}[]`.
  // Older clients/screens still treat AdminRestaurant.cuisines as a string[] of
  // display names, so flatten to names here. Legacy string arrays still work.
  const rawCuisines = Array.isArray(r.cuisines)
    ? (r.cuisines as unknown[])
    : [];
  const cuisineRefs = rawCuisines
    .map((c) => {
      if (c && typeof c === "object" && "id" in c && "name" in c) {
        const obj = c as Record<string, unknown>;
        const id = typeof obj.id === "number" ? obj.id : null;
        const name = typeof obj.name === "string" ? obj.name : null;
        const slug = typeof obj.slug === "string" ? obj.slug : "";
        const iconUrl = typeof obj.iconUrl === "string" ? obj.iconUrl : null;
        const isPrimary = !!obj.isPrimary;
        return id != null && name
          ? { id, name, slug, iconUrl, isPrimary }
          : null;
      }
      return null;
    })
    .filter(
      (
        c,
      ): c is {
        id: number;
        name: string;
        slug: string;
        iconUrl: string | null;
        isPrimary: boolean;
      } => c !== null,
    );
  const cuisines =
    cuisineRefs.length > 0
      ? cuisineRefs.map((c) => c.name)
      : rawCuisines.filter((c): c is string => typeof c === "string");
  const dietaryTags = Array.isArray(r.dietaryTags)
    ? (r.dietaryTags as string[])
    : [];
  return {
    id: (r.id as number) ?? 0,
    slug: (r.slug as string) ?? "",
    name: (r.name as string) ?? "",
    city: (r.city as string) ?? "·",
    neighborhood: (r.neighborhood as string) ?? "·",
    shortDescription: (r.shortDescription as string) ?? null,
    description: (r.description as string) ?? null,
    phone: (r.phone as string) ?? null,
    whatsapp: (r.whatsapp as string) ?? null,
    email: (r.email as string) ?? null,
    website: (r.website as string) ?? null,
    address: (r.address as string) ?? null,
    addressLine2: (r.addressLine2 as string) ?? null,
    region: (r.region as string) ?? null,
    postalCode: (r.postalCode as string) ?? null,
    country: (r.country as string) ?? null,
    latitude: typeof r.latitude === "number" ? r.latitude : null,
    longitude: typeof r.longitude === "number" ? r.longitude : null,
    googleMapsUrl: (r.googleMapsUrl as string) ?? null,
    timezone: (r.timezone as string) ?? null,
    coverImageUrl: (r.coverImageUrl as string) ?? null,
    logoUrl: (r.logoUrl as string) ?? null,
    images: Array.isArray(r.images) ? (r.images as string[]) : [],
    cuisines: cuisines.length ? cuisines : dietaryTags,
    cuisineRefs: cuisineRefs.length > 0 ? cuisineRefs : undefined,
    priceRange: (r.priceRange as PriceRange) ?? "MODERATE",
    cuisineTypes: Array.isArray(r.cuisineTypes)
      ? (r.cuisineTypes as string[])
      : [],
    amenities: Array.isArray(r.amenities) ? (r.amenities as string[]) : [],
    paymentMethodsAccepted: Array.isArray(r.paymentMethodsAccepted)
      ? (r.paymentMethodsAccepted as string[])
      : [],
    socialLinks:
      r.socialLinks &&
      typeof r.socialLinks === "object" &&
      !Array.isArray(r.socialLinks)
        ? (r.socialLinks as Record<string, string>)
        : null,
    rating: (r.ratingAvg as number) ?? 0,
    ratingCount: (r.ratingCount as number) ?? 0,
    menuItemCount: (r.menuItemCount as number) ?? 0,
    approvalStatus: (r.approvalStatus as ApprovalStatus) ?? "PENDING",
    isFeatured: (r.isFeatured as boolean) ?? false,
    isVerified: (r.isVerified as boolean) ?? false,
    deliveryAvailable: (r.deliveryAvailable as boolean) ?? false,
    takeoutAvailable: (r.takeoutAvailable as boolean) ?? false,
    reservationsAvailable: (r.reservationsAvailable as boolean) ?? false,
    parkingAvailable: (r.parkingAvailable as boolean) ?? false,
    openingHours: Array.isArray(r.openingHours) ? r.openingHours : [],
    specialHours: Array.isArray(r.specialHours) ? r.specialHours : [],
    views30d: (r.views30d as number) ?? 0,
    ownerId: (r.ownerId as string) ?? undefined,
    ownerName: (r.ownerName as string) ?? "·",
    tagIds: Array.isArray(r.tagIds) ? (r.tagIds as number[]) : [],
    claimStatus: (r.claimStatus as string) ?? undefined,
    rejectionReason: (r.rejectionReason as string) ?? null,
    isActive: (r.isActive as boolean) ?? undefined,
    createdAt: typeof r.createdAt === "string" ? r.createdAt : "·",
  };
}

export interface FetchRestaurantsParams {
  q?: string;
  approvalStatus?: string[];
  featured?: boolean;
  verified?: boolean;
  priceRanges?: string[];
  ratingMin?: number;
  sort?: string;
  limit?: number;
  offset?: number;
}

/** All restaurants · not supported in the LeLa Kasa SDK (legacy stub). */
export async function fetchRestaurants(
  _params: FetchRestaurantsParams = {},
): Promise<{ items: AdminRestaurant[]; total: number }> {
  return { items: [], total: 0 };
}

/** All menu items · not supported in the LeLa Kasa SDK (legacy stub). */
export async function fetchMenuItems(): Promise<AdminMenuItem[]> {
  return [];
}
