import { z } from "zod";

// ── Enums (mirror prisma) ──────────────────────────────────────────────────────

export enum PlanTier {
  FREE = "FREE",
  PAID = "PAID",
}

export enum BillingCycle {
  MONTHLY = "MONTHLY",
  YEARLY = "YEARLY",
}

export enum SubscriptionStatus {
  PENDING_PAYMENT = "PENDING_PAYMENT",
  ACTIVE = "ACTIVE",
  PAUSED = "PAUSED",
  GRACE_PERIOD = "GRACE_PERIOD",
  EXPIRED = "EXPIRED",
  CANCELED = "CANCELED",
}

export enum SubscriptionChargeType {
  NEW = "NEW",
  RENEWAL = "RENEWAL",
  UPGRADE = "UPGRADE",
  DOWNGRADE = "DOWNGRADE",
  PRORATION = "PRORATION",
}

export enum SubscriptionPaymentStatus {
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  CANCELED = "CANCELED",
  REFUNDED = "REFUNDED",
  PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED",
}

export enum InvoiceStatus {
  DRAFT = "DRAFT",
  OPEN = "OPEN",
  PAID = "PAID",
  VOID = "VOID",
  REFUNDED = "REFUNDED",
}

export enum CouponType {
  PERCENTAGE = "PERCENTAGE",
  FIXED = "FIXED",
}

export enum RefundRequestStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  PROCESSED = "PROCESSED",
  FAILED = "FAILED",
}

export enum FeatureType {
  BOOLEAN = "BOOLEAN",
  NUMERIC = "NUMERIC",
}

export enum ChapaChannel {
  TELEBIRR = "TELEBIRR",
  CBE = "CBE",
  AMOLE = "AMOLE",
  EBIRR = "EBIRR",
  MPESA = "MPESA",
  CARD = "CARD",
}

// ── Feature catalog ────────────────────────────────────────────────────────────

export const FeatureDefinitionSchema = z.object({
  id: z.string(),
  key: z.string(),
  label: z.string(),
  description: z.string().nullable().optional(),
  type: z.nativeEnum(FeatureType),
  unit: z.string().nullable().optional(),
  defaultValueBool: z.boolean().nullable().optional(),
  defaultValueNumeric: z.number().int().nullable().optional(),
  isActive: z.boolean(),
  sortOrder: z.number().int(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});
export type FeatureDefinition = z.infer<typeof FeatureDefinitionSchema>;

export const CreateFeatureDefinitionSchema = z.object({
  key: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z][a-z0-9_]*$/, "must be snake_case"),
  label: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.nativeEnum(FeatureType),
  unit: z.string().max(32).optional(),
  defaultValueBool: z.boolean().optional(),
  defaultValueNumeric: z.number().int().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});
export type CreateFeatureDefinitionInput = z.infer<
  typeof CreateFeatureDefinitionSchema
>;

export const UpdateFeatureDefinitionSchema =
  CreateFeatureDefinitionSchema.partial().omit({ key: true });
export type UpdateFeatureDefinitionInput = z.infer<
  typeof UpdateFeatureDefinitionSchema
>;

// ── Plan ───────────────────────────────────────────────────────────────────────

export const PlanPriceSchema = z.object({
  id: z.string(),
  cycle: z.nativeEnum(BillingCycle),
  amountCents: z.number().int().nonnegative(),
  currency: z.string(),
  isActive: z.boolean(),
});
export type PlanPrice = z.infer<typeof PlanPriceSchema>;

export const PlanFeatureValueSchema = z.object({
  id: z.string(),
  featureDefinitionId: z.string(),
  key: z.string(),
  label: z.string(),
  type: z.nativeEnum(FeatureType),
  unit: z.string().nullable().optional(),
  valueBool: z.boolean().nullable().optional(),
  valueNumeric: z.number().int().nullable().optional(),
});
export type PlanFeatureValue = z.infer<typeof PlanFeatureValueSchema>;

export const PlanSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  tier: z.nativeEnum(PlanTier),
  isActive: z.boolean(),
  isPublic: z.boolean(),
  sortOrder: z.number().int(),
  prices: z.array(PlanPriceSchema),
  features: z.array(PlanFeatureValueSchema),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});
export type Plan = z.infer<typeof PlanSchema>;

