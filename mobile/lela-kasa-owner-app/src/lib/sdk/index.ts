import { SdkClient } from './client';
import { AuthResource } from './resources/auth';
import { CustomersResource } from './resources/customers';
import { SalesResource } from './resources/sales';
import { BeveragesResource } from './resources/beverages';
import { PriceTiersResource } from './resources/price-tiers';
import { PaymentAccountsResource } from './resources/payment-accounts';
import { EmployeesResource } from './resources/employees';
import { SubscriptionsResource } from './resources/subscriptions';
import { BillingResource } from './resources/billing';
import { ShopsResource } from './resources/shops';
import { DashboardResource } from './resources/dashboard';
import { ReportsResource } from './resources/reports';
import { TelegramResource } from './resources/telegram';
import { PermissionsResource } from './resources/permissions';
import { tokenStore } from './token-store-rn';
import { emitAuthLogout } from '../event-emitter';
import { BASE_URL } from './client';

export const API_URL = BASE_URL;

export type { SdkConfig, RequestOptions } from './client';
export { SdkClient } from './client';
export { ApiError } from './error';
export type { TokenStore } from './token-store';
export { tokenStore } from './token-store-rn';

export { AuthResource } from './resources/auth';
export type {
  AuthUser,
  LoginInput,
  LoginResponse,
  AuthConfig,
  SupportInfo,
  VerificationStatus,
  ChannelVerification,
} from './resources/auth';
export { TelegramResource } from './resources/telegram';
export type { TelegramLinkInfo } from './resources/telegram';

export { CustomersResource } from './resources/customers';
export type {
  Customer,
  CreateCustomerDto,
  UpdateCustomerDto,
  ListCustomersParams,
  PaginatedCustomers,
  LedgerEntry,
  LedgerSaleEntry,
  LedgerPaymentEntry,
  LedgerReturnEntry,
  RecordPaymentDto,
  RecordReturnDto,
} from './resources/customers';

export { SalesResource } from './resources/sales';
export type {
  Sale,
  SaleLine,
  SaleContainerKasa,
  SaleReturnedContainer,
  Payment,
  CreateSaleDto,
  AddPaymentDto,
  ListSalesParams,
  PaginatedSales,
  PaymentMethod,
} from './resources/sales';

export { BeveragesResource } from './resources/beverages';
export type { Beverage, PaginatedBeverages } from './resources/beverages';

export { PriceTiersResource } from './resources/price-tiers';
export type { PriceTier } from './resources/price-tiers';

export { PaymentAccountsResource } from './resources/payment-accounts';
export type { PaymentAccount } from './resources/payment-accounts';

export { EmployeesResource } from './resources/employees';
export type { Employee, EmployeeDetail, CreateEmployeeDto, UpdateEmployeeDto } from './resources/employees';

export { SubscriptionsResource } from './resources/subscriptions';
export type { SubscriptionData, SubscriptionHistoryEntry, SubscriptionProvider, NotifyPaymentInput } from './resources/subscriptions';

export { BillingResource } from './resources/billing';
export type { SubscriptionPlan, SubscriptionStatus as BillingSubscriptionStatus, CheckoutInput, CheckoutResult } from './resources/billing';

export { ShopsResource } from './resources/shops';
export type { Shop, UpdateShopDto } from './resources/shops';

export { DashboardResource } from './resources/dashboard';
export type { DashboardData } from './resources/dashboard';

export { ReportsResource } from './resources/reports';
export type { ReportParams } from './resources/reports';

export { PermissionsResource } from './resources/permissions';
export type { PermissionGroup, UpdatePermissionsDto } from './resources/permissions';

export interface KasaSdk {
  auth: AuthResource;
  customers: CustomersResource;
  sales: SalesResource;
  beverages: BeveragesResource;
  priceTiers: PriceTiersResource;
  paymentAccounts: PaymentAccountsResource;
  employees: EmployeesResource;
  subscriptions: SubscriptionsResource;
  billing: BillingResource;
  shops: ShopsResource;
  dashboard: DashboardResource;
  reports: ReportsResource;
  telegram: TelegramResource;
  permissions: PermissionsResource;
}

let _sdk: KasaSdk | null = null;

export function getSdk(): KasaSdk {
  if (!_sdk) {
    const client = new SdkClient({
      tokenStore,
      onUnauthenticated: () => {
        tokenStore.clearTokens();
        emitAuthLogout();
      },
    });
    _sdk = {
      auth: new AuthResource(client),
      customers: new CustomersResource(client),
      sales: new SalesResource(client),
      beverages: new BeveragesResource(client),
      priceTiers: new PriceTiersResource(client),
      paymentAccounts: new PaymentAccountsResource(client),
      employees: new EmployeesResource(client),
      subscriptions: new SubscriptionsResource(client),
      billing: new BillingResource(client),
      shops: new ShopsResource(client),
      dashboard: new DashboardResource(client),
      reports: new ReportsResource(client),
      telegram: new TelegramResource(client),
      permissions: new PermissionsResource(client),
    };
  }
  return _sdk;
}
