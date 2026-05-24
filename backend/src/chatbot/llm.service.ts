import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../crypto/crypto.service';
import { ServiceUnavailableException } from '../common/errors/service-unavailable.exception';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

const LLM_KEYS = ['chatbot_api_key', 'chatbot_endpoint', 'chatbot_model', 'chatbot_enabled'];

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  async getConfig(): Promise<{ baseUrl: string; apiKey: string; model: string; enabled: boolean }> {
    let dbApiKey = '';
    let dbEndpoint = '';
    let dbModel = '';
    let dbEnabled = 'true';

    try {
      const settings = await this.prisma.systemSetting.findMany({
        where: { key: { in: LLM_KEYS } },
      });
      for (const s of settings) {
        if (s.key === 'chatbot_api_key') dbApiKey = s.iv && this.crypto.isReady() ? this.crypto.decrypt(s.value, s.iv) : s.value;
        if (s.key === 'chatbot_endpoint') dbEndpoint = s.value;
        if (s.key === 'chatbot_model') dbModel = s.value;
        if (s.key === 'chatbot_enabled') dbEnabled = s.value;
      }
    } catch {
      // SystemSetting table might not have these keys yet
    }

    const apiKey = dbApiKey;
    const baseUrl = dbEndpoint || 'https://api.openai.com/v1';
    const model = dbModel || 'gpt-4o-mini';
    const enabled = dbEnabled === 'true';

    return { baseUrl, apiKey, model, enabled };
  }

  async chat(messages: LLMMessage[], maxTokens = 1000, temperature = 0): Promise<LLMResponse> {
    const config = await this.getConfig();

    if (!config.enabled) {
      throw new ServiceUnavailableException('AI_NOT_CONFIGURED', 'AI assistant is not enabled.');
    }
    if (!config.apiKey) {
      throw new ServiceUnavailableException('AI_NOT_CONFIGURED', 'AI assistant credentials are not configured.');
    }

    const url = `${config.baseUrl.replace(/\/$/, '')}/chat/completions`;

    const body = {
      model: config.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: maxTokens,
      temperature,
      response_format: { type: 'json_object' },
    };

    this.logger.debug(`LLM request to ${url} with model ${config.model}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      this.logger.error(`LLM API error ${response.status}: ${errorText}`);
      throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content: string } }>;
      usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };
    const choice = data.choices?.[0];

    if (!choice?.message?.content) {
      throw new Error('LLM returned empty response');
    }

    return {
      text: choice.message.content,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
    };
  }
}
