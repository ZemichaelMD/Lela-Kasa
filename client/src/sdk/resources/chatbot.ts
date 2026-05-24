import { SdkClient } from '../client';

export interface ChatMessageResponse {
  type: 'answer' | 'confirmation' | 'clarify' | 'error' | 'success';
  sessionId: string;
  message?: string;
  intent?: string;
  confidence?: number;
  summary?: ChatConfirmationSummary;
  question?: string;
  options?: string[];
  confirmBefore?: string;
}

export interface ChatConfirmationSummary {
  customer: {
    id: string;
    name: string;
    matched: boolean;
  };
  lines?: Array<{
    beverage: {
      id: string;
      name: string;
      brand: string | null;
      pricePerBoxCents: number;
      pricePerBottleCents: number;
      bottlesPerBox: number;
      matched: boolean;
    };
    boxes: number;
    bottles: number;
    lineTotalCents: number;
  }>;
  payments?: Array<{
    amountCents: number;
    method: string;
    account: {
      id: string;
      name: string;
      kind: string;
      matched: boolean;
    };
  }>;
  subtotalCents?: number;
  paidCents?: number;
  creditDeltaCents?: number;
  boxes?: number;
  bottles?: number;
}

export class ChatbotResource {
  constructor(private readonly client: SdkClient) {}

  async sendMessage(message: string, sessionId?: string): Promise<ChatMessageResponse> {
    return this.client.post<ChatMessageResponse>('/api/v1/chatbot/message', {
      message,
      sessionId,
    });
  }

  async confirm(sessionId: string, confirm: boolean): Promise<ChatMessageResponse> {
    return this.client.post<ChatMessageResponse>('/api/v1/chatbot/confirm', {
      sessionId,
      confirm,
    });
  }

  /** Whether the AI assistant is enabled by the platform admin. */
  async getConfig(): Promise<{ enabled: boolean }> {
    return this.client.get<{ enabled: boolean }>('/api/v1/chatbot/config');
  }
}
