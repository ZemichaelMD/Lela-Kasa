import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { BillingService } from './billing.service';
import { ChapaService } from './chapa.service';
import { ChapaCheckoutDto } from './dto/checkout.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentShopId } from '../common/decorators/current-shop.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';

@ApiTags('billing')
@ApiBearerAuth()
@Controller('billing')
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly chapa: ChapaService,
  ) {}

  @Get('chapa/config')
  @ApiOperation({ summary: 'Whether Chapa online checkout is available' })
  config() {
    return this.chapa.getPublicConfig();
  }

  @Post('chapa/checkout')
  @ApiOperation({ summary: 'Start a Chapa checkout for a subscription plan' })
  checkout(
    @CurrentShopId() shopId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChapaCheckoutDto,
  ) {
    return this.billing.createChapaCheckout(shopId, user, dto);
  }

  @Get('chapa/status')
  @ApiOperation({ summary: 'Poll the outcome of a Chapa checkout' })
  status(@CurrentShopId() shopId: string, @Query('txRef') txRef: string) {
    return this.billing.getCheckoutStatus(shopId, txRef);
  }

  @Public()
  @Post('chapa/callback')
  @ApiOperation({ summary: 'Chapa payment webhook (public, signature-verified)' })
  callback(
    @Req() req: { rawBody?: Buffer; headers: Record<string, string | string[] | undefined> },
    @Body() body: Record<string, unknown>,
  ) {
    const sig = req.headers['chapa-signature'] ?? req.headers['x-chapa-signature'];
    const signature = Array.isArray(sig) ? sig[0] : sig;
    return this.billing.handleWebhook(req.rawBody, signature, body ?? {});
  }
}
