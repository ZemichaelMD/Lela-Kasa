import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { TelegramService } from './telegram.service';
import { TelegramBotService } from './telegram-bot.service';

@ApiTags('telegram')
@Controller('telegram')
export class TelegramController {
  constructor(
    private readonly telegram: TelegramService,
    private readonly bot: TelegramBotService,
  ) {}

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive Telegram bot updates' })
  async webhook(
    @Headers('x-telegram-bot-api-secret-token') secret: string | undefined,
    @Body() update: unknown,
  ): Promise<{ ok: true }> {
    // Telegram echoes the secret token set with setWebhook on every update.
    // A mismatch means the request did not come from Telegram — drop it.
    const expected = await this.telegram.getWebhookSecret();
    if (expected && secret !== expected) {
      return { ok: true };
    }
    await this.bot.handleUpdate(update as never);
    return { ok: true };
  }

  @Get('link')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a Telegram deep link to connect this account' })
  async getLink(@CurrentUser() user: AuthenticatedUser) {
    const configured = await this.telegram.isConfigured();
    if (!configured) {
      return { configured: false, deepLink: '', code: '', botUsername: '' };
    }
    const link = await this.telegram.createLinkCode('USER', user.id, user.shopId ?? null);
    return { configured: true, ...link };
  }
}
