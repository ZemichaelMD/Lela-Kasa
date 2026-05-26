/**
 * @kasa/database — re-exports Prisma client and all model/enum types
 * for the LeLa Kasa beverage shop platform.
 * Import from the local `src/database` module instead of the generated path directly.
 */

export { PrismaClient, Prisma } from "../../prisma/generated/index";

// ── Model types ───────────────────────────────────────────────────────────────
export type {
  // Identity & tenancy
  User,
  Session,
  PasswordResetToken,
  EmailVerificationToken,
  Shop,
  ShopSetting,
  // Master data
  Customer,
  Beverage,
  PriceTier,
  BeveragePrice,
  PaymentAccount,
  // Sales
  Sale,
  SaleLine,
  Payment,
  // Stock
  StockMovement,
  // Audit
  AuditLog,
  // Orders
  CustomerOrder,
  CustomerOrderLine,
} from "../../prisma/generated/index";

// ── Enum values ───────────────────────────────────────────────────────────────
export {
  UserRole,
  SaleStatus,
  PaymentMethod,
  PaymentAccountKind,
  PriceTierKind,
  StockMovementReason,
  OrderStatus,
} from "../../prisma/generated/index";
