import type { SdkClient, RequestOptions } from '../client';

export interface Beverage {
  id: string;
  shopId: string;
  code: string;
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

export interface CreateBeverageDto {
  name: string;
  brand?: string;
  sizeMl?: number;
  bottlesPerBox: number;
  imageUrl?: string;
  code?: string;
}

export interface UpdateBeverageDto {
  name?: string;
  brand?: string;
  sizeMl?: number;
  bottlesPerBox?: number;
  isActive?: boolean;
  stockBottles?: number;
  code?: string;
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

  create(dto: CreateBeverageDto, options?: RequestOptions): Promise<Beverage> {
    return this.client.post<Beverage>('/api/v1/beverages', dto, options);
  }

  createMany(dtos: CreateBeverageDto[], options?: RequestOptions): Promise<Beverage[]> {
    return this.client.post<Beverage[]>('/api/v1/beverages/bulk', { beverages: dtos }, options);
  }

  update(id: string, dto: UpdateBeverageDto, options?: RequestOptions): Promise<Beverage> {
    return this.client.patch<Beverage>(`/api/v1/beverages/${id}`, dto, options);
  }

  delete(id: string, options?: RequestOptions): Promise<void> {
    return this.client.delete<void>(`/api/v1/beverages/${id}`, options);
  }
}
