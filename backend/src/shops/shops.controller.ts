import { Body, Controller, Get, Patch, Param, Put } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

import { ShopsService } from './shops.service';
import { SettingsService } from '../settings/settings.service';
import { UpdateShopDto } from './dto/update-shop.dto';
import { CurrentShopId } from '../common/decorators/current-shop.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('shops')
@ApiBearerAuth()
@Controller('shops')
export class ShopsController {
  constructor(
    private readonly shopsService: ShopsService,
    private readonly settingsService: SettingsService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get my shop' })
  getMyShop(@CurrentShopId() shopId: string) {
    return this.shopsService.getMyShop(shopId);
  }

  @Patch('me')
  @Roles('OWNER')
  @ApiOperation({ summary: 'Update my shop (OWNER only)' })
  updateMyShop(
    @CurrentShopId() shopId: string,
    @Body() dto: UpdateShopDto,
  ) {
    return this.shopsService.updateMyShop(shopId, dto);
  }

  @Get('me/settings')
  @ApiOperation({ summary: 'Get all shop-level settings' })
  getSettings(@CurrentShopId() shopId: string) {
    return this.settingsService.getAll(shopId);
  }

  @Get('me/settings/:key')
  @ApiOperation({ summary: 'Get a single shop-level setting' })
  getSetting(@CurrentShopId() shopId: string, @Param('key') key: string) {
    return this.settingsService.get(shopId, key);
  }

  @Put('me/settings/:key')
  @Roles('OWNER')
  @ApiOperation({ summary: 'Set a single shop-level setting' })
  setSetting(
    @CurrentShopId() shopId: string,
    @Param('key') key: string,
    @Body() dto: { value: string },
  ) {
    return this.settingsService.set(shopId, key, dto.value);
  }
}
