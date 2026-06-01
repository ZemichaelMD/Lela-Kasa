import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../common/errors/app.exception';
import { ErrorCode } from '../contract';
import { generateNextCode, normalizePublicCode } from '../common/public-code';
import type { CreateBeverageDto } from './dto/create-beverage.dto';
import type { UpdateBeverageDto } from './dto/update-beverage.dto';
import type { AdjustStockDto } from './dto/adjust-stock.dto';
import type { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import type { SwapDto } from './dto/swap.dto';

export interface BeverageListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
}

const BEVERAGE_CODE_PREFIX = 'BE';
const BEVERAGE_CODE_PAD = 3;

@Injectable()
export class BeveragesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(shopId: string, query: BeverageListQuery) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {
      shopId,
      deletedAt: null,
    };

    if (query.search) {
      where['OR'] = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { brand: { contains: query.search, mode: 'insensitive' } },
        { code: { equals: normalizePublicCode(query.search) ?? query.search, mode: 'insensitive' } },
      ];
    }

    if (query.isActive !== undefined) {
      where['isActive'] = query.isActive;
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.beverage.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { name: 'asc' },
      }),
      this.prisma.beverage.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async findOne(shopId: string, id: string) {
    const beverage = await this.prisma.beverage.findFirst({
      where: { id, shopId, deletedAt: null },
    });
    if (!beverage) throw AppException.notFound('Beverage', id);
    return beverage;
  }

  async createBulk(
    shopId: string,
    dtos: CreateBeverageDto[],
    actorUserId: string,
  ) {
    const created = await this.prisma.$transaction(async (tx) => {
      const results = [];
      for (const dto of dtos) {
        const code =
          normalizePublicCode(dto.code) ??
          (await generateNextCode({
            prefix: BEVERAGE_CODE_PREFIX,
            padLength: BEVERAGE_CODE_PAD,
            prisma: tx,
            model: 'beverage',
            shopId,
          }));
        const beverage = await tx.beverage.create({
          data: {
            shopId,
            code,
            name: dto.name,
            brand: dto.brand ?? null,
            sizeMl: dto.sizeMl ?? null,
            bottlesPerBox: dto.bottlesPerBox ?? 24,
            imageUrl: dto.imageUrl ?? null,
            isActive: dto.isActive ?? true,
          },
        });
        results.push(beverage);
      }
      return results;
    });

    await this.prisma.auditLog.create({
      data: {
        shopId,
        actorUserId,
        action: 'beverage.create',
        entityType: 'Beverage',
        entityId: created.map((b) => b.id).join(','),
        afterJson: JSON.stringify({
          count: created.length,
          ids: created.map((b) => b.id),
          names: created.map((b) => b.name),
          codes: created.map((b) => b.code),
        }),
      },
    });

    return created;
  }

  async create(shopId: string, dto: CreateBeverageDto, actorUserId: string) {
    const code =
      normalizePublicCode(dto.code) ??
      (await generateNextCode({
        prefix: BEVERAGE_CODE_PREFIX,
        padLength: BEVERAGE_CODE_PAD,
        prisma: this.prisma,
        model: 'beverage',
        shopId,
      }));

    const beverage = await this.prisma.beverage.create({
      data: {
        shopId,
        code,
        name: dto.name,
        brand: dto.brand ?? null,
        sizeMl: dto.sizeMl ?? null,
        bottlesPerBox: dto.bottlesPerBox ?? 24,
        imageUrl: dto.imageUrl ?? null,
        isActive: dto.isActive ?? true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        shopId,
        actorUserId,
        action: 'beverage.create',
        entityType: 'Beverage',
        entityId: beverage.id,
        afterJson: JSON.stringify(beverage),
      },
    });

    return beverage;
  }

  async update(shopId: string, id: string, dto: UpdateBeverageDto, actorUserId: string) {
    await this.findOne(shopId, id);

    const beverage = await this.prisma.beverage.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.brand !== undefined ? { brand: dto.brand } : {}),
        ...(dto.sizeMl !== undefined ? { sizeMl: dto.sizeMl } : {}),
        ...(dto.bottlesPerBox !== undefined ? { bottlesPerBox: dto.bottlesPerBox } : {}),
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        shopId,
        actorUserId,
        action: 'beverage.update',
        entityType: 'Beverage',
        entityId: beverage.id,
        afterJson: JSON.stringify(beverage),
      },
    });

    return beverage;
  }

  async remove(shopId: string, id: string, actorUserId: string) {
    await this.findOne(shopId, id);

    const saleLineCount = await this.prisma.saleLine.count({
      where: { beverageId: id },
    });

    if (saleLineCount > 0) {
      throw AppException.conflict(
        ErrorCode.CONFLICT,
        'Cannot delete beverage that has sale lines',
      );
    }

    const deleted = await this.prisma.beverage.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        shopId,
        actorUserId,
        action: 'beverage.delete',
        entityType: 'Beverage',
        entityId: id,
        afterJson: JSON.stringify(deleted),
      },
    });

    return { success: true };
  }

  async adjustStock(
    shopId: string,
    beverageId: string,
    dto: AdjustStockDto,
    actorUserId: string,
  ) {
    await this.findOne(shopId, beverageId);

    const [movement, beverage] = await this.prisma.$transaction([
      this.prisma.stockMovement.create({
        data: {
          shopId,
          beverageId,
          reason: dto.reason,
          bottlesDelta: dto.bottlesDelta,
          notes: dto.notes ?? null,
          createdById: actorUserId,
        },
      }),
      this.prisma.beverage.update({
        where: { id: beverageId },
        data: { stockBottles: { increment: dto.bottlesDelta } },
      }),
    ]);

    await this.prisma.auditLog.create({
      data: {
        shopId,
        actorUserId,
        action: 'beverage.adjust_stock',
        entityType: 'StockMovement',
        entityId: movement.id,
        afterJson: JSON.stringify({ movement, stockBottles: beverage.stockBottles }),
      },
    });

    return { movement, stockBottles: beverage.stockBottles };
  }

  async getMovements(shopId: string, beverageId: string) {
    await this.findOne(shopId, beverageId);

    return this.prisma.stockMovement.findMany({
      where: { shopId, beverageId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCurrentPrices(shopId: string, beverageId: string) {
    await this.findOne(shopId, beverageId);

    // Add 5-second buffer to catch recently created prices
    const now = new Date(Date.now() + 5000);

    const tiers = await this.prisma.priceTier.findMany({
      where: { shopId, deletedAt: null },
      select: { id: true, name: true, kind: true },
    });

    const results = await Promise.all(
      tiers.map(async (tier) => {
        const price = await this.prisma.beveragePrice.findFirst({
          where: { beverageId, priceTierId: tier.id, effectiveFrom: { lte: now } },
          orderBy: { effectiveFrom: 'desc' },
        });
        return { tier, currentPrice: price ?? null };
      }),
    );

    return results;
  }

  async adjustInventory(
    shopId: string,
    beverageId: string,
    dto: AdjustInventoryDto,
    actorUserId: string,
  ) {
    const beverage = await this.findOne(shopId, beverageId);

    const fullDelta = dto.fullBottlesDelta ?? 0;
    const emptyBoxesDelta = dto.emptyBoxesDelta ?? 0;
    const emptyBottlesDelta = dto.emptyBottlesDelta ?? 0;

    if (fullDelta === 0 && emptyBoxesDelta === 0 && emptyBottlesDelta === 0) {
      throw new AppException({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Enter at least one full or empty quantity',
        status: 422,
      });
    }

    if (beverage.stockBottles + fullDelta < 0) {
      throw new AppException({
        code: ErrorCode.VALIDATION_ERROR,
        message: `Not enough full stock to remove (have ${beverage.stockBottles} bottles)`,
        status: 422,
      });
    }

    const [movement, updated] = await this.prisma.$transaction([
      this.prisma.stockMovement.create({
        data: {
          shopId,
          beverageId,
          reason: dto.reason,
          bottlesDelta: fullDelta,
          emptyBoxesDelta: emptyBoxesDelta !== 0 ? emptyBoxesDelta : null,
          emptyBottlesDelta: emptyBottlesDelta !== 0 ? emptyBottlesDelta : null,
          notes: dto.notes ?? null,
          createdById: actorUserId,
        },
      }),
      this.prisma.beverage.update({
        where: { id: beverageId },
        data: {
          stockBottles: { increment: fullDelta },
          emptyBoxes: { increment: emptyBoxesDelta },
          emptyBottles: { increment: emptyBottlesDelta },
        },
      }),
    ]);

    await this.prisma.auditLog.create({
      data: {
        shopId,
        actorUserId,
        action: 'beverage.adjust_inventory',
        entityType: 'StockMovement',
        entityId: movement.id,
        afterJson: JSON.stringify({
          movement,
          stockBottles: updated.stockBottles,
          emptyBoxes: updated.emptyBoxes,
          emptyBottles: updated.emptyBottles,
        }),
      },
    });

    return updated;
  }

  async swap(
    shopId: string,
    beverageId: string,
    dto: SwapDto,
    actorUserId: string,
  ) {
    const beverage = await this.findOne(shopId, beverageId);

    if (dto.emptyBoxes === 0 && dto.emptyBottles === 0) {
      throw new AppException({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Enter at least one empty box or bottle to swap',
        status: 422,
      });
    }

    if (dto.emptyBoxes > beverage.emptyBoxes) {
      throw new AppException({
        code: ErrorCode.VALIDATION_ERROR,
        message: `Not enough empty boxes (have ${beverage.emptyBoxes}, requested ${dto.emptyBoxes})`,
        status: 422,
      });
    }

    if (dto.emptyBottles > beverage.emptyBottles) {
      throw new AppException({
        code: ErrorCode.VALIDATION_ERROR,
        message: `Not enough empty bottles (have ${beverage.emptyBottles}, requested ${dto.emptyBottles})`,
        status: 422,
      });
    }

    const fullBottlesDelta =
      dto.emptyBoxes * beverage.bottlesPerBox + dto.emptyBottles;

    const [movement, updated] = await this.prisma.$transaction([
      this.prisma.stockMovement.create({
        data: {
          shopId,
          beverageId,
          reason: 'SWAP',
          bottlesDelta: fullBottlesDelta,
          emptyBoxesDelta: dto.emptyBoxes > 0 ? -dto.emptyBoxes : null,
          emptyBottlesDelta: dto.emptyBottles > 0 ? -dto.emptyBottles : null,
          createdById: actorUserId,
        },
      }),
      this.prisma.beverage.update({
        where: { id: beverageId },
        data: {
          stockBottles: { increment: fullBottlesDelta },
          emptyBoxes: { decrement: dto.emptyBoxes },
          emptyBottles: { decrement: dto.emptyBottles },
        },
      }),
    ]);

    await this.prisma.auditLog.create({
      data: {
        shopId,
        actorUserId,
        action: 'beverage.swap',
        entityType: 'StockMovement',
        entityId: movement.id,
        afterJson: JSON.stringify({
          movement,
          stockBottles: updated.stockBottles,
          emptyBoxes: updated.emptyBoxes,
          emptyBottles: updated.emptyBottles,
        }),
      },
    });

    return updated;
  }
}
