import type { SdkClient, RequestOptions } from '../client';

export type DashboardRange = 'today' | 'week' | 'month';

export interface DashboardData {
  todaySalesCents: number;
  weekSalesCents: number;
  monthSalesCents: number;

  totalOutstandingCreditCents: number;
  customersWithCreditCount: number;

  outstandingBoxes: number;
  outstandingBottles: number;

  topCustomers: Array<{
    id: string;
    name: string;
    totalCents: number;
  }>;

  topBeverages: Array<{
    id: string;
    name: string;
    totalBoxes: number;
  }>;

  lowStockBeverages: Array<{
    name: string;
    stockBottles: number;
  }>;

  recentVoids: Array<{
    id: string;
    customerId: string | null;
    customerName?: string | null;
    saleDate: string | null;
    voidedAt: string | null;
    subtotalCents: number;
  }>;
}

export class DashboardResource {
  constructor(private readonly client: SdkClient) {}

  getDashboard(range: DashboardRange = 'today', options?: RequestOptions): Promise<DashboardData> {
    return this.client.get<DashboardData>(`/api/v1/reports/dashboard?range=${range}`, options);
  }
}
