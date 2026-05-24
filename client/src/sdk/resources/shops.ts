import type { SdkClient, RequestOptions } from '../client';

export interface Shop {
  id: string;
  name: string;
  ownerId: string;
  phone?: string | null;
  address?: string | null;
  description?: string | null;
  email?: string | null;
  website?: string | null;
  facebook?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  mapUrl?: string | null;
  currency: string;
  timezone: string;
  lowStockThreshold: number;
  defaultPriceTierId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateShopDto {
  name?: string;
  phone?: string;
  address?: string;
  timezone?: string;
  lowStockThreshold?: number;
  description?: string;
  email?: string;
  website?: string;
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  mapUrl?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export class ShopsResource {
  constructor(private readonly client: SdkClient) {}

  getMyShop(options?: RequestOptions): Promise<Shop> {
    return this.client.get<Shop>('/api/v1/shops/me', options);
  }

  updateMyShop(dto: UpdateShopDto, options?: RequestOptions): Promise<Shop> {
    return this.client.patch<Shop>('/api/v1/shops/me', dto, options);
  }

  async getSetting(key: string, options?: RequestOptions): Promise<string | null> {
    const data = await this.client.get<{ value: string } | null>(`/api/v1/shops/me/settings/${key}`, options);
    return data?.value ?? null;
  }

  setSetting(key: string, value: string, options?: RequestOptions): Promise<{ key: string; value: string }> {
    return this.client.put(`/api/v1/shops/me/settings/${key}`, { value }, options);
  }
}
