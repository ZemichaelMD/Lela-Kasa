import type { SdkClient, RequestOptions } from '../client';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  monthlyPriceCents: number;
  yearlyPriceCents: number;
  features?: string[];
}

export interface SubscriptionStatus {
  id?: string;
  planId?: string;
  plan?: {
    id: string;
    name: string;
  };
  status: 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'EXPIRED' | 'CANCELLED' | 'FREE';
  currentPeriodEnd?: string;
}

export interface CheckoutInput {
  planId: string;
  cycle: 'MONTHLY' | 'YEARLY';
}

export interface CheckoutResult {
  checkoutUrl: string;
}

export interface CancelInput {
  cancelAtPeriodEnd?: boolean;
}

export class BillingResource {
  constructor(private readonly client: SdkClient) {}

  mySubscription(options?: RequestOptions): Promise<SubscriptionStatus> {
    return this.client.get<SubscriptionStatus>('/api/v1/billing/subscription', options);
  }

  listPlans(options?: RequestOptions): Promise<SubscriptionPlan[]> {
    return this.client.get<SubscriptionPlan[]>('/api/v1/billing/plans', options);
  }

  checkout(input: CheckoutInput, options?: RequestOptions): Promise<CheckoutResult> {
    return this.client.post<CheckoutResult>('/api/v1/billing/checkout', input, options);
  }

  cancel(input: CancelInput, options?: RequestOptions): Promise<{ success: boolean }> {
    return this.client.post<{ success: boolean }>('/api/v1/billing/cancel', input, options);
  }
}
