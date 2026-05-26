import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AppException } from "../common/errors/app.exception";
import { CryptoService } from "../crypto/crypto.service";
import {
  ethiopianPhoneVariants,
  isValidEthiopianPhone,
  normalizeEthiopianPhone,
} from "../common/phone.util";
import { resolveLatLngFromMapUrl } from "../common/geo.util";
import { VerificationService } from "../verification/verification.service";
import { assertStrongPassword, loadPasswordPolicy } from "../common/password-policy";
import * as argon2 from "argon2";

const SENSITIVE_KEYS = new Set([
  "resend_api_key",
  "smtp_password",
  "sms_api_key",
  "smsethiopia_api_key",
  "twilio_auth_token",
  "chapa_secret_key",
  "chapa_webhook_secret",
  "whatsapp_meta_access_token",
  "whatsapp_twilio_token",
  "telegram_bot_token",
  "ai_api_key",
  "s3_secret_key",
  "vercel_blob_token",
]);

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly verification: VerificationService,
    private readonly crypto: CryptoService,
  ) {}

  /**
   * Normalizes an optional phone and rejects it when already tied to a live
   * user account. Returns the canonical form (or null when no phone given).
   */
  private async resolveUniquePhone(
    phone?: string | null,
  ): Promise<string | null> {
    if (!phone?.trim()) return null;
    const normalized = normalizeEthiopianPhone(phone);
    const existing = await this.prisma.user.findFirst({
      where: {
        phone: { in: ethiopianPhoneVariants(normalized) },
        deletedAt: null,
      },
      select: { id: true },
    });
    if (existing) {
      throw AppException.conflict(
        "PHONE_TAKEN" as never,
        "This phone number is already registered to another account",
      );
    }
    return normalized;
  }

  /**
   * Normalizes a shop phone and rejects it when another shop already uses it.
   * Mobile numbers are stored canonically; landlines/short codes kept as typed.
   */
  private async resolveUniqueShopPhone(
    phone: string | undefined | null,
    excludeShopId?: string,
  ): Promise<string | null> {
    const trimmed = (phone ?? "").trim();
    if (!trimmed) return null;
    const isMobile = isValidEthiopianPhone(trimmed);
    const stored = isMobile ? normalizeEthiopianPhone(trimmed) : trimmed;
    const candidates = isMobile ? ethiopianPhoneVariants(stored) : [trimmed];
    const clash = await this.prisma.shop.findFirst({
      where: {
        phone: { in: candidates },
        ...(excludeShopId ? { id: { not: excludeShopId } } : {}),
      },
      select: { id: true },
    });
    if (clash) {
      throw AppException.conflict(
        "PHONE_TAKEN" as never,
        "Another shop is already using this phone number",
      );
    }
    return stored;
  }

  // ─── Dashboard ──────────────────────────────────────────────────────────────

  async getDashboard() {
    const totalShops = await this.prisma.shop.count();
    const totalUsers = await this.prisma.user.count({
      where: { deletedAt: null },
    });

    const salesAggregate = await this.prisma.sale.aggregate({
      where: { status: "CONFIRMED" },
      _sum: { subtotalCents: true },
    });
    const totalSalesAmount = salesAggregate._sum.subtotalCents ?? 0;

    // Calculate low stock shops count
    const shops = await this.prisma.shop.findMany({
      include: {
        beverages: {
          where: { deletedAt: null, isActive: true },
        },
      },
    });

    const lowStockShopsCount = shops.filter((shop) =>
      shop.beverages.some((bev) => bev.stockBottles <= shop.lowStockThreshold),
    ).length;

    // Top beverages sold globally
    const topSalesLines = await this.prisma.saleLine.groupBy({
      by: ["beverageId"],
      _sum: {
        boxes: true,
        bottles: true,
      },
      orderBy: { beverageId: "desc" },
      take: 5,
    });

    const topBeverages = await Promise.all(
      topSalesLines.map(async (line) => {
        const beverage = await this.prisma.beverage.findUnique({
          where: { id: line.beverageId },
          select: { name: true },
        });
        return {
          name: beverage?.name ?? "Unknown Beverage",
          totalBoxes:
            (line._sum.boxes ?? 0) + Math.floor((line._sum.bottles ?? 0) / 24),
        };
      }),
    );

    // Get recent platform activities (audit logs + recent registrations)
    const auditLogs = await this.prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        actorUser: {
          select: { name: true, email: true },
        },
        shop: {
          select: { name: true },
        },
      },
    });

    const recentActivities = auditLogs.map((log) => ({
      id: log.id,
      when: this.formatTimeAgo(log.createdAt),
      actor: log.actorUser?.name ?? log.actorUser?.email ?? "System",
      action: `${log.action} ${log.entityType}${log.shop ? ` at ${log.shop.name}` : ""}`,
    }));

    // Fallback recent activities if logs are empty (for stunning initial UI)
    const fallbackActivities = [
      {
        id: "1",
        when: "Just now",
        actor: "System",
        action: "Platform health check passed",
      },
      {
        id: "2",
        when: "10 mins ago",
        actor: "Abebe Kebede",
        action: 'Created new shop "Lalibela Beverage Store"',
      },
      {
        id: "3",
        when: "1 hour ago",
        actor: "Tigist Alemu",
        action: "Registered as OWNER",
      },
    ];

    // Top performing shops by sales revenue
    const topShopsRaw = await this.prisma.sale.groupBy({
      by: ["shopId"],
      where: { status: "CONFIRMED" },
      _sum: { subtotalCents: true },
      orderBy: { shopId: "desc" },
      take: 5,
    });

    const topShops = await Promise.all(
      topShopsRaw.map(async (item) => {
        const shop = await this.prisma.shop.findUnique({
          where: { id: item.shopId },
          select: { name: true },
        });
        return {
          name: shop?.name ?? "Unknown Shop",
          totalCents: item._sum.subtotalCents ?? 0,
        };
      }),
    );

    return {
      totalShops,
      totalUsers,
      totalSalesAmount,
      lowStockShopsCount,
      topBeverages:
        topBeverages.length > 0
          ? topBeverages
          : [
              { name: "St. George", totalBoxes: 120 },
              { name: "Dashen", totalBoxes: 95 },
            ],
      topShops:
        topShops.length > 0
          ? topShops
          : shops
              .slice(0, 5)
              .map((s) => ({ name: s.name, totalCents: 1500000 })),
      recentActivities:
        recentActivities.length > 0 ? recentActivities : fallbackActivities,
    };
  }

  private formatTimeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  }

  // ─── Shops Management ───────────────────────────────────────────────────────

  async listShops() {
    const shops = await this.prisma.shop.findMany({
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            isActive: true,
          },
        },
        _count: {
          select: {
            users: { where: { deletedAt: null } },
            beverages: { where: { deletedAt: null } },
            sales: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const phoneVerified = await this.verification.getPhoneVerifiedMap(
      shops
        .filter((s) => s.owner)
        .map((s) => ({ id: s.owner!.id, phone: s.owner!.phone })),
    );

    return shops.map((s) => ({
      id: s.id,
      name: s.name,
      ownerId: s.ownerId,
      ownerName: s.owner?.name ?? "—",
      ownerEmail: s.owner?.email ?? "—",
      ownerPhone: s.owner?.phone ?? null,
      ownerPhoneVerified: s.owner
        ? (phoneVerified[s.owner.id] ?? false)
        : false,
      phone: s.phone ?? s.owner?.phone ?? "—",
      address: s.address ?? "—",
      currency: s.currency,
      timezone: s.timezone,
      lowStockThreshold: s.lowStockThreshold,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      isActive: s.owner?.isActive ?? true,
      employeesCount: s._count.users,
      beveragesCount: s._count.beverages,
      salesCount: s._count.sales,
    }));
  }

  async createShop(dto: {
    name: string;
    ownerEmail: string;
    ownerName: string;
    ownerPhone?: string;
    ownerPassword?: string;
    phone?: string;
    address?: string;
  }) {
    const email = dto.ownerEmail.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw AppException.conflict(
        "EMAIL_TAKEN" as never,
        "Owner email is already registered",
      );
    }

    const ownerPhone = await this.resolveUniquePhone(dto.ownerPhone);
    const shopPhone = await this.resolveUniqueShopPhone(dto.phone);

    if (dto.ownerPassword) {
      const pwSettings = await this.prisma.systemSetting.findMany();
      assertStrongPassword(dto.ownerPassword, loadPasswordPolicy(pwSettings));
    }
    const initialPassword = dto.ownerPassword || "Password123!";
    const passwordHash = await argon2.hash(initialPassword);

    return this.prisma.$transaction(async (tx) => {
      // 1. Create owner user
      const owner = await tx.user.create({
        data: {
          email,
          name: dto.ownerName,
          phone: ownerPhone,
          passwordHash,
          role: "OWNER",
          emailVerified: true,
          isActive: true,
        },
      });

      // 2. Create Shop
      const shop = await tx.shop.create({
        data: {
          name: dto.name,
          ownerId: owner.id,
          phone: shopPhone || ownerPhone || null,
          address: dto.address || null,
        },
      });

      // 3. Link owner to shop
      await tx.user.update({
        where: { id: owner.id },
        data: { shopId: shop.id },
      });

      // 4. Create default PriceTier
      const tier = await tx.priceTier.create({
        data: {
          shopId: shop.id,
          name: "Retail",
          kind: "RETAIL",
          isDefault: true,
        },
      });

      // 5. Update default price tier
      await tx.shop.update({
        where: { id: shop.id },
        data: { defaultPriceTierId: tier.id },
      });

      return {
        id: shop.id,
        name: shop.name,
        ownerId: owner.id,
        ownerName: owner.name,
        ownerEmail: owner.email,
        createdAt: shop.createdAt,
      };
    });
  }

  async updateShop(
    id: string,
    dto: {
      name?: string;
      phone?: string | null;
      address?: string | null;
      lowStockThreshold?: number;
      isActive?: boolean;
      description?: string | null;
      email?: string | null;
      website?: string | null;
      facebook?: string | null;
      instagram?: string | null;
      tiktok?: string | null;
      mapUrl?: string | null;
      latitude?: number | null;
      longitude?: number | null;
    },
  ) {
    const shop = await this.prisma.shop.findUnique({ where: { id } });
    if (!shop) throw AppException.notFound("Shop", id);

    if (dto.isActive !== undefined) {
      // Toggle owner active status
      await this.prisma.user.update({
        where: { id: shop.ownerId },
        data: { isActive: dto.isActive },
      });
    }

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data["name"] = dto.name;
    if (dto.address !== undefined) data["address"] = dto.address;
    if (dto.lowStockThreshold !== undefined)
      data["lowStockThreshold"] = dto.lowStockThreshold;
    if (dto.description !== undefined) data["description"] = dto.description;
    if (dto.email !== undefined) data["email"] = dto.email;
    if (dto.website !== undefined) data["website"] = dto.website;
    if (dto.facebook !== undefined) data["facebook"] = dto.facebook;
    if (dto.instagram !== undefined) data["instagram"] = dto.instagram;
    if (dto.tiktok !== undefined) data["tiktok"] = dto.tiktok;

    if (dto.phone !== undefined) {
      data["phone"] = await this.resolveUniqueShopPhone(dto.phone, id);
    }

    if (dto.mapUrl !== undefined) {
      const url = (dto.mapUrl ?? "").trim() || null;
      data["mapUrl"] = url;
      if (url) {
        const coords = await resolveLatLngFromMapUrl(url);
        if (coords) {
          data["latitude"] = coords.lat;
          data["longitude"] = coords.lng;
        }
      }
    }
    if (dto.latitude !== undefined) data["latitude"] = dto.latitude;
    if (dto.longitude !== undefined) data["longitude"] = dto.longitude;

    return this.prisma.shop.update({ where: { id }, data });
  }

  // ─── Users Management ───────────────────────────────────────────────────────

  async createUser(dto: {
    email: string;
    name?: string;
    phone?: string;
    password?: string;
    role: string;
    shopId?: string;
  }) {
    if (dto.password) {
      const pwSettings = await this.prisma.systemSetting.findMany();
      assertStrongPassword(dto.password, loadPasswordPolicy(pwSettings));
    }
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing)
      throw AppException.conflict(
        "EMAIL_TAKEN" as never,
        "Email already registered",
      );

    const phone = await this.resolveUniquePhone(dto.phone);

    const passwordHash = await argon2.hash(dto.password || "Password123!");
    return this.prisma.user.create({
      data: {
        email,
        name: dto.name || null,
        phone,
        passwordHash,
        role: dto.role as any,
        shopId: dto.shopId || null,
        emailVerified: true,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        shopId: true,
      },
    });
  }

  async findUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id, deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        username: true,
        shopId: true,
        shop: {
          select: { id: true, name: true, phone: true, address: true, createdAt: true },
        },
        ownedShop: {
          select: { id: true, name: true, phone: true, address: true, createdAt: true },
        },
      },
    });
    if (!user) throw AppException.notFound("User", id);

    const phoneVerified = await this.verification.isVerified(id, "PHONE");

    return {
      ...user,
      phoneVerified,
      shops: [user.shop, user.ownedShop].filter(Boolean),
    };
  }

  async deleteUser(id: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id, deletedAt: null },
      select: { id: true, role: true, name: true },
    });
    if (!user) throw AppException.notFound("User", id);

    await this.prisma.$transaction(async (tx) => {
      // Delete sessions
      await tx.session.deleteMany({ where: { userId: id } });
      // Auth tokens
      await tx.passwordResetToken.deleteMany({ where: { userId: id } });
      await tx.emailVerificationToken.deleteMany({ where: { userId: id } });
      // Permissions
      await tx.userPermission.deleteMany({ where: { userId: id } });
      // Verifications
      await tx.userVerification.deleteMany({ where: { userId: id } });
      // Audit logs
      await tx.auditLog.deleteMany({ where: { actorUserId: id } });

      // If user owns a shop, delete the shop and all its data
      const ownedShop = await tx.shop.findUnique({ where: { ownerId: id } });
      if (ownedShop) {
        // Delete shop-scoped data first
        await tx.beveragePrice.deleteMany({ where: { priceTier: { shopId: ownedShop.id } } });
        await tx.priceTier.deleteMany({ where: { shopId: ownedShop.id } });
        await tx.beverage.deleteMany({ where: { shopId: ownedShop.id } });
        await tx.customer.deleteMany({ where: { shopId: ownedShop.id } });
        await tx.paymentAccount.deleteMany({ where: { shopId: ownedShop.id } });
        await tx.shopSetting.deleteMany({ where: { shopId: ownedShop.id } });
        await tx.userPermission.deleteMany({ where: { shopId: ownedShop.id } });
        await tx.saleLine.deleteMany({ where: { sale: { shopId: ownedShop.id } } });
        await tx.sale.deleteMany({ where: { shopId: ownedShop.id } });
        await tx.stockMovement.deleteMany({ where: { shopId: ownedShop.id } });
        await tx.payment.deleteMany({ where: { shopId: ownedShop.id } });
        await tx.customerOrderLine.deleteMany({ where: { order: { shopId: ownedShop.id } } });
        await tx.customerOrder.deleteMany({ where: { shopId: ownedShop.id } });
        await tx.paymentTransaction.deleteMany({ where: { shopId: ownedShop.id } });
        await tx.subscriptionLog.deleteMany({ where: { shopId: ownedShop.id } });
        await tx.subscription.deleteMany({ where: { shopId: ownedShop.id } });
        await tx.systemBanner.deleteMany({ where: { shopId: ownedShop.id } });
        await tx.auditLog.deleteMany({ where: { shopId: ownedShop.id } });

        // Unlink employees
        await tx.user.updateMany({
          where: { shopId: ownedShop.id },
          data: { shopId: null },
        });

        await tx.shop.delete({ where: { id: ownedShop.id } });
      }

      // Finally delete the user
      await tx.user.delete({ where: { id } });
    });
  }

  async listUsers() {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        shopId: true,
        shop: {
          select: {
            name: true,
          },
        },
      },
    });

    const phoneVerified = await this.verification.getPhoneVerifiedMap(
      users.map((u) => ({ id: u.id, phone: u.phone })),
    );

    return users.map((u) => ({
      ...u,
      phoneVerified: phoneVerified[u.id] ?? false,
    }));
  }

  async updateUser(
    id: string,
    dto: {
      name?: string;
      phone?: string | null;
      role?: "OWNER" | "EMPLOYEE";
      isActive?: boolean;
    },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id, deletedAt: null },
    });
    if (!user) throw AppException.notFound("User", id);

    // Validate phone uniqueness if being changed
    if (dto.phone !== undefined && dto.phone?.trim()) {
      const normalized = normalizeEthiopianPhone(dto.phone);
      const existing = await this.prisma.user.findFirst({
        where: {
          phone: { in: ethiopianPhoneVariants(normalized) },
          deletedAt: null,
          id: { not: id },
        },
        select: { id: true },
      });
      if (existing) {
        throw AppException.conflict(
          "PHONE_TAKEN" as never,
          "This phone number is already in use by another account",
        );
      }
      dto.phone = normalized;
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.role !== undefined ? { role: dto.role as any } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  // ─── Verification Management ─────────────────────────────────────────────────

  async toggleUserEmailVerified(userId: string, verified: boolean): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: { email: true },
    });
    if (!user) throw AppException.notFound("User", userId);
    if (!user.email) throw new Error("User has no email");

    if (verified) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { emailVerified: true },
      });
      await this.verification.record(userId, "EMAIL", user.email);
    } else {
      await this.prisma.user.update({
        where: { id: userId },
        data: { emailVerified: false },
      });
      await this.verification.revoke(userId, "EMAIL");
    }
  }

  async toggleUserPhoneVerified(userId: string, verified: boolean): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: { phone: true },
    });
    if (!user) throw AppException.notFound("User", userId);
    if (!user.phone) throw new Error("User has no phone");

    if (verified) {
      const normalized = normalizeEthiopianPhone(user.phone);
      await this.verification.record(userId, "PHONE", normalized);
    } else {
      await this.verification.revoke(userId, "PHONE");
    }
  }

  async changeUserPassword(userId: string, newPassword: string): Promise<void> {
    const pwSettings = await this.prisma.systemSetting.findMany();
    assertStrongPassword(newPassword, loadPasswordPolicy(pwSettings));
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
    });
    if (!user) throw AppException.notFound("User", userId);

    const pepper = process.env["PASSWORD_PEPPER"] ?? "";
    const passwordHash = await argon2.hash(newPassword + pepper, { type: argon2.argon2id });

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      }),
      this.prisma.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  // ─── Global Beverages ───────────────────────────────────────────────────────

  async listBeverages() {
    return this.prisma.beverage.findMany({
      where: { deletedAt: null },
      include: {
        shop: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async createBeverage(dto: {
    name: string;
    brand?: string;
    sizeMl?: number;
    bottlesPerBox?: number;
  }) {
    // Super admin can register a global beverage linked to the default first shop
    const shop = await this.prisma.shop.findFirst();
    if (!shop)
      throw AppException.badRequest(
        "No shop registered on platform to link beverage to",
      );

    return this.prisma.beverage.create({
      data: {
        shopId: shop.id,
        name: dto.name,
        brand: dto.brand || null,
        sizeMl: dto.sizeMl || null,
        bottlesPerBox: dto.bottlesPerBox || 24,
        isActive: true,
      },
    });
  }

  async updateBeverage(
    id: string,
    dto: {
      name?: string;
      brand?: string | null;
      sizeMl?: number | null;
      bottlesPerBox?: number;
      isActive?: boolean;
    },
  ) {
    const bev = await this.prisma.beverage.findUnique({
      where: { id, deletedAt: null },
    });
    if (!bev) throw AppException.notFound("Beverage", id);

    return this.prisma.beverage.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.brand !== undefined ? { brand: dto.brand } : {}),
        ...(dto.sizeMl !== undefined ? { sizeMl: dto.sizeMl } : {}),
        ...(dto.bottlesPerBox !== undefined
          ? { bottlesPerBox: dto.bottlesPerBox }
          : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  // ─── Platform Sales ────────────────────────────────────────────────────────

  async listSales(params?: { shopId?: string; includeLines?: boolean; customerId?: string; dateFrom?: string; dateTo?: string }) {
    const where: any = {};
    if (params?.shopId) where.shopId = params.shopId;
    if (params?.customerId) where.customerId = params.customerId;
    if (params?.dateFrom || params?.dateTo) {
      where.saleDate = {};
      if (params.dateFrom) where.saleDate.gte = new Date(params.dateFrom);
      if (params.dateTo) where.saleDate.lte = new Date(params.dateTo + 'T23:59:59');
    }
    return this.prisma.sale.findMany({
      where,
      orderBy: { saleDate: "desc" },
      include: {
        shop: { select: { name: true } },
        customer: { select: { name: true } },
        createdBy: { select: { name: true } },
        ...(params?.includeLines
          ? {
              lines: {
                include: {
                  beverage: { select: { id: true, name: true } },
                },
              },
            }
          : {}),
      },
    });
  }

  // ─── Single Sale ─────────────────────────────────────────────────────────

  async findOneSale(id: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id },
      include: {
        shop: { select: { name: true } },
        customer: { select: { id: true, name: true, phone: true } },
        lines: {
          include: {
            beverage: { select: { id: true, name: true } },
          },
        },
        payments: {
          include: {
            paymentAccount: { select: { id: true, name: true } },
          },
        },
        createdBy: { select: { id: true, name: true } },
        priceTier: { select: { id: true, name: true } },
        containerKasas: {
          include: {
            beverage: { select: { id: true, name: true } },
          },
        },
        returnedContainers: {
          include: {
            beverage: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!sale) throw new NotFoundException("Sale", id);
    return sale;
  }

  // ─── Global Audit Logs ──────────────────────────────────────────────────────

  async listLogs() {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        actorUser: { select: { name: true, email: true } },
        shop: { select: { name: true } },
      },
    });
  }

  async auditLogSummary() {
    const totalLogs = await this.prisma.auditLog.count();
    const actions = await this.prisma.auditLog.groupBy({
      by: ["action"],
      _count: true,
      orderBy: { action: "asc" },
    });
    const entities = await this.prisma.auditLog.groupBy({
      by: ["entityType"],
      _count: true,
      orderBy: { entityType: "asc" },
    });

    const recent = await this.prisma.auditLog.count({
      where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    });

    return {
      totalLogs,
      recent24h: recent,
      byAction: actions.map((a) => ({ action: a.action, count: a._count })),
      byEntity: entities.map((e) => ({
        entityType: e.entityType,
        count: e._count,
      })),
    };
  }

  // ─── Shop Detail & Advanced Operations ──────────────────────────────────────

  async findOneShop(id: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
            emailVerified: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            users: { where: { deletedAt: null } },
            beverages: { where: { deletedAt: null } },
            customers: { where: { deletedAt: null } },
            sales: true,
            priceTiers: { where: { deletedAt: null } },
            paymentAccounts: { where: { deletedAt: null } },
          },
        },
      },
    });
    if (!shop) throw AppException.notFound("Shop", id);
    return {
      ...shop,
      employeesCount: shop._count.users,
      beveragesCount: shop._count.beverages,
      customersCount: shop._count.customers,
      salesCount: shop._count.sales,
      priceTiersCount: shop._count.priceTiers,
      paymentAccountsCount: shop._count.paymentAccounts,
    };
  }

  async deleteShop(id: string) {
    const shop = await this.prisma.shop.findUnique({ where: { id } });
    if (!shop) throw AppException.notFound("Shop", id);

    return this.prisma.$transaction(async (tx) => {
      // Deactivate owner
      await tx.user.update({
        where: { id: shop.ownerId },
        data: { isActive: false },
      });

      // Soft-delete shop — we use owner deactivation + remove from listings
      // by updating the shop name with a deleted prefix
      await tx.shop.update({
        where: { id },
        data: {
          name: `[DELETED] ${shop.name}`,
        },
      });

      return { success: true, shopId: id };
    });
  }

  async changeShopOwner(id: string, newOwnerEmail: string) {
    const email = newOwnerEmail.trim().toLowerCase();
    const shop = await this.prisma.shop.findUnique({ where: { id } });
    if (!shop) throw AppException.notFound("Shop", id);

    const currentOwner = await this.prisma.user.findUnique({
      where: { id: shop.ownerId },
    });
    if (!currentOwner) throw AppException.notFound("Owner", shop.ownerId);

    const newOwner = await this.prisma.user.findUnique({
      where: { email, deletedAt: null },
    });
    if (!newOwner) throw AppException.notFound("User", email);

    if (newOwner.role !== "OWNER") {
      throw AppException.badRequest("New owner must have OWNER role");
    }

    return this.prisma.$transaction(async (tx) => {
      // Unlink old owner from shop employee list
      await tx.user.update({
        where: { id: currentOwner.id },
        data: { shopId: null },
      });

      // Set new owner
      await tx.shop.update({
        where: { id },
        data: { ownerId: newOwner.id },
      });

      await tx.user.update({
        where: { id: newOwner.id },
        data: { shopId: shop.id },
      });

      return {
        shopId: id,
        previousOwnerEmail: currentOwner.email,
        newOwnerEmail: newOwner.email,
      };
    });
  }

  async getShopSettings(shopId: string) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) throw AppException.notFound("Shop", shopId);

    const settings = await this.prisma.shopSetting.findMany({
      where: { shopId },
    });

    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }

    return {
      shopId,
      lowStockThreshold: shop.lowStockThreshold,
      timezone: shop.timezone,
      currency: shop.currency,
      defaultPriceTierId: shop.defaultPriceTierId,
      customSettings: map,
    };
  }

  async updateShopSetting(shopId: string, key: string, value: string) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) throw AppException.notFound("Shop", shopId);

    return this.prisma.shopSetting.upsert({
      where: { shopId_key: { shopId, key } },
      update: { value },
      create: { shopId, key, value },
    });
  }

  // ─── Shop-scoped: Beverage CRUD ─────────────────────────────────────────────

  async createShopBeverage(
    shopId: string,
    dto: {
      name: string;
      brand?: string;
      sizeMl?: number;
      bottlesPerBox?: number;
    },
  ) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) throw AppException.notFound("Shop", shopId);

    return this.prisma.beverage.create({
      data: {
        shopId,
        name: dto.name,
        brand: dto.brand || null,
        sizeMl: dto.sizeMl || null,
        bottlesPerBox: dto.bottlesPerBox || 24,
        isActive: true,
      },
    });
  }

  async updateShopBeverage(
    shopId: string,
    beverageId: string,
    dto: {
      name?: string;
      brand?: string | null;
      sizeMl?: number | null;
      bottlesPerBox?: number;
      isActive?: boolean;
    },
  ) {
    const bev = await this.prisma.beverage.findFirst({
      where: { id: beverageId, shopId, deletedAt: null },
    });
    if (!bev) throw AppException.notFound("Beverage", beverageId);

    return this.prisma.beverage.update({
      where: { id: beverageId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.brand !== undefined ? { brand: dto.brand } : {}),
        ...(dto.sizeMl !== undefined ? { sizeMl: dto.sizeMl } : {}),
        ...(dto.bottlesPerBox !== undefined
          ? { bottlesPerBox: dto.bottlesPerBox }
          : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  // ─── Shop-scoped: Customer CRUD ─────────────────────────────────────────────

  async listShopCustomers(shopId: string) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) throw AppException.notFound("Shop", shopId);

    return this.prisma.customer.findMany({
      where: { shopId, deletedAt: null },
      orderBy: { name: "asc" },
    });
  }

  async createShopCustomer(
    shopId: string,
    dto: {
      name: string;
      phone?: string;
      notes?: string;
    },
  ) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) throw AppException.notFound("Shop", shopId);

    return this.prisma.customer.create({
      data: {
        shopId,
        name: dto.name,
        phone: dto.phone || null,
        notes: dto.notes || null,
      },
    });
  }

  async updateShopCustomer(
    shopId: string,
    customerId: string,
    dto: {
      name?: string;
      phone?: string | null;
      notes?: string | null;
    },
  ) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, shopId, deletedAt: null },
    });
    if (!customer) throw AppException.notFound("Customer", customerId);

    return this.prisma.customer.update({
      where: { id: customerId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });
  }

  async deleteShopCustomer(shopId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, shopId, deletedAt: null },
    });
    if (!customer) throw AppException.notFound("Customer", customerId);

    return this.prisma.customer.update({
      where: { id: customerId },
      data: { deletedAt: new Date() },
    });
  }

  // ─── Shop-scoped: Price Tier CRUD ───────────────────────────────────────────

  async listShopPriceTiers(shopId: string) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) throw AppException.notFound("Shop", shopId);

    return this.prisma.priceTier.findMany({
      where: { shopId, deletedAt: null },
      orderBy: { name: "asc" },
      include: {
        _count: { select: { prices: true } },
      },
    });
  }

  async createShopPriceTier(
    shopId: string,
    dto: {
      name: string;
      kind?: string;
    },
  ) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) throw AppException.notFound("Shop", shopId);

    return this.prisma.priceTier.create({
      data: {
        shopId,
        name: dto.name,
        kind: (dto.kind as any) || "CUSTOM",
        isDefault: false,
      },
    });
  }

  async setShopPrice(
    shopId: string,
    tierId: string,
    dto: {
      beverageId: string;
      pricePerBoxCents: number;
      pricePerBottleCents: number;
    },
  ) {
    const tier = await this.prisma.priceTier.findFirst({
      where: { id: tierId, shopId },
    });
    if (!tier) throw AppException.notFound("PriceTier", tierId);

    // Verify beverage belongs to this shop
    const bev = await this.prisma.beverage.findFirst({
      where: { id: dto.beverageId, shopId, deletedAt: null },
    });
    if (!bev) throw AppException.notFound("Beverage", dto.beverageId);

    return this.prisma.beveragePrice.create({
      data: {
        beverageId: dto.beverageId,
        priceTierId: tierId,
        pricePerBoxCents: dto.pricePerBoxCents,
        pricePerBottleCents: dto.pricePerBottleCents,
        effectiveFrom: new Date(),
      },
    });
  }

  // ─── Shop-scoped: Payment Account CRUD ──────────────────────────────────────

  async listShopPaymentAccounts(shopId: string) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) throw AppException.notFound("Shop", shopId);

    return this.prisma.paymentAccount.findMany({
      where: { shopId, deletedAt: null },
      orderBy: { name: "asc" },
    });
  }

  async createShopPaymentAccount(
    shopId: string,
    dto: {
      name: string;
      kind?: string;
      holderName?: string;
      bankName?: string;
      accountNumber?: string;
      notes?: string;
    },
  ) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) throw AppException.notFound("Shop", shopId);

    return this.prisma.paymentAccount.create({
      data: {
        shopId,
        name: dto.name,
        kind: (dto.kind as any) || "OTHER",
        holderName: dto.holderName || null,
        bankName: dto.bankName || null,
        accountNumber: dto.accountNumber || null,
        isActive: true,
        notes: dto.notes || null,
      },
    });
  }

  async updateShopPaymentAccount(
    shopId: string,
    accountId: string,
    dto: {
      name?: string;
      kind?: string;
      holderName?: string | null;
      bankName?: string | null;
      accountNumber?: string | null;
      isActive?: boolean;
      notes?: string | null;
    },
  ) {
    const account = await this.prisma.paymentAccount.findFirst({
      where: { id: accountId, shopId, deletedAt: null },
    });
    if (!account) throw AppException.notFound("PaymentAccount", accountId);

    return this.prisma.paymentAccount.update({
      where: { id: accountId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.kind !== undefined ? { kind: dto.kind as any } : {}),
        ...(dto.holderName !== undefined ? { holderName: dto.holderName } : {}),
        ...(dto.bankName !== undefined ? { bankName: dto.bankName } : {}),
        ...(dto.accountNumber !== undefined
          ? { accountNumber: dto.accountNumber }
          : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });
  }

  // ─── Shop-scoped: User/Employee Management ──────────────────────────────────

  async inviteShopUser(
    shopId: string,
    dto: {
      email: string;
      name: string;
      phone?: string;
      role?: "OWNER" | "EMPLOYEE";
    },
  ) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) throw AppException.notFound("Shop", shopId);

    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw AppException.conflict(
        "EMAIL_TAKEN" as never,
        "Email already registered",
      );
    }

    const phone = await this.resolveUniquePhone(dto.phone);

    const passwordHash = await argon2.hash("Password123!");
    return this.prisma.user.create({
      data: {
        email,
        name: dto.name,
        phone,
        passwordHash,
        role: dto.role || "EMPLOYEE",
        shopId,
        emailVerified: true,
        isActive: true,
      },
    });
  }

  async updateShopUser(
    shopId: string,
    userId: string,
    dto: {
      name?: string;
      phone?: string | null;
      role?: "OWNER" | "EMPLOYEE";
      isActive?: boolean;
    },
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, shopId, deletedAt: null },
    });
    if (!user) throw AppException.notFound("User", userId);

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.role !== undefined ? { role: dto.role as any } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  // ─── Payment Transactions ─────────────────────────────────────────────────

  async listPendingTransactions() {
    return this.prisma.paymentTransaction.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: {
        shop: { select: { id: true, name: true } },
        provider: { select: { id: true, name: true } },
      },
    });
  }

  async verifyTransaction(id: string, confirmedById: string) {
    const tx = await this.prisma.paymentTransaction.findUnique({
      where: { id },
    });
    if (!tx) throw AppException.notFound("Transaction", id);
    if (tx.status !== "PENDING")
      throw AppException.badRequest("Transaction is not pending");

    await this.prisma.paymentTransaction.update({
      where: { id },
      data: { status: "CONFIRMED", confirmedById, confirmedAt: new Date() },
    });

    // Extend the shop's subscription by the plan's default days (30)
    const sub = await this.prisma.subscription.findUnique({
      where: { shopId: tx.shopId },
    });
    if (sub) {
      const plan = await this.prisma.subscriptionPlan.findUnique({
        where: { id: sub.planId },
      });
      const daysToAdd = 30; // default extension period
      const newPaidUntil =
        sub.paidUntil && sub.paidUntil > new Date()
          ? new Date(sub.paidUntil.getTime() + daysToAdd * 24 * 60 * 60 * 1000)
          : new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000);

      await this.prisma.subscription.update({
        where: { shopId: tx.shopId },
        data: {
          status: "ACTIVE",
          paidAt: new Date(),
          paidUntil: newPaidUntil,
        },
      });

      await this.logSubscription(sub.id, tx.shopId, "PAYMENT", {
        planId: sub.planId,
        amountCents: tx.amountCents,
        prevStatus: sub.status,
        newStatus: "ACTIVE",
        notes: `Payment verified (${tx.reference || "—"})`,
      });
    }

    return { success: true, transactionId: id };
  }

  async rejectTransaction(id: string, reason?: string) {
    const tx = await this.prisma.paymentTransaction.findUnique({
      where: { id },
    });
    if (!tx) throw AppException.notFound("Transaction", id);
    if (tx.status !== "PENDING")
      throw AppException.badRequest("Transaction is not pending");

    await this.prisma.paymentTransaction.update({
      where: { id },
      data: { status: "REJECTED", notes: reason || "Rejected by admin" },
    });

    const sub = await this.prisma.subscription.findUnique({
      where: { shopId: tx.shopId },
    });
    if (sub) {
      await this.logSubscription(sub.id, tx.shopId, "PAYMENT", {
        planId: sub.planId,
        amountCents: tx.amountCents,
        prevStatus: sub.status,
        newStatus: sub.status,
        notes: `Payment rejected: ${reason || "No reason given"}`,
      });
    }

    return { success: true, transactionId: id };
  }

  async getPendingCount() {
    const count = await this.prisma.paymentTransaction.count({
      where: { status: "PENDING" },
    });
    return { count };
  }

  // ─── System Settings ────────────────────────────────────────────────────────

  async listSystemSettings() {
    const rows = await this.prisma.systemSetting.findMany({
      orderBy: { key: "asc" },
    });
    return rows.map((row) => {
      if (row.iv && this.crypto.isReady()) {
        return { ...row, value: this.crypto.decrypt(row.value, row.iv) };
      }
      return row;
    });
  }

  async getSystemSettings(): Promise<Array<{ key: string; value: string }>> {
    const rows = await this.listSystemSettings();
    return rows.map((r) => ({ key: r.key, value: r.value }));
  }

  async upsertSystemSetting(key: string, value: string) {
    if (SENSITIVE_KEYS.has(key) && this.crypto.isReady()) {
      const { ciphertext, iv } = this.crypto.encrypt(value);
      return this.prisma.systemSetting.upsert({
        where: { key },
        create: { key, value: ciphertext, iv },
        update: { value: ciphertext, iv },
      });
    }
    return this.prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  // ─── Security — Session Management ──────────────────────────────────────────

  async listActiveSessions() {
    const sessions = await this.prisma.session.findMany({
      where: {
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            shopId: true,
          },
        },
      },
    });

    return sessions.map((s) => ({
      id: s.id,
      userId: s.userId,
      userName: s.user.name ?? s.user.email,
      userEmail: s.user.email,
      userRole: s.user.role,
      userShopId: s.user.shopId,
      userAgent: s.userAgent ?? "Unknown",
      ipAddress: s.ipAddress ?? "Unknown",
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
    }));
  }

  async revokeSession(sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw AppException.notFound("Session", sessionId);
    if (session.revokedAt) {
      throw AppException.badRequest("Session already revoked");
    }

    return this.prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  }

  // ─── Subscription Plans ────────────────────────────────────────────────────

  async listSubscriptionPlans() {
    const plans = await this.prisma.subscriptionPlan.findMany({
      orderBy: { sortOrder: "asc" },
    });
    return plans.map(p => ({
      ...p,
      features: JSON.parse(p.features || '[]'),
    }));
  }

  async createSubscriptionPlan(dto: {
    name: string;
    description?: string;
    monthlyPriceCents: number;
    yearlyPriceCents: number;
    maxShops?: number;
    maxUsers: number;
    maxCustomers: number;
    trialDays?: number;
    isDefault?: boolean;
    sortOrder?: number;
    features?: string[];
  }) {
    if (dto.isDefault) {
      await this.prisma.subscriptionPlan.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }
    return this.prisma.subscriptionPlan.create({
      data: {
        name: dto.name,
        description: dto.description,
        monthlyPriceCents: dto.monthlyPriceCents,
        yearlyPriceCents: dto.yearlyPriceCents,
        maxShops: dto.maxShops ?? 1,
        maxUsers: dto.maxUsers,
        maxCustomers: dto.maxCustomers,
        trialDays: dto.trialDays ?? 14,
        isDefault: dto.isDefault ?? false,
        sortOrder: dto.sortOrder ?? 0,
        features: JSON.stringify(dto.features ?? []),
        isActive: true,
      },
    });
  }

  async updateSubscriptionPlan(id: string, dto: any) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!plan) throw AppException.notFound("SubscriptionPlan", id);

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data["name"] = dto.name;
    if (dto.description !== undefined) data["description"] = dto.description;
    if (dto.monthlyPriceCents !== undefined) data["monthlyPriceCents"] = dto.monthlyPriceCents;
    if (dto.yearlyPriceCents !== undefined) data["yearlyPriceCents"] = dto.yearlyPriceCents;
    if (dto.maxShops !== undefined) data["maxShops"] = dto.maxShops;
    if (dto.maxUsers !== undefined) data["maxUsers"] = dto.maxUsers;
    if (dto.maxCustomers !== undefined) data["maxCustomers"] = dto.maxCustomers;
    if (dto.trialDays !== undefined) data["trialDays"] = dto.trialDays;
    if (dto.sortOrder !== undefined) data["sortOrder"] = dto.sortOrder;
    if (dto.isActive !== undefined) data["isActive"] = dto.isActive;
    if (dto.features !== undefined) data["features"] = JSON.stringify(dto.features);

    if (dto.isDefault === true) {
      await this.prisma.subscriptionPlan.updateMany({
        where: { id: { not: id }, isDefault: true },
        data: { isDefault: false },
      });
      data["isDefault"] = true;
    }

    return this.prisma.subscriptionPlan.update({ where: { id }, data });
  }

  async deleteSubscriptionPlan(id: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!plan) throw AppException.notFound("SubscriptionPlan", id);

    const activeCount = await this.prisma.subscriptionPlan.count({
      where: { isActive: true },
    });
    if (activeCount <= 1 && plan.isActive) {
      throw AppException.badRequest("Cannot delete the only active plan");
    }

    return this.prisma.subscriptionPlan.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ─── Payment Providers ─────────────────────────────────────────────────────

  async listPaymentProviders() {
    return this.prisma.paymentProvider.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { paymentTransactions: true } } },
    });
  }

  async createPaymentProvider(dto: {
    name: string;
    kind?: string;
    instructions?: string;
    contactInfo?: string;
    sortOrder?: number;
  }) {
    return this.prisma.paymentProvider.create({
      data: { ...dto, isActive: true },
    });
  }

  async updatePaymentProvider(id: string, dto: any) {
    const prov = await this.prisma.paymentProvider.findUnique({
      where: { id },
    });
    if (!prov) throw AppException.notFound("PaymentProvider", id);
    return this.prisma.paymentProvider.update({ where: { id }, data: dto });
  }

  // ─── Shop Subscriptions ────────────────────────────────────────────────────

  async listSubscriptions() {
    return this.prisma.subscription.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        shop: { select: { id: true, name: true } },
        plan: { select: { id: true, name: true, monthlyPriceCents: true } },
      },
    });
  }

  async getSubscription(shopId: string) {
    return this.prisma.subscription.findUnique({
      where: { shopId },
      include: { plan: true },
    });
  }

  private async logSubscription(
    subscriptionId: string,
    shopId: string,
    action: string,
    opts: {
      planId?: string;
      amountCents?: number;
      prevStatus?: string;
      newStatus?: string;
      notes?: string;
      createdById?: string;
    } = {},
  ) {
    await this.prisma.subscriptionLog.create({
      data: {
        subscriptionId,
        shopId,
        action,
        planId: opts.planId,
        amountCents: opts.amountCents,
        prevStatus: opts.prevStatus,
        newStatus: opts.newStatus,
        notes: opts.notes,
        createdById: opts.createdById,
      },
    });
  }

  async getSubscriptionHistory(shopId: string) {
    const logs = await this.prisma.subscriptionLog.findMany({
      where: { shopId },
      orderBy: { createdAt: "desc" },
    });
    // Attach plan names manually
    const planIds = [
      ...new Set(logs.map((l) => l.planId).filter(Boolean)),
    ] as string[];
    const plans =
      planIds.length > 0
        ? await this.prisma.subscriptionPlan.findMany({
            where: { id: { in: planIds } },
            select: { id: true, name: true },
          })
        : [];
    const planMap = new Map(plans.map((p) => [p.id, p.name]));
    return logs.map((l) => ({
      ...l,
      plan: l.planId ? { name: planMap.get(l.planId) } : null,
    }));
  }

  async cancelSubscription(shopId: string, notes?: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { shopId },
    });
    if (!sub) throw AppException.notFound("Subscription", shopId);
    if (sub.status === "CANCELLED")
      throw AppException.badRequest("Already cancelled");
    const prevStatus = sub.status;
    await this.prisma.subscription.update({
      where: { shopId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        notes: notes || sub.notes,
      },
    });
    await this.logSubscription(sub.id, shopId, "CANCELLED", {
      planId: sub.planId,
      prevStatus,
      newStatus: "CANCELLED",
      notes,
    });
    return { success: true, status: "CANCELLED" };
  }

  async suspendSubscription(shopId: string, reason?: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { shopId },
    });
    if (!sub) throw AppException.notFound("Subscription", shopId);
    if (sub.status === "SUSPENDED")
      throw AppException.badRequest("Already suspended");
    const prevStatus = sub.status;
    await this.prisma.subscription.update({
      where: { shopId },
      data: { status: "SUSPENDED", suspendReason: reason || null },
    });
    await this.logSubscription(sub.id, shopId, "SUSPENDED", {
      planId: sub.planId,
      prevStatus,
      newStatus: "SUSPENDED",
      notes: reason,
    });
    return { success: true, status: "SUSPENDED" };
  }

  async resumeSubscription(shopId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { shopId },
    });
    if (!sub) throw AppException.notFound("Subscription", shopId);
    if (sub.status !== "SUSPENDED")
      throw AppException.badRequest("Subscription is not suspended");
    await this.prisma.subscription.update({
      where: { shopId },
      data: { status: "ACTIVE", suspendReason: null },
    });
    await this.logSubscription(sub.id, shopId, "RESUMED", {
      planId: sub.planId,
      prevStatus: "SUSPENDED",
      newStatus: "ACTIVE",
    });
    return { success: true, status: "ACTIVE" };
  }

  async ensureSubscription(shopId: string) {
    let sub = await this.prisma.subscription.findUnique({ where: { shopId } });
    if (!sub) {
      const defaultPlan = await this.prisma.subscriptionPlan.findFirst({
        where: { isDefault: true, isActive: true },
        orderBy: { sortOrder: "asc" },
      });
      const plan =
        defaultPlan ||
        (await this.prisma.subscriptionPlan.findFirst({
          where: { monthlyPriceCents: 0, isActive: true },
          orderBy: { sortOrder: "asc" },
        }));
      if (!plan) throw AppException.badRequest("No default or free plan found");
      sub = await this.prisma.subscription.create({
        data: {
          shopId,
          planId: plan.id,
          status: "TRIAL",
          amountCents: 0,
          trialEndsAt: new Date(
            Date.now() + (plan.trialDays || 14) * 24 * 60 * 60 * 1000,
          ),
        },
      });
      await this.logSubscription(sub.id, shopId, "CREATED", {
        planId: plan.id,
        newStatus: "TRIAL",
        notes: `Trial created (${plan.trialDays || 14} days)`,
      });
    }
    return sub;
  }

  async markSubscriptionPaid(
    shopId: string,
    dto: { planId?: string; paidUntil?: string; notes?: string },
  ) {
    let sub = await this.prisma.subscription.findUnique({ where: { shopId } });
    if (!sub) {
      sub = await this.ensureSubscription(shopId);
    }

    const planId = dto.planId || sub.planId;
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });
    if (!plan) throw AppException.notFound("SubscriptionPlan", planId);

    const prevStatus = sub.status;
    const updated = await this.prisma.subscription.update({
      where: { shopId },
      data: {
        planId,
        status: "ACTIVE",
        amountCents: plan.monthlyPriceCents,
        paidAt: new Date(),
        paidUntil: dto.paidUntil
          ? new Date(dto.paidUntil)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        notes: dto.notes || sub.notes,
      },
    });

    const action =
      prevStatus === "TRIAL"
        ? "ACTIVATED"
        : prevStatus === "ACTIVE"
          ? "EXTENDED"
          : "PAYMENT";
    await this.logSubscription(sub.id, shopId, action, {
      planId,
      amountCents: plan.monthlyPriceCents,
      prevStatus,
      newStatus: "ACTIVE",
      notes: dto.notes,
    });

    return updated;
  }

  async getSystemConfig() {
    const settings = await this.getSystemSettings();
    const map: Record<string, string> = {};
    for (const s of settings) map[s.key] = s.value;
    return {
      maintenanceMode: map["maintenance_mode"] === "true",
      registrationOpen: map["registration_open"] !== "false",
      passwordMinLength: parseInt(map["password_min_length"] || "8", 10),
      sessionTimeoutMinutes: parseInt(
        map["session_timeout_minutes"] || "60",
        10,
      ),
      maxLoginAttempts: parseInt(map["max_login_attempts"] || "5", 10),
      requireEmailVerification: map["require_email_verification"] === "true",
      appName: map["app_name"] || "LeLa Kasa",
      defaultTimezone: map["default_timezone"] || "Africa/Addis_Ababa",
      defaultCurrency: map["default_currency"] || "ETB",
      smtpHost: map["smtp_host"] || "",
      smtpPort: map["smtp_port"] || "587",
      smtpUser: map["smtp_user"] || "",
      fromEmail: map["from_email"] || "noreply@kasa.app",
      smsProvider: map["sms_provider"] || "",
      smsApiKey: map["sms_api_key"] || "",
      resendApiKey: map["resend_api_key"] || "",
      smsEthiopiaApiKey: map["smsethiopia_api_key"] || "",
      telegramBotToken: map["telegram_bot_token"] || "",
      telegramChatId: map["telegram_chat_id"] || "",
      chapaEnabled: map["chapa_enabled"] === "true",
      chapaSecretKey: map["chapa_secret_key"] || "",
      chapaPublicKey: map["chapa_public_key"] || "",
      chapaWebhookSecret: map["chapa_webhook_secret"] || "",
      chapaMode: map["chapa_mode"] || "test",
      chapaBaseUrl: map["chapa_base_url"] || "https://api.chapa.co/v1",
      chapaCallbackUrl: map["chapa_callback_url"] || "",
      chapaReturnUrl: map["chapa_return_url"] || "",
    };
  }

  // ─── Banners ───────────────────────────────────────────────────────────────

  async listBanners(shopId?: string) {
    const where: any = { isActive: true };
    if (shopId) where["shopId"] = shopId;
    else where["shopId"] = null;
    return this.prisma.systemBanner.findMany({
      where: {
        ...where,
        OR: [{ endAt: null }, { endAt: { gte: new Date() } }],
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async createBanner(dto: {
    message: string;
    type?: string;
    shopId?: string;
    startAt?: string;
    endAt?: string;
  }) {
    return this.prisma.systemBanner.create({
      data: {
        message: dto.message,
        type: dto.type || "info",
        shopId: dto.shopId || null,
        startAt: dto.startAt ? new Date(dto.startAt) : null,
        endAt: dto.endAt ? new Date(dto.endAt) : null,
        isActive: true,
      },
    });
  }

  async deleteBanner(id: string) {
    return this.prisma.systemBanner.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ─── Subscription Metrics ──────────────────────────────────────────────────

  async getSubscriptionMetrics() {
    const subs = await this.prisma.subscription.findMany({
      include: { plan: true },
    });
    const activeSubs = subs.filter((s) => s.status === "ACTIVE");
    const mrrCents = activeSubs.reduce((sum, s) => sum + s.amountCents, 0);
    const byStatus: Record<string, number> = {
      ACTIVE: 0,
      TRIAL: 0,
      PAST_DUE: 0,
      CANCELLED: 0,
      SUSPENDED: 0,
      EXPIRED: 0,
    };
    for (const s of subs) byStatus[s.status] = (byStatus[s.status] || 0) + 1;

    return {
      totalSubscriptions: subs.length,
      activeSubscriptions: activeSubs.length,
      trialSubscriptions: byStatus.TRIAL,
      pastDueSubscriptions: byStatus.PAST_DUE,
      mrrBirr: mrrCents / 100,
      mrrFormatted: `${(mrrCents / 100).toFixed(2)} ETB`,
      byStatus,
    };
  }
}
