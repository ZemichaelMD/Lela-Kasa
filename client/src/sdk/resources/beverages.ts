import type { SdkClient, RequestOptions } from '../client';

export interface Beverage {
  id: string;
  shopId: string;
  name: string;
  brand?: string;
  sizeMl?: number;
  bottlesPerBox: number;
  imageUrl?: string;
  isActive: boolean;
  stockBottles: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBeverageDto {
  name: string;
  brand?: string;
  sizeMl?: number;
  bottlesPerBox: number;
  imageUrl?: string;
  isActive?: boolean;
}

export interface UpdateBeverageDto {
  name?: string;
  brand?: string;
  sizeMl?: number;
  bottlesPerBox?: number;
  imageUrl?: string;
  isActive?: boolean;
}

export interface ListBeveragesParams {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
}

export interface PaginatedBeverages {
  data: Beverage[];
  total: number;
  page: number;
  pageSize: number;
}

export interface StockMovement {
  id: string;
  beverageId: string;
  bottlesDelta: number;
  reason: string;
  notes?: string;
  createdAt: string;
}

export interface BeveragePrice {
  id: string;
  priceTierId: string;
  beverageId: string;
  pricePerBoxCents: number;
  pricePerBottleCents: number;
}

/** Shape returned by GET /beverages/:id/prices — one entry per tier. */
export interface CurrentTierPrice {
  tier: { id: string; name: string; kind: string };
  currentPrice: BeveragePrice | null;
}

export interface AdjustStockDto {
  bottlesDelta: number;
  reason: string;
  notes?: string;
}

export class BeveragesResource {
  constructor(private readonly client: SdkClient) {}

  list(params?: ListBeveragesParams, options?: RequestOptions): Promise<PaginatedBeverages> {
    const query = new URLSearchParams();
    if (params?.page !== undefined) query.set('page', String(params.page));
    if (params?.pageSize !== undefined) query.set('pageSize', String(params.pageSize));
    if (params?.search) query.set('search', params.search);
    if (params?.isActive !== undefined) query.set('isActive', String(params.isActive));
    const qs = query.toString();
    return this.client.get<PaginatedBeverages>(`/api/v1/beverages${qs ? `?${qs}` : ''}`, options);
  }

  findOne(id: string, options?: RequestOptions): Promise<Beverage> {
    return this.client.get<Beverage>(`/api/v1/beverages/${id}`, options);
  }

  create(dto: CreateBeverageDto, options?: RequestOptions): Promise<Beverage> {
    return this.client.post<Beverage>('/api/v1/beverages', dto, options);
  }

  createMany(dtos: CreateBeverageDto[], options?: RequestOptions): Promise<Beverage[]> {
    return this.client.post<Beverage[]>('/api/v1/beverages/bulk', { beverages: dtos }, options);
  }

  update(id: string, dto: UpdateBeverageDto, options?: RequestOptions): Promise<Beverage> {
    return this.client.patch<Beverage>(`/api/v1/beverages/${id}`, dto, options);
  }

  remove(id: string, options?: RequestOptions): Promise<void> {
    return this.client.delete<void>(`/api/v1/beverages/${id}`, options);
  }

  adjustStock(id: string, dto: AdjustStockDto, options?: RequestOptions): Promise<Beverage> {
    return this.client.post<Beverage>(`/api/v1/beverages/${id}/stock`, dto, options);
  }

  getMovements(id: string, options?: RequestOptions): Promise<StockMovement[]> {
    return this.client.get<StockMovement[]>(`/api/v1/beverages/${id}/stock`, options);
  }

  getCurrentPrices(id: string, options?: RequestOptions): Promise<CurrentTierPrice[]> {
    return this.client.get<CurrentTierPrice[]>(`/api/v1/beverages/${id}/prices`, options);
  }
}
