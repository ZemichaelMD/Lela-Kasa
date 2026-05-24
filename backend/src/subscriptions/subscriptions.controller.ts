import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUrl } from 'class-validator';

import { SubscriptionsService } from './subscriptions.service';
import { CurrentShopId } from '../common/decorators/current-shop.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';

export class NotifyPaymentDto {
  @IsOptional()
  @IsString()
  planId?: string;

  @IsOptional()
  @IsString()
  providerId?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsUrl()
  screenshotUrl?: string;

  @IsOptional()
  @IsIn(['monthly', 'yearly'])
  billingCycle?: string;
}

export class SelectPlanDto {
  @IsString()
  planId!: string;

  @IsIn(['monthly', 'yearly'])
  billingCycle!: 'monthly' | 'yearly';
}

@ApiTags('subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('my')
  @ApiOperation({ summary: 'Get current shop subscription with plan details' })
  getMySubscription(@CurrentShopId() shopId: string) {
    return this.subscriptionsService.getMySubscription(shopId);
  }

  @Get('plans')
  @ApiOperation({ summary: 'List available subscription plans' })
  listPlans() {
    return this.subscriptionsService.listPlans();
  }

  @Get('my/history')
  @ApiOperation({ summary: 'Get current shop subscription history' })
  getMyHistory(@CurrentShopId() shopId: string) {
    return this.subscriptionsService.getMyHistory(shopId);
  }

  @Get('providers')
  @ApiOperation({ summary: 'List active payment providers with instructions' })
  listProviders() {
    return this.subscriptionsService.listProviders();
  }

  @Post('notify-payment')
  @ApiOperation({ summary: 'Notify admin of payment and record transaction' })
  notifyPayment(
    @CurrentShopId() shopId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: NotifyPaymentDto,
  ) {
    return this.subscriptionsService.notifyPayment(shopId, user, dto);
  }

  @Post('select-plan')
  @ApiOperation({ summary: 'Select a subscription plan and billing cycle' })
  selectPlan(
    @CurrentShopId() shopId: string,
    @Body() dto: SelectPlanDto,
  ) {
    return this.subscriptionsService.selectPlan(shopId, dto.planId, dto.billingCycle);
  }
}
