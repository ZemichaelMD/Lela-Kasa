import { Injectable } from "@nestjs/common";
import { SaleStatus } from "../database";

import { PrismaService } from "../prisma/prisma.service";

export interface DateRangeQuery {
  from?: string;
  to?: string;
}

// Simple in-memory cache for dashboard
const dashboardCache = new Map<string, { data: unknown; expiresAt: number }>();

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private buildSaleDateWhere(shopId: string, query: DateRangeQuery) {
    const where: Record<string, unknown> = {
      shopId,
      status: SaleStatus.CONFIRMED,
    };
    if (query.from || query.to) {
      const range: Record<string, Date> = {};
      if (query.from) range["gte"] = new Date(query.from);
      if (query.to) {
        // Expand a date-only "YYYY-MM-DD" to end-of-day UTC so same-day sales are included.
        const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(query.to);
        range["lte"] = new Date(
          isDateOnly ? `${query.to}T23:59:59.999Z` : query.to,
        );
      }
      where["saleDate"] = range;
    }
    return where;
  }

  /**
   * Where clause for non-voided payments in a date range, keyed off paidAt.
   * Covers BOTH sale-linked payments and account-level payments (those recorded
   * outside of a sale), so payment totals are not understated.
   */
  private buildPaymentDateWhere(shopId: string, query: DateRangeQuery) {
    const where: Record<string, unknown> = { shopId, voidedAt: null };
    if (query.from || query.to) {
      const range: Record<string, Date> = {};
      if (query.from) range["gte"] = new Date(query.from);
      if (query.to) {
        const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(query.to);
        range["lte"] = new Date(
          isDateOnly ? `${query.to}T23:59:59.999Z` : query.to,
        );
      }
      where["paidAt"] = range;
    }
    return where;
  }

  // ── salesSummary ─────────────────────────────────────────────────────────────

  async salesSummary(shopId: string, query: DateRangeQuery) {
    const where = this.buildSaleDateWhere(shopId, query);

    const [allSales, byDayRaw, byPriceTierRaw] = await Promise.all([
      this.prisma.sale.aggregate({
        where,
        _sum: { subtotalCents: true },
        _count: { _all: true },
      }),
      this.prisma.sale.groupBy({
        by: ["saleDate"],
        where,
        _sum: { subtotalCents: true },
        _count: { _all: true },
        orderBy: { saleDate: "asc" },
      }),
      this.prisma.sale.groupBy({
        by: ["priceTierId"],
        where,
        _sum: { subtotalCents: true },
        _count: { _all: true },
      }),
    ]);

    // Resolve priceTier names
    const tierIds = byPriceTierRaw.map((r) => r.priceTierId);
    const tiers = tierIds.length
      ? await this.prisma.priceTier.findMany({
          where: { id: { in: tierIds } },
          select: { id: true, name: true },
        })
      : [];
    const tierMap = new Map(tiers.map((t) => [t.id, t.name]));

    return {
      totalAmountCents: allSales._sum.subtotalCents ?? 0,
      totalCount: allSales._count._all,
      byDay: byDayRaw.map((r) => ({
        date: r.saleDate.toISOString().slice(0, 10),
        amountCents: r._sum.subtotalCents ?? 0,
        count: r._count._all,
      })),
      byPriceTier: byPriceTierRaw.map((r) => ({
        priceTierId: r.priceTierId,
        tierName: tierMap.get(r.priceTierId) ?? r.priceTierId,
        amountCents: r._sum.subtotalCents ?? 0,
        count: r._count._all,
      })),
    };
  }

  // ── salesByCustomer ──────────────────────────────────────────────────────────

  async salesByCustomer(shopId: string, query: DateRangeQuery) {
    const where = this.buildSaleDateWhere(shopId, query);

    const rows = await this.prisma.sale.groupBy({
      by: ["customerId"],
      where,
      _count: { _all: true },
      _sum: { subtotalCents: true },
    });

    const customerIds = rows.map((r) => r.customerId);
    if (customerIds.length === 0) return [];

    // Total received from each customer in the same window — counts BOTH
    // sale-linked payments and payments recorded outside a sale. Keyed off the
    // payment's own paidAt, not the sale, so account payments are not missed.
    const paymentRows = await this.prisma.payment.groupBy({
      by: ["customerId"],
      where: {
        ...this.buildPaymentDateWhere(shopId, query),
        customerId: { in: customerIds },
      },
      _sum: { amountCents: true },
    });
    const paidMap = new Map(
      paymentRows.map((r) => [r.customerId, r._sum.amountCents ?? 0]),
    );

    const customers = await this.prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: {
        id: true,
        name: true,
        outstandingBoxes: true,
        outstandingBottles: true,
      },
    });
    const customerMap = new Map(customers.map((c) => [c.id, c]));

    return rows.map((r) => {
      const c = customerMap.get(r.customerId);
      const subtotalCents = r._sum.subtotalCents ?? 0;
      const paidCents = paidMap.get(r.customerId) ?? 0;
      return {
        customerId: r.customerId,
        customerName: c?.name ?? r.customerId,
        salesCount: r._count._all,
        subtotalCents,
        paidCents,
        creditCents: subtotalCents - paidCents,
        outstandingBoxes: c?.outstandingBoxes ?? 0,
        outstandingBottles: c?.outstandingBottles ?? 0,
      };
    });
  }

  // ── salesByBeverage ──────────────────────────────────────────────────────────

  async salesByBeverage(shopId: string, query: DateRangeQuery) {
    const saleWhere = this.buildSaleDateWhere(shopId, query);

    // Get sale IDs matching the date/status filter
    const matchingSales = await this.prisma.sale.findMany({
      where: saleWhere,
      select: { id: true },
    });
    const saleIds = matchingSales.map((s) => s.id);

    if (saleIds.length === 0) return [];

    const rows = await this.prisma.saleLine.groupBy({
      by: ["beverageId"],
      where: { saleId: { in: saleIds } },
      _sum: { boxes: true, bottles: true, lineTotalCents: true },
    });

    const beverageIds = rows.map((r) => r.beverageId);
    const beverages = beverageIds.length
      ? await this.prisma.beverage.findMany({
          where: { id: { in: beverageIds } },
          select: { id: true, name: true },
        })
      : [];
    const beverageMap = new Map(beverages.map((b) => [b.id, b.name]));

    return rows.map((r) => ({
      beverageId: r.beverageId,
      beverageName: beverageMap.get(r.beverageId) ?? r.beverageId,
      boxesSold: r._sum.boxes ?? 0,
      bottlesSold: r._sum.bottles ?? 0,
      totalAmountCents: r._sum.lineTotalCents ?? 0,
    }));
  }

  // ── salesByPaymentAccount ────────────────────────────────────────────────────

  async salesByPaymentAccount(shopId: string, query: DateRangeQuery) {
    // All non-voided payments in the window, keyed off paidAt — this includes
    // account-level payments (debt settled outside a sale), not just payments
    // attached to a sale.
    const paymentWhere = this.buildPaymentDateWhere(shopId, query);

    // Group by paymentAccountId + method
    const byMethod = await this.prisma.payment.groupBy({
      by: ["paymentAccountId", "method"],
      where: paymentWhere,
      _sum: { amountCents: true },
      _count: { _all: true },
    });

    // Group by paymentAccountId for totals
    const byAccount = await this.prisma.payment.groupBy({
      by: ["paymentAccountId"],
      where: paymentWhere,
      _sum: { amountCents: true },
      _count: { _all: true },
    });

    const accountIds = byAccount.map((r) => r.paymentAccountId);
    const accounts = accountIds.length
      ? await this.prisma.paymentAccount.findMany({
          where: { id: { in: accountIds } },
          select: { id: true, name: true, kind: true },
        })
      : [];
    const accountMap = new Map(accounts.map((a) => [a.id, a]));

    return byAccount.map((row) => {
      const account = accountMap.get(row.paymentAccountId);
      const methods = byMethod
        .filter((m) => m.paymentAccountId === row.paymentAccountId)
        .map((m) => ({
          method: m.method,
          totalCents: m._sum.amountCents ?? 0,
          count: m._count._all,
        }));

      return {
        accountId: row.paymentAccountId,
        accountName: account?.name ?? row.paymentAccountId,
        kind: account?.kind ?? null,
        totalAmountCents: row._sum.amountCents ?? 0,
        count: row._count._all,
        byMethod: methods,
      };
    });
  }

  // ── creditAging ──────────────────────────────────────────────────────────────

  async creditAging(shopId: string) {
    const customers = await this.prisma.customer.findMany({
      where: { shopId, creditBalanceCents: { gt: 0 }, deletedAt: null },
      select: { id: true, name: true, creditBalanceCents: true },
    });

    if (customers.length === 0) return [];

    const now = new Date();

    // Find oldest unpaid (confirmed) sale per customer
    const customerIds = customers.map((c) => c.id);
    const oldestSales = await this.prisma.sale.findMany({
      where: {
        shopId,
        customerId: { in: customerIds },
        status: SaleStatus.CONFIRMED,
        creditDeltaCents: { gt: 0 },
      },
      select: { customerId: true, saleDate: true },
      orderBy: { saleDate: "asc" },
      distinct: ["customerId"],
    });

    const oldestDateMap = new Map(
      oldestSales.map((s) => [s.customerId, s.saleDate]),
    );

    return customers.map((c) => {
      const oldestDate = oldestDateMap.get(c.id);
      let daysOverdue = 0;
      if (oldestDate) {
        daysOverdue = Math.floor(
          (now.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24),
        );
      }

      let bucket: "0-30" | "31-60" | "61-90" | "90+";
      if (daysOverdue <= 30) bucket = "0-30";
      else if (daysOverdue <= 60) bucket = "31-60";
      else if (daysOverdue <= 90) bucket = "61-90";
      else bucket = "90+";

      return {
        customerId: c.id,
        customerName: c.name,
        creditBalanceCents: c.creditBalanceCents,
        ageBucket: bucket,
      };
    });
  }

  // ── containerDebt ────────────────────────────────────────────────────────────

  async containerDebt(shopId: string) {
    const customers = await this.prisma.customer.findMany({
      where: {
        shopId,
        deletedAt: null,
        OR: [
          { outstandingBoxes: { gt: 0 } },
          { outstandingBottles: { gt: 0 } },
        ],
      },
      select: {
        id: true,
        name: true,
        outstandingBoxes: true,
        outstandingBottles: true,
      },
      orderBy: { name: "asc" },
    });

    return customers.map((c) => ({
      customerId: c.id,
      customerName: c.name,
      outstandingBoxes: c.outstandingBoxes,
      outstandingBottles: c.outstandingBottles,
    }));
  }

  // ── stockOnHand ──────────────────────────────────────────────────────────────

  async stockOnHand(shopId: string) {
    const [beverages, shop] = await Promise.all([
      this.prisma.beverage.findMany({
        where: { shopId, deletedAt: null, isActive: true },
        select: {
          id: true,
          name: true,
          brand: true,
          stockBottles: true,
          bottlesPerBox: true,
        },
        orderBy: { name: "asc" },
      }),
      this.prisma.shop.findUnique({
        where: { id: shopId },
        select: { lowStockThreshold: true },
      }),
    ]);

    const threshold = shop?.lowStockThreshold ?? 2;

    return beverages.map((b) => ({
      beverageId: b.id,
      beverageName: b.name,
      brand: b.brand ?? null,
      stockBottles: b.stockBottles,
      stockBoxes: Math.floor(b.stockBottles / b.bottlesPerBox),
      looseBottles: b.stockBottles % b.bottlesPerBox,
      isLowStock: b.stockBottles < b.bottlesPerBox * threshold,
    }));
  }

  // ── lowStock ─────────────────────────────────────────────────────────────────

  async lowStock(shopId: string) {
    const all = await this.stockOnHand(shopId);
    return all.filter((b) => b.isLowStock);
  }

  // ── dashboard ─────────────────────────────────────────────────────────────────

  async dashboard(shopId: string) {
    const cached = dashboardCache.get(shopId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 6);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const confirmedWhere = (from: Date) => ({
      shopId,
      status: SaleStatus.CONFIRMED,
      saleDate: { gte: from },
    });

    const [
      todaySales,
      weekSales,
      monthSales,
      creditAgg,
      creditCount,
      containerAgg,
      topCustomersRaw,
      topBeveragesRaw,
      lowStockBeverages,
      recentVoidsRaw,
    ] = await Promise.all([
      this.prisma.sale.aggregate({
        where: confirmedWhere(todayStart),
        _sum: { subtotalCents: true },
      }),
      this.prisma.sale.aggregate({
        where: confirmedWhere(weekStart),
        _sum: { subtotalCents: true },
      }),
      this.prisma.sale.aggregate({
        where: confirmedWhere(monthStart),
        _sum: { subtotalCents: true },
      }),
      this.prisma.customer.aggregate({
        where: { shopId, deletedAt: null, creditBalanceCents: { gt: 0 } },
        _sum: { creditBalanceCents: true },
      }),
      this.prisma.customer.count({
        where: { shopId, deletedAt: null, creditBalanceCents: { gt: 0 } },
      }),
      this.prisma.customer.aggregate({
        where: { shopId, deletedAt: null },
        _sum: { outstandingBoxes: true, outstandingBottles: true },
      }),
      this.prisma.sale.groupBy({
        by: ["customerId"],
        where: confirmedWhere(monthStart),
        _sum: { subtotalCents: true },
        orderBy: { _sum: { subtotalCents: "desc" } },
        take: 5,
      }),
      this.prisma.saleLine.groupBy({
        by: ["beverageId"],
        where: {
          sale: confirmedWhere(monthStart),
        },
        _sum: { boxes: true },
        orderBy: { _sum: { boxes: "desc" } },
        take: 5,
      }),
      this.prisma.beverage.findMany({
        where: { shopId, deletedAt: null, isActive: true },
        select: {
          id: true,
          name: true,
          stockBottles: true,
          bottlesPerBox: true,
        },
        orderBy: { stockBottles: "asc" },
        take: 10,
      }),
      this.prisma.sale.findMany({
        where: { shopId, status: SaleStatus.VOIDED, voidedAt: { not: null } },
        include: { customer: { select: { name: true } } },
        orderBy: { voidedAt: "desc" },
        take: 5,
      }),
    ]);

    // Resolve top customer names
    const topCustomerIds = topCustomersRaw.map((r) => r.customerId);
    const topCustomers = topCustomerIds.length
      ? await this.prisma.customer.findMany({
          where: { id: { in: topCustomerIds } },
          select: { id: true, name: true },
        })
      : [];
    const topCustomerMap = new Map(topCustomers.map((c) => [c.id, c.name]));

    // Resolve top beverage names
    const topBeverageIds = topBeveragesRaw.map((r) => r.beverageId);
    const topBeverages = topBeverageIds.length
      ? await this.prisma.beverage.findMany({
          where: { id: { in: topBeverageIds } },
          select: { id: true, name: true },
        })
      : [];
    const topBeverageMap = new Map(topBeverages.map((b) => [b.id, b.name]));

    // Shop threshold for low stock
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { lowStockThreshold: true },
    });
    const threshold = shop?.lowStockThreshold ?? 2;

    const data = {
      todaySalesCents: todaySales._sum.subtotalCents ?? 0,
      weekSalesCents: weekSales._sum.subtotalCents ?? 0,
      monthSalesCents: monthSales._sum.subtotalCents ?? 0,
      totalOutstandingCreditCents: creditAgg._sum.creditBalanceCents ?? 0,
      customersWithCreditCount: creditCount,
      outstandingBoxes: containerAgg._sum.outstandingBoxes ?? 0,
      outstandingBottles: containerAgg._sum.outstandingBottles ?? 0,
      topCustomers: topCustomersRaw.map((r) => ({
        name: topCustomerMap.get(r.customerId) ?? r.customerId,
        totalCents: r._sum.subtotalCents ?? 0,
      })),
      topBeverages: topBeveragesRaw.map((r) => ({
        name: topBeverageMap.get(r.beverageId) ?? r.beverageId,
        totalBoxes: r._sum.boxes ?? 0,
      })),
      lowStockBeverages: lowStockBeverages
        .filter((b) => b.stockBottles < b.bottlesPerBox * threshold)
        .map((b) => ({ name: b.name, stockBottles: b.stockBottles })),
      recentVoids: recentVoidsRaw.map((s) => ({
        id: s.id,
        customerName: s.customer.name,
        voidedAt: s.voidedAt,
      })),
    };

    dashboardCache.set(shopId, { data, expiresAt: Date.now() + 30_000 });
    return data;
  }
}
