import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsIn, IsInt, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

import { AdminService } from './admin.service';
import { MailService } from '../mail/mail.service';
import { SmsService } from '../sms/sms.service';
import { TelegramService } from '../telegram/telegram.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { FileService } from '../file/file.service';
import { Roles } from '../common/decorators/roles.decorator';

// ─── DTOs ────────────────────────────────────────────────────────────────────

export class CreateShopDto {
  @IsString()
  name!: string;

  @IsEmail()
  ownerEmail!: string;

  @IsString()
  ownerName!: string;

  @IsOptional()
  @IsString()
  ownerPhone?: string;

  @IsOptional()
  @IsString()
  ownerPassword?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;
}

export class UpdateShopAdminDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string | null;

  @IsOptional()
  @IsString()
  address?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  email?: string | null;

  @IsOptional()
  @IsString()
  website?: string | null;

  @IsOptional()
  @IsString()
  facebook?: string | null;

  @IsOptional()
  @IsString()
  instagram?: string | null;

  @IsOptional()
  @IsString()
  tiktok?: string | null;

  @IsOptional()
  @IsString()
  mapUrl?: string | null;

  @IsOptional()
  @IsNumber()
  latitude?: number | null;

  @IsOptional()
  @IsNumber()
  longitude?: number | null;
}

export class ChangeShopOwnerDto {
  @IsEmail()
  newOwnerEmail!: string;
}

export class UpdateUserAdminDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string | null;

  @IsOptional()
  @IsIn(['OWNER', 'EMPLOYEE'])
  role?: 'OWNER' | 'EMPLOYEE';

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateBeverageAdminDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  sizeMl?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  bottlesPerBox?: number;
}

export class UpdateBeverageAdminDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  brand?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  sizeMl?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  bottlesPerBox?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpsertSystemSettingDto {
  @IsString()
  key!: string;

  @IsString()
  value!: string;
}

export class UpdateShopSettingDto {
  @IsString()
  value!: string;
}

export class AdminCreateCustomerDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class AdminUpdateCustomerDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class AdminCreatePriceTierDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  kind?: string;
}

export class AdminSetPriceDto {
  @IsString()
  beverageId!: string;

  @IsInt()
  @Min(0)
  pricePerBoxCents!: number;

  @IsInt()
  @Min(0)
  pricePerBottleCents!: number;
}

export class AdminCreatePaymentAccountDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  kind?: string;

  @IsOptional()
  @IsString()
  holderName?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class AdminUpdatePaymentAccountDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  kind?: string;

  @IsOptional()
  @IsString()
  holderName?: string | null;

  @IsOptional()
  @IsString()
  bankName?: string | null;

  @IsOptional()
  @IsString()
  accountNumber?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class AdminInviteUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsIn(['OWNER', 'EMPLOYEE'])
  role?: 'OWNER' | 'EMPLOYEE';
}

// ─── Controller ──────────────────────────────────────────────────────────────

export class TestChannelDto {
  @IsString()
  @MinLength(1)
  to!: string;
}

export class SetTelegramWebhookDto {
  @IsString()
  @MinLength(1)
  url!: string;
}

