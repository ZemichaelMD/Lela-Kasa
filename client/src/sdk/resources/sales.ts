import type { SdkClient, RequestOptions } from '../client';

export interface SaleContainerKasa {
  id: string;
  saleId: string;
  beverageId: string;
  count: number;
  beverage?: { id: string; name: string };
  createdAt: string;
}

export interface SaleReturnedContainer {
  id: string;
  saleId: string;
  beverageId: string;
  boxes: number;
  bottles: number;
  beverage?: { id: string; name: string };
  createdAt: string;
}

export interface SaleLine {
  id: string;
  saleId: string;
  beverageId: string;
  boxes: number;
  bottles: number;
  pricePerBoxCents: number;
  pricePerBottleCents: number;
  lineTotalCents: number;
  beverage?: { id: string; name: string };
}

export interface Payment {
  id: string;
  saleId: string;
  paymentAccountId: string;
  amountCents: number;
  method: string;
  reference?: string;
  notes?: string;
  paidAt?: string;
  voidedAt?: string;
  createdAt: string;
  paymentAccount?: { id: string; name: string };
}

export interface Sale {
  id: string;
  shopId: string;
  customerId?: string;
  priceTierId: string;
  saleDate: string;
  status: string;
  subtotalCents: number;
  paidCents: number;
  creditDeltaCents: number;
  boxesOutDelta: number;
  bottlesOutDelta: number;
  boxesReturnedOnSale: number;
  bottlesReturnedOnSale: number;
  notes?: string;
  voidedAt?: string;
  voidReason?: string;
  createdAt: string;
  updatedAt: string;
  lines: SaleLine[];
  payments: Payment[];
  containerKasas?: SaleContainerKasa[];
  returnedContainers?: SaleReturnedContainer[];
  customer?: { id: string; name: string; phone?: string };
  priceTier?: { id: string; name: string };
  createdBy?: { id: string; name: string };
  updatedBy?: { id: string; name: string };
}

export interface CreateSaleLineDto {
  beverageId: string;
  priceTierId?: string;
  boxes?: number;
  bottles?: number;
}

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'MOBILE_MONEY' | 'OTHER';

export interface CreateSalePaymentDto {
  paymentAccountId: string;
  amountCents: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  paidAt?: string;
}

export interface CreateSaleDto {
  saleDate: string;
  customerId?: string;
  priceTierId: string;
  lines: CreateSaleLineDto[];
  notes?: string;
  applyCredit?: boolean;
  payments?: CreateSalePaymentDto[];
  containerKasas?: { beverageId: string; count: number }[];
  returnedContainers?: { beverageId: string; boxes: number; bottles: number }[];
}

export interface UpdateSaleDto {
  saleDate: string;
  customerId: string;
  priceTierId?: string;
  notes?: string;
  lines: CreateSaleLineDto[];
  payments?: CreateSalePaymentDto[];
  draft?: boolean;
  containerKasas?: { beverageId: string; count: number }[];
  returnedContainers?: { beverageId: string; boxes: number; bottles: number }[];
}

export interface AddPaymentDto {
  paymentAccountId: string;
  amountCents: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  paidAt?: string;
}

export interface ListSalesParams {
  page?: number;
  pageSize?: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  customerId?: string;
  priceTierId?: string;
  paymentAccountId?: string;
  beverageId?: string;
  status?: string;
  hasCredit?: boolean;
  createdById?: string;
}

export interface PaginatedSales {
  data: Sale[];
  total: number;
  page: number;
  pageSize: number;
}

export class SalesResource {
  constructor(private readonly client: SdkClient) {}

  list(params?: ListSalesParams, options?: RequestOptions): Promise<PaginatedSales> {
    const query = new URLSearchParams();
    if (params?.page !== undefined) query.set('page', String(params.page));
    if (params?.pageSize !== undefined) query.set('pageSize', String(params.pageSize));
    if (params?.search) query.set('search', params.search);
    if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
    if (params?.dateTo) query.set('dateTo', params.dateTo);
    if (params?.customerId) query.set('customerId', params.customerId);
    if (params?.priceTierId) query.set('priceTierId', params.priceTierId);
    if (params?.paymentAccountId) query.set('paymentAccountId', params.paymentAccountId);
    if (params?.beverageId) query.set('beverageId', params.beverageId);
    if (params?.status) query.set('status', params.status);
    if (params?.hasCredit !== undefined) query.set('hasCredit', String(params.hasCredit));
    if (params?.createdById) query.set('createdById', params.createdById);
    const qs = query.toString();
    return this.client.get<PaginatedSales>(`/api/v1/sales${qs ? `?${qs}` : ''}`, options);
  }

  findOne(id: string, options?: RequestOptions): Promise<Sale> {
    return this.client.get<Sale>(`/api/v1/sales/${id}`, options);
  }

  create(dto: CreateSaleDto, options?: RequestOptions): Promise<Sale> {
    return this.client.post<Sale>('/api/v1/sales', dto, options);
  }

  update(id: string, dto: UpdateSaleDto, options?: RequestOptions): Promise<Sale> {
    return this.client.patch<Sale>(`/api/v1/sales/${id}`, dto, options);
  }

  void(saleId: string, reason: string, options?: RequestOptions): Promise<Sale> {
    return this.client.post<Sale>(`/api/v1/sales/${saleId}/void`, { reason }, options);
  }

  addPayment(saleId: string, dto: AddPaymentDto, options?: RequestOptions): Promise<Payment> {
    return this.client.post<Payment>(`/api/v1/sales/${saleId}/payments`, dto, options);
  }

  voidPayment(saleId: string, paymentId: string, reason?: string, options?: RequestOptions): Promise<void> {
    return this.client.post<void>(
      `/api/v1/sales/${saleId}/payments/${paymentId}/void`,
      reason ? { reason } : undefined,
      options,
    );
  }

  exportCsv(params?: ListSalesParams, options?: RequestOptions): Promise<Response> {
    const query = new URLSearchParams();
    if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
    if (params?.dateTo) query.set('dateTo', params.dateTo);
    if (params?.customerId) query.set('customerId', params.customerId);
    if (params?.status) query.set('status', params.status);
    const qs = query.toString();
    return this.client.getRaw(`/api/v1/sales/export${qs ? `?${qs}` : ''}`, options);
  }
}
