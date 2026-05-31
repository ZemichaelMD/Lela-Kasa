import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthenticatedUser } from "../common/types/authenticated-user";

type SaleLinePayload = {
  beverage_id: string;
  boxes: number;
  bottles: number;
  price_per_box_cents: number;
  price_per_bottle_cents: number;
};

@Injectable()
export class SyncService {
  constructor(private readonly prisma: PrismaService) {}

  async sync(user: AuthenticatedUser, body: any) {
    const { shopId, outbox, lastSyncCursor } = body;

    // 1. Authorization Check
    if (user.shopId !== shopId && user.role !== "SUPER_ADMIN") {
      throw new UnauthorizedException("You do not have access to this shop");
    }

    const results = [];

    // 2. Process Outbox (Push)
    if (outbox && outbox.length > 0) {
      for (const item of outbox) {
        const result = await this.processOutboxItem(shopId, user.id, item);
        results.push(result);
      }
    }

    // 3. Fetch Changes (Pull)
    const changes = await this.fetchChanges(shopId, lastSyncCursor);

    return {
      serverTime: new Date().toISOString(),
      newSyncCursor: new Date().toISOString(), // Simple cursor for now
      results,
      changes,
    };
  }

  private async processOutboxItem(shopId: string, userId: string, item: any) {
    const {
      id: outboxId,
      entityType,
      operation,
      clientMutationId,
      payload,
    } = item;

    // Idempotency Check
    const existing = await this.prisma.processedMutation.findUnique({
      where: { clientMutationId },
    });

    if (existing) {
      return { outboxId, status: "SUCCESS", serverId: existing.serverId };
    }

    try {
      let serverId: string;

      switch (entityType) {
        case "customers":
          serverId = await this.handleCustomerSync(shopId, payload);
          break;
        case "sales":
          serverId = await this.handleSaleSync(shopId, userId, payload);
          break;
        // Add other cases here
        default:
          throw new Error(`Unsupported entity type: ${entityType}`);
      }

      await this.prisma.processedMutation.create({
        data: {
          clientMutationId,
          serverId,
          entityType,
          shopId,
        },
      });

      return { outboxId, status: "SUCCESS", serverId };
    } catch (error: any) {
      return {
        outboxId,
        status: "ERROR",
        error: error?.message || "Unknown error",
      };
    }
  }

  private async handleCustomerSync(shopId: string, payload: any) {
    const customer = await this.prisma.customer.create({
      data: {
        ...payload,
        shopId,
      },
    });
    return customer.id;
  }

