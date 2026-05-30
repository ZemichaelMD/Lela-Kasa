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

import { BeveragesService } from './beverages.service';
import { CreateBeverageDto } from './dto/create-beverage.dto';
import { CreateBeverageBulkDto } from './dto/create-beverage-bulk.dto';
import { UpdateBeverageDto } from './dto/update-beverage.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { SwapDto } from './dto/swap.dto';
import { CurrentShopId } from '../common/decorators/current-shop.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';

@ApiTags('beverages')
@ApiBearerAuth()
@Controller('beverages')
export class BeveragesController {
  constructor(private readonly beveragesService: BeveragesService) {}

  @Get()
  @RequirePermission('beverages:view')
  @ApiOperation({ summary: 'List beverages' })
  list(
    @CurrentShopId() shopId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.beveragesService.list(shopId, {
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      search,
      isActive:
        isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });
  }

  @Post()
  @ApiOperation({ summary: 'Create beverage' })
  create(
    @CurrentShopId() shopId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBeverageDto,
  ) {
    return this.beveragesService.create(shopId, dto, user.id);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Create multiple beverages at once' })
  createBulk(
    @CurrentShopId() shopId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBeverageBulkDto,
  ) {
    return this.beveragesService.createBulk(shopId, dto.beverages, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get beverage by id' })
  findOne(@CurrentShopId() shopId: string, @Param('id') id: string) {
    return this.beveragesService.findOne(shopId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update beverage' })
  update(
    @CurrentShopId() shopId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateBeverageDto,
  ) {
    return this.beveragesService.update(shopId, id, dto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete beverage (soft)' })
  remove(
    @CurrentShopId() shopId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.beveragesService.remove(shopId, id, user.id);
  }

  @Post(':id/stock')
  @ApiOperation({ summary: 'Adjust stock for beverage' })
  adjustStock(
    @CurrentShopId() shopId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AdjustStockDto,
  ) {
    return this.beveragesService.adjustStock(shopId, id, dto, user.id);
  }

  @Get(':id/stock')
  @ApiOperation({ summary: 'Get stock movement history for beverage' })
  getMovements(@CurrentShopId() shopId: string, @Param('id') id: string) {
    return this.beveragesService.getMovements(shopId, id);
  }

  @Get(':id/prices')
  @ApiOperation({ summary: 'Get current prices per tier for beverage' })
  getCurrentPrices(@CurrentShopId() shopId: string, @Param('id') id: string) {
    return this.beveragesService.getCurrentPrices(shopId, id);
  }

  @Post(':id/inventory')
  @ApiOperation({ summary: 'Adjust full and/or empty inventory for beverage' })
  adjustInventory(
    @CurrentShopId() shopId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AdjustInventoryDto,
  ) {
    return this.beveragesService.adjustInventory(shopId, id, dto, user.id);
  }

  @Post(':id/swap')
  @ApiOperation({ summary: 'Swap empty containers for full bottles' })
  swap(
    @CurrentShopId() shopId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SwapDto,
  ) {
    return this.beveragesService.swap(shopId, id, dto, user.id);
  }
}
