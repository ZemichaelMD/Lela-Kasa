import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CustomerPortalController } from './customer-portal.controller';

@Module({
  imports: [AuthModule],
  controllers: [CustomerPortalController],
})
export class CustomerPortalModule {}
