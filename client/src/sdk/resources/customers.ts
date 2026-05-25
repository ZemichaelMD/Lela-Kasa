import type { SdkClient, RequestOptions } from '../client';

export interface Customer {
  id: string;
  shopId: string;
  name: string;
  phone?: string;
  notes?: string;
  creditBalanceCents: number;
  outstandingBoxes: number;
  outstandingBottles: number;
  priceTierId?: string | null;
  priceTierLocked: boolean;
  username?: string | null;
  mustChangePassword?: boolean;
  passwordChangedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CreateCustomerDto {
  name: string;
  phone?: string;
  notes?: string;
  priceTierId?: string;
  priceTierLocked?: boolean;
  username?: string;
  pin?: string;
}

export interface UpdateCustomerDto {
  name?: string;
  phone?: string;
  notes?: string;
  priceTierId?: string;
  priceTierLocked?: boolean;
  username?: string;
  pin?: string;
}

export interface ListCustomersParams {
  page?: number;
  pageSize?: number;
  search?: string;
  hasCredit?: boolean;
}

export interface PaginatedCustomers {
  data: Customer[];
  total: number;
  page: number;
  pageSize: number;
}

export interface LedgerSaleEntry {
  type: 'sale';
  date: string;
  data: {
    id: string;
    saleDate: string;
    status: string;
    subtotalCents: number;
    paidCents: number;
    creditDeltaCents: number;
    boxesOutDelta: number;
    boxesReturnedOnSale: number;
    bottlesOutDelta: number;
    bottlesReturnedOnSale: number;
    notes?: string | null;
    lines: Array<{
      id: string;
      beverageId: string;
      boxes: number;
      bottles: number;
      lineTotalCents: number;
    }>;
  };
}

export interface LedgerPaymentEntry {
  type: 'payment';
  date: string;
  data: {
    id: string;
    amountCents: number;
    method: string;
    paymentAccountId: string;
    saleId: string | null;
    reference?: string | null;
    notes?: string | null;
    paidAt: string;
    voidedAt: string | null;
  };
}

export interface LedgerReturnEntry {
  type: 'return';
  date: string;
  data: {
    id: string;
    customerId: string;
    boxes: number;
    bottles: number;
    notes?: string | null;
    recordedById: string | null;
    createdAt: string;
  };
}

export type LedgerEntry =
  | LedgerSaleEntry
  | LedgerPaymentEntry
  | LedgerReturnEntry;

export interface RecordPaymentDto {
  amountCents: number;
  method: 'CASH' | 'BANK_TRANSFER' | 'MOBILE_MONEY' | 'OTHER';
  paymentAccountId: string;
  reference?: string;
  notes?: string;
  paidAt?: string;
}

export interface RecordReturnDto {
  boxes: number;
  bottles: number;
  notes?: string;
  returnedAt?: string;
}

export interface SendSmsDto {
  text: string;
}

export interface ReminderResult {
  success: boolean;
  throttled: boolean;
  retryAfterMinutes?: number;
  channels: string[];
  message: string;
}

export interface TelegramLinkInfo {
  configured: boolean;
  deepLink: string;
  code: string;
  botUsername: string;
}

export class CustomersResource {
  constructor(private readonly client: SdkClient) {}

  list(params?: ListCustomersParams, options?: RequestOptions): Promise<PaginatedCustomers> {
    const query = new URLSearchParams();
    if (params?.page !== undefined) query.set('page', String(params.page));
    if (params?.pageSize !== undefined) query.set('pageSize', String(params.pageSize));
    if (params?.search) query.set('search', params.search);
    if (params?.hasCredit !== undefined) query.set('hasCredit', String(params.hasCredit));
    const qs = query.toString();
    return this.client.get<PaginatedCustomers>(`/api/v1/customers${qs ? `?${qs}` : ''}`, options);
  }

  findOne(id: string, options?: RequestOptions): Promise<Customer> {
    return this.client.get<Customer>(`/api/v1/customers/${id}`, options);
  }

  /**
   * Recomputes the customer's credit balance and outstanding container counts
   * from their transaction history, persists any correction, and returns the
   * updated customer.
   */
  recalculate(id: string, options?: RequestOptions): Promise<Customer> {
    return this.client.post<Customer>(`/api/v1/customers/${id}/recalculate`, undefined, options);
  }

  /**
   * Recomputes credit balances and container counts for every customer in the
   * shop, healing any drifted counters. Returns how many were corrected.
   */
  recalculateAll(
    options?: RequestOptions,
  ): Promise<{ customersChecked: number; customersCorrected: number }> {
    return this.client.post<{ customersChecked: number; customersCorrected: number }>(
      `/api/v1/customers/recalculate-all`,
      undefined,
      options,
    );
  }

  create(dto: CreateCustomerDto, options?: RequestOptions): Promise<Customer> {
    return this.client.post<Customer>('/api/v1/customers', dto, options);
  }

  update(id: string, dto: UpdateCustomerDto, options?: RequestOptions): Promise<Customer> {
    return this.client.patch<Customer>(`/api/v1/customers/${id}`, dto, options);
  }

  remove(id: string, options?: RequestOptions): Promise<void> {
    return this.client.delete<void>(`/api/v1/customers/${id}`, options);
  }

  setCredentials(id: string, dto: { username: string; pin: string }, options?: RequestOptions): Promise<any> {
    return this.client.patch<any>(`/api/v1/customers/${id}/credentials`, dto, options);
  }

  getLedger(id: string, options?: RequestOptions): Promise<LedgerEntry[]> {
    return this.client.get<LedgerEntry[]>(`/api/v1/customers/${id}/ledger`, options);
  }

  recordPayment(
    id: string,
    dto: RecordPaymentDto,
    options?: RequestOptions,
  ): Promise<Customer> {
    return this.client.post<Customer>(`/api/v1/customers/${id}/payments`, dto, options);
  }

  recordReturn(
    id: string,
    dto: RecordReturnDto,
    options?: RequestOptions,
  ): Promise<Customer> {
    return this.client.post<Customer>(`/api/v1/customers/${id}/returns`, dto, options);
  }

  sendSms(id: string, dto: SendSmsDto, options?: RequestOptions): Promise<{ sent: boolean }> {
    return this.client.post<{ sent: boolean }>(`/api/v1/customers/${id}/sms`, dto, options);
  }

  /**
   * Sends a payment / container reminder to the customer across every channel
   * available for them (SMS, WhatsApp, Telegram). Throttled to once per 2h.
   */
  remind(id: string, options?: RequestOptions): Promise<ReminderResult> {
    return this.client.post<ReminderResult>(`/api/v1/customers/${id}/remind`, undefined, options);
  }

  /** Generates a Telegram deep link to share with the customer so they can connect. */
  telegramLink(id: string, options?: RequestOptions): Promise<TelegramLinkInfo> {
    return this.client.post<TelegramLinkInfo>(
      `/api/v1/customers/${id}/telegram-link`,
      undefined,
      options,
    );
  }
}
