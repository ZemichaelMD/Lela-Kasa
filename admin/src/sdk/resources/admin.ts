import type { SdkClient, RequestOptions } from '../client';

export interface AdminDashboardData {
  totalShops: number;
  totalUsers: number;
  totalSalesAmount: number;
  lowStockShopsCount: number;
  topBeverages: Array<{
    name: string;
    totalBoxes: number;
  }>;
  topShops: Array<{
    name: string;
    totalCents: number;
  }>;
  recentActivities: Array<{
    id: string;
    when: string;
    actor: string;
    action: string;
  }>;
}

export interface AdminShop {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string | null;
  ownerPhoneVerified: boolean;
  phone: string;
  address: string;
  currency: string;
  timezone: string;
  lowStockThreshold: number;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  employeesCount: number;
  beveragesCount: number;
  salesCount: number;
}

export interface AdminShopDetail extends AdminShop {
  customersCount: number;
  priceTiersCount: number;
  paymentAccountsCount: number;
  owner: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    role: string;
    isActive: boolean;
    emailVerified: boolean;
    createdAt: string;
  };
}

export interface CreateShopDto {
  name: string;
  ownerEmail: string;
  ownerName: string;
  ownerPhone?: string;
  ownerPassword?: string;
  phone?: string;
  address?: string;
}

export interface UpdateShopAdminDto {
  name?: string;
  phone?: string | null;
  address?: string | null;
  lowStockThreshold?: number;
  isActive?: boolean;
}

export interface ChangeShopOwnerDto {
  newOwnerEmail: string;
}

export interface AdminShopSettings {
  shopId: string;
  lowStockThreshold: number;
  timezone: string;
  currency: string;
  defaultPriceTierId: string | null;
  customSettings: Record<string, string>;
}

export interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: 'OWNER' | 'EMPLOYEE' | 'SUPER_ADMIN';
  isActive: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
  shopId: string | null;
  shop?: {
    name: string;
  } | null;
}

export interface AdminUserDetail extends AdminUser {
  updatedAt: string;
  lastLoginAt: string | null;
  username: string | null;
  shops: Array<{
    id: string;
    name: string;
    phone: string | null;
    address: string | null;
    createdAt: string;
  }>;
}

export interface UpdateUserAdminDto {
  name?: string;
  phone?: string | null;
  role?: 'OWNER' | 'EMPLOYEE';
  isActive?: boolean;
}

export interface AdminBeverage {
  id: string;
  shopId: string;
  name: string;
  brand: string | null;
  sizeMl: number | null;
  bottlesPerBox: number;
  isActive: boolean;
  createdAt: string;
  shop?: {
    name: string;
  } | null;
}

export interface CreateBeverageAdminDto {
  name: string;
  brand?: string;
  sizeMl?: number;
  bottlesPerBox?: number;
}

export interface UpdateBeverageAdminDto {
  name?: string;
  brand?: string | null;
  sizeMl?: number | null;
  bottlesPerBox?: number;
  isActive?: boolean;
}

export interface AdminSale {
  id: string;
  shopId: string;
  saleDate: string;
  subtotalCents: number;
  taxCents: number;
  discountCents: number;
  paidCents: number;
  creditDeltaCents: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  shop?: { name: string } | null;
  customer?: { name: string } | null;
  createdBy?: { name: string } | null;
}

export interface AdminAuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  actorUser?: {
    name: string | null;
    email: string;
  } | null;
  shop?: {
    name: string;
  } | null;
}

export interface AuditLogSummary {
  totalLogs: number;
  recent24h: number;
  byAction: Array<{ action: string; count: number }>;
  byEntity: Array<{ entityType: string; count: number }>;
}

export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminSession {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  userShopId: string | null;
  userAgent: string;
  ipAddress: string;
  createdAt: string;
  expiresAt: string;
}

export class AdminResource {
  constructor(private readonly client: SdkClient) {}

  getDashboard(options?: RequestOptions): Promise<AdminDashboardData> {
    return this.client.get<AdminDashboardData>('/api/v1/admin/dashboard', options);
  }

  // ── Shops ───────────────────────────────────────────────────────────────────

  listShops(options?: RequestOptions): Promise<AdminShop[]> {
    return this.client.get<AdminShop[]>('/api/v1/admin/shops', options);
  }

