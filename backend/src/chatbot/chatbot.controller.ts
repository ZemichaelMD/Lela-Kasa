import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { CurrentShopId } from '../common/decorators/current-shop.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

import { ChatbotService } from './chatbot.service';
import { LlmService } from './llm.service';
import { ChatMessageDto } from './dto/chat-message.dto';
import { ChatConfirmDto } from './dto/chat-confirm.dto';
import type { ChatResponse } from './types/intents';

@Controller('chatbot')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'EMPLOYEE', 'SUPER_ADMIN')
export class ChatbotController {
  constructor(
    private readonly chatbotService: ChatbotService,
    private readonly llmService: LlmService,
  ) {}

  @Get('config')
  async getConfig(): Promise<{ enabled: boolean }> {
    const config = await this.llmService.getConfig();
    return { enabled: config.enabled };
  }

  @Post('message')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async sendMessage(
    @CurrentShopId() shopId: string,
    @CurrentUser() user: { id: string; role: string },
    @Body() dto: ChatMessageDto,
  ): Promise<ChatResponse> {
    return this.chatbotService.handleMessage(
      shopId,
      user.id,
      user.role,
      dto.message,
      dto.sessionId,
    );
  }

  @Post('confirm')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async confirm(
    @Body() dto: ChatConfirmDto,
  ): Promise<ChatResponse> {
    return this.chatbotService.handleConfirm(dto.sessionId, dto.confirm);
  }
}
