import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "crypto";

import { PrismaService } from "../prisma/prisma.service";
import { ChapaService } from "./chapa.service";

interface CheckoutUser {
  id: string;
  email: string;
  name?: string | null;
}

/** Encoded into PaymentTransaction.notes so the webhook can rebuild the order. */
interface TxMeta {
  planId: string;
  billingCycle: "monthly" | "yearly";
  userId: string;
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly chapa: ChapaService,
  ) {}

  /** Finds (or lazily creates) the Chapa payment-provider row. */
  private async getChapaProviderId(): Promise<string> {
    const existing = await this.prisma.paymentProvider.findFirst({
      where: { OR: [{ kind: "CHAPA" }, { name: "Chapa" }] },
    });
    if (existing) return existing.id;
    const created = await this.prisma.paymentProvider.create({
      data: { name: "Chapa", kind: "CHAPA", isActive: true, sortOrder: 0 },
    });
    return created.id;
  }

  /**
   * Starts a Chapa checkout for a subscription plan. Records a PENDING
   * PaymentTransaction and returns the hosted-checkout URL.
   */
  async createChapaCheckout(
    shopId: string,
    user: CheckoutUser,
    dto: { planId: string; billingCycle?: "monthly" | "yearly" },
  ) {
    const billingCycle = dto.billingCycle === "yearly" ? "yearly" : "monthly";

    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: dto.planId },
    });
    if (!plan || !plan.isActive)
      throw new NotFoundException("Subscription plan not found");

    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { name: true },
    });
    if (!shop) throw new NotFoundException("Shop not found");

    const amountCents =
      billingCycle === "yearly"
        ? plan.yearlyPriceCents || plan.monthlyPriceCents * 12
        : plan.monthlyPriceCents;
    if (amountCents <= 0) {
      throw new BadRequestException("This plan has no payable price");
    }

    const providerId = await this.getChapaProviderId();
    const txRef = `kasa-sub-${randomUUID().replace(/-/g, "")}`;
    const meta: TxMeta = { planId: plan.id, billingCycle, userId: user.id };

    await this.prisma.paymentTransaction.create({
      data: {
        shopId,
        providerId,
        amountCents,
        status: "PENDING",
        reference: txRef,
        notes: JSON.stringify(meta),
      },
    });

    const [firstName, ...rest] = (user.name?.trim() || "LeLa Kasa Owner").split(
      /\s+/,
    );
    const { checkoutUrl } = await this.chapa.initialize({
      amountCents,
      currency: "ETB",
      email: user.email,
      firstName: firstName || "LelaKasa",
      lastName: rest.join(" ") || "Owner",
      txRef,
      title: "LeLa Kasa Plan",
      description: `${plan.name} subscription (${billingCycle})`,
    });

    return { checkoutUrl, txRef };
  }

  /**
   * Verifies a transaction with Chapa and, if paid, activates the subscription.
   * Idempotent — safe to call from both the webhook and the return-page poll.
   */
  async activateByTxRef(
    txRef: string,
  ): Promise<{ activated: boolean; status: string }> {
    const tx = await this.prisma.paymentTransaction.findFirst({
      where: { reference: txRef },
    });
    if (!tx) return { activated: false, status: "NOT_FOUND" };
    if (tx.status === "CONFIRMED")
      return { activated: true, status: "CONFIRMED" };

    const result = await this.chapa.verify(txRef);
    if (!result.paid) {
      return { activated: false, status: result.status.toUpperCase() };
    }

    let meta: TxMeta;
    try {
      meta = JSON.parse(tx.notes ?? "{}") as TxMeta;
    } catch {
      this.logger.error(`Transaction ${txRef} has unreadable metadata`);
      return { activated: false, status: "BAD_METADATA" };
    }

    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: meta.planId },
    });
    if (!plan) return { activated: false, status: "PLAN_GONE" };

    const now = new Date();
    const existing = await this.prisma.subscription.findUnique({
      where: { shopId: tx.shopId },
    });
    // Extend from the later of "now" and the current paid-through date.
    const base =
      existing?.paidUntil && existing.paidUntil > now
        ? new Date(existing.paidUntil)
        : now;
    const paidUntil = new Date(base);
    if (meta.billingCycle === "yearly")
      paidUntil.setFullYear(paidUntil.getFullYear() + 1);
    else paidUntil.setMonth(paidUntil.getMonth() + 1);

    await this.prisma.$transaction(async (db) => {
      await db.paymentTransaction.update({
        where: { id: tx.id },
        data: { status: "CONFIRMED", confirmedAt: now },
      });

      const subscription = await db.subscription.upsert({
        where: { shopId: tx.shopId },
        create: {
          shopId: tx.shopId,
          planId: plan.id,
          status: "ACTIVE",
          billingCycle: meta.billingCycle,
          amountCents: tx.amountCents,
          startDate: now,
          paidAt: now,
          paidUntil,
        },
        update: {
          planId: plan.id,
          status: "ACTIVE",
          billingCycle: meta.billingCycle,
          amountCents: tx.amountCents,
          paidAt: now,
          paidUntil,
          cancelledAt: null,
          suspendReason: null,
        },
      });

      await db.subscriptionLog.create({
        data: {
          subscriptionId: subscription.id,
          shopId: tx.shopId,
          action: "PAYMENT",
          planId: plan.id,
          amountCents: tx.amountCents,
          newStatus: "ACTIVE",
          notes: `Chapa payment confirmed — ${txRef}`,
        },
      });
    });

    this.logger.log(
      `Subscription activated for shop ${tx.shopId} via Chapa ${txRef}`,
    );
    return { activated: true, status: "CONFIRMED" };
  }

  /** Webhook entry point. Re-verifies with Chapa before activating anything. */
  async handleWebhook(
    rawBody: Buffer | undefined,
    signature: string | undefined,
    body: Record<string, unknown>,
  ): Promise<{ received: boolean }> {
    const cfg = await this.chapa.getConfig();
    if (!this.chapa.verifySignature(rawBody, signature, cfg.webhookSecret)) {
      // Don't hard-fail — Chapa's verify() API below is the real gate — but log it.
      this.logger.warn(
        "Chapa webhook signature mismatch — proceeding with API verification",
      );
    }

    const txRef =
      (body["tx_ref"] as string) ||
      (body["trx_ref"] as string) ||
      (body["reference"] as string) ||
      "";
    if (!txRef) {
      this.logger.warn("Chapa webhook received with no tx_ref");
      return { received: true };
    }

    try {
      await this.activateByTxRef(txRef);
    } catch (err) {
      this.logger.error(
        `Chapa webhook activation failed for ${txRef}: ${String(err)}`,
      );
    }
    return { received: true };
  }

  /** Used by the checkout return page to poll the outcome of a payment. */
  async getCheckoutStatus(shopId: string, txRef: string) {
    const tx = await this.prisma.paymentTransaction.findFirst({
      where: { reference: txRef, shopId },
    });
    if (!tx) throw new NotFoundException("Transaction not found");
    if (tx.status === "PENDING") {
      // Lazily settle if Chapa already processed it but the webhook hasn't landed.
      await this.activateByTxRef(txRef).catch(() => undefined);
      const fresh = await this.prisma.paymentTransaction.findUnique({
        where: { id: tx.id },
      });
      return {
        status: fresh?.status ?? tx.status,
        amountCents: tx.amountCents,
      };
    }
    return { status: tx.status, amountCents: tx.amountCents };
  }
}