  findOneShop(id: string, options?: RequestOptions): Promise<AdminShopDetail> {
    return this.client.get<AdminShopDetail>(`/api/v1/admin/shops/${id}`, options);
  }

  createShop(dto: CreateShopDto, options?: RequestOptions): Promise<any> {
    return this.client.post<any>('/api/v1/admin/shops', dto, options);
  }

  updateShop(id: string, dto: UpdateShopAdminDto, options?: RequestOptions): Promise<any> {
    return this.client.patch<any>(`/api/v1/admin/shops/${id}`, dto, options);
  }

  deleteShop(id: string, options?: RequestOptions): Promise<any> {
    return this.client.delete<any>(`/api/v1/admin/shops/${id}`, options);
  }

  changeShopOwner(id: string, dto: ChangeShopOwnerDto, options?: RequestOptions): Promise<any> {
    return this.client.patch<any>(`/api/v1/admin/shops/${id}/owner`, dto, options);
  }

  getShopSettings(id: string, options?: RequestOptions): Promise<AdminShopSettings> {
    return this.client.get<AdminShopSettings>(`/api/v1/admin/shops/${id}/settings`, options);
  }

  updateShopSetting(id: string, key: string, value: string, options?: RequestOptions): Promise<any> {
    return this.client.patch<any>(`/api/v1/admin/shops/${id}/settings/${key}`, { value }, options);
  }

  // ── Shop-scoped: Beverages ──────────────────────────────────────────────────

  createShopBeverage(shopId: string, dto: CreateBeverageAdminDto, options?: RequestOptions): Promise<any> {
    return this.client.post<any>(`/api/v1/admin/shops/${shopId}/beverages`, dto, options);
  }

  updateShopBeverage(shopId: string, beverageId: string, dto: UpdateBeverageAdminDto, options?: RequestOptions): Promise<any> {
    return this.client.patch<any>(`/api/v1/admin/shops/${shopId}/beverages/${beverageId}`, dto, options);
  }

  // ── Shop-scoped: Customers ──────────────────────────────────────────────────

  listShopCustomers(shopId: string, options?: RequestOptions): Promise<any[]> {
    return this.client.get<any[]>(`/api/v1/admin/shops/${shopId}/customers`, options);
  }

  createShopCustomer(shopId: string, dto: { name: string; phone?: string; notes?: string }, options?: RequestOptions): Promise<any> {
    return this.client.post<any>(`/api/v1/admin/shops/${shopId}/customers`, dto, options);
  }

  updateShopCustomer(shopId: string, customerId: string, dto: { name?: string; phone?: string | null; notes?: string | null }, options?: RequestOptions): Promise<any> {
    return this.client.patch<any>(`/api/v1/admin/shops/${shopId}/customers/${customerId}`, dto, options);
  }

  deleteShopCustomer(shopId: string, customerId: string, options?: RequestOptions): Promise<any> {
    return this.client.delete<any>(`/api/v1/admin/shops/${shopId}/customers/${customerId}`, options);
  }

  // ── Shop-scoped: Price Tiers ────────────────────────────────────────────────

  listShopPriceTiers(shopId: string, options?: RequestOptions): Promise<any[]> {
    return this.client.get<any[]>(`/api/v1/admin/shops/${shopId}/price-tiers`, options);
  }

  createShopPriceTier(shopId: string, dto: { name: string; kind?: string }, options?: RequestOptions): Promise<any> {
    return this.client.post<any>(`/api/v1/admin/shops/${shopId}/price-tiers`, dto, options);
  }

  setShopPrice(shopId: string, tierId: string, dto: { beverageId: string; pricePerBoxCents: number; pricePerBottleCents: number }, options?: RequestOptions): Promise<any> {
    return this.client.post<any>(`/api/v1/admin/shops/${shopId}/price-tiers/${tierId}/prices`, dto, options);
  }

  // ── Shop-scoped: Payment Accounts ───────────────────────────────────────────

  listShopPaymentAccounts(shopId: string, options?: RequestOptions): Promise<any[]> {
    return this.client.get<any[]>(`/api/v1/admin/shops/${shopId}/payment-accounts`, options);
  }

