import { Module } from '@nestjs/common';
import { SmsModule } from '../sms/sms.module';
import { TelegramModule } from '../telegram/telegram.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { MailModule } from '../mail/mail.module';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';

@Module({
  imports: [SmsModule, TelegramModule, WhatsappModule, MailModule],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
