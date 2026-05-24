import { Module } from '@nestjs/common';
import { SmsService } from './sms.service';
import { OtpService } from './otp.service';
import { SmsTemplatesService } from './sms-templates.service';

@Module({
  providers: [SmsService, OtpService, SmsTemplatesService],
  exports: [SmsService, OtpService, SmsTemplatesService],
})
export class SmsModule {}