export const CreatePlanPriceInputSchema = z.object({
  cycle: z.nativeEnum(BillingCycle),
  amountCents: z.number().int().nonnegative(),
  currency: z.string().default("ETB"),
  isActive: z.boolean().default(true),
});
export type CreatePlanPriceInput = z.infer<typeof CreatePlanPriceInputSchema>;

export const CreatePlanInputSchema = z.object({
  code: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[A-Z][A-Z0-9_]*$/, "must be SCREAMING_SNAKE_CASE"),
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  tier: z.nativeEnum(PlanTier),
  isActive: z.boolean().default(true),
  isPublic: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  prices: z.array(CreatePlanPriceInputSchema).default([]),
});
export type CreatePlanInput = z.infer<typeof CreatePlanInputSchema>;

export const UpdatePlanInputSchema = CreatePlanInputSchema.partial().omit({
  code: true,
  prices: true,
});
export type UpdatePlanInput = z.infer<typeof UpdatePlanInputSchema>;

export const SetPlanFeatureValueSchema = z
  .object({
    featureDefinitionId: z.string(),
    valueBool: z.boolean().optional(),
    valueNumeric: z.number().int().optional(),
  })
  .refine((v) => v.valueBool !== undefined || v.valueNumeric !== undefined, {
    message: "must provide valueBool or valueNumeric",
  });
export type SetPlanFeatureValueInput = z.infer<typeof SetPlanFeatureValueSchema>;

// ── Subscription ──────────────────────────────────────────────────────────────

export const SubscriptionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  planId: z.string(),
  plan: PlanSchema.optional(),
  priceId: z.string().nullable().optional(),
  status: z.nativeEnum(SubscriptionStatus),
  cycle: z.nativeEnum(BillingCycle),
  amountCents: z.number().int(),
  currency: z.string(),
  currentPeriodStart: z.string().or(z.date()),
  currentPeriodEnd: z.string().or(z.date()),
  pausedAt: z.string().or(z.date()).nullable().optional(),
  pausedRemainingMs: z.union([z.number(), z.string(), z.bigint()]).nullable().optional(),
  cancelAtPeriodEnd: z.boolean(),
  canceledAt: z.string().or(z.date()).nullable().optional(),
  gracePeriodEndsAt: z.string().or(z.date()).nullable().optional(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});
export type Subscription = z.infer<typeof SubscriptionSchema>;

export const SubscriptionSummarySchema = SubscriptionSchema.extend({
  features: z.array(PlanFeatureValueSchema),
  usage: z.record(z.string(), z.number()),
});
export type SubscriptionSummary = z.infer<typeof SubscriptionSummarySchema>;

export const CheckoutInputSchema = z.object({
  planId: z.string().min(1),
  cycle: z.nativeEnum(BillingCycle),
  couponCode: z.string().trim().toUpperCase().optional(),
  changeBehavior: z.enum(["NEW", "UPGRADE", "DOWNGRADE"]).optional(),
});
export type CheckoutInput = z.infer<typeof CheckoutInputSchema>;

export const CheckoutResultSchema = z.object({
  checkoutUrl: z.string().nullable(),
  txRef: z.string().nullable(),
  subscriptionId: z.string(),
  paymentId: z.string().nullable(),
  invoiceId: z.string().nullable(),
  amountCents: z.number().int().nonnegative(),
  discountCents: z.number().int().nonnegative(),
  prorationCreditCents: z.number().int().nonnegative(),
  forfeitedCreditCents: z.number().int().nonnegative(),
  immediate: z.boolean(),
});
export type CheckoutResult = z.infer<typeof CheckoutResultSchema>;

export const CancelSubscriptionInputSchema = z.object({
  cancelAtPeriodEnd: z.boolean().default(true),
});
export type CancelSubscriptionInput = z.infer<typeof CancelSubscriptionInputSchema>;

// ── Coupon ─────────────────────────────────────────────────────────────────────

export const CouponSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  type: z.nativeEnum(CouponType),
  valuePercent: z.number().int().nullable().optional(),
  valueAmountCents: z.number().int().nullable().optional(),
  currency: z.string(),
  maxRedemptions: z.number().int(),
  redeemedCount: z.number().int(),
  perUserLimit: z.number().int(),
  minSubtotalCents: z.number().int().nullable().optional(),
  appliesToPlanIds: z.array(z.string()),
  appliesToCycles: z.array(z.string()),
  validFrom: z.string().or(z.date()).nullable().optional(),
  validUntil: z.string().or(z.date()).nullable().optional(),
  isActive: z.boolean(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});
