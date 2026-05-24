import type { SdkClient, RequestOptions } from '../client';

export interface SubscriptionData {
  hasSubscription: boolean;
  planId?: string;
  planName?: string;
  planPriceCents?: number;
  monthlyPriceCents?: number;
  yearlyPriceCents?: number;
  currentPriceCents?: number;
  billingCycle?: string;
  status: string;
  paidUntil?: string;
  trialEndsAt?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  monthlyPriceCents: number;
  yearlyPriceCents: number;
  trialDays: number;
  features: string[];
  maxShops: number;
  maxUsers: number;
  maxCustomers: number;
}

export interface SubscriptionHistoryEntry {
  id: string;
  action: string;
  plan?: { name: string };
  amountCents?: number;
  prevStatus?: string;
  newStatus?: string;
  notes?: string;
  createdAt: string;
}

export interface SubscriptionProvider {
  id: string;
  name: string;
  kind: string;
  instructions?: string;
  contactInfo?: string;
}

export interface NotifyPaymentInput {
  planId: string;
  providerId: string;
  reference?: string;
  notes?: string;
}

export class SubscriptionsResource {
  constructor(private readonly client: SdkClient) {}

  mySubscription(options?: RequestOptions): Promise<SubscriptionData> {
    return this.client.get<SubscriptionData>('/api/v1/subscriptions/my', options);
  }

  history(options?: RequestOptions): Promise<SubscriptionHistoryEntry[]> {
    return this.client.get<SubscriptionHistoryEntry[]>('/api/v1/subscriptions/my/history', options);
  }

  providers(options?: RequestOptions): Promise<SubscriptionProvider[]> {
    return this.client.get<SubscriptionProvider[]>('/api/v1/subscriptions/providers', options);
  }

  notifyPayment(input: NotifyPaymentInput, options?: RequestOptions): Promise<{ throttled?: boolean; retryAfterMinutes?: number; message?: string }> {
    return this.client.post('/api/v1/subscriptions/notify-payment', input, options);
  }

  getStatus(options?: RequestOptions): Promise<{ plan: string; status: string; expiresAt?: string }> {
    return this.client.get('/api/v1/subscription/status', options);
  }

  extend(dto: { plan: string }, options?: RequestOptions): Promise<{ plan: string; status: string; expiresAt?: string }> {
    return this.client.post('/api/v1/subscription/extend', dto, options);
  }

  listPlans(options?: RequestOptions): Promise<SubscriptionPlan[]> {
    return this.client.get<SubscriptionPlan[]>('/api/v1/subscriptions/plans', options);
  }

  selectPlan(planId: string, billingCycle: 'monthly' | 'yearly', options?: RequestOptions): Promise<any> {
    return this.client.post('/api/v1/subscriptions/select-plan', { planId, billingCycle }, options);
  }
}
