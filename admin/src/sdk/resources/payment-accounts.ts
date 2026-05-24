import type { SdkClient, RequestOptions } from '../client';
import type { Payment } from './sales';

export interface PaymentAccount {
  id: string;
  shopId: string;
  name: string;
  kind: string;
  holderName?: string;
  bankName?: string;
  accountNumber?: string;
  isActive: boolean;
  notes?: string;
}

export interface CreatePaymentAccountDto {
  name: string;
  kind: string;
  holderName?: string;
  bankName?: string;
  accountNumber?: string;
  isActive?: boolean;
  notes?: string;
}

export interface UpdatePaymentAccountDto {
  name?: string;
  kind?: string;
  holderName?: string;
  bankName?: string;
  accountNumber?: string;
  isActive?: boolean;
  notes?: string;
}

export class PaymentAccountsResource {
  constructor(private readonly client: SdkClient) {}

  list(options?: RequestOptions): Promise<PaymentAccount[]> {
    return this.client.get<PaymentAccount[]>('/api/v1/payment-accounts', options);
  }

  findOne(id: string, options?: RequestOptions): Promise<PaymentAccount> {
    return this.client.get<PaymentAccount>(`/api/v1/payment-accounts/${id}`, options);
  }

  create(dto: CreatePaymentAccountDto, options?: RequestOptions): Promise<PaymentAccount> {
    return this.client.post<PaymentAccount>('/api/v1/payment-accounts', dto, options);
  }

  update(id: string, dto: UpdatePaymentAccountDto, options?: RequestOptions): Promise<PaymentAccount> {
    return this.client.patch<PaymentAccount>(`/api/v1/payment-accounts/${id}`, dto, options);
  }

  remove(id: string, options?: RequestOptions): Promise<void> {
    return this.client.delete<void>(`/api/v1/payment-accounts/${id}`, options);
  }

  getPayments(id: string, options?: RequestOptions): Promise<Payment[]> {
    return this.client.get<Payment[]>(`/api/v1/payment-accounts/${id}/payments`, options);
  }
}