  createShopPaymentAccount(shopId: string, dto: { name: string; kind?: string; holderName?: string; bankName?: string; accountNumber?: string; notes?: string }, options?: RequestOptions): Promise<any> {
    return this.client.post<any>(`/api/v1/admin/shops/${shopId}/payment-accounts`, dto, options);
  }

  updateShopPaymentAccount(shopId: string, accountId: string, dto: { name?: string; kind?: string; isActive?: boolean; holderName?: string | null; bankName?: string | null; accountNumber?: string | null; notes?: string | null }, options?: RequestOptions): Promise<any> {
    return this.client.patch<any>(`/api/v1/admin/shops/${shopId}/payment-accounts/${accountId}`, dto, options);
  }

  // ── Shop-scoped: Users/Employees ────────────────────────────────────────────

  inviteShopUser(shopId: string, dto: { email: string; name: string; phone?: string; role?: string }, options?: RequestOptions): Promise<any> {
    return this.client.post<any>(`/api/v1/admin/shops/${shopId}/users`, dto, options);
  }

  updateShopUser(shopId: string, userId: string, dto: UpdateUserAdminDto, options?: RequestOptions): Promise<any> {
    return this.client.patch<any>(`/api/v1/admin/shops/${shopId}/users/${userId}`, dto, options);
  }

  // ── Users ───────────────────────────────────────────────────────────────────

  listUsers(options?: RequestOptions): Promise<AdminUser[]> {
    return this.client.get<AdminUser[]>('/api/v1/admin/users', options);
  }

  createUser(dto: { email: string; name?: string; phone?: string; password?: string; role: string; shopId?: string }, options?: RequestOptions): Promise<any> {
    return this.client.post<any>('/api/v1/admin/users', dto, options);
  }

  updateUser(id: string, dto: UpdateUserAdminDto, options?: RequestOptions): Promise<any> {
    return this.client.patch<any>(`/api/v1/admin/users/${id}`, dto, options);
  }

  findUser(id: string, options?: RequestOptions): Promise<AdminUserDetail> {
    return this.client.get<AdminUserDetail>(`/api/v1/admin/users/${id}`, options);
  }

  deleteUser(id: string, options?: RequestOptions): Promise<void> {
    return this.client.delete<void>(`/api/v1/admin/users/${id}`, options);
  }

  toggleUserEmailVerified(id: string, verified: boolean, options?: RequestOptions): Promise<{ success: boolean }> {
    return this.client.post<{ success: boolean }>(`/api/v1/admin/users/${id}/verify-email`, { verified }, options);
  }

  toggleUserPhoneVerified(id: string, verified: boolean, options?: RequestOptions): Promise<{ success: boolean }> {
    return this.client.post<{ success: boolean }>(`/api/v1/admin/users/${id}/verify-phone`, { verified }, options);
  }

  changeUserPassword(id: string, newPassword: string, options?: RequestOptions): Promise<{ success: boolean }> {
    return this.client.post<{ success: boolean }>(`/api/v1/admin/users/${id}/change-password`, { newPassword }, options);
  }

  // ── Beverages ───────────────────────────────────────────────────────────────

  listBeverages(options?: RequestOptions): Promise<AdminBeverage[]> {
    return this.client.get<AdminBeverage[]>('/api/v1/admin/beverages', options);
  }

  createBeverage(dto: CreateBeverageAdminDto, options?: RequestOptions): Promise<AdminBeverage> {
    return this.client.post<AdminBeverage>('/api/v1/admin/beverages', dto, options);
  }

  updateBeverage(id: string, dto: UpdateBeverageAdminDto, options?: RequestOptions): Promise<AdminBeverage> {
    return this.client.patch<AdminBeverage>(`/api/v1/admin/beverages/${id}`, dto, options);
  }

  // ── Sales ───────────────────────────────────────────────────────────────────

  listSales(params?: { shopId?: string; includeLines?: boolean; customerId?: string; dateFrom?: string; dateTo?: string }, options?: RequestOptions): Promise<AdminSale[]> {
    const query = new URLSearchParams();
    if (params?.shopId) query.set('shopId', params.shopId);
    if (params?.includeLines) query.set('includeLines', 'true');
    if (params?.customerId) query.set('customerId', params.customerId);
    if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
    if (params?.dateTo) query.set('dateTo', params.dateTo);
    const qs = query.toString();
    return this.client.get<AdminSale[]>(`/api/v1/admin/sales${qs ? `?${qs}` : ''}`, options);
  }

