import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { PaymentAccountsService } from './payment-accounts.service';
import { CreatePaymentAccountDto } from './dto/create-payment-account.dto';
import { UpdatePaymentAccountDto } from './dto/update-payment-account.dto';
import { CurrentShopId } from '../common/decorators/current-shop.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';

@ApiTags('payment-accounts')
@ApiBearerAuth()
@Controller('payment-accounts')
export class PaymentAccountsController {
  constructor(private readonly paymentAccountsService: PaymentAccountsService) {}

  @Get()
  @ApiOperation({ summary: 'List payment accounts' })
  list(@CurrentShopId() shopId: string) {
    return this.paymentAccountsService.list(shopId);
  }

  @Post()
  @ApiOperation({ summary: 'Create payment account' })
  create(
    @CurrentShopId() shopId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePaymentAccountDto,
  ) {
    return this.paymentAccountsService.create(shopId, dto, user.id);
  }

  @Get(':id')
  @RequirePermission('payment-accounts:view')
  @ApiOperation({ summary: 'Get payment account by id' })
  findOne(@CurrentShopId() shopId: string, @Param('id') id: string) {
    return this.paymentAccountsService.findOne(shopId, id);
  }

  @Patch(':id')
  @Roles('OWNER')
  @ApiOperation({ summary: 'Update payment account (OWNER only)' })
  update(
    @CurrentShopId() shopId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdatePaymentAccountDto,
  ) {
    return this.paymentAccountsService.update(shopId, id, dto, user.id);
  }

  @Delete(':id')
  @Roles('OWNER')
  @ApiOperation({ summary: 'Delete payment account (OWNER only)' })
  remove(
    @CurrentShopId() shopId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.paymentAccountsService.remove(shopId, id, user.id);
  }
}
