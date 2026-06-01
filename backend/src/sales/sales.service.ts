import { HttpStatus, Injectable } from "@nestjs/common";
import { PaymentAccountKind, PaymentMethod, SaleStatus, StockMovementReason } from "../database";

import { PrismaService } from "../prisma/prisma.service";
import { AppException } from "../common/errors/app.exception";
import { ErrorCode } from "../contract";
import { findEntityIdByCode } from "../common/public-code";
import type { CreateSaleDto } from "./dto/create-sale.dto";
import type { UpdateSaleDto } from "./dto/update-sale.dto";
import type { AddPaymentDto } from "./dto/add-payment.dto";

export interface SaleListQuery {
  page?: number;
  pageSize?: number;
  sortBy?:
    | "saleDate"
    | "subtotalCents"
    | "paidCents"
    | "creditDeltaCents"
    | "createdAt";
  sortDir?: "asc" | "desc";
  dateFrom?: string;
  dateTo?: string;
  customerId?: string;
  customerCode?: string;
  status?: SaleStatus;
  paymentAccountId?: string;
  beverageId?: string;
  beverageCode?: string;
  hasCredit?: boolean;
  search?: string;
  createdById?: string;
}

function kindToPaymentMethod(kind: PaymentAccountKind): PaymentMethod {
  const map: Record<PaymentAccountKind, PaymentMethod> = {
    [PaymentAccountKind.CASH_PERSON]: PaymentMethod.CASH,
    [PaymentAccountKind.BANK]: PaymentMethod.BANK_TRANSFER,
    [PaymentAccountKind.MOBILE_MONEY]: PaymentMethod.MOBILE_MONEY,
    [PaymentAccountKind.OTHER]: PaymentMethod.OTHER,
  };
  return map[kind];
}

