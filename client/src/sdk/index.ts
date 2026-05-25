import { SdkClient } from "./client";
import { AuthResource } from "./resources/auth";
import { MediaResource } from "./resources/media";
import { ShopsResource } from "./resources/shops";
import { CustomersResource } from "./resources/customers";
import { BeveragesResource } from "./resources/beverages";
import { PriceTiersResource } from "./resources/price-tiers";
import { PaymentAccountsResource } from "./resources/payment-accounts";
import { SalesResource } from "./resources/sales";
import { DashboardResource } from "./resources/dashboard";
import { ReportsResource } from "./resources/reports";
import { EmployeesResource } from "./resources/employees";
import { ChatbotResource } from "./resources/chatbot";
import { TelegramResource } from "./resources/telegram";

export type { SdkConfig, RequestOptions } from "./client";
export { MediaResource } from "./resources/media";
export type { UploadResult, MediaUploadOptions } from "./resources/media";
export { SdkClient } from "./client";
export { ApiError } from "./error";
export type { TokenStore } from "./token-store";
export {
  MemoryTokenStore,
  NoopTokenStore,
  BrowserTokenStore,
} from "./token-store";

export { AuthResource } from "./resources/auth";
export type { VerificationStatus, ChannelVerification } from "./resources/auth";
export { ShopsResource } from "./resources/shops";
export type { Shop, UpdateShopDto } from "./resources/shops";
export { CustomersResource } from "./resources/customers";
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
  SendSmsDto,
} from "./resources/customers";
export { BeveragesResource } from "./resources/beverages";
export type {
  Beverage,
  CreateBeverageDto,
  UpdateBeverageDto,
  ListBeveragesParams,
  PaginatedBeverages,
  StockMovement,
  BeveragePrice,
  CurrentTierPrice,
  AdjustStockDto,
} from "./resources/beverages";
export { PriceTiersResource } from "./resources/price-tiers";
export type {
  PriceTier,
  CreatePriceTierDto,
  UpdatePriceTierDto,
  SetPriceDto,
  TierPrice,
} from "./resources/price-tiers";
export { PaymentAccountsResource } from "./resources/payment-accounts";
export type {
  PaymentAccount,
  CreatePaymentAccountDto,
  UpdatePaymentAccountDto,
} from "./resources/payment-accounts";
export { SalesResource } from "./resources/sales";
export type {
  Sale,
  SaleLine,
  Payment,
  CreateSaleDto,
  UpdateSaleDto,
  AddPaymentDto,
  ListSalesParams,
  PaginatedSales,
} from "./resources/sales";
export { DashboardResource } from "./resources/dashboard";
export type { DashboardData, DashboardRange } from "./resources/dashboard";
export { ReportsResource } from "./resources/reports";
export type { ReportParams } from "./resources/reports";
export { EmployeesResource } from "./resources/employees";
export type {
  Employee,
  EmployeeDetail,
  InviteEmployeeDto,
  UpdateEmployeeDto,
} from "./resources/employees";
export { ChatbotResource } from "./resources/chatbot";
export type {
  ChatMessageResponse,
  ChatConfirmationSummary,
} from "./resources/chatbot";
export { TelegramResource } from "./resources/telegram";
export type { TelegramLinkInfo } from "./resources/telegram";
export type { ReminderResult } from "./resources/customers";

/**
 * The main Lela Kasa SDK instance.
 * Create once and reuse across your app.
 *
 * @example
 * const sdk = createSdk({ baseUrl: 'http://localhost:3000' });
 */
export interface KasaSdk {
  auth: AuthResource;
  media: MediaResource;
  shops: ShopsResource;
  customers: CustomersResource;
  beverages: BeveragesResource;
  priceTiers: PriceTiersResource;
  paymentAccounts: PaymentAccountsResource;
  sales: SalesResource;
  dashboard: DashboardResource;
  reports: ReportsResource;
  employees: EmployeesResource;
  chatbot: ChatbotResource;
  telegram: TelegramResource;
}

export function createSdk(
  config: ConstructorParameters<typeof SdkClient>[0],
): KasaSdk {
  const client = new SdkClient(config);
  const tokenStore = config.tokenStore;
  const getAccessToken = () => tokenStore?.getAccessToken() ?? null;
  return {
    auth: new AuthResource(client),
    media: new MediaResource(client, config.baseUrl, getAccessToken),
    shops: new ShopsResource(client),
    customers: new CustomersResource(client),
    beverages: new BeveragesResource(client),
    priceTiers: new PriceTiersResource(client),
    paymentAccounts: new PaymentAccountsResource(client),
    sales: new SalesResource(client),
    dashboard: new DashboardResource(client),
    reports: new ReportsResource(client),
    employees: new EmployeesResource(client),
    chatbot: new ChatbotResource(client),
    telegram: new TelegramResource(client),
  };
}