  private async handleSaleSync(shopId: string, userId: string, payload: any) {
    const { lines, payment, payments, returned_containers, container_kasas, ...saleData } = payload;
    const allPayments = payments?.length ? payments : payment ? [payment] : [];

    return await this.prisma.$transaction(async (tx) => {
      // Compute totals — matching SalesService.createSale() logic
      const subtotalCents = saleData.subtotal_cents ?? 0;
      const paidCents = saleData.paid_cents ?? 0;
      const creditDeltaCents = subtotalCents - paidCents;

      const containerKasaTotal = (container_kasas ?? []).reduce(
        (sum: number, k: any) => sum + (k.count || 0), 0,
      );
      const boxesOutDelta = lines.reduce(
        (sum: number, l: SaleLinePayload) => sum + (l.boxes || 0), 0,
      ) + containerKasaTotal;
      const bottlesOutDelta = lines.reduce(
        (sum: number, l: SaleLinePayload) => sum + (l.bottles || 0), 0,
      );
      const boxesReturnedOnSale = (returned_containers ?? []).reduce(
        (sum: number, r: any) => sum + (r.boxes || 0), 0,
      );
      const bottlesReturnedOnSale = (returned_containers ?? []).reduce(
        (sum: number, r: any) => sum + (r.bottles || 0), 0,
      );

      // 1. Create Sale — map snake_case payload fields to camelCase for Prisma
      const sale = await tx.sale.create({
        data: {
          customerId: saleData.customer_id,
          saleDate: saleData.sale_date,
          priceTierId: saleData.price_tier_id,
          ...(saleData.notes !== undefined ? { notes: saleData.notes } : {}),
          subtotalCents,
          paidCents,
          creditDeltaCents,
          boxesOutDelta,
          bottlesOutDelta,
          boxesReturnedOnSale,
          bottlesReturnedOnSale,
          shopId,
          createdById: userId,
          lines: {
            create: lines.map((line: SaleLinePayload) => ({
              beverageId: line.beverage_id,
              boxes: line.boxes,
              bottles: line.bottles,
              pricePerBoxCents: line.price_per_box_cents,
              pricePerBottleCents: line.price_per_bottle_cents,
              lineTotalCents:
                line.boxes * line.price_per_box_cents +
                line.bottles * line.price_per_bottle_cents,
            })),
          },
        },
      });

      // 2. Handle Payments
      for (const pmt of allPayments) {
        await tx.payment.create({
          data: {
            shopId,
            saleId: sale.id,
            customerId: saleData.customer_id,
            amountCents: pmt.amount_cents,
            method: pmt.method,
            paymentAccountId: pmt.payment_account_id,
            reference: pmt.reference,
            recordedById: userId,
          },
        });
      }

      // 3. Handle Returned Containers
      if (returned_containers) {
        for (const rc of returned_containers) {
          await tx.saleReturnedContainer.create({
            data: {
              saleId: sale.id,
              beverageId: rc.beverage_id,
              boxes: rc.boxes,
              bottles: rc.bottles,
            },
          });
        }
      }

      // 4. Handle Container Kasas
      if (container_kasas) {
        for (const ck of container_kasas) {
          await tx.saleContainerKasa.create({
            data: {
              saleId: sale.id,
              beverageId: ck.beverage_id,
              count: ck.count,
            },
          });
        }
      }

      // 5. Update customer balances — matching SalesService.createSale() logic
      if (saleData.customer_id) {
        await tx.customer.update({
          where: { id: saleData.customer_id },
          data: {
            creditBalanceCents: { increment: creditDeltaCents },
            outstandingBoxes: { increment: boxesOutDelta - boxesReturnedOnSale },
            outstandingBottles: { increment: bottlesOutDelta - bottlesReturnedOnSale },
          },
        });
      }

      return sale.id;
    });
  }

  private async fetchChanges(shopId: string, cursor: string) {
    const lastSync = cursor ? new Date(cursor) : new Date(0);

    // Fetch all entities updated after cursor
    const [customers, beverages, sales, payments, priceTiers, paymentAccounts] =
      await Promise.all([
        this.prisma.customer.findMany({
          where: { shopId, updatedAt: { gt: lastSync } },
        }),
        this.prisma.beverage.findMany({
          where: { shopId, updatedAt: { gt: lastSync } },
        }),
        this.prisma.sale.findMany({
          where: { shopId, updatedAt: { gt: lastSync } },
          include: { lines: true },
        }),
        this.prisma.payment.findMany({
          where: { shopId, updatedAt: { gt: lastSync } },
        }),
        this.prisma.priceTier.findMany({
          where: { shopId, updatedAt: { gt: lastSync } },
        }),
        this.prisma.paymentAccount.findMany({
          where: { shopId, updatedAt: { gt: lastSync } },
        }),
      ]);

    // Fetch beverage prices for price tiers that changed
    const tierIds = priceTiers.map((t) => t.id);
    const beveragePrices =
      tierIds.length > 0
        ? await this.prisma.beveragePrice.findMany({
            where: { priceTierId: { in: tierIds } },
          })
        : [];

    return {
      customers,
      beverages,
      sales,
      payments,
      priceTiers,
      beveragePrices,
      paymentAccounts,
      tombstones: {}, // Add delete tracking logic later
    };
  }
}
