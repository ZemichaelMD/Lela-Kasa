import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

import { ALL_CONFIG_NAMESPACES, validate } from "./config/index";
import { PrismaModule } from "./prisma/prisma.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { PrismaExceptionFilter } from "./common/filters/prisma-exception.filter";
import { ResponseEnvelopeInterceptor } from "./common/interceptors/response-envelope.interceptor";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import { MaintenanceGuard } from "./common/guards/maintenance.guard";
import { SubscriptionGuard } from "./common/guards/subscription.guard";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";

import { HealthModule } from "./health/health.module";
import { CacheModule } from "./cache/cache.module";
import { MailModule } from "./mail/mail.module";
import { AuditModule } from "./audit/audit.module";
import { SettingsModule } from "./settings/settings.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { ShopsModule } from "./shops/shops.module";
import { ReportsModule } from "./reports/reports.module";
import { FileModule } from "./file/file.module";
import { CustomersModule } from "./customers/customers.module";
import { PaymentAccountsModule } from "./payment-accounts/payment-accounts.module";
import { PriceTiersModule } from "./price-tiers/price-tiers.module";
import { BeveragesModule } from "./beverages/beverages.module";
import { SalesModule } from "./sales/sales.module";
import { SmsModule } from "./sms/sms.module";
import { TelegramModule } from "./telegram/telegram.module";
import { WhatsappModule } from "./whatsapp/whatsapp.module";
import { VerificationModule } from "./verification/verification.module";
import { AdminModule } from "./admin/admin.module";
import { SubscriptionsModule } from "./subscriptions/subscriptions.module";
import { BillingModule } from "./billing/billing.module";
import { CustomerPortalModule } from "./customer-portal/customer-portal.module";
import { ChatbotModule } from "./chatbot/chatbot.module";
import { CryptoModule } from "./crypto/crypto.module";
import { OrdersModule } from "./orders/orders.module";
import { PermissionsModule } from "./permissions/permissions.module";
import { PermissionsGuard } from "./permissions/guards/permissions.guard";
import { SyncModule } from "./sync/sync.module";

@Module({
  imports: [
    // Config — global, Zod env validation
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      load: ALL_CONFIG_NAMESPACES,
    }),

    // Rate limiting — very permissive for development; tighten per-env before production
    ThrottlerModule.forRoot({
      throttlers: [
        { name: "default", ttl: 60_000, limit: 10_000 },
        { name: "auth", ttl: 60_000, limit: 500 },
      ],
    }),

    // Cron scheduler
    ScheduleModule.forRoot(),

    // Database — global
    PrismaModule,

    // Infrastructure
    CryptoModule,
    CacheModule,
    MailModule,
    SmsModule,
    TelegramModule,
    WhatsappModule,
    VerificationModule,
    AuditModule,
    SettingsModule,

    // API surface
    HealthModule,
    AuthModule,
    UsersModule,
    ShopsModule,
    ReportsModule,
    FileModule,
    CustomersModule,
    PaymentAccountsModule,
    PriceTiersModule,
    BeveragesModule,
    SalesModule,
    AdminModule,
    SubscriptionsModule,
    BillingModule,
    CustomerPortalModule,
    OrdersModule,
    ChatbotModule,
    PermissionsModule,
    SyncModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,

    // Global guards (order: throttle → auth → maintenance → subscription → roles).
    // Deny-by-default: any handler without @Public() requires a valid JWT,
    // @Roles() narrows it, MaintenanceGuard blocks non-admins when
    // maintenance mode is active, and SubscriptionGuard blocks users whose
    // shop subscription is not ACTIVE or TRIAL.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: MaintenanceGuard },
    { provide: APP_GUARD, useClass: SubscriptionGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },

    // Global exception filters (order matters — Prisma first, then generic)
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },

    // Global interceptors
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ResponseEnvelopeInterceptor },
  ],
})
export class AppModule {}
