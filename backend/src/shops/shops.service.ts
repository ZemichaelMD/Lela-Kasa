import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../common/errors/app.exception';
import { ErrorCode } from '../contract';
import {
  ethiopianPhoneVariants,
  isValidEthiopianPhone,
  normalizeEthiopianPhone,
} from '../common/phone.util';
import { resolveLatLngFromMapUrl } from '../common/geo.util';
import type { UpdateShopDto } from './dto/update-shop.dto';

const shopSelect = {
  id: true,
  name: true,
  ownerId: true,
  phone: true,
  address: true,
  description: true,
  email: true,
  website: true,
  facebook: true,
  instagram: true,
  tiktok: true,
  latitude: true,
  longitude: true,
  mapUrl: true,
  currency: true,
  timezone: true,
  lowStockThreshold: true,
  defaultPriceTierId: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class ShopsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyShop(shopId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: shopSelect,
    });
    if (!shop) throw AppException.notFound('Shop', shopId);
    return shop;
  }

  /**
   * Normalizes a shop phone and ensures no *other* shop already uses it.
   * Ethiopian mobile numbers are stored canonically; anything else (landlines,
   * short codes) is kept as typed. Returns null when no phone is given.
   */
  private async resolveUniqueShopPhone(
    raw: string | undefined | null,
    currentShopId: string,
  ): Promise<string | null> {
    const trimmed = (raw ?? '').trim();
    if (!trimmed) return null;

    const isMobile = isValidEthiopianPhone(trimmed);
    const stored = isMobile ? normalizeEthiopianPhone(trimmed) : trimmed;
    const candidates = isMobile ? ethiopianPhoneVariants(stored) : [trimmed];

    const clash = await this.prisma.shop.findFirst({
      where: { phone: { in: candidates }, id: { not: currentShopId } },
      select: { id: true },
    });
    if (clash) {
      throw AppException.conflict(
        ErrorCode.PHONE_TAKEN,
        'Another shop is already using this phone number',
      );
    }
    return stored;
  }

  async updateMyShop(shopId: string, dto: UpdateShopDto) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) throw AppException.notFound('Shop', shopId);

    const data: Record<string, unknown> = {};
    const str = (v: string | undefined) =>
      v === undefined ? undefined : v.trim() || null;

    if (dto.name !== undefined) data['name'] = dto.name;
    if (dto.address !== undefined) data['address'] = str(dto.address);
    if (dto.timezone !== undefined) data['timezone'] = dto.timezone;
    if (dto.lowStockThreshold !== undefined)
      data['lowStockThreshold'] = dto.lowStockThreshold;
    if (dto.description !== undefined) data['description'] = str(dto.description);
    if (dto.email !== undefined) data['email'] = str(dto.email);
    if (dto.website !== undefined) data['website'] = str(dto.website);
    if (dto.facebook !== undefined) data['facebook'] = str(dto.facebook);
    if (dto.instagram !== undefined) data['instagram'] = str(dto.instagram);
    if (dto.tiktok !== undefined) data['tiktok'] = str(dto.tiktok);

    if (dto.phone !== undefined) {
      data['phone'] = await this.resolveUniqueShopPhone(dto.phone, shopId);
    }

    // A pasted Maps link: store it and try to extract coordinates from it.
    if (dto.mapUrl !== undefined) {
      const url = (dto.mapUrl ?? '').trim() || null;
      data['mapUrl'] = url;
      if (url) {
        const coords = await resolveLatLngFromMapUrl(url);
        if (coords) {
          data['latitude'] = coords.lat;
          data['longitude'] = coords.lng;
        }
      }
    }
    // Explicit coordinates always win over anything parsed from the URL.
    if (dto.latitude !== undefined) data['latitude'] = dto.latitude;
    if (dto.longitude !== undefined) data['longitude'] = dto.longitude;

    return this.prisma.shop.update({
      where: { id: shopId },
      data,
      select: shopSelect,
    });
  }
}