@ApiTags('admin')
@ApiBearerAuth()
@Roles('SUPER_ADMIN')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly mailService: MailService,
    private readonly smsService: SmsService,
    private readonly telegramService: TelegramService,
    private readonly whatsappService: WhatsAppService,
    private readonly fileService: FileService,
  ) {}

  // ── Dashboard ───────────────────────────────────────────────────────────────

  @Get('dashboard')
  @ApiOperation({ summary: 'Get global analytics dashboard metrics' })
  getDashboard() {
    return this.adminService.getDashboard();
  }

  // ── Shops — Full Management ────────────────────────────────────────────────

  @Get('shops')
  @ApiOperation({ summary: 'List all registered shops on the platform' })
  listShops() {
    return this.adminService.listShops();
  }

  @Get('shops/:id')
  @ApiOperation({ summary: 'Get full shop details with owner info and settings' })
  findOneShop(@Param('id') id: string) {
    return this.adminService.findOneShop(id);
  }

  @Post('shops')
  @ApiOperation({ summary: 'Create a new shop along with an owner user' })
  createShop(@Body() dto: CreateShopDto) {
    return this.adminService.createShop(dto);
  }

  @Patch('shops/:id')
  @ApiOperation({ summary: 'Update a shop details or toggle active status' })
  updateShop(@Param('id') id: string, @Body() dto: UpdateShopAdminDto) {
    return this.adminService.updateShop(id, dto);
  }

  @Delete('shops/:id')
  @ApiOperation({ summary: 'Soft-delete a shop (deactivate owner, mark deleted)' })
  deleteShop(@Param('id') id: string) {
    return this.adminService.deleteShop(id);
  }

  @Patch('shops/:id/owner')
  @ApiOperation({ summary: 'Transfer shop ownership to a different user' })
  changeShopOwner(@Param('id') id: string, @Body() dto: ChangeShopOwnerDto) {
    return this.adminService.changeShopOwner(id, dto.newOwnerEmail);
  }

  @Get('shops/:id/settings')
  @ApiOperation({ summary: 'Get all settings for a specific shop' })
  getShopSettings(@Param('id') id: string) {
    return this.adminService.getShopSettings(id);
  }

  @Patch('shops/:id/settings/:key')
  @ApiOperation({ summary: 'Update a specific shop setting' })
  updateShopSetting(
    @Param('id') id: string,
    @Param('key') key: string,
    @Body() dto: UpdateShopSettingDto,
  ) {
    return this.adminService.updateShopSetting(id, key, dto.value);
  }

  // ── Shop-scoped: Beverages ──────────────────────────────────────────────────

  @Post('shops/:id/beverages')
  @ApiOperation({ summary: 'Create a beverage for a specific shop' })
  createShopBeverage(@Param('id') id: string, @Body() dto: CreateBeverageAdminDto) {
    return this.adminService.createShopBeverage(id, dto);
  }

  @Patch('shops/:id/beverages/:beverageId')
  @ApiOperation({ summary: 'Update a beverage for a specific shop' })
  updateShopBeverage(
    @Param('id') id: string,
    @Param('beverageId') beverageId: string,
    @Body() dto: UpdateBeverageAdminDto,
  ) {
    return this.adminService.updateShopBeverage(id, beverageId, dto);
  }

  // ── Shop-scoped: Customers ──────────────────────────────────────────────────

  @Get('shops/:id/customers')
  @ApiOperation({ summary: 'List customers for a specific shop' })
  listShopCustomers(@Param('id') id: string) {
    return this.adminService.listShopCustomers(id);
  }

  @Post('shops/:id/customers')
  @ApiOperation({ summary: 'Create a customer for a specific shop' })
  createShopCustomer(@Param('id') id: string, @Body() dto: AdminCreateCustomerDto) {
    return this.adminService.createShopCustomer(id, dto);
  }

  @Patch('shops/:id/customers/:customerId')
  @ApiOperation({ summary: 'Update a customer for a specific shop' })
  updateShopCustomer(
    @Param('id') id: string,
    @Param('customerId') customerId: string,
    @Body() dto: AdminUpdateCustomerDto,
  ) {
    return this.adminService.updateShopCustomer(id, customerId, dto);
  }

  @Delete('shops/:id/customers/:customerId')
  @ApiOperation({ summary: 'Delete a customer from a specific shop' })
  deleteShopCustomer(@Param('id') id: string, @Param('customerId') customerId: string) {
    return this.adminService.deleteShopCustomer(id, customerId);
  }

  // ── Shop-scoped: Price Tiers ────────────────────────────────────────────────

  @Get('shops/:id/price-tiers')
  @ApiOperation({ summary: 'List price tiers for a specific shop' })
  listShopPriceTiers(@Param('id') id: string) {
    return this.adminService.listShopPriceTiers(id);
  }

  @Post('shops/:id/price-tiers')
  @ApiOperation({ summary: 'Create a price tier for a specific shop' })
  createShopPriceTier(@Param('id') id: string, @Body() dto: AdminCreatePriceTierDto) {
    return this.adminService.createShopPriceTier(id, dto);
  }

  @Post('shops/:id/price-tiers/:tierId/prices')
  @ApiOperation({ summary: 'Set a beverage price for a shop price tier' })
  setShopPrice(
    @Param('id') id: string,
    @Param('tierId') tierId: string,
    @Body() dto: AdminSetPriceDto,
  ) {
    return this.adminService.setShopPrice(id, tierId, dto);
  }

  // ── Shop-scoped: Payment Accounts ───────────────────────────────────────────

  @Get('shops/:id/payment-accounts')
  @ApiOperation({ summary: 'List payment accounts for a specific shop' })
  listShopPaymentAccounts(@Param('id') id: string) {
    return this.adminService.listShopPaymentAccounts(id);
  }

  @Post('shops/:id/payment-accounts')
  @ApiOperation({ summary: 'Create a payment account for a specific shop' })
  createShopPaymentAccount(@Param('id') id: string, @Body() dto: AdminCreatePaymentAccountDto) {
    return this.adminService.createShopPaymentAccount(id, dto);
  }

  @Patch('shops/:id/payment-accounts/:accountId')
  @ApiOperation({ summary: 'Update a payment account for a specific shop' })
  updateShopPaymentAccount(
    @Param('id') id: string,
    @Param('accountId') accountId: string,
    @Body() dto: AdminUpdatePaymentAccountDto,
  ) {
    return this.adminService.updateShopPaymentAccount(id, accountId, dto);
  }

  // ── Shop-scoped: Users/Employees ────────────────────────────────────────────

  @Post('shops/:id/users')
  @ApiOperation({ summary: 'Invite a user (employee) to a shop' })
  inviteShopUser(@Param('id') id: string, @Body() dto: AdminInviteUserDto) {
    return this.adminService.inviteShopUser(id, dto);
  }

  @Patch('shops/:id/users/:userId')
  @ApiOperation({ summary: 'Update a shop user' })
  updateShopUser(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateUserAdminDto,
  ) {
    return this.adminService.updateShopUser(id, userId, dto);
  }

  @Post('users/:id/verify-email')
  @ApiOperation({ summary: 'Toggle email verification status (admin override)' })
  async toggleUserEmailVerified(@Param('id') id: string, @Body() dto: { verified: boolean }) {
    await this.adminService.toggleUserEmailVerified(id, dto.verified);
    return { success: true };
  }

  @Post('users/:id/verify-phone')
  @ApiOperation({ summary: 'Toggle phone verification status (admin override)' })
  async toggleUserPhoneVerified(@Param('id') id: string, @Body() dto: { verified: boolean }) {
    await this.adminService.toggleUserPhoneVerified(id, dto.verified);
    return { success: true };
  }

  @Post('users/:id/change-password')
  @ApiOperation({ summary: 'Change a user password (admin override)' })
  async changeUserPassword(@Param('id') id: string, @Body() dto: { newPassword: string }) {
    await this.adminService.changeUserPassword(id, dto.newPassword);
    return { success: true };
  }

  // ── Users Management ───────────────────────────────────────────────────────

  @Get('users')
  @ApiOperation({ summary: 'List all platform users' })
  listUsers() {
    return this.adminService.listUsers();
  }

  @Post('users')
  @ApiOperation({ summary: 'Create a new platform user (owner, employee, or super admin)' })
  createUser(@Body() dto: any) {
    return this.adminService.createUser(dto);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get full user details with shops' })
  findUser(@Param('id') id: string) {
    return this.adminService.findUser(id);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Update platform user properties' })
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserAdminDto) {
    return this.adminService.updateUser(id, dto);
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently delete a user and all associated data' })
  async deleteUser(@Param('id') id: string) {
    await this.adminService.deleteUser(id);
  }

  // ── Global Beverages ───────────────────────────────────────────────────────

  @Get('beverages')
  @ApiOperation({ summary: 'List all registered platform beverages' })
  listBeverages() {
    return this.adminService.listBeverages();
  }

  @Post('beverages')
  @ApiOperation({ summary: 'Register a new platform beverage (links to first shop)' })
  createBeverage(@Body() dto: CreateBeverageAdminDto) {
    return this.adminService.createBeverage(dto);
  }

  @Patch('beverages/:id')
  @ApiOperation({ summary: 'Update a beverage information' })
  updateBeverage(@Param('id') id: string, @Body() dto: UpdateBeverageAdminDto) {
    return this.adminService.updateBeverage(id, dto);
  }

  // ── Sales ───────────────────────────────────────────────────────────────────

  @Get('sales')
  @ApiOperation({ summary: 'List platform transactions across all shops' })
  listSales() {
    return this.adminService.listSales();
  }

  @Get('sales/:id')
  @ApiOperation({ summary: 'Get a single sale details across all shops' })
  findOneSale(@Param('id') id: string) {
    return this.adminService.findOneSale(id);
  }

  // ── Audit Logs ─────────────────────────────────────────────────────────────

  @Get('logs')
  @ApiOperation({ summary: 'List platform-wide security audit logs' })
  listLogs() {
    return this.adminService.listLogs();
  }

  @Get('logs/summary')
  @ApiOperation({ summary: 'Get audit log summary statistics' })
  auditLogSummary() {
    return this.adminService.auditLogSummary();
  }

  // ── System Settings ────────────────────────────────────────────────────────

  @Get('settings')
  @ApiOperation({ summary: 'List all system-wide settings' })
  listSystemSettings() {
    return this.adminService.listSystemSettings();
  }

  @Post('settings')
  @ApiOperation({ summary: 'Create or update a system-wide setting' })
  upsertSystemSetting(@Body() dto: UpsertSystemSettingDto) {
    return this.adminService.upsertSystemSetting(dto.key, dto.value);
  }

  // ── Integration tests ───────────────────────────────────────────────────────

  @Post('test/email')
  @ApiOperation({ summary: 'Send a test email using the saved settings' })
  testEmail(@Body() dto: TestChannelDto) {
    return this.mailService.sendTest(dto.to);
  }

  @Post('test/sms')
  @ApiOperation({ summary: 'Send a test SMS using the saved settings' })
  testSms(@Body() dto: TestChannelDto) {
    return this.smsService.sendTest(dto.to);
  }

  @Post('sms/afromessage-balance')
  @ApiOperation({ summary: 'Check AfroMessage account balance' })
  checkAfroMessageBalance() {
    return this.smsService.checkAfroMessageBalance();
  }

  @Post('test/telegram')
  @ApiOperation({ summary: 'Send a test Telegram message using the saved settings' })
  testTelegram() {
    return this.telegramService.sendTest();
  }

  @Post('test/whatsapp')
  @ApiOperation({ summary: 'Send a test WhatsApp message using the saved settings' })
  testWhatsapp(@Body() dto: TestChannelDto) {
    return this.whatsappService.sendTest(dto.to);
  }

  @Post('test/storage')
  @ApiOperation({ summary: 'Test the storage connection by writing and deleting a temp object' })
  testStorage() {
    return this.fileService.testStorage();
  }

  @Post('telegram/set-webhook')
  @ApiOperation({ summary: 'Register the Telegram bot webhook URL' })
  setTelegramWebhook(@Body() dto: SetTelegramWebhookDto) {
    return this.telegramService.setWebhook(dto.url);
  }

  // ── Subscription Plans ─────────────────────────────────────────────────────

  @Get('plans')
  @ApiOperation({ summary: 'List all subscription plans' })
  listPlans() {
    return this.adminService.listSubscriptionPlans();
  }

  @Post('plans')
  @ApiOperation({ summary: 'Create a subscription plan' })
  createPlan(@Body() dto: any) {
    return this.adminService.createSubscriptionPlan(dto);
  }

  @Patch('plans/:id')
  @ApiOperation({ summary: 'Update a subscription plan' })
  updatePlan(@Param('id') id: string, @Body() dto: any) {
    return this.adminService.updateSubscriptionPlan(id, dto);
  }

  @Delete('plans/:id')
  @ApiOperation({ summary: 'Deactivate a subscription plan' })
  deletePlan(@Param('id') id: string) {
    return this.adminService.deleteSubscriptionPlan(id);
  }

  // ── Payment Providers ──────────────────────────────────────────────────────

  @Get('payment-providers')
  @ApiOperation({ summary: 'List payment providers' })
  listPaymentProviders() {
    return this.adminService.listPaymentProviders();
  }

  @Post('payment-providers')
  @ApiOperation({ summary: 'Create a payment provider' })
  createPaymentProvider(@Body() dto: any) {
    return this.adminService.createPaymentProvider(dto);
  }

  @Patch('payment-providers/:id')
  @ApiOperation({ summary: 'Update a payment provider' })
  updatePaymentProvider(@Param('id') id: string, @Body() dto: any) {
    return this.adminService.updatePaymentProvider(id, dto);
  }

  // ── Shop Subscriptions ─────────────────────────────────────────────────────

  @Get('subscriptions')
  @ApiOperation({ summary: 'List all shop subscriptions' })
  listSubscriptions() {
    return this.adminService.listSubscriptions();
  }

  @Get('subscriptions/metrics')
  @ApiOperation({ summary: 'Get subscription metrics (MRR, counts)' })
  getSubscriptionMetrics() {
    return this.adminService.getSubscriptionMetrics();
  }

  @Get('subscriptions/:shopId')
  @ApiOperation({ summary: 'Get subscription for a shop' })
  getSubscription(@Param('shopId') shopId: string) {
    return this.adminService.getSubscription(shopId);
  }

  @Post('subscriptions/:shopId/ensure')
  @ApiOperation({ summary: 'Ensure a shop has a subscription (creates default if missing)' })
  ensureSubscription(@Param('shopId') shopId: string) {
    return this.adminService.ensureSubscription(shopId);
  }

  @Post('subscriptions/:shopId/mark-paid')
  @ApiOperation({ summary: 'Mark a shop subscription as paid' })
  markSubscriptionPaid(@Param('shopId') shopId: string, @Body() dto: any) {
    return this.adminService.markSubscriptionPaid(shopId, dto);
  }

  @Get('subscriptions/:shopId/history')
  @ApiOperation({ summary: 'Get subscription history for a shop' })
  getSubscriptionHistory(@Param('shopId') shopId: string) {
    return this.adminService.getSubscriptionHistory(shopId);
  }

  @Post('subscriptions/:shopId/cancel')
  @ApiOperation({ summary: 'Cancel a shop subscription' })
  cancelSubscription(@Param('shopId') shopId: string, @Body() dto: { notes?: string }) {
    return this.adminService.cancelSubscription(shopId, dto?.notes);
  }

  @Post('subscriptions/:shopId/suspend')
  @ApiOperation({ summary: 'Suspend a shop subscription' })
  suspendSubscription(@Param('shopId') shopId: string, @Body() dto: { reason?: string }) {
    return this.adminService.suspendSubscription(shopId, dto?.reason);
  }

  @Post('subscriptions/:shopId/resume')
  @ApiOperation({ summary: 'Resume a suspended subscription' })
  resumeSubscription(@Param('shopId') shopId: string) {
    return this.adminService.resumeSubscription(shopId);
  }

  // ── Payment Transactions ─────────────────────────────────────────────────

  @Get('payments/pending')
  @ApiOperation({ summary: 'List pending payment verification requests' })
  listPendingTransactions() {
    return this.adminService.listPendingTransactions();
  }

  @Get('payments/pending/count')
  @ApiOperation({ summary: 'Get count of pending payment verifications' })
  getPendingCount() {
    return this.adminService.getPendingCount();
  }

  @Post('payments/:id/verify')
  @ApiOperation({ summary: 'Verify a pending payment and extend subscription' })
  verifyTransaction(@Param('id') id: string) {
    return this.adminService.verifyTransaction(id, 'admin');
  }

  @Post('payments/:id/reject')
  @ApiOperation({ summary: 'Reject a pending payment' })
  rejectTransaction(@Param('id') id: string, @Body() dto: { reason?: string }) {
    return this.adminService.rejectTransaction(id, dto?.reason);
  }

  // ── System Config ──────────────────────────────────────────────────────────

  @Get('system/config')
  @ApiOperation({ summary: 'Get combined system configuration' })
  getSystemConfig() {
    return this.adminService.getSystemConfig();
  }

  // ── Banners ────────────────────────────────────────────────────────────────

  @Get('banners')
  @ApiOperation({ summary: 'List active global banners' })
  listGlobalBanners() {
    return this.adminService.listBanners();
  }

  @Get('banners/shop/:shopId')
  @ApiOperation({ summary: 'List active banners for a specific shop' })
  listShopBanners(@Param('shopId') shopId: string) {
    return this.adminService.listBanners(shopId);
  }

  @Post('banners')
  @ApiOperation({ summary: 'Create a banner notification' })
  createBanner(@Body() dto: any) {
    return this.adminService.createBanner(dto);
  }

  @Delete('banners/:id')
  @ApiOperation({ summary: 'Deactivate a banner' })
  deleteBanner(@Param('id') id: string) {
    return this.adminService.deleteBanner(id);
  }

  // ── Security — Session Management ──────────────────────────────────────────

  @Get('sessions')
  @ApiOperation({ summary: 'List all active sessions across platform' })
  listActiveSessions() {
    return this.adminService.listActiveSessions();
  }

  @Delete('sessions/:id')
  @ApiOperation({ summary: 'Force-revoke a session' })
  revokeSession(@Param('id') id: string) {
    return this.adminService.revokeSession(id);
  }
}
