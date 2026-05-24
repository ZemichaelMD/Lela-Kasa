import type { SdkClient, RequestOptions } from '../client';

export interface TelegramLinkInfo {
  configured: boolean;
  deepLink: string;
  code: string;
  botUsername: string;
}

export class TelegramResource {
  constructor(private readonly client: SdkClient) {}

  /** Returns a deep link the current user opens to connect their Telegram account. */
  getLinkInfo(options?: RequestOptions): Promise<TelegramLinkInfo> {
    return this.client.get<TelegramLinkInfo>('/api/v1/telegram/link', options);
  }
}
