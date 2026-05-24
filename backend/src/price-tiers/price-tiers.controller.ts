import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { PriceTiersService } from './price-tiers.service';
import { CreatePriceTierDto } from './dto/create-price-tier.dto';
import { UpdatePriceTierDto } from './dto/update-price-tier.dto';
import { SetBeveragePriceDto } from './dto/set-beverage-price.dto';
import { CurrentShopId } from '../common/decorators/current-shop.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';

@ApiTags('price-tiers')
@ApiBearerAuth()
@Controller('price-tiers')
export class PriceTiersController {
  constructor(private readonly priceTiersService: PriceTiersService) {}

  @Get()
  @ApiOperation({ summary: 'List price tiers' })
  list(@CurrentShopId() shopId: string) {
    return this.priceTiersService.list(shopId);
  }

  @Post()
  @ApiOperation({ summary: 'Create price tier' })
  create(
    @CurrentShopId() shopId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePriceTierDto,
  ) {
    return this.priceTiersService.create(shopId, dto, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get price tier by id' })
  findOne(@CurrentShopId() shopId: string, @Param('id') id: string) {
    return this.priceTiersService.findOne(shopId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update price tier' })
  update(
    @CurrentShopId() shopId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdatePriceTierDto,
  ) {
    return this.priceTiersService.update(shopId, id, dto, user.id);
  }

  @Delete(':id')
  @RequirePermission('price-tiers:delete')
  @ApiOperation({ summary: 'Delete price tier (soft)' })
  remove(
    @CurrentShopId() shopId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.priceTiersService.remove(shopId, id, user.id);
  }

  @Put(':id/prices')
  @ApiOperation({ summary: 'Set beverage price for tier' })
  setPrice(
    @CurrentShopId() shopId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SetBeveragePriceDto,
  ) {
    return this.priceTiersService.setPrice(shopId, id, dto, user.id);
  }

  @Get(':id/prices')
  @ApiOperation({ summary: 'Get prices for tier grouped by beverage' })
  getPrices(@CurrentShopId() shopId: string, @Param('id') id: string) {
    return this.priceTiersService.getPrices(shopId, id);
  }
}
