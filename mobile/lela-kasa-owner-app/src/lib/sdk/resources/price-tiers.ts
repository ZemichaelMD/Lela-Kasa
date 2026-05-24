import type { SdkClient, RequestOptions } from '../client';

export interface PriceTier {
  id: string;
  shopId: string;
  name: string;
  kind: string;
  isDefault: boolean;
  createdAt: string;
}

export interface TierPrice {
  id: string;
  priceTierId: string;
  beverageId: string;
  pricePerBoxCents: number;
  pricePerBottleCents: number;
}

export interface CreatePriceTierDto {
  name: string;
  kind?: string;
  isDefault?: boolean;
}

export interface UpdatePriceTierDto {
  name?: string;
  kind?: string;
  isDefault?: boolean;
}

export class PriceTiersResource {
  constructor(private readonly client: SdkClient) {}

  list(options?: RequestOptions): Promise<PriceTier[]> {
    return this.client.get<PriceTier[]>('/api/v1/price-tiers', options);
  }

  create(dto: CreatePriceTierDto, options?: RequestOptions): Promise<PriceTier> {
    return this.client.post<PriceTier>('/api/v1/price-tiers', dto, options);
  }

  update(id: string, dto: UpdatePriceTierDto, options?: RequestOptions): Promise<PriceTier> {
    return this.client.patch<PriceTier>(`/api/v1/price-tiers/${id}`, dto, options);
  }

  delete(id: string, options?: RequestOptions): Promise<void> {
    return this.client.delete<void>(`/api/v1/price-tiers/${id}`, options);
  }

  getPrices(tierId: string, options?: RequestOptions): Promise<TierPrice[]> {
    return this.client.get<TierPrice[]>(`/api/v1/price-tiers/${tierId}/prices`, options);
  }

  setPrices(tierId: string, prices: { beverageId: string; pricePerBoxCents: number; pricePerBottleCents: number }[], options?: RequestOptions): Promise<TierPrice[]> {
    return this.client.post<TierPrice[]>(`/api/v1/price-tiers/${tierId}/prices`, { prices }, options);
  }
}