  findOneSale(id: string, options?: RequestOptions): Promise<any> {
    return this.client.get<any>(`/api/v1/admin/sales/${id}`, options);
  }

  // ── Subscription Plans ─────────────────────────────────────────────────────

  listSubscriptionPlans(options?: RequestOptions): Promise<any[]> {
    return this.client.get<any[]>('/api/v1/admin/plans', options);
  }

  createSubscriptionPlan(dto: any, options?: RequestOptions): Promise<any> {
    return this.client.post<any>('/api/v1/admin/plans', dto, options);
  }

  updateSubscriptionPlan(id: string, dto: any, options?: RequestOptions): Promise<any> {
    return this.client.patch<any>(`/api/v1/admin/plans/${id}`, dto, options);
  }

  deleteSubscriptionPlan(id: string, options?: RequestOptions): Promise<any> {
    return this.client.delete<any>(`/api/v1/admin/plans/${id}`, options);
  }

  // ── Payment Providers ──────────────────────────────────────────────────────

  listPaymentProviders(options?: RequestOptions): Promise<any[]> {
    return this.client.get<any[]>('/api/v1/admin/payment-providers', options);
  }

  createPaymentProvider(dto: any, options?: RequestOptions): Promise<any> {
    return this.client.post<any>('/api/v1/admin/payment-providers', dto, options);
  }

  updatePaymentProvider(id: string, dto: any, options?: RequestOptions): Promise<any> {
    return this.client.patch<any>(`/api/v1/admin/payment-providers/${id}`, dto, options);
  }

  // ── Shop Subscriptions ─────────────────────────────────────────────────────

  listSubscriptions(options?: RequestOptions): Promise<any[]> {
    return this.client.get<any[]>('/api/v1/admin/subscriptions', options);
  }

  getSubscriptionMetrics(options?: RequestOptions): Promise<any> {
    return this.client.get<any>('/api/v1/admin/subscriptions/metrics', options);
  }

  getShopSubscription(shopId: string, options?: RequestOptions): Promise<any> {
    return this.client.get<any>(`/api/v1/admin/subscriptions/${shopId}`, options);
  }

  ensureShopSubscription(shopId: string, options?: RequestOptions): Promise<any> {
    return this.client.post<any>(`/api/v1/admin/subscriptions/${shopId}/ensure`, undefined, options);
  }

  markShopPaid(shopId: string, dto: any, options?: RequestOptions): Promise<any> {
    return this.client.post<any>(`/api/v1/admin/subscriptions/${shopId}/mark-paid`, dto, options);
  }

  getSubscriptionHistory(shopId: string, options?: RequestOptions): Promise<any[]> {
    return this.client.get<any[]>(`/api/v1/admin/subscriptions/${shopId}/history`, options);
  }

  cancelSubscription(shopId: string, notes?: string, options?: RequestOptions): Promise<any> {
    return this.client.post<any>(`/api/v1/admin/subscriptions/${shopId}/cancel`, { notes }, options);
  }

  suspendSubscription(shopId: string, reason?: string, options?: RequestOptions): Promise<any> {
    return this.client.post<any>(`/api/v1/admin/subscriptions/${shopId}/suspend`, { reason }, options);
  }

  resumeSubscription(shopId: string, options?: RequestOptions): Promise<any> {
    return this.client.post<any>(`/api/v1/admin/subscriptions/${shopId}/resume`, undefined, options);
  }

  // ── Payment Transactions ──────────────────────────────────────────────────

  listPendingPayments(options?: RequestOptions): Promise<any[]> {
    return this.client.get<any[]>('/api/v1/admin/payments/pending', options);
  }

  getPendingPaymentCount(options?: RequestOptions): Promise<{ count: number }> {
    return this.client.get<{ count: number }>('/api/v1/admin/payments/pending/count', options);
  }

  verifyPayment(id: string, options?: RequestOptions): Promise<any> {
    return this.client.post<any>(`/api/v1/admin/payments/${id}/verify`, undefined, options);
  }

