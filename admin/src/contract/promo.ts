// Enums
export enum CampaignKind {
  OPEN_CLAIM = "OPEN_CLAIM",
  CHECKLIST = "CHECKLIST",
  DRAW = "DRAW",
  FIRST_N = "FIRST_N",
}

export enum CampaignStatus {
  DRAFT = "DRAFT",
  SCHEDULED = "SCHEDULED",
  LIVE = "LIVE",
  PAUSED = "PAUSED",
  ENDED = "ENDED",
  ARCHIVED = "ARCHIVED",
}

export enum CampaignRewardType {
  FREE_ITEM = "FREE_ITEM",
  PERCENT_DISCOUNT = "PERCENT_DISCOUNT",
  FIXED_DISCOUNT = "FIXED_DISCOUNT",
  FREE_DELIVERY = "FREE_DELIVERY",
  GIFT_CARD_CREDIT = "GIFT_CARD_CREDIT",
}

export enum GiftCardStatus {
  ACTIVE = "ACTIVE",
  PARTIALLY_REDEEMED = "PARTIALLY_REDEEMED",
  FULLY_REDEEMED = "FULLY_REDEEMED",
  EXPIRED = "EXPIRED",
  DISABLED = "DISABLED",
  REFUNDED = "REFUNDED",
}

export enum GiftCardSource {
  PURCHASE = "PURCHASE",
  ADMIN_GRANT = "ADMIN_GRANT",
  CAMPAIGN_REWARD = "CAMPAIGN_REWARD",
  REFUND_CREDIT = "REFUND_CREDIT",
}

export enum PromoApprovalStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export enum PromoMonetizationEventType {
  CAMPAIGN_CREATED = "CAMPAIGN_CREATED",
  CAMPAIGN_APPROVED = "CAMPAIGN_APPROVED",
  CAMPAIGN_LAUNCHED = "CAMPAIGN_LAUNCHED",
  CODE_ISSUED = "CODE_ISSUED",
  CODE_REDEEMED = "CODE_REDEEMED",
  CODE_VOIDED = "CODE_VOIDED",
  DRAW_EXECUTED = "DRAW_EXECUTED",
  GIFT_CARD_PURCHASED = "GIFT_CARD_PURCHASED",
  GIFT_CARD_REDEEMED = "GIFT_CARD_REDEEMED",
  FEATURED_PURCHASED = "FEATURED_PURCHASED",
  FEATURED_GO_LIVE = "FEATURED_GO_LIVE",
  FEATURED_EXPIRED = "FEATURED_EXPIRED",
  USAGE_LIMIT_HIT = "USAGE_LIMIT_HIT",
  ENTITLEMENT_DENIED = "ENTITLEMENT_DENIED",
}

// Types
export interface Campaign {
  id: string;
  name: string;
  publicTitle: string;
  kind: CampaignKind;
  status: CampaignStatus;
  rewardType: CampaignRewardType;
  approvalStatus: PromoApprovalStatus;
  restaurantId?: number;
  restaurantName?: string;
  startsAt: string;
  endsAt: string;
  issuedCount: number;
  redeemedCount: number;
  budgetMaxCodes?: number;
  createdAt: string;
}

export interface CampaignDetail extends Campaign {
  publicDescription?: string;
  heroImageUrl?: string;
  rules: CampaignRule[];
  drawAt?: string;
  drawWinnersCount?: number;
  firstNLimit?: number;
}

export interface CampaignRule {
  id: string;
  type: string;
  paramInt?: number;
  paramString?: string;
}

export interface CampaignCode {
  id: string;
  code: string;
  codeFormatted: string;
  status: string;
  issuedToUserId?: string;
  issuedAt?: string;
  redeemedAt?: string;
  expiresAt?: string;
}

export interface CampaignEntry {
  id: string;
  userId: string;
  status: string;
  createdAt: string;
  eligibilitySnapshot?: unknown;
}

export interface GiftCard {
  id: string;
  code: string;
  kind: string;
  restaurantId?: number;
  restaurantName?: string;
  initialBalanceCents: number;
  balanceCents: number;
  status: GiftCardStatus;
  source: GiftCardSource;
  expiresAt?: string;
  recipientEmail?: string;
  createdAt: string;
}

