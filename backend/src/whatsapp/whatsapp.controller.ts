import { Body, Controller, Get, Logger, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

/**
 * WhatsApp webhook endpoints. Meta's Cloud API performs a GET verification
 * handshake when the webhook URL is registered, then POSTs inbound messages
 * and delivery statuses. Inbound messages are logged for now; the handler is a
 * single place to later route customer replies into the bot/notification flow.
 */
@ApiTags('whatsapp')
@Controller('whatsapp')
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get('webhook')
  @Public()
  @ApiOperation({ summary: 'Meta WhatsApp webhook verification handshake' })
  async verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ): Promise<void> {
    const row = await this.prisma.systemSetting.findUnique({
      where: { key: 'whatsapp_meta_verify_token' },
    });
    if (mode === 'subscribe' && token && row?.value && token === row.value) {
      res.status(200).send(challenge);
      return;
    }
    res.status(403).send('Verification failed');
  }

  @Post('webhook')
  @Public()
  @ApiOperation({ summary: 'Receive inbound WhatsApp messages and statuses' })
  receive(@Body() body: unknown): { received: true } {
    try {
      this.logger.log(`[whatsapp:inbound] ${JSON.stringify(body)}`);
    } catch {
      this.logger.log('[whatsapp:inbound] (unserializable payload)');
    }
    return { received: true };
  }
}
