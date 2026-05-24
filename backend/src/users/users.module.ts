import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { SmsModule } from '../sms/sms.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [MailModule, SmsModule, PermissionsModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