export type Coupon = z.infer<typeof CouponSchema>;

export const CreateCouponInputSchema = z
  .object({
    code: z
      .string()
      .min(3)
      .max(32)
      .transform((s) => s.toUpperCase()),
    name: z.string().min(1).max(120),
    description: z.string().max(500).optional(),
    type: z.nativeEnum(CouponType),
    valuePercent: z.number().int().min(1).max(100).optional(),
    valueAmountCents: z.number().int().positive().optional(),
    currency: z.string().default("ETB"),
    maxRedemptions: z.number().int().positive(),
    perUserLimit: z.number().int().positive().default(1),
    minSubtotalCents: z.number().int().nonnegative().optional(),
    appliesToPlanIds: z.array(z.string()).default([]),
    appliesToCycles: z.array(z.nativeEnum(BillingCycle)).default([]),
    validFrom: z.string().datetime().optional(),
    validUntil: z.string().datetime().optional(),
    isActive: z.boolean().default(true),
  })
  .superRefine((v, ctx) => {
    if (v.type === CouponType.PERCENTAGE && !v.valuePercent) {
      ctx.addIssue({
        path: ["valuePercent"],
        code: z.ZodIssueCode.custom,
        message: "valuePercent required for PERCENTAGE coupons",
      });
    }
    if (v.type === CouponType.FIXED && !v.valueAmountCents) {
      ctx.addIssue({
        path: ["valueAmountCents"],
        code: z.ZodIssueCode.custom,
        message: "valueAmountCents required for FIXED coupons",
      });
    }
  });
export type CreateCouponInput = z.infer<typeof CreateCouponInputSchema>;

export const UpdateCouponInputSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional(),
  maxRedemptions: z.number().int().positive().optional(),
  perUserLimit: z.number().int().positive().optional(),
  minSubtotalCents: z.number().int().nonnegative().optional(),
  appliesToPlanIds: z.array(z.string()).optional(),
  appliesToCycles: z.array(z.nativeEnum(BillingCycle)).optional(),
  validFrom: z.string().datetime().nullable().optional(),
  validUntil: z.string().datetime().nullable().optional(),
  isActive: z.boolean().optional(),
});
export type UpdateCouponInput = z.infer<typeof UpdateCouponInputSchema>;

export const ValidateCouponInputSchema = z.object({
  code: z
    .string()
    .min(1)
    .transform((s) => s.toUpperCase()),
  planId: z.string(),
  cycle: z.nativeEnum(BillingCycle),
});
export type ValidateCouponInput = z.infer<typeof ValidateCouponInputSchema>;

export const ValidateCouponResultSchema = z.object({
  valid: z.boolean(),
  reason: z.string().nullable().optional(),
  discountCents: z.number().int().nonnegative(),
  finalAmountCents: z.number().int().nonnegative(),
  coupon: CouponSchema.nullable().optional(),
});
export type ValidateCouponResult = z.infer<typeof ValidateCouponResultSchema>;

// ── Invoice ────────────────────────────────────────────────────────────────────

export const InvoiceLineItemSchema = z.object({
  id: z.string(),
  description: z.string(),
  quantity: z.number().int(),
  unitAmountCents: z.number().int(),
  amountCents: z.number().int(),
  sortOrder: z.number().int(),
});
export type InvoiceLineItem = z.infer<typeof InvoiceLineItemSchema>;

export const InvoiceSchema = z.object({
  id: z.string(),
  number: z.string(),
  subscriptionId: z.string().nullable().optional(),
  userId: z.string(),
  status: z.nativeEnum(InvoiceStatus),
  subtotalCents: z.number().int(),
  discountCents: z.number().int(),
  taxCents: z.number().int(),
  totalCents: z.number().int(),
  currency: z.string(),
  cycle: z.nativeEnum(BillingCycle).nullable().optional(),
  periodStart: z.string().or(z.date()).nullable().optional(),
  periodEnd: z.string().or(z.date()).nullable().optional(),
  dueDate: z.string().or(z.date()).nullable().optional(),
  issuedAt: z.string().or(z.date()),
  paidAt: z.string().or(z.date()).nullable().optional(),
  voidedAt: z.string().or(z.date()).nullable().optional(),
  billingAddress: z.unknown().nullable().optional(),
  lineItems: z.array(InvoiceLineItemSchema).optional(),
  createdAt: z.string().or(z.date()),
});
export type Invoice = z.infer<typeof InvoiceSchema>;

