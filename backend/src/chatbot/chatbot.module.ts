import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { CacheModule } from '../cache/cache.module';
import { SalesModule } from '../sales/sales.module';
import { CustomersModule } from '../customers/customers.module';
import { BeveragesModule } from '../beverages/beverages.module';
import { ReportsModule } from '../reports/reports.module';
import { AuditModule } from '../audit/audit.module';

import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { IntentClassifierService } from './intent-classifier.service';
import { IntentExecutorService } from './intent-executor.service';
import { LlmService } from './llm.service';

@Module({
  imports: [
    PrismaModule,
    CacheModule,
    SalesModule,
    CustomersModule,
    BeveragesModule,
    ReportsModule,
    AuditModule,
  ],
  controllers: [ChatbotController],
  providers: [
    ChatbotService,
    IntentClassifierService,
    IntentExecutorService,
    LlmService,
  ],
  exports: [ChatbotService],
})
export class ChatbotModule {}
