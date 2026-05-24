import type { SdkClient, RequestOptions } from '../client';

export interface Shop {
  id: string;
  name: string;
  ownerId: string;
  phone?: string;
  address?: string;
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
}

export class ShopsResource {
  constructor(private readonly client: SdkClient) {}

  getMyShop(options?: RequestOptions): Promise<Shop> {
    return this.client.get<Shop>('/api/v1/shops/me', options);
  }

  updateMyShop(dto: UpdateShopDto, options?: RequestOptions): Promise<Shop> {
    return this.client.patch<Shop>('/api/v1/shops/me', dto, options);
  }
}