export interface GiftCardTransaction {
  id: string;
  type: string;
  amountCents: number;
  balanceAfterCents: number;
  createdAt: string;
  reason?: string;
}

export interface GiftCardPurchase {
  id: string;
  buyerEmail: string;
  amountCents: number;
  totalChargedCents: number;
  status: string;
  paidAt?: string;
  restaurantId?: number;
}

export interface GiftCardDesign {
  id: string;
  key: string;
  name: string;
  previewImageUrl: string;
  isActive: boolean;
  isSystem: boolean;
  restaurantId?: number;
}

export interface PromoEvent {
  id: string;
  eventType: PromoMonetizationEventType;
  restaurantId?: number;
  campaignId?: string;
  giftCardId?: string;
  featuredPurchaseId?: string;
  payload?: unknown;
  createdAt: string;
}

export interface AdminGrantGiftCardInput {
  amountCents: number;
  restaurantId?: number;
  issuedToUserId: string;
  reason: string;
  expiryDays?: number;
}

export interface GiftCardSettings {
  processingFeeBps: number;
  platformFeeBps: number;
  defaultExpiryDays: number;
  minAmountCents: number;
  maxAmountCents: number;
  regulatoryText?: string;
}

// ── Featured Marketplace ───────────────────────────────────────────────────────

export enum PromoFeaturedPlacement {
  HOME_HERO = "HOME_HERO",
  HOME_RESTAURANTS = "HOME_RESTAURANTS",
  HOME_MENU_ITEMS = "HOME_MENU_ITEMS",
  CATEGORY_TOP = "CATEGORY_TOP",
  CITY_TOP = "CITY_TOP",
  SEARCH_PROMOTED = "SEARCH_PROMOTED",
}

export enum FeaturedPurchaseStatus {
  PENDING_PAYMENT = "PENDING_PAYMENT",
  PAID = "PAID",
  ACTIVE = "ACTIVE",
  EXPIRED = "EXPIRED",
  CANCELED = "CANCELED",
  REFUNDED = "REFUNDED",
}

export enum FeaturedInventoryStatus {
  ACTIVE = "ACTIVE",
  ARCHIVED = "ARCHIVED",
}

export interface FeaturedInventory {
  id: string;
  placement: PromoFeaturedPlacement;
  name: string;
  city?: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  basePriceCents: number;
  status: FeaturedInventoryStatus;
  autoApprove: boolean;
  isVisible: boolean;
  createdAt: string;
}

export interface FeaturedPurchase {
  id: string;
  inventoryId: string;
  restaurantId: number;
  restaurantName?: string;
  status: FeaturedPurchaseStatus;
  approvalStatus: PromoApprovalStatus;
  totalChargedCents: number;
  paidAt?: string;
  windowStartsAt: string;
  windowEndsAt: string;
  placement?: PromoFeaturedPlacement;
  title?: string;
  imageUrl?: string;
}

export interface FeaturedSlot {
  id: string;
  placement: PromoFeaturedPlacement;
  restaurantId?: number;
  title?: string;
  imageUrl?: string;
  isActive: boolean;
  isSponsored: boolean;
  source: string;
  startsAt?: string;
  endsAt?: string;
  impressionsCount: number;
  clicksCount: number;
}

export interface FeaturedSettings {
  defaultReviewSlaHours: number;
  priorityReviewSlaHours: number;
}

export interface CreateFeaturedInventoryInput {
  placement: PromoFeaturedPlacement;
  name: string;
  description?: string;
  city?: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  basePriceCents: number;
  autoApprove: boolean;
  eligiblePlanCodes: string[];
  isVisible: boolean;
}

export interface FeaturedAnalytics {
  revenueByPlacement: Array<{
    placement: PromoFeaturedPlacement;
    revenueCents: number;
    soldSlots: number;
    totalSlots: number;
  }>;
  topSpenders: Array<{
    restaurantId: number;
    restaurantName?: string;
    totalSpentCents: number;
  }>;
}
