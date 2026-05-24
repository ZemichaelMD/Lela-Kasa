import type { SdkClient, RequestOptions } from '../client';

export interface ReportParams {
  dateFrom?: string;
  dateTo?: string;
  format?: 'json' | 'csv';
}

function buildQuery(params?: ReportParams): string {
  if (!params) return '';
  const query = new URLSearchParams();
  if (params.dateFrom) query.set('from', params.dateFrom);
  if (params.dateTo) query.set('to', params.dateTo);
  if (params.format) query.set('format', params.format);
  const qs = query.toString();
  return qs ? `?${qs}` : '';
}

export class ReportsResource {
  constructor(private readonly client: SdkClient) {}

  salesSummary(params?: ReportParams, options?: RequestOptions): Promise<unknown> {
    return this.client.get(`/api/v1/reports/sales-summary${buildQuery(params)}`, options);
  }

  salesByCustomer(params?: ReportParams, options?: RequestOptions): Promise<unknown> {
    return this.client.get(`/api/v1/reports/sales-by-customer${buildQuery(params)}`, options);
  }

  salesByBeverage(params?: ReportParams, options?: RequestOptions): Promise<unknown> {
    return this.client.get(`/api/v1/reports/sales-by-beverage${buildQuery(params)}`, options);
  }

  salesByPaymentAccount(params?: ReportParams, options?: RequestOptions): Promise<unknown> {
    return this.client.get(`/api/v1/reports/sales-by-payment-account${buildQuery(params)}`, options);
  }

  creditAging(params?: ReportParams, options?: RequestOptions): Promise<unknown> {
    return this.client.get(`/api/v1/reports/credit-aging${buildQuery(params)}`, options);
  }

  containerDebt(params?: ReportParams, options?: RequestOptions): Promise<unknown> {
    return this.client.get(`/api/v1/reports/container-debt${buildQuery(params)}`, options);
  }

  stockOnHand(params?: ReportParams, options?: RequestOptions): Promise<unknown> {
    return this.client.get(`/api/v1/reports/stock-on-hand${buildQuery(params)}`, options);
  }

  lowStock(params?: ReportParams, options?: RequestOptions): Promise<unknown> {
    return this.client.get(`/api/v1/reports/low-stock${buildQuery(params)}`, options);
  }

  // Export methods using getRaw for authenticated file downloads
  exportSalesSummary(params?: ReportParams, options?: RequestOptions): Promise<Response> {
    return this.client.getRaw(`/api/v1/reports/sales-summary${buildQuery({ ...params, format: 'csv' })}`, options);
  }

  exportSalesByCustomer(params?: ReportParams, options?: RequestOptions): Promise<Response> {
    return this.client.getRaw(`/api/v1/reports/sales-by-customer${buildQuery({ ...params, format: 'csv' })}`, options);
  }

  exportSalesByBeverage(params?: ReportParams, options?: RequestOptions): Promise<Response> {
    return this.client.getRaw(`/api/v1/reports/sales-by-beverage${buildQuery({ ...params, format: 'csv' })}`, options);
  }

  exportSalesByPaymentAccount(params?: ReportParams, options?: RequestOptions): Promise<Response> {
    return this.client.getRaw(`/api/v1/reports/sales-by-payment-account${buildQuery({ ...params, format: 'csv' })}`, options);
  }

  exportCreditAging(params?: ReportParams, options?: RequestOptions): Promise<Response> {
    return this.client.getRaw(`/api/v1/reports/credit-aging${buildQuery({ ...params, format: 'csv' })}`, options);
  }

  exportContainerDebt(params?: ReportParams, options?: RequestOptions): Promise<Response> {
    return this.client.getRaw(`/api/v1/reports/container-debt${buildQuery({ ...params, format: 'csv' })}`, options);
  }

  exportStockOnHand(params?: ReportParams, options?: RequestOptions): Promise<Response> {
    return this.client.getRaw(`/api/v1/reports/stock-on-hand${buildQuery({ ...params, format: 'csv' })}`, options);
  }
}
