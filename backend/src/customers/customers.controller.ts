import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { RecordCustomerPaymentDto } from './dto/record-payment.dto';
import { RecordContainerReturnDto } from './dto/record-return.dto';
import { SendCustomerSmsDto } from './dto/send-sms.dto';
import { CurrentShopId } from '../common/decorators/current-shop.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';

@ApiTags('customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'List customers' })
  list(
    @CurrentShopId() shopId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('hasCredit') hasCredit?: string,
  ) {
    return this.customersService.list(shopId, {
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      search,
      hasCredit:
        hasCredit === 'true' ? true : hasCredit === 'false' ? false : undefined,
    });
  }

  @Post()
  @ApiOperation({ summary: 'Create customer' })
  create(
    @CurrentShopId() shopId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCustomerDto,
  ) {
    return this.customersService.create(shopId, dto, user.id);
  }

  @Post('recalculate-all')
  @ApiOperation({
    summary: 'Recompute credit balances and container counts for all customers',
  })
  recalculateAll(@CurrentShopId() shopId: string) {
    return this.customersService.recalculateAllBalances(shopId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer by id' })
  findOne(@CurrentShopId() shopId: string, @Param('id') id: string) {
    return this.customersService.findOne(shopId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update customer' })
  update(
    @CurrentShopId() shopId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(shopId, id, dto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete customer (soft)' })
  remove(
    @CurrentShopId() shopId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.customersService.remove(shopId, id, user.id);
  }

  @Get(':id/ledger')
  @RequirePermission('customers:view')
  @ApiOperation({ summary: 'Get customer ledger' })
  getLedger(@CurrentShopId() shopId: string, @Param('id') id: string) {
    return this.customersService.getLedger(shopId, id);
  }

  @Post(':id/recalculate')
  @ApiOperation({
    summary: 'Recompute credit balance and outstanding containers from transactions',
  })
  recalculate(@CurrentShopId() shopId: string, @Param('id') id: string) {
    return this.customersService.recalculateBalances(shopId, id);
  }

  @Post(':id/payments')
  @ApiOperation({ summary: 'Record a customer payment / credit deposit (not tied to a sale)' })
  recordPayment(
    @CurrentShopId() shopId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RecordCustomerPaymentDto,
  ) {
    return this.customersService.recordPayment(shopId, id, dto, user.id);
  }

  @Post(':id/sms')
  @ApiOperation({ summary: 'Send an SMS to a customer via EthioSMS' })
  async sendSms(
    @CurrentShopId() shopId: string,
    @Param('id') id: string,
    @Body() dto: SendCustomerSmsDto,
  ) {
    await this.customersService.sendCustomerSms(shopId, id, dto.text);
    return { sent: true };
  }

  @Patch(':id/credentials')
  @ApiOperation({ summary: 'Set or update customer username and PIN for portal access' })
  async setCredentials(
    @CurrentShopId() shopId: string,
    @Param('id') id: string,
    @Body() dto: { username: string; pin: string },
  ) {
    return this.customersService.setCredentials(shopId, id, dto.username, dto.pin);
  }

  @Post(':id/returns')
  @ApiOperation({ summary: 'Record a container return (boxes/bottles) by a customer' })
  recordReturn(
    @CurrentShopId() shopId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RecordContainerReturnDto,
  ) {
    return this.customersService.recordReturn(shopId, id, dto, user.id);
  }

  @Post(':id/remind')
  @ApiOperation({
    summary: 'Send a payment / container reminder across SMS, WhatsApp and Telegram',
  })
  remind(
    @CurrentShopId() shopId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.customersService.sendReminder(shopId, id, user.id);
  }

  @Post(':id/telegram-link')
  @ApiOperation({ summary: 'Generate a Telegram deep link to share with a customer' })
  telegramLink(@CurrentShopId() shopId: string, @Param('id') id: string) {
    return this.customersService.generateTelegramLink(shopId, id);
  }

  @Post(':id/reset-pin')
  @ApiOperation({ summary: 'Send a PIN reset code to the customer email' })
  async resetPin(
    @CurrentShopId() shopId: string,
    @Param('id') id: string,
  ) {
    return this.customersService.resetPin(shopId, id);
  }

  @Post(':id/owner-reset-pin')
  @ApiOperation({ summary: 'Owner resets customer PIN and receives the new PIN' })
  async ownerResetPin(
    @CurrentShopId() shopId: string,
    @Param('id') id: string,
  ) {
    return this.customersService.ownerResetPin(shopId, id);
  }

  @Post(':id/send-email-otp')
  @ApiOperation({ summary: 'Send an email OTP to the customer for verification' })
  async sendEmailOtp(
    @CurrentShopId() shopId: string,
    @Param('id') id: string,
  ) {
    await this.customersService.sendCustomerEmailOtp(shopId, id);
    return { sent: true };
  }

  @Post(':id/verify-email')
  @ApiOperation({ summary: 'Verify customer email with OTP' })
  async verifyEmail(
    @CurrentShopId() shopId: string,
    @Param('id') id: string,
    @Body() dto: { code: string },
  ) {
    await this.customersService.verifyCustomerEmailOtp(shopId, id, dto.code);
    return { success: true };
  }
}
