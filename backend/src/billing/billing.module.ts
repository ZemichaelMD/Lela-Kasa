import { Module } from '@nestjs/common';

import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { ChapaService } from './chapa.service';

@Module({
  controllers: [BillingController],
  providers: [BillingService, ChapaService],
  exports: [BillingService, ChapaService],
})
export class BillingModule {}
