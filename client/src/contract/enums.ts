/**
 * Shared enums · mirror the Prisma schema enums exactly.
 * DO NOT import from @prisma/client here; this package must work in browsers and React Native.
 * A test in packages/database asserts parity with the generated Prisma enums.
 */

export enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  OWNER = "OWNER",
  STAFF = "STAFF",
  USER = "USER",
  DRIVER = "DRIVER",
}

export enum ApprovalStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export enum ClaimStatus {
  UNCLAIMED = "UNCLAIMED",
  PENDING = "PENDING",
  CLAIMED = "CLAIMED",
}

export enum PriceRange {
  BUDGET = "BUDGET",
  MODERATE = "MODERATE",
  EXPENSIVE = "EXPENSIVE",
  LUXURY = "LUXURY",
}

export enum RestaurantStaffRole {
  WAITER = "WAITER",
  CHEF = "CHEF",
  MANAGER = "MANAGER",
  CASHIER = "CASHIER",
  OTHER = "OTHER",
}

export enum RestaurantStaffStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  PENDING = "PENDING",
}

export enum HoursService {
  ALL = "ALL",
  DINE_IN = "DINE_IN",
  DELIVERY = "DELIVERY",
  TAKEOUT = "TAKEOUT",
}

export enum PayoutStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  PAID = "PAID",
  FAILED = "FAILED",
}

export enum QrThemeLayout {
  PLAIN = "PLAIN",
  CARD = "CARD",
  POSTER = "POSTER",
  TENT = "TENT",
  STICKER = "STICKER",
}

export enum QrTargetType {
  RESTAURANT_PAGE = "RESTAURANT_PAGE",
  MENU = "MENU",
  TABLE_ORDER = "TABLE_ORDER",
}

export enum FeaturedPlacement {
  HOME_HERO = "HOME_HERO",
  HOME_RESTAURANTS = "HOME_RESTAURANTS",
  HOME_MENU_ITEMS = "HOME_MENU_ITEMS",
  CATEGORY_TOP = "CATEGORY_TOP",
  CITY_TOP = "CITY_TOP",
  SEARCH_PROMOTED = "SEARCH_PROMOTED",
}

export enum FeaturedTargetType {
  RESTAURANT = "RESTAURANT",
  MENU_ITEM = "MENU_ITEM",
  COLLECTION = "COLLECTION",
}

export enum ReportType {
  INCORRECT_INFO = "INCORRECT_INFO",
  INAPPROPRIATE_CONTENT = "INAPPROPRIATE_CONTENT",
  DUPLICATE = "DUPLICATE",
  CLOSED_BUSINESS = "CLOSED_BUSINESS",
  SPAM = "SPAM",
  HARASSMENT = "HARASSMENT",
  OTHER = "OTHER",
}

export enum ReportStatus {
  PENDING = "PENDING",
  UNDER_REVIEW = "UNDER_REVIEW",
  RESOLVED = "RESOLVED",
  DISMISSED = "DISMISSED",
}

export enum NotificationType {
  RESTAURANT_APPROVED = "RESTAURANT_APPROVED",
  RESTAURANT_REJECTED = "RESTAURANT_REJECTED",
  RESTAURANT_CLAIM_APPROVED = "RESTAURANT_CLAIM_APPROVED",
  MENU_ITEM_APPROVED = "MENU_ITEM_APPROVED",
  MENU_ITEM_REJECTED = "MENU_ITEM_REJECTED",
  NEW_REVIEW = "NEW_REVIEW",
  REVIEW_REPLY = "REVIEW_REPLY",
  NEW_MESSAGE = "NEW_MESSAGE",
  STAFF_INVITE = "STAFF_INVITE",
  ORDER_PLACED = "ORDER_PLACED",
  ORDER_CONFIRMED = "ORDER_CONFIRMED",
  ORDER_READY = "ORDER_READY",
  ORDER_OUT_FOR_DELIVERY = "ORDER_OUT_FOR_DELIVERY",
  ORDER_DELIVERED = "ORDER_DELIVERED",
  ORDER_CANCELLED = "ORDER_CANCELLED",
  ORDER_REFUNDED = "ORDER_REFUNDED",
  WALLET_CREDITED = "WALLET_CREDITED",
  PAYOUT_PAID = "PAYOUT_PAID",
  PROMO_AVAILABLE = "PROMO_AVAILABLE",
  SYSTEM = "SYSTEM",
}

export enum NotificationChannel {
  IN_APP = "IN_APP",
  EMAIL = "EMAIL",
  SMS = "SMS",
  PUSH = "PUSH",
}

export enum CreditTransactionType {
  TOP_UP = "TOP_UP",
  SPEND = "SPEND",
  REFUND = "REFUND",
  ADJUSTMENT = "ADJUSTMENT",
  BONUS = "BONUS",
  EXPIRY = "EXPIRY",
}

export enum CreditTransactionStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}

export enum OrderType {
  DINE_IN = "DINE_IN",
  PICKUP = "PICKUP",
  DELIVERY = "DELIVERY",
}

export enum OrderStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  PREPARING = "PREPARING",
  READY = "READY",
  OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY",
  DELIVERED = "DELIVERED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  REFUNDED = "REFUNDED",
}

export enum PaymentStatus {
  PENDING = "PENDING",
  AUTHORIZED = "AUTHORIZED",
  PARTIAL = "PARTIAL",
  PAID = "PAID",
  REFUNDED = "REFUNDED",
  PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED",
  FAILED = "FAILED",
}

export enum PaymentMethod {
  CASH = "CASH",
  CARD = "CARD",
  MOBILE_MONEY = "MOBILE_MONEY",
  TELEBIRR = "TELEBIRR",
  CHAPA = "CHAPA",
  BANK_TRANSFER = "BANK_TRANSFER",
  STORE_CREDIT = "STORE_CREDIT",
  GIFT_CARD = "GIFT_CARD",
  OTHER = "OTHER",
}

export enum TransactionType {
  PAYMENT = "PAYMENT",
  REFUND = "REFUND",
  ADJUSTMENT = "ADJUSTMENT",
  TIP = "TIP",
}

export enum DeliveryDriverStatus {
  OFFLINE = "OFFLINE",
  ONLINE = "ONLINE",
  ON_DELIVERY = "ON_DELIVERY",
  BREAK = "BREAK",
}

export enum MediaOwnerType {
  RESTAURANT = "RESTAURANT",
  MENU_ITEM = "MENU_ITEM",
  USER = "USER",
  REVIEW = "REVIEW",
  TEMPLATE = "TEMPLATE",
  QR = "QR",
  DRIVER_DOC = "DRIVER_DOC",
  OTHER = "OTHER",
}

export enum OutboxStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  DONE = "DONE",
  FAILED = "FAILED",
}

export enum WebhookOwnerType {
  PLATFORM = "PLATFORM",
  RESTAURANT = "RESTAURANT",
}

export enum LoyaltyTier {
  BRONZE = "BRONZE",
  SILVER = "SILVER",
  GOLD = "GOLD",
  PLATINUM = "PLATINUM",
}

export enum OrderSource {
  WEB = "WEB",
  MOBILE = "MOBILE",
  ADMIN = "ADMIN",
  API = "API",
  QR_TABLE = "QR_TABLE",
}

export enum ModifierSelectionType {
  SINGLE = "SINGLE",
  MULTI = "MULTI",
}
