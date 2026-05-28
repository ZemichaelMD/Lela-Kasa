import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { SaleStatus } from "../database";
import { PrismaService } from "../prisma/prisma.service";
import { SmsService } from "../sms/sms.service";
import { SmsTemplatesService } from "../sms/sms-templates.service";
import { TelegramService } from "../telegram/telegram.service";
import { WhatsAppService } from "../whatsapp/whatsapp.service";
import { MailService } from "../mail/mail.service";
import { AppException } from "../common/errors/app.exception";
import * as argon2 from "argon2";
import * as crypto from "node:crypto";
import { ErrorCode } from "../contract";
import type { CreateCustomerDto } from "./dto/create-customer.dto";
import type { UpdateCustomerDto } from "./dto/update-customer.dto";
import type { RecordCustomerPaymentDto } from "./dto/record-payment.dto";
import type { RecordContainerReturnDto } from "./dto/record-return.dto";

export interface CustomerListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  hasCredit?: boolean;
}

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  /** A reminder may only be sent to a customer once per this window. */
  private static readonly REMINDER_THROTTLE_MS = 2 * 60 * 60 * 1000; // 2 hours

  constructor(
    private readonly prisma: PrismaService,
    private readonly sms: SmsService,
    private readonly smsTemplates: SmsTemplatesService,
    private readonly telegram: TelegramService,
    private readonly whatsapp: WhatsAppService,
    private readonly mail: MailService,
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  async list(shopId: string, query: CustomerListQuery) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {
      shopId,
      deletedAt: null,
    };

    if (query.search) {
      where["name"] = { contains: query.search, mode: "insensitive" };
    }

    if (query.hasCredit === true) {
      where["creditBalanceCents"] = { not: 0 };
    } else if (query.hasCredit === false) {
      where["creditBalanceCents"] = 0;
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { name: "asc" },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async findOne(shopId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, shopId, deletedAt: null },
    });
    if (!customer) throw AppException.notFound("Customer", id);
    return customer;
  }

  private async checkEmailUniqueness(
    email: string | undefined,
    excludeCustomerId?: string,
  ): Promise<void> {
    if (!email) return;
    const normalized = email.toLowerCase().trim();

    // Check against other customers
    const existingCustomer = await this.prisma.customer.findFirst({
      where: {
        email: normalized,
        deletedAt: null,
        ...(excludeCustomerId ? { id: { not: excludeCustomerId } } : {}),
      },
      select: { id: true },
    });
    if (existingCustomer) {
      throw new ConflictException({
        code: ErrorCode.EMAIL_TAKEN,
        message: "This email is already used by another customer.",
      });
    }

    // Check against User table (owners, employees, admins)
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalized },
      select: { id: true },
    });
    if (existingUser) {
      throw new ConflictException({
        code: ErrorCode.EMAIL_TAKEN,
        message: "This email is already in use by an account in the system.",
      });
    }
  }

  async create(shopId: string, dto: CreateCustomerDto, actorUserId: string) {
    let pinHash: string | undefined;
    if (dto.username && dto.pin) {
      const existing = await this.prisma.customer.findUnique({
        where: { username: dto.username.trim() },
      });
      if (existing) throw new ConflictException("Username is already taken");
      pinHash = await argon2.hash(dto.pin);
    }

    if (dto.email) {
      await this.checkEmailUniqueness(dto.email);
    }

    const customer = await this.prisma.customer.create({
      data: {
        shopId,
        name: dto.name,
        phone: dto.phone ?? null,
        email: dto.email?.toLowerCase().trim() ?? null,
        notes: dto.notes ?? null,
        priceTierId: dto.priceTierId ?? null,
        priceTierLocked: dto.priceTierLocked ?? false,
        username: dto.username?.trim() ?? null,
        pinHash: pinHash ?? null,
        mustChangePassword: !!pinHash,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        shopId,
        actorUserId,
        action: "customer.create",
        entityType: "Customer",
        entityId: customer.id,
        afterJson: JSON.stringify(customer),
      },
    });

    return customer;
  }

  async update(
    shopId: string,
    id: string,
    dto: UpdateCustomerDto,
    actorUserId: string,
  ) {
    const current = await this.findOne(shopId, id);

    const updateData: Record<string, unknown> = {};

    if (dto.name !== undefined) updateData["name"] = dto.name;
    if (dto.phone !== undefined) updateData["phone"] = dto.phone;
    if (dto.notes !== undefined) updateData["notes"] = dto.notes;
    if (dto.priceTierId !== undefined)
      updateData["priceTierId"] = dto.priceTierId || null;
    if (dto.priceTierLocked !== undefined)
      updateData["priceTierLocked"] = dto.priceTierLocked;

    if (dto.email !== undefined) {
      if (dto.email.trim()) {
        const normalized = dto.email.toLowerCase().trim();
        if (normalized !== current.email) {
          await this.checkEmailUniqueness(normalized, id);
        }
        updateData["email"] = normalized;
        if (normalized !== current.email) {
          updateData["emailVerified"] = false;
        }
      } else {
        updateData["email"] = null;
        updateData["emailVerified"] = false;
      }
    }

    if (dto.username !== undefined) {
      if (dto.username.trim()) {
        const existing = await this.prisma.customer.findUnique({
          where: { username: dto.username.trim() },
        });
        if (existing && existing.id !== id) {
          throw new ConflictException("Username is already taken");
        }
        updateData["username"] = dto.username.trim();
      } else {
        updateData["username"] = null;
        updateData["pinHash"] = null;
        updateData["mustChangePassword"] = false;
        updateData["passwordChangedAt"] = null;
      }
    }

    if (dto.pin !== undefined) {
      if (dto.pin.trim()) {
        updateData["pinHash"] = await argon2.hash(dto.pin);
        updateData["mustChangePassword"] = true;
        updateData["passwordChangedAt"] = null;
      } else {
        updateData["pinHash"] = null;
        updateData["mustChangePassword"] = false;
        updateData["passwordChangedAt"] = null;
      }
    }

    const updated = await this.prisma.customer.update({
      where: { id },
      data: updateData,
    });

    await this.prisma.auditLog.create({
      data: {
        shopId,
        actorUserId,
        action: "customer.update",
        entityType: "Customer",
        entityId: updated.id,
        afterJson: JSON.stringify(updated),
      },
    });

    return updated;
  }

  async remove(shopId: string, id: string, actorUserId: string) {
    const customer = await this.findOne(shopId, id);

    if (
      customer.creditBalanceCents !== 0 ||
      customer.outstandingBoxes !== 0 ||
      customer.outstandingBottles !== 0
    ) {
      throw AppException.conflict(
        ErrorCode.CONFLICT,
        "Cannot delete customer with outstanding balance or boxes/bottles",
      );
    }

    const deleted = await this.prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        shopId,
        actorUserId,
        action: "customer.delete",
        entityType: "Customer",
        entityId: id,
        afterJson: JSON.stringify(deleted),
      },
    });

    return { success: true };
  }

  async getLedger(shopId: string, id: string) {
    await this.findOne(shopId, id);

    const [sales, payments, returnLogs] = await Promise.all([
      this.prisma.sale.findMany({
        where: { shopId, customerId: id },
        include: { lines: true },
        orderBy: { saleDate: "desc" },
      }),
      this.prisma.payment.findMany({
        where: { shopId, customerId: id },
        orderBy: { paidAt: "desc" },
      }),
      this.prisma.auditLog.findMany({
        where: {
          shopId,
          action: "customer.return",
          entityType: "Customer",
          entityId: id,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    type ReturnPayload = {
      boxes?: number;
      bottles?: number;
      notes?: string | null;
      returnedAt?: string;
    };

    const returnEntries = returnLogs.map((log) => {
      let payload: ReturnPayload = {};
      try {
        payload = log.afterJson
          ? (JSON.parse(log.afterJson) as ReturnPayload)
          : {};
      } catch {
        payload = {};
      }
      const when = payload.returnedAt
        ? new Date(payload.returnedAt)
        : log.createdAt;
      return {
        type: "return" as const,
        date: when,
        data: {
          id: log.id,
          customerId: id,
          boxes: payload.boxes ?? 0,
          bottles: payload.bottles ?? 0,
          notes: payload.notes ?? null,
          recordedById: log.actorUserId,
          createdAt: log.createdAt,
        },
      };
    });

    const entries = [
      ...sales.map((s) => ({
        type: "sale" as const,
        date: s.saleDate,
        data: s,
      })),
      ...payments.map((p) => ({
        type: "payment" as const,
        date: p.paidAt,
        data: p,
      })),
      ...returnEntries,
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    return entries;
  }

  /**
   * Recomputes creditBalanceCents, outstandingBoxes and outstandingBottles for a
   * customer from the source-of-truth transaction records, and persists the
   * result if it differs from the stored values.
   *
   * The stored fields are incremental counters maintained by sale/payment/return
   * operations. They can drift from reality (seed data, manually deleted rows,
   * historical bugs). This derives the authoritative figures:
   *   creditBalanceCents = Σ(non-voided sale subtotals) − Σ(non-voided payments)
   *   outstandingBoxes   = Σ(sale.boxesOutDelta − boxesReturnedOnSale) − Σ(returned boxes)
   *   outstandingBottles = Σ(sale.bottlesOutDelta − bottlesReturnedOnSale) − Σ(returned bottles)
   */
  async recalculateBalances(shopId: string, customerId: string) {
    const current = await this.findOne(shopId, customerId);

    const [sales, payments, returnLogs] = await Promise.all([
      this.prisma.sale.findMany({
        where: { shopId, customerId, status: { not: SaleStatus.VOIDED } },
        select: {
          subtotalCents: true,
          boxesOutDelta: true,
          bottlesOutDelta: true,
          boxesReturnedOnSale: true,
          bottlesReturnedOnSale: true,
        },
      }),
      this.prisma.payment.findMany({
        where: { shopId, customerId, voidedAt: null },
        select: { amountCents: true },
      }),
      this.prisma.auditLog.findMany({
        where: {
          shopId,
          action: "customer.return",
          entityType: "Customer",
          entityId: customerId,
        },
        select: { afterJson: true },
      }),
    ]);

    const billedCents = sales.reduce((sum, s) => sum + s.subtotalCents, 0);
    const paidCents = payments.reduce((sum, p) => sum + p.amountCents, 0);
    const creditBalanceCents = billedCents - paidCents;

    let outstandingBoxes = sales.reduce(
      (sum, s) => sum + s.boxesOutDelta - s.boxesReturnedOnSale,
      0,
    );
    let outstandingBottles = sales.reduce(
      (sum, s) => sum + s.bottlesOutDelta - s.bottlesReturnedOnSale,
      0,
    );
    for (const log of returnLogs) {
      let payload: { boxes?: number; bottles?: number } = {};
      try {
        payload = log.afterJson ? JSON.parse(log.afterJson) : {};
      } catch {
        payload = {};
      }
      outstandingBoxes -= payload.boxes ?? 0;
      outstandingBottles -= payload.bottles ?? 0;
    }

    if (
      current.creditBalanceCents === creditBalanceCents &&
      current.outstandingBoxes === outstandingBoxes &&
      current.outstandingBottles === outstandingBottles
    ) {
      return current;
    }

    return this.prisma.customer.update({
      where: { id: customerId },
      data: { creditBalanceCents, outstandingBoxes, outstandingBottles },
    });
  }

  /**
   * Bulk variant of recalculateBalances — recomputes and heals every customer
   * in the shop in a fixed number of queries. Used to correct drifted counters
   * across the whole customer table (e.g. after seed data or historical bugs).
   */
  async recalculateAllBalances(shopId: string) {
    const [customers, salesAgg, paymentsAgg, returnLogs] = await Promise.all([
      this.prisma.customer.findMany({
        where: { shopId, deletedAt: null },
        select: {
          id: true,
          creditBalanceCents: true,
          outstandingBoxes: true,
          outstandingBottles: true,
        },
      }),
      this.prisma.sale.groupBy({
        by: ["customerId"],
        where: { shopId, status: { not: SaleStatus.VOIDED } },
        _sum: {
          subtotalCents: true,
          boxesOutDelta: true,
          bottlesOutDelta: true,
          boxesReturnedOnSale: true,
          bottlesReturnedOnSale: true,
        },
      }),
      this.prisma.payment.groupBy({
        by: ["customerId"],
        where: { shopId, voidedAt: null },
        _sum: { amountCents: true },
      }),
      this.prisma.auditLog.findMany({
        where: { shopId, action: "customer.return", entityType: "Customer" },
        select: { entityId: true, afterJson: true },
      }),
    ]);

    const salesMap = new Map(salesAgg.map((r) => [r.customerId, r._sum]));
    const paidMap = new Map(
      paymentsAgg.map((r) => [r.customerId, r._sum.amountCents ?? 0]),
    );
    const returnsMap = new Map<string, { boxes: number; bottles: number }>();
    for (const log of returnLogs) {
      if (!log.entityId) continue;
      let payload: { boxes?: number; bottles?: number } = {};
      try {
        payload = log.afterJson ? JSON.parse(log.afterJson) : {};
      } catch {
        payload = {};
      }
      const acc = returnsMap.get(log.entityId) ?? { boxes: 0, bottles: 0 };
      acc.boxes += payload.boxes ?? 0;
      acc.bottles += payload.bottles ?? 0;
      returnsMap.set(log.entityId, acc);
    }

    let corrected = 0;
    for (const c of customers) {
      const s = salesMap.get(c.id);
      const ret = returnsMap.get(c.id) ?? { boxes: 0, bottles: 0 };
      const creditBalanceCents =
        (s?.subtotalCents ?? 0) - (paidMap.get(c.id) ?? 0);
      const outstandingBoxes =
        (s?.boxesOutDelta ?? 0) - (s?.boxesReturnedOnSale ?? 0) - ret.boxes;
      const outstandingBottles =
        (s?.bottlesOutDelta ?? 0) -
        (s?.bottlesReturnedOnSale ?? 0) -
        ret.bottles;

      if (
        c.creditBalanceCents !== creditBalanceCents ||
        c.outstandingBoxes !== outstandingBoxes ||
        c.outstandingBottles !== outstandingBottles
      ) {
        await this.prisma.customer.update({
          where: { id: c.id },
          data: { creditBalanceCents, outstandingBoxes, outstandingBottles },
        });
        corrected++;
      }
    }

    return {
      customersChecked: customers.length,
      customersCorrected: corrected,
    };
  }

  async recordPayment(
    shopId: string,
    customerId: string,
    dto: RecordCustomerPaymentDto,
    actorUserId: string,
  ) {
    const customer = await this.findOne(shopId, customerId);

    const account = await this.prisma.paymentAccount.findFirst({
      where: { id: dto.paymentAccountId, shopId, deletedAt: null },
    });
    if (!account)
      throw AppException.notFound("PaymentAccount", dto.paymentAccountId);

    await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          shopId,
          saleId: null,
          customerId,
          amountCents: dto.amountCents,
          method: dto.method,
          paymentAccountId: dto.paymentAccountId,
          reference: dto.reference ?? null,
          notes: dto.notes ?? null,
          paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
          recordedById: actorUserId,
        },
      });

      await tx.customer.update({
        where: { id: customerId },
        data: { creditBalanceCents: { decrement: dto.amountCents } },
      });

      await tx.auditLog.create({
        data: {
          shopId,
          actorUserId,
          action: "customer.payment",
          entityType: "Payment",
          entityId: payment.id,
          afterJson: JSON.stringify({
            customerId,
            amountCents: dto.amountCents,
            previousBalanceCents: customer.creditBalanceCents,
          }),
        },
      });
    });

    return this.findOne(shopId, customerId);
  }

  async recordReturn(
    shopId: string,
    customerId: string,
    dto: RecordContainerReturnDto,
    actorUserId: string,
  ) {
    if (dto.boxes <= 0 && dto.bottles <= 0) {
      throw new AppException({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Provide at least one box or bottle to return",
        status: 422,
      });
    }

    const customer = await this.findOne(shopId, customerId);

    await this.prisma.$transaction(async (tx) => {
      await tx.customer.update({
        where: { id: customerId },
        data: {
          outstandingBoxes: { decrement: dto.boxes },
          outstandingBottles: { decrement: dto.bottles },
        },
      });

      await tx.auditLog.create({
        data: {
          shopId,
          actorUserId,
          action: "customer.return",
          entityType: "Customer",
          entityId: customerId,
          afterJson: JSON.stringify({
            boxes: dto.boxes,
            bottles: dto.bottles,
            notes: dto.notes ?? null,
            returnedAt: dto.returnedAt ?? new Date().toISOString(),
            previousBoxes: customer.outstandingBoxes,
            previousBottles: customer.outstandingBottles,
          }),
        },
      });
    });

    return this.findOne(shopId, customerId);
  }

  async setCredentials(
    shopId: string,
    customerId: string,
    username: string,
    pin: string,
  ): Promise<any> {
    const customer = await this.findOne(shopId, customerId);

    const existing = await this.prisma.customer.findUnique({
      where: { username: username.trim() },
    });
    if (existing && existing.id !== customerId) {
      throw new ConflictException("Username is already taken");
    }

    const pinHash = await argon2.hash(pin);
    return this.prisma.customer.update({
      where: { id: customerId },
      data: {
        username: username.trim(),
        pinHash,
        mustChangePassword: true,
      },
      select: {
        id: true,
        name: true,
        username: true,
        phone: true,
        mustChangePassword: true,
        passwordChangedAt: true,
      },
    });
  }

  /**
   * Sends an email OTP to the customer's email for verification.
   */
  async sendCustomerEmailOtp(shopId: string, customerId: string): Promise<void> {
    const customer = await this.findOne(shopId, customerId);
    if (!customer.email) {
      throw new BadRequestException("Customer has no email address on file");
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = this.hashToken(code);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await this.prisma.customerEmailVerificationToken.deleteMany({
      where: { customerId },
    });
    await this.prisma.customerEmailVerificationToken.create({
      data: { customerId, codeHash, expiresAt },
    });

    await this.mail.sendOtp(customer.email, {
      name: customer.name,
      code,
      appName: "LeLa Kasa",
    });
  }

  /**
   * Verifies the customer's email with an OTP code.
   */
  async verifyCustomerEmailOtp(
    shopId: string,
    customerId: string,
    code: string,
  ): Promise<void> {
    await this.findOne(shopId, customerId);

    const codeHash = this.hashToken(code);
    const record = await this.prisma.customerEmailVerificationToken.findFirst({
      where: {
        customerId,
        codeHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });
    if (!record) {
      throw new BadRequestException("Invalid or expired email verification code");
    }

    await this.prisma.$transaction([
      this.prisma.customer.update({
        where: { id: customerId },
        data: { emailVerified: true },
      }),
      this.prisma.customerEmailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);
  }

  /**
   * Owner-initiated: generates a random reset code for the customer's portal
   * and sends it to their email so they can set a new PIN.
   */
  async resetPin(shopId: string, customerId: string): Promise<{ sent: boolean }> {
    const customer = await this.findOne(shopId, customerId);
    if (!customer.email) {
      throw new BadRequestException(
        "Customer has no email address. Set an email before resetting their PIN.",
      );
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = this.hashToken(code);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await this.prisma.customerPinResetToken.deleteMany({
      where: { customerId },
    });
    await this.prisma.customerPinResetToken.create({
      data: { customerId, codeHash, expiresAt },
    });

    await this.mail.sendOtp(customer.email, {
      name: customer.name,
      code,
      appName: "LeLa Kasa",
    });

    return { sent: true };
  }

  async sendCustomerSms(
    shopId: string,
    customerId: string,
    text: string,
  ): Promise<void> {
    const customer = await this.findOne(shopId, customerId);
    if (!customer.phone) {
      throw new BadRequestException("Customer has no phone number on file");
    }
    await this.sms.sendSms(customer.phone, text);
  }

  /**
   * Sends a payment / container reminder to a customer across every channel
   * available for them — SMS, WhatsApp (when enabled) and Telegram (when the
   * customer has linked their account). The balance is recalculated from
   * source transactions first so the figures quoted are authoritative, and the
   * message text comes from the shop's `reminder_template` ShopSetting (falling
   * back to the built-in default).
   */
  async sendReminder(shopId: string, customerId: string, actorUserId: string) {
    // Heal the stored counters before quoting any numbers to the customer.
    const customer = await this.recalculateBalances(shopId, customerId);

    if (
      customer.creditBalanceCents <= 0 &&
      customer.outstandingBoxes <= 0 &&
      customer.outstandingBottles <= 0
    ) {
      throw new BadRequestException(
        "This customer has nothing outstanding — no reminder needed.",
      );
    }

    // ── Rate limit — one reminder per customer per 2 hours ──────────────────
    const lastReminder = await this.prisma.auditLog.findFirst({
      where: {
        shopId,
        action: "customer.reminder",
        entityType: "Customer",
        entityId: customerId,
      },
      orderBy: { createdAt: "desc" },
    });
    if (lastReminder) {
      const elapsedMs = Date.now() - lastReminder.createdAt.getTime();
      if (elapsedMs < CustomersService.REMINDER_THROTTLE_MS) {
        const retryAfterMinutes = Math.ceil(
          (CustomersService.REMINDER_THROTTLE_MS - elapsedMs) / 60000,
        );
        return {
          success: false,
          throttled: true,
          retryAfterMinutes,
          channels: [] as string[],
          message: `A reminder was already sent recently. Try again in about ${retryAfterMinutes} minute${retryAfterMinutes === 1 ? "" : "s"}.`,
        };
      }
    }

    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { name: true },
    });

    // Resolve the message — a per-shop override wins over the code default.
    const override = await this.prisma.shopSetting.findUnique({
      where: { shopId_key: { shopId, key: "reminder_template" } },
    });
    const text = this.smsTemplates.renderReminder(
      override?.value || this.smsTemplates.reminderDefaultTemplate(),
      {
        name: customer.name,
        shopName: shop?.name ?? "your shop",
        amountCents: customer.creditBalanceCents,
        boxes: customer.outstandingBoxes,
        bottles: customer.outstandingBottles,
      },
    );

    const channels: string[] = [];

    if (customer.phone) {
      try {
        await this.sms.sendSms(customer.phone, text);
        channels.push("SMS");
      } catch (e) {
        this.logger.error(
          `[reminder] SMS failed for ${customerId}: ${String(e)}`,
        );
      }
      if (await this.whatsapp.isEnabled()) {
        try {
          await this.whatsapp.sendMessage(customer.phone, text);
          channels.push("WhatsApp");
        } catch (e) {
          this.logger.error(
            `[reminder] WhatsApp failed for ${customerId}: ${String(e)}`,
          );
        }
      }
    }

    if (customer.telegramChatId) {
      try {
        const sent = await this.telegram.sendToCustomer(customerId, text);
        if (sent) channels.push("Telegram");
      } catch (e) {
        this.logger.error(
          `[reminder] Telegram failed for ${customerId}: ${String(e)}`,
        );
      }
    }

    if (channels.length === 0) {
      throw new BadRequestException(
        "No way to reach this customer — add a phone number or have them connect Telegram.",
      );
    }

    await this.prisma.auditLog.create({
      data: {
        shopId,
        actorUserId,
        action: "customer.reminder",
        entityType: "Customer",
        entityId: customerId,
        afterJson: JSON.stringify({
          channels,
          text,
          creditBalanceCents: customer.creditBalanceCents,
          outstandingBoxes: customer.outstandingBoxes,
          outstandingBottles: customer.outstandingBottles,
        }),
      },
    });

    return {
      success: true,
      throttled: false,
      channels,
      message: `Reminder sent via ${channels.join(", ")}.`,
    };
  }

  /**
   * Creates a Telegram deep link the owner can share with a customer so the
   * customer can connect and receive reminders through the bot.
   */
  async generateTelegramLink(shopId: string, customerId: string) {
    await this.findOne(shopId, customerId);
    const configured = await this.telegram.isConfigured();
    if (!configured) {
      return { configured: false, deepLink: "", code: "", botUsername: "" };
    }
    const link = await this.telegram.createLinkCode(
      "CUSTOMER",
      customerId,
      shopId,
    );
    return { configured: true, ...link };
  }
}