// ── Refunds ────────────────────────────────────────────────────────────────────

export const RefundRequestSchema = z.object({
  id: z.string(),
  subscriptionId: z.string(),
  paymentId: z.string(),
  userId: z.string(),
  amountCents: z.number().int(),
  reason: z.string(),
  status: z.nativeEnum(RefundRequestStatus),
  adminNotes: z.string().nullable().optional(),
  decidedById: z.string().nullable().optional(),
  decidedAt: z.string().or(z.date()).nullable().optional(),
  refundedAmountCents: z.number().int().nullable().optional(),
  providerRefundId: z.string().nullable().optional(),
  processedAt: z.string().or(z.date()).nullable().optional(),
  createdAt: z.string().or(z.date()),
});
export type RefundRequest = z.infer<typeof RefundRequestSchema>;

export const CreateRefundRequestSchema = z.object({
  paymentId: z.string(),
  amountCents: z.number().int().positive(),
  reason: z.string().min(10).max(2000),
});
export type CreateRefundRequestInput = z.infer<typeof CreateRefundRequestSchema>;

export const DecideRefundRequestSchema = z.object({
  amountCents: z.number().int().positive().optional(),
  adminNotes: z.string().max(2000).optional(),
});
export type DecideRefundRequestInput = z.infer<typeof DecideRefundRequestSchema>;

export const MarkRefundProcessedSchema = z.object({
  providerRefundId: z.string().min(1),
  refundedAmountCents: z.number().int().positive(),
  adminNotes: z.string().max(2000).optional(),
});
export type MarkRefundProcessedInput = z.infer<typeof MarkRefundProcessedSchema>;

// ── Channels ──────────────────────────────────────────────────────────────────

export const PaymentChannelConfigSchema = z.object({
  id: z.string(),
  channel: z.nativeEnum(ChapaChannel),
  displayName: z.string(),
  isEnabled: z.boolean(),
  sortOrder: z.number().int(),
});
export type PaymentChannelConfig = z.infer<typeof PaymentChannelConfigSchema>;

export const UpdatePaymentChannelInputSchema = z.object({
  displayName: z.string().min(1).max(60).optional(),
  isEnabled: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});
export type UpdatePaymentChannelInput = z.infer<
  typeof UpdatePaymentChannelInputSchema
>;

// ── Settings ──────────────────────────────────────────────────────────────────

export const BillingSettingsSchema = z.object({
  gracePeriodDays: z.number().int(),
  maxRefundDays: z.number().int(),
  renewalReminderDays: z.number().int(),
  invoiceNumberPrefix: z.string(),
  invoiceSequence: z.number().int(),
  defaultCurrency: z.string(),
  platformName: z.string(),
  platformAddress: z.unknown().nullable().optional(),
  billingEmail: z.string().nullable().optional(),
});
export type BillingSettings = z.infer<typeof BillingSettingsSchema>;

export const UpdateBillingSettingsSchema = z.object({
  gracePeriodDays: z.number().int().min(0).max(30).optional(),
  maxRefundDays: z.number().int().min(0).max(365).optional(),
  renewalReminderDays: z.number().int().min(0).max(30).optional(),
  invoiceNumberPrefix: z.string().max(16).optional(),
  defaultCurrency: z.string().length(3).optional(),
  platformName: z.string().max(120).optional(),
  platformAddress: z.unknown().optional(),
  billingEmail: z.string().email().nullable().optional(),
});
export type UpdateBillingSettingsInput = z.infer<
  typeof UpdateBillingSettingsSchema
>;

// ── Admin overview ─────────────────────────────────────────────────────────────

export const BillingOverviewSchema = z.object({
  mrrCents: z.number().int(),
  arrCents: z.number().int(),
  activeSubscriptions: z.number().int(),
  pausedSubscriptions: z.number().int(),
  gracePeriodSubscriptions: z.number().int(),
  expiredSubscriptions: z.number().int(),
  newSubscriptions7d: z.number().int(),
  newSubscriptions30d: z.number().int(),
  revenue7dCents: z.number().int(),
  revenue30dCents: z.number().int(),
  pendingRefundRequests: z.number().int(),
  topPlans: z.array(
    z.object({ planId: z.string(), name: z.string(), count: z.number().int() }),
  ),
});
export type BillingOverview = z.infer<typeof BillingOverviewSchema>;