  rejectPayment(id: string, reason?: string, options?: RequestOptions): Promise<any> {
    return this.client.post<any>(`/api/v1/admin/payments/${id}/reject`, { reason }, options);
  }

  // ── System Config ──────────────────────────────────────────────────────────

  getSystemConfig(options?: RequestOptions): Promise<any> {
    return this.client.get<any>('/api/v1/admin/system/config', options);
  }

  // ── Banners ────────────────────────────────────────────────────────────────

  listBanners(options?: RequestOptions): Promise<any[]> {
    return this.client.get<any[]>('/api/v1/admin/banners', options);
  }

  listShopBanners(shopId: string, options?: RequestOptions): Promise<any[]> {
    return this.client.get<any[]>(`/api/v1/admin/banners/shop/${shopId}`, options);
  }

  createBanner(dto: any, options?: RequestOptions): Promise<any> {
    return this.client.post<any>('/api/v1/admin/banners', dto, options);
  }

  deleteBanner(id: string, options?: RequestOptions): Promise<any> {
    return this.client.delete<any>(`/api/v1/admin/banners/${id}`, options);
  }

  // ── Audit Logs ──────────────────────────────────────────────────────────────

  listLogs(options?: RequestOptions): Promise<AdminAuditLog[]> {
    return this.client.get<AdminAuditLog[]>('/api/v1/admin/logs', options);
  }

  getAuditLogSummary(options?: RequestOptions): Promise<AuditLogSummary> {
    return this.client.get<AuditLogSummary>('/api/v1/admin/logs/summary', options);
  }

  // ── System Settings ─────────────────────────────────────────────────────────

  listSystemSettings(options?: RequestOptions): Promise<SystemSetting[]> {
    return this.client.get<SystemSetting[]>('/api/v1/admin/settings', options);
  }

  upsertSystemSetting(key: string, value: string, options?: RequestOptions): Promise<SystemSetting> {
    return this.client.post<SystemSetting>('/api/v1/admin/settings', { key, value }, options);
  }

  // ── Integration tests ───────────────────────────────────────────────────────

  testEmail(to: string, options?: RequestOptions): Promise<{ ok: boolean; message: string }> {
    return this.client.post<{ ok: boolean; message: string }>(
      '/api/v1/admin/test/email',
      { to },
      options,
    );
  }

  testSms(to: string, options?: RequestOptions): Promise<{ ok: boolean; message: string }> {
    return this.client.post<{ ok: boolean; message: string }>(
      '/api/v1/admin/test/sms',
      { to },
      options,
    );
  }

  testTelegram(options?: RequestOptions): Promise<{ ok: boolean; message: string }> {
    return this.client.post<{ ok: boolean; message: string }>(
      '/api/v1/admin/test/telegram',
      {},
      options,
    );
  }

  checkAfroMessageBalance(): Promise<{
    ok: boolean;
    balance?: string;
    estimatedMessages?: string;
    message?: string;
  }> {
    return this.client.post('/api/v1/admin/sms/afromessage-balance', {});
  }

  testWhatsapp(to: string, options?: RequestOptions): Promise<{ ok: boolean; message: string }> {
    return this.client.post<{ ok: boolean; message: string }>(
      '/api/v1/admin/test/whatsapp',
      { to },
      options,
    );
  }

  testStorage(options?: RequestOptions): Promise<{ ok: boolean; message: string }> {
    return this.client.post<{ ok: boolean; message: string }>(
      '/api/v1/admin/test/storage',
      {},
      options,
    );
  }

  setTelegramWebhook(
    url: string,
    options?: RequestOptions,
  ): Promise<{ ok: boolean; message: string }> {
    return this.client.post<{ ok: boolean; message: string }>(
      '/api/v1/admin/telegram/set-webhook',
      { url },
      options,
    );
  }

  // ── Security — Sessions ─────────────────────────────────────────────────────

  listActiveSessions(options?: RequestOptions): Promise<AdminSession[]> {
    return this.client.get<AdminSession[]>('/api/v1/admin/sessions', options);
  }

  revokeSession(id: string, options?: RequestOptions): Promise<any> {
    return this.client.delete<any>(`/api/v1/admin/sessions/${id}`, options);
  }
}