const SALE_INCLUDE = {
  customer: { select: { id: true, code: true, name: true, phone: true } },
  lines: {
    include: {
      beverage: { select: { id: true, code: true, name: true } },
    },
  },
  payments: {
    include: {
      paymentAccount: { select: { id: true, name: true } },
    },
  },
  containerKasas: {
    include: {
      beverage: { select: { id: true, code: true, name: true } },
    },
  },
  returnedContainers: {
    include: {
      beverage: { select: { id: true, code: true, name: true } },
    },
  },
  createdBy: { select: { id: true, name: true } },
  updatedBy: { select: { id: true, name: true } },
} as const;

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(shopId: string, query: SaleListQuery) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 25));
    const skip = (page - 1) * pageSize;

    const sortBy = query.sortBy ?? "saleDate";
    const sortDir = query.sortDir ?? "desc";

    // Build where
    const where: Record<string, unknown> = { shopId };

    if (query.status) {
      const statuses =
        typeof query.status === "string"
          ? query.status.split(",").map((s) => s.trim())
          : [query.status];
      where["status"] = statuses.length === 1 ? statuses[0] : { in: statuses };
    } else {
      where["status"] = { in: [SaleStatus.CONFIRMED, SaleStatus.OPEN] };
    }

    if (query.dateFrom || query.dateTo) {
      const range: Record<string, Date> = {};
      if (query.dateFrom) range["gte"] = new Date(query.dateFrom);
      if (query.dateTo) {
        // Expand a date-only "YYYY-MM-DD" to end-of-day UTC so same-day sales are included.
        const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(query.dateTo);
        range["lte"] = new Date(
          isDateOnly ? `${query.dateTo}T23:59:59.999Z` : query.dateTo,
        );
      }
      where["saleDate"] = range;
    }

    if (query.customerId) {
      where["customerId"] = query.customerId;
    } else if (query.customerCode) {
      const customerId = await findEntityIdByCode(
        this.prisma,
        "customer",
        shopId,
        query.customerCode,
      );
      if (customerId) {
        where["customerId"] = customerId;
      } else {
        // No match — force an empty result set without hitting the DB twice.
        where["customerId"] = "__no_match__";
      }
    }

    if (query.hasCredit === true) {
      where["creditDeltaCents"] = { gt: 0 };
    }

    if (query.paymentAccountId) {
      where["payments"] = {
        some: { paymentAccountId: query.paymentAccountId, voidedAt: null },
      };
    }

    if (query.beverageId) {
      where["lines"] = { some: { beverageId: query.beverageId } };
    } else if (query.beverageCode) {
      const beverageId = await findEntityIdByCode(
        this.prisma,
        "beverage",
        shopId,
        query.beverageCode,
      );
      if (beverageId) {
        where["lines"] = { some: { beverageId } };
      } else {
        where["lines"] = { some: { beverageId: "__no_match__" } };
      }
    }

    if (query.search) {
      const normalizedCode = query.search.trim().toUpperCase();
      const codeOnly = /^([A-Z]{1,8})-(\d{1,9})$/.test(normalizedCode);
      if (codeOnly) {
        const customerId = await findEntityIdByCode(
          this.prisma,
          "customer",
          shopId,
          normalizedCode,
        );
        where["customer"] = customerId
          ? { id: customerId }
          : { name: { contains: query.search, mode: "insensitive" } };
      } else {
        where["customer"] = {
          name: { contains: query.search, mode: "insensitive" },
        };
      }
    }

    if (query.createdById) {
      where["createdById"] = query.createdById;
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.sale.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [sortBy]: sortDir },
        include: SALE_INCLUDE,
      }),
      this.prisma.sale.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async exportSales(
    shopId: string,
    query: {
      dateFrom?: string;
      dateTo?: string;
      customerId?: string;
      status?: SaleStatus;
    },
  ) {
    const where: Record<string, unknown> = { shopId };

    if (query.status) {
      where["status"] = query.status;
    } else {
      where["status"] = { in: [SaleStatus.CONFIRMED, SaleStatus.OPEN] };
    }

    if (query.dateFrom || query.dateTo) {
      const range: Record<string, Date> = {};
      if (query.dateFrom) range["gte"] = new Date(query.dateFrom);
      if (query.dateTo) {
        const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(query.dateTo);
        range["lte"] = new Date(
          isDateOnly ? `${query.dateTo}T23:59:59.999Z` : query.dateTo,
        );
      }
      where["saleDate"] = range;
    }

    if (query.customerId) {
      where["customerId"] = query.customerId;
    }

    const sales = await this.prisma.sale.findMany({
      where,
      orderBy: { saleDate: "desc" },
      include: {
        customer: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
    });

    return sales.map((s) => ({
      id: s.id,
      saleDate: s.saleDate.toISOString().split("T")[0],
      customerName: s.customer?.name ?? "—",
      status: s.status,
      subtotalCents: s.subtotalCents,
      paidCents: s.paidCents,
      creditDeltaCents: s.creditDeltaCents,
      boxesOutDelta: s.boxesOutDelta,
      bottlesOutDelta: s.bottlesOutDelta,
      boxesReturnedOnSale: s.boxesReturnedOnSale,
      bottlesReturnedOnSale: s.bottlesReturnedOnSale,
      createdByName: s.createdBy?.name ?? "—",
    }));
  }

  async findOne(shopId: string, id: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, shopId },
      include: {
        ...SALE_INCLUDE,
        voidedBy: { select: { id: true, name: true } },
        priceTier: { select: { id: true, name: true } },
        stockMovements: true,
      },
    });
    if (!sale) throw AppException.notFound("Sale", id);

    const auditLogs = await this.prisma.auditLog.findMany({
      where: { entityType: "Sale", entityId: id },
      orderBy: { createdAt: "asc" },
    });

    return { ...sale, auditLogs };
  }

  /**
   * Walk the sale DTO and resolve any `*Code` fields to their matching ids
   * in place. The id field on each row is left alone when the client sent
   * a valid id; when only a code is provided the id is filled in via a
   * unique lookup. Missing codes are silently ignored — the existing
   * "Beverage not found" error path will then trigger for an empty id.
   */
  private async resolveCodesInDto(
    shopId: string,
    dto: CreateSaleDto | UpdateSaleDto,
  ): Promise<void> {
    if (!dto.customerId && dto.customerCode) {
      const id = await findEntityIdByCode(
        this.prisma,
        "customer",
        shopId,
        dto.customerCode,
      );
      if (id) dto.customerId = id;
    }

    const beverageRows: Array<{ beverageId: string; beverageCode?: string }> = [
      ...((dto.lines ?? []) as Array<{ beverageId: string; beverageCode?: string }>),
      ...((dto.containerKasas ?? []) as Array<{ beverageId: string; beverageCode?: string }>),
      ...((dto.returnedContainers ?? []) as Array<{ beverageId: string; beverageCode?: string }>),
    ];

    for (const row of beverageRows) {
      if (!row.beverageId && row.beverageCode) {
        const id = await findEntityIdByCode(
          this.prisma,
          "beverage",
          shopId,
          row.beverageCode,
        );
        if (id) row.beverageId = id;
      }
    }
  }

  async createSale(shopId: string, userId: string, dto: CreateSaleDto) {
    const saleDate = new Date(dto.saleDate);
    // Use end-of-day for price lookup: effectiveFrom is stored as the exact creation
    // timestamp, so a price created at 15:30 on day X must still match a sale on day X.
    const saleDateEndOfDay = new Date(dto.saleDate + "T23:59:59.999Z");
    const status = dto.draft ? SaleStatus.OPEN : SaleStatus.CONFIRMED;

    // Resolve any *Code fields to ids so the rest of the service can
    // continue using the existing id-based logic. id is preferred; if the
    // client sent a code, fill in the id when blank.
    await this.resolveCodesInDto(shopId, dto);

    const result = await this.prisma.$transaction(async (tx) => {
      // a. Load Customer
      const customer = await tx.customer.findFirst({
        where: { id: dto.customerId, shopId, deletedAt: null },
      });
      if (!customer) throw AppException.notFound("Customer", dto.customerId);

      // b. Load Shop to get defaultPriceTierId
      const shop = await tx.shop.findUnique({ where: { id: shopId } });
      if (!shop) throw AppException.notFound("Shop", shopId);

      // c. Resolve priceTierId
      const priceTierId = dto.priceTierId ?? shop.defaultPriceTierId;
      if (!priceTierId) {
        throw new AppException({
          code: ErrorCode.VALIDATION_ERROR,
          message: "No price tier specified and shop has no default price tier",
          status: HttpStatus.UNPROCESSABLE_ENTITY,
        });
      }

      // d. For each line: load Beverage and resolve price
      type ResolvedLine = {
        beverageId: string;
        boxes: number;
        bottles: number;
        pricePerBoxCents: number;
        pricePerBottleCents: number;
        lineTotalCents: number;
        bottlesPerBox: number;
      };

      const resolvedLines: ResolvedLine[] = [];
      for (const line of dto.lines) {
        const beverage = await tx.beverage.findFirst({
          where: { id: line.beverageId, shopId, deletedAt: null },
        });
        if (!beverage) throw AppException.notFound("Beverage", line.beverageId);

        const price = await tx.beveragePrice.findFirst({
          where: { beverageId: line.beverageId, priceTierId },
          orderBy: { effectiveFrom: "desc" },
        });

        if (!price) {
          const msg = `Price not set for beverage "${beverage.name}" in this price tier. Add a price first, then retry.`;
          throw new AppException({
            code: ErrorCode.VALIDATION_ERROR,
            message: msg,
            status: HttpStatus.UNPROCESSABLE_ENTITY,
          });
        }

        // e. Stock check for CONFIRMED sales
        if (status === SaleStatus.CONFIRMED) {
          const required = line.boxes * beverage.bottlesPerBox + line.bottles;
          if (beverage.stockBottles < required) {
            throw new AppException({
              code: ErrorCode.VALIDATION_ERROR,
              message: `Insufficient stock for beverage "${beverage.name}". Required: ${required}, available: ${beverage.stockBottles}`,
              status: HttpStatus.UNPROCESSABLE_ENTITY,
            });
          }
        }

        // f. Compute line total
        const boxes = line.boxes ?? 0;
        const bottles = line.bottles ?? 0;
        const lineTotalCents =
          boxes * price.pricePerBoxCents + bottles * price.pricePerBottleCents;

        resolvedLines.push({
          beverageId: line.beverageId,
          boxes,
          bottles,
          pricePerBoxCents: price.pricePerBoxCents,
          pricePerBottleCents: price.pricePerBottleCents,
          lineTotalCents,
          bottlesPerBox: beverage.bottlesPerBox,
        });
      }

      // g. subtotalCents
      const subtotalCents = resolvedLines.reduce(
        (sum, l) => sum + l.lineTotalCents,
        0,
      );

      // h. paidCents
      const paidCents = (dto.payments ?? []).reduce(
        (sum, p) => sum + p.amountCents,
        0,
      );

      // i. creditDeltaCents
      const creditDeltaCents = subtotalCents - paidCents;

      // j. container deltas
      const containerKasaTotal = (dto.containerKasas ?? []).reduce((sum, k) => sum + k.count, 0);
      const boxesOutDelta = resolvedLines.reduce((sum, l) => sum + l.boxes, 0) + containerKasaTotal;
      const bottlesOutDelta = resolvedLines.reduce(
        (sum, l) => sum + l.bottles,
        0,
      );
      const boxesReturnedOnSale = (dto.returnedContainers ?? []).reduce((sum, r) => sum + r.boxes, 0);
      const bottlesReturnedOnSale = (dto.returnedContainers ?? []).reduce((sum, r) => sum + r.bottles, 0);

      // k. Insert Sale
      const sale = await tx.sale.create({
        data: {
          shopId,
          customerId: dto.customerId,
          priceTierId,
          saleDate,
          status,
          subtotalCents,
          paidCents,
          creditDeltaCents,
          boxesOutDelta,
          bottlesOutDelta,
          boxesReturnedOnSale,
          bottlesReturnedOnSale,
          notes: dto.notes ?? null,
          createdById: userId,
          updatedById: userId,
        },
      });

      // l. Insert SaleLines
      await tx.saleLine.createMany({
        data: resolvedLines.map((l) => ({
          saleId: sale.id,
          beverageId: l.beverageId,
          boxes: l.boxes,
          bottles: l.bottles,
          pricePerBoxCents: l.pricePerBoxCents,
          pricePerBottleCents: l.pricePerBottleCents,
          lineTotalCents: l.lineTotalCents,
        })),
      });

      // l2. Insert ContainerKasas
      if (dto.containerKasas && dto.containerKasas.length > 0) {
        await tx.saleContainerKasa.createMany({
          data: dto.containerKasas.map((k) => ({
            saleId: sale.id,
            beverageId: k.beverageId,
            count: k.count,
          })),
        });
      }

      // l3. Insert ReturnedContainers
      if (dto.returnedContainers && dto.returnedContainers.length > 0) {
        await tx.saleReturnedContainer.createMany({
          data: dto.returnedContainers.map((r) => ({
            saleId: sale.id,
            beverageId: r.beverageId,
            boxes: r.boxes,
            bottles: r.bottles,
          })),
        });
      }

      // m. Insert Payments
      if (dto.payments && dto.payments.length > 0) {
        for (const payment of dto.payments) {
          const account = await tx.paymentAccount.findFirst({
            where: { id: payment.paymentAccountId, shopId, deletedAt: null },
          });
          if (!account) {
            throw AppException.notFound(
              "PaymentAccount",
              payment.paymentAccountId,
            );
          }

          await tx.payment.create({
            data: {
              shopId,
              saleId: sale.id,
              customerId: dto.customerId,
              amountCents: payment.amountCents,
              method: kindToPaymentMethod(account.kind),
              paymentAccountId: payment.paymentAccountId,
              reference: payment.reference ?? null,
              notes: payment.notes ?? null,
              paidAt: payment.paidAt ? new Date(payment.paidAt) : new Date(),
              recordedById: userId,
            },
          });
        }
      }

      // n. If CONFIRMED: stock movements + update stock
      if (status === SaleStatus.CONFIRMED) {
        for (const line of resolvedLines) {
          const bottlesDelta = -(
            line.boxes * line.bottlesPerBox +
            line.bottles
          );
          await tx.stockMovement.create({
            data: {
              shopId,
              beverageId: line.beverageId,
              reason: StockMovementReason.SALE,
              bottlesDelta,
              saleId: sale.id,
              createdById: userId,
            },
          });
          await tx.beverage.update({
            where: { id: line.beverageId },
            data: { stockBottles: { increment: bottlesDelta } },
          });
        }

        // Container Kasas — empty boxes going out to customer
        for (const kasa of dto.containerKasas ?? []) {
          await tx.beverage.update({
            where: { id: kasa.beverageId },
            data: { emptyBoxes: { decrement: kasa.count } },
          });
          await tx.stockMovement.create({
            data: {
              shopId,
              beverageId: kasa.beverageId,
              reason: StockMovementReason.SALE,
              bottlesDelta: 0,
              emptyBoxesDelta: -kasa.count,
              saleId: sale.id,
              createdById: userId,
            },
          });
        }

        // Returned containers — empty boxes/bottles coming back
        for (const ret of dto.returnedContainers ?? []) {
          await tx.beverage.update({
            where: { id: ret.beverageId },
            data: {
              emptyBoxes: { increment: ret.boxes },
              emptyBottles: { increment: ret.bottles },
            },
          });
          await tx.stockMovement.create({
            data: {
              shopId,
              beverageId: ret.beverageId,
              reason: StockMovementReason.RETURN,
              bottlesDelta: 0,
              emptyBoxesDelta: ret.boxes > 0 ? ret.boxes : null,
              emptyBottlesDelta: ret.bottles > 0 ? ret.bottles : null,
              saleId: sale.id,
              createdById: userId,
            },
          });
        }
      }

      // o. Update Customer
      const netBoxDelta = boxesOutDelta - boxesReturnedOnSale;
      const netBottleDelta = bottlesOutDelta - bottlesReturnedOnSale;

      await tx.customer.update({
        where: { id: dto.customerId },
        data: {
          creditBalanceCents: { increment: creditDeltaCents },
          outstandingBoxes: { increment: netBoxDelta },
          outstandingBottles: { increment: netBottleDelta },
        },
      });

      // p. Insert AuditLog
      await tx.auditLog.create({
        data: {
          shopId,
          actorUserId: userId,
          action: "sale.create",
          entityType: "Sale",
          entityId: sale.id,
          afterJson: JSON.stringify({ saleId: sale.id, status }),
        },
      });

      return sale.id;
    });

    // Return full sale with includes
    return this.findOne(shopId, result);
  }

  async updateSale(
    shopId: string,
    userId: string,
    saleId: string,
    dto: UpdateSaleDto,
  ) {
    const existingSale = await this.prisma.sale.findFirst({
      where: { id: saleId, shopId },
      include: {
        lines: { include: { beverage: true } },
        payments: { where: { voidedAt: null } },
      },
    });
    if (!existingSale) throw AppException.notFound("Sale", saleId);
    if (existingSale.status === SaleStatus.VOIDED) {
      throw AppException.conflict(
        ErrorCode.CONFLICT,
        "Cannot edit a voided sale",
      );
    }

    const status = dto.draft ? SaleStatus.OPEN : SaleStatus.CONFIRMED;
    const saleDate = new Date(dto.saleDate);
    const saleDateEndOfDay = new Date(dto.saleDate + "T23:59:59.999Z");

    await this.resolveCodesInDto(shopId, dto);

    await this.prisma.$transaction(async (tx) => {
      // a. Reverse old customer effects
      const oldNetBoxDelta =
        existingSale.boxesOutDelta - existingSale.boxesReturnedOnSale;
      const oldNetBottleDelta =
        existingSale.bottlesOutDelta - existingSale.bottlesReturnedOnSale;
      await tx.customer.update({
        where: { id: existingSale.customerId },
        data: {
          creditBalanceCents: { decrement: existingSale.creditDeltaCents },
          outstandingBoxes: { decrement: oldNetBoxDelta },
          outstandingBottles: { decrement: oldNetBottleDelta },
        },
      });

      // b. If old status was CONFIRMED: reverse stock
      if (existingSale.status === SaleStatus.CONFIRMED) {
        for (const line of existingSale.lines) {
          const bottlesDelta =
            line.boxes * line.beverage.bottlesPerBox + line.bottles;
          await tx.stockMovement.create({
            data: {
              shopId,
              beverageId: line.beverageId,
              reason: StockMovementReason.SALE_VOID,
              bottlesDelta,
              saleId,
              createdById: userId,
            },
          });
          await tx.beverage.update({
            where: { id: line.beverageId },
            data: { stockBottles: { increment: bottlesDelta } },
          });
        }

        // Reverse old container kasas (empty boxes went out, now come back)
        const oldKasas = await tx.saleContainerKasa.findMany({ where: { saleId } });
        for (const kasa of oldKasas) {
          await tx.beverage.update({
            where: { id: kasa.beverageId },
            data: { emptyBoxes: { increment: kasa.count } },
          });
          await tx.stockMovement.create({
            data: {
              shopId,
              beverageId: kasa.beverageId,
              reason: StockMovementReason.SALE_VOID,
              bottlesDelta: 0,
              emptyBoxesDelta: kasa.count,
              saleId,
              createdById: userId,
            },
          });
        }

        // Reverse old returned containers (empty boxes/bottles came back, now go out again)
        const oldReturns = await tx.saleReturnedContainer.findMany({ where: { saleId } });
        for (const ret of oldReturns) {
          await tx.beverage.update({
            where: { id: ret.beverageId },
            data: {
              emptyBoxes: { decrement: ret.boxes },
              emptyBottles: { decrement: ret.bottles },
            },
          });
          await tx.stockMovement.create({
            data: {
              shopId,
              beverageId: ret.beverageId,
              reason: StockMovementReason.SALE_VOID,
              bottlesDelta: 0,
              emptyBoxesDelta: ret.boxes > 0 ? -ret.boxes : null,
              emptyBottlesDelta: ret.bottles > 0 ? -ret.bottles : null,
              saleId,
              createdById: userId,
            },
          });
        }
      }

      // c. Delete old sale lines, container kasas, and returned containers
      await tx.saleLine.deleteMany({ where: { saleId } });
      await tx.saleContainerKasa.deleteMany({ where: { saleId } });
      await tx.saleReturnedContainer.deleteMany({ where: { saleId } });

      // d. Void old payments
      await tx.payment.updateMany({
        where: { saleId, voidedAt: null },
        data: { voidedAt: new Date() },
      });

      // e. Load & validate new customer
      const customer = await tx.customer.findFirst({
        where: { id: dto.customerId, shopId, deletedAt: null },
      });
      if (!customer) throw AppException.notFound("Customer", dto.customerId);

      // f. Load shop for priceTierId fallback
      const shop = await tx.shop.findUnique({ where: { id: shopId } });
      if (!shop) throw AppException.notFound("Shop", shopId);

      // g. Resolve priceTierId
      const priceTierId = dto.priceTierId ?? shop.defaultPriceTierId;
      if (!priceTierId) {
        throw new AppException({
          code: ErrorCode.VALIDATION_ERROR,
          message: "No price tier specified and shop has no default price tier",
          status: HttpStatus.UNPROCESSABLE_ENTITY,
        });
      }

      // h. Resolve new lines with price lookup
      type ResolvedLine = {
        beverageId: string;
        boxes: number;
        bottles: number;
        pricePerBoxCents: number;
        pricePerBottleCents: number;
        lineTotalCents: number;
        bottlesPerBox: number;
      };

      const resolvedLines: ResolvedLine[] = [];
      for (const line of dto.lines) {
        const beverage = await tx.beverage.findFirst({
          where: { id: line.beverageId, shopId, deletedAt: null },
        });
        if (!beverage) throw AppException.notFound("Beverage", line.beverageId);

        const price = await tx.beveragePrice.findFirst({
          where: { beverageId: line.beverageId, priceTierId },
          orderBy: { effectiveFrom: "desc" },
        });

        if (!price) {
          const msg = `Price not set for beverage "${beverage.name}" in this price tier. Add a price first, then retry.`;
          throw new AppException({
            code: ErrorCode.VALIDATION_ERROR,
            message: msg,
            status: HttpStatus.UNPROCESSABLE_ENTITY,
          });
        }

        // Stock check if new status is CONFIRMED
        if (status === SaleStatus.CONFIRMED) {
          const required = line.boxes * beverage.bottlesPerBox + line.bottles;
          if (beverage.stockBottles < required) {
            throw new AppException({
              code: ErrorCode.VALIDATION_ERROR,
              message: `Insufficient stock for beverage "${beverage.name}". Required: ${required}, available: ${beverage.stockBottles}`,
              status: HttpStatus.UNPROCESSABLE_ENTITY,
            });
          }
        }

        const boxes = line.boxes ?? 0;
        const bottles = line.bottles ?? 0;
        const lineTotalCents =
          boxes * price.pricePerBoxCents + bottles * price.pricePerBottleCents;

        resolvedLines.push({
          beverageId: line.beverageId,
          boxes,
          bottles,
          pricePerBoxCents: price.pricePerBoxCents,
          pricePerBottleCents: price.pricePerBottleCents,
          lineTotalCents,
          bottlesPerBox: beverage.bottlesPerBox,
        });
      }

      // i. Compute new totals
      const subtotalCents = resolvedLines.reduce(
        (sum, l) => sum + l.lineTotalCents,
        0,
      );
      const paidCents = (dto.payments ?? []).reduce(
        (sum, p) => sum + p.amountCents,
        0,
      );
      const creditDeltaCents = subtotalCents - paidCents;
      const containerKasaTotal = (dto.containerKasas ?? []).reduce((sum, k) => sum + k.count, 0);
      const boxesOutDelta = resolvedLines.reduce((sum, l) => sum + l.boxes, 0) + containerKasaTotal;
      const bottlesOutDelta = resolvedLines.reduce(
        (sum, l) => sum + l.bottles,
        0,
      );
      const boxesReturnedOnSale = (dto.returnedContainers ?? []).reduce((sum, r) => sum + r.boxes, 0);
      const bottlesReturnedOnSale = (dto.returnedContainers ?? []).reduce((sum, r) => sum + r.bottles, 0);

      // j. Update sale record
      await tx.sale.update({
        where: { id: saleId },
        data: {
          customerId: dto.customerId,
          priceTierId,
          saleDate,
          status,
          subtotalCents,
          paidCents,
          creditDeltaCents,
          boxesOutDelta,
          bottlesOutDelta,
          boxesReturnedOnSale,
          bottlesReturnedOnSale,
          notes: dto.notes ?? null,
          updatedById: userId,
        },
      });

      // k. Create new sale lines
      await tx.saleLine.createMany({
        data: resolvedLines.map((l) => ({
          saleId,
          beverageId: l.beverageId,
          boxes: l.boxes,
          bottles: l.bottles,
          pricePerBoxCents: l.pricePerBoxCents,
          pricePerBottleCents: l.pricePerBottleCents,
          lineTotalCents: l.lineTotalCents,
        })),
      });

      // k2. Create new container kasas
      if (dto.containerKasas && dto.containerKasas.length > 0) {
        await tx.saleContainerKasa.createMany({
          data: dto.containerKasas.map((k) => ({
            saleId,
            beverageId: k.beverageId,
            count: k.count,
          })),
        });
      }

      // k3. Create new returned containers
      if (dto.returnedContainers && dto.returnedContainers.length > 0) {
        await tx.saleReturnedContainer.createMany({
          data: dto.returnedContainers.map((r) => ({
            saleId,
            beverageId: r.beverageId,
            boxes: r.boxes,
            bottles: r.bottles,
          })),
        });
      }

      // l. Create new payments
      if (dto.payments && dto.payments.length > 0) {
        for (const payment of dto.payments) {
          const account = await tx.paymentAccount.findFirst({
            where: { id: payment.paymentAccountId, shopId, deletedAt: null },
          });
          if (!account) {
            throw AppException.notFound(
              "PaymentAccount",
              payment.paymentAccountId,
            );
          }

          await tx.payment.create({
            data: {
              shopId,
              saleId,
              customerId: dto.customerId,
              amountCents: payment.amountCents,
              method: kindToPaymentMethod(account.kind),
              paymentAccountId: payment.paymentAccountId,
              reference: payment.reference ?? null,
              notes: payment.notes ?? null,
              paidAt: payment.paidAt ? new Date(payment.paidAt) : new Date(),
              recordedById: userId,
            },
          });
        }
      }

      // m. If new status is CONFIRMED: create stock movements + update stock
      if (status === SaleStatus.CONFIRMED) {
        for (const line of resolvedLines) {
          const bottlesDelta = -(
            line.boxes * line.bottlesPerBox +
            line.bottles
          );
          await tx.stockMovement.create({
            data: {
              shopId,
              beverageId: line.beverageId,
              reason: StockMovementReason.SALE,
              bottlesDelta,
              saleId,
              createdById: userId,
            },
          });
          await tx.beverage.update({
            where: { id: line.beverageId },
            data: { stockBottles: { increment: bottlesDelta } },
          });
        }

        // Container Kasas — empty boxes going out to customer
        for (const kasa of dto.containerKasas ?? []) {
          await tx.beverage.update({
            where: { id: kasa.beverageId },
            data: { emptyBoxes: { decrement: kasa.count } },
          });
          await tx.stockMovement.create({
            data: {
              shopId,
              beverageId: kasa.beverageId,
              reason: StockMovementReason.SALE,
              bottlesDelta: 0,
              emptyBoxesDelta: -kasa.count,
              saleId,
              createdById: userId,
            },
          });
        }

        // Returned containers — empty boxes/bottles coming back
        for (const ret of dto.returnedContainers ?? []) {
          await tx.beverage.update({
            where: { id: ret.beverageId },
            data: {
              emptyBoxes: { increment: ret.boxes },
              emptyBottles: { increment: ret.bottles },
            },
          });
          await tx.stockMovement.create({
            data: {
              shopId,
              beverageId: ret.beverageId,
              reason: StockMovementReason.RETURN,
              bottlesDelta: 0,
              emptyBoxesDelta: ret.boxes > 0 ? ret.boxes : null,
              emptyBottlesDelta: ret.bottles > 0 ? ret.bottles : null,
              saleId,
              createdById: userId,
            },
          });
        }
      }

      // n. Update new customer balances
      const newNetBoxDelta = boxesOutDelta - boxesReturnedOnSale;
      const newNetBottleDelta = bottlesOutDelta - bottlesReturnedOnSale;
      await tx.customer.update({
        where: { id: dto.customerId },
        data: {
          creditBalanceCents: { increment: creditDeltaCents },
          outstandingBoxes: { increment: newNetBoxDelta },
          outstandingBottles: { increment: newNetBottleDelta },
        },
      });

      // o. AuditLog
      await tx.auditLog.create({
        data: {
          shopId,
          actorUserId: userId,
          action: "sale.update",
          entityType: "Sale",
          entityId: saleId,
          afterJson: JSON.stringify({ saleId, status }),
        },
      });
    });

    return this.findOne(shopId, saleId);
  }

  async voidSale(
    shopId: string,
    userId: string,
    saleId: string,
    reason: string,
  ) {
    const sale = await this.prisma.sale.findFirst({
      where: { id: saleId, shopId },
      include: {
        lines: { include: { beverage: true } },
        payments: { where: { voidedAt: null } },
      },
    });
    if (!sale) throw AppException.notFound("Sale", saleId);
    if (sale.status === SaleStatus.VOIDED) {
      throw AppException.conflict(ErrorCode.CONFLICT, "Sale is already voided");
    }

    await this.prisma.$transaction(async (tx) => {
      // a. Set Sale voided
      await tx.sale.update({
        where: { id: saleId },
        data: {
          status: SaleStatus.VOIDED,
          voidedAt: new Date(),
          voidedById: userId,
          voidReason: reason,
        },
      });

      // b. Reverse stock for confirmed sales
      if (sale.status === SaleStatus.CONFIRMED) {
        for (const line of sale.lines) {
          const bottlesDelta =
            line.boxes * line.beverage.bottlesPerBox + line.bottles;
          await tx.stockMovement.create({
            data: {
              shopId,
              beverageId: line.beverageId,
              reason: StockMovementReason.SALE_VOID,
              bottlesDelta,
              saleId,
              createdById: userId,
            },
          });
          await tx.beverage.update({
            where: { id: line.beverageId },
            data: { stockBottles: { increment: bottlesDelta } },
          });
        }

        // Reverse container kasas — empty boxes come back
        const saleKasas = await tx.saleContainerKasa.findMany({ where: { saleId } });
        for (const kasa of saleKasas) {
          await tx.beverage.update({
            where: { id: kasa.beverageId },
            data: { emptyBoxes: { increment: kasa.count } },
          });
          await tx.stockMovement.create({
            data: {
              shopId,
              beverageId: kasa.beverageId,
              reason: StockMovementReason.SALE_VOID,
              bottlesDelta: 0,
              emptyBoxesDelta: kasa.count,
              saleId,
              createdById: userId,
            },
          });
        }

        // Reverse returned containers — empty boxes/bottles go back out
        const saleReturns = await tx.saleReturnedContainer.findMany({ where: { saleId } });
        for (const ret of saleReturns) {
          await tx.beverage.update({
            where: { id: ret.beverageId },
            data: {
              emptyBoxes: { decrement: ret.boxes },
              emptyBottles: { decrement: ret.bottles },
            },
          });
          await tx.stockMovement.create({
            data: {
              shopId,
              beverageId: ret.beverageId,
              reason: StockMovementReason.SALE_VOID,
              bottlesDelta: 0,
              emptyBoxesDelta: ret.boxes > 0 ? -ret.boxes : null,
              emptyBottlesDelta: ret.bottles > 0 ? -ret.bottles : null,
              saleId,
              createdById: userId,
            },
          });
        }
      }

      // c. Void all payments
      await tx.payment.updateMany({
        where: { saleId, voidedAt: null },
        data: { voidedAt: new Date(), voidReason: reason },
      });

      // d. Reverse Customer balances
      const netBoxDelta = sale.boxesOutDelta - sale.boxesReturnedOnSale;
      const netBottleDelta = sale.bottlesOutDelta - sale.bottlesReturnedOnSale;

      await tx.customer.update({
        where: { id: sale.customerId },
        data: {
          creditBalanceCents: { decrement: sale.creditDeltaCents },
          outstandingBoxes: { decrement: netBoxDelta },
          outstandingBottles: { decrement: netBottleDelta },
        },
      });

      // e. AuditLog
      await tx.auditLog.create({
        data: {
          shopId,
          actorUserId: userId,
          action: "sale.void",
          entityType: "Sale",
          entityId: saleId,
          afterJson: JSON.stringify({ reason }),
        },
      });
    });

    return this.findOne(shopId, saleId);
  }

  async addPayment(
    shopId: string,
    userId: string,
    saleId: string,
    dto: AddPaymentDto,
  ) {
    const sale = await this.prisma.sale.findFirst({
      where: { id: saleId, shopId },
    });
    if (!sale) throw AppException.notFound("Sale", saleId);
    if (sale.status === SaleStatus.VOIDED) {
      throw AppException.conflict(
        ErrorCode.CONFLICT,
        "Cannot add payment to a voided sale",
      );
    }

    const account = await this.prisma.paymentAccount.findFirst({
      where: { id: dto.paymentAccountId, shopId, deletedAt: null },
    });
    if (!account)
      throw AppException.notFound("PaymentAccount", dto.paymentAccountId);

    await this.prisma.$transaction(async (tx) => {
      // a. Insert Payment
      const payment = await tx.payment.create({
        data: {
          shopId,
          saleId,
          customerId: sale.customerId,
          amountCents: dto.amountCents,
          method: kindToPaymentMethod(account.kind),
          paymentAccountId: dto.paymentAccountId,
          reference: dto.reference ?? null,
          notes: dto.notes ?? null,
          paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
          recordedById: userId,
        },
      });

      // b. Update Sale
      await tx.sale.update({
        where: { id: saleId },
        data: {
          paidCents: { increment: dto.amountCents },
          creditDeltaCents: { decrement: dto.amountCents },
        },
      });

      // c. Update Customer
      await tx.customer.update({
        where: { id: sale.customerId },
        data: { creditBalanceCents: { decrement: dto.amountCents } },
      });

      // d. AuditLog
      await tx.auditLog.create({
        data: {
          shopId,
          actorUserId: userId,
          action: "payment.create",
          entityType: "Payment",
          entityId: payment.id,
          afterJson: JSON.stringify({ saleId, amountCents: dto.amountCents }),
        },
      });
    });

    return this.findOne(shopId, saleId);
  }

  async voidPayment(
    shopId: string,
    userId: string,
    saleId: string,
    paymentId: string,
    reason?: string,
  ) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, saleId, shopId },
    });
    if (!payment) throw AppException.notFound("Payment", paymentId);
    if (payment.voidedAt) {
      throw AppException.conflict(
        ErrorCode.CONFLICT,
        "Payment is already voided",
      );
    }

    const sale = await this.prisma.sale.findFirst({
      where: { id: saleId, shopId },
    });
    if (!sale) throw AppException.notFound("Sale", saleId);

    await this.prisma.$transaction(async (tx) => {
      // a. Void payment
      await tx.payment.update({
        where: { id: paymentId },
        data: { voidedAt: new Date(), voidReason: reason ?? null },
      });

      // b. Update Sale
      await tx.sale.update({
        where: { id: saleId },
        data: {
          paidCents: { decrement: payment.amountCents },
          creditDeltaCents: { increment: payment.amountCents },
        },
      });

      // c. Update Customer
      await tx.customer.update({
        where: { id: sale.customerId },
        data: { creditBalanceCents: { increment: payment.amountCents } },
      });

      // d. AuditLog
      await tx.auditLog.create({
        data: {
          shopId,
          actorUserId: userId,
          action: "payment.void",
          entityType: "Payment",
          entityId: paymentId,
          afterJson: JSON.stringify({ reason }),
        },
      });
    });

    return this.findOne(shopId, saleId);
  }
}
