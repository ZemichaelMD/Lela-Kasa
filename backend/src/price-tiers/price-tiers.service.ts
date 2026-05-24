import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../common/errors/app.exception';
import { ErrorCode } from '../contract';
import type { CreatePriceTierDto } from './dto/create-price-tier.dto';
import type { UpdatePriceTierDto } from './dto/update-price-tier.dto';
import type { SetBeveragePriceDto } from './dto/set-beverage-price.dto';

@Injectable()
export class PriceTiersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(shopId: string) {
    return this.prisma.priceTier.findMany({
      where: { shopId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(shopId: string, id: string) {
    const tier = await this.prisma.priceTier.findFirst({
      where: { id, shopId, deletedAt: null },
    });
    if (!tier) throw AppException.notFound('PriceTier', id);
    return tier;
  }

  async create(shopId: string, dto: CreatePriceTierDto, actorUserId: string) {
    const tier = await this.prisma.priceTier.create({
      data: {
        shopId,
        name: dto.name,
        kind: dto.kind ?? 'CUSTOM',
        isDefault: dto.isDefault ?? false,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        shopId,
        actorUserId,
        action: 'price_tier.create',
        entityType: 'PriceTier',
        entityId: tier.id,
        afterJson: JSON.stringify(tier),
      },
    });

    return tier;
  }

  async update(
    shopId: string,
    id: string,
    dto: UpdatePriceTierDto,
    actorUserId: string,
  ) {
    await this.findOne(shopId, id);

    const tier = await this.prisma.priceTier.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.kind !== undefined ? { kind: dto.kind } : {}),
        ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        shopId,
        actorUserId,
        action: 'price_tier.update',
        entityType: 'PriceTier',
        entityId: tier.id,
        afterJson: JSON.stringify(tier),
      },
    });

    return tier;
  }

  async remove(shopId: string, id: string, actorUserId: string) {
    const tier = await this.findOne(shopId, id);

    if (tier.isDefault) {
      throw AppException.conflict(
        ErrorCode.CONFLICT,
        'Cannot delete the default price tier',
      );
    }

    const salesCount = await this.prisma.sale.count({
      where: { priceTierId: id },
    });

    if (salesCount > 0) {
      throw AppException.conflict(
        ErrorCode.CONFLICT,
        'Cannot delete price tier that has associated sales',
      );
    }

    const deleted = await this.prisma.priceTier.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        shopId,
        actorUserId,
        action: 'price_tier.delete',
        entityType: 'PriceTier',
        entityId: id,
        afterJson: JSON.stringify(deleted),
      },
    });

    return { success: true };
  }

  async setPrice(
    shopId: string,
    tierId: string,
    dto: SetBeveragePriceDto,
    actorUserId: string,
  ) {
    // Validate tier belongs to this shop
    await this.findOne(shopId, tierId);

    // Validate beverage belongs to this shop
    const beverage = await this.prisma.beverage.findFirst({
      where: { id: dto.beverageId, shopId, deletedAt: null },
    });
    if (!beverage) throw AppException.notFound('Beverage', dto.beverageId);

    const price = await this.prisma.beveragePrice.create({
      data: {
        beverageId: dto.beverageId,
        priceTierId: tierId,
        pricePerBoxCents: dto.pricePerBoxCents,
        pricePerBottleCents: dto.pricePerBottleCents,
        effectiveFrom: new Date(),
        createdById: actorUserId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        shopId,
        actorUserId,
        action: 'price_tier.set_price',
        entityType: 'BeveragePrice',
        entityId: price.id,
        afterJson: JSON.stringify(price),
      },
    });

    return price;
  }

  async getPrices(shopId: string, tierId: string) {
    await this.findOne(shopId, tierId);

    // Ordered desc so the first row per beverage is the most recent
    const allPrices = await this.prisma.beveragePrice.findMany({
      where: { priceTierId: tierId },
      orderBy: { effectiveFrom: 'desc' },
    });

    // Return only the latest price per beverage (flat array matching the SDK TierPrice type)
    const seen = new Set<string>();
    const current: typeof allPrices = [];
    for (const price of allPrices) {
      if (!seen.has(price.beverageId)) {
        seen.add(price.beverageId);
        current.push(price);
      }
    }
    return current;
  }
}
