import { Injectable, Logger } from '@nestjs/common';
import { IntentClassifierService } from './intent-classifier.service';
import { IntentExecutorService } from './intent-executor.service';
import type {
  ChatResponse,
  PendingAction,
  ChatIntent,
} from './types/intents';

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  private readonly sessions = new Map<string, PendingAction>();
  private readonly SESSION_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly classifier: IntentClassifierService,
    private readonly executor: IntentExecutorService,
  ) {}

  // Clean up expired sessions periodically
  cleanupExpiredSessions(): void {
    const now = new Date();
    for (const [key, value] of this.sessions.entries()) {
      if (value.expiresAt < now) {
        this.sessions.delete(key);
      }
    }
  }

  async handleMessage(
    shopId: string,
    userId: string,
    userRole: string,
    message: string,
    sessionId?: string,
  ): Promise<ChatResponse> {
    const sid = sessionId || this.generateSessionId();

    // Check if this is a clarification response
    const existingSession = sessionId ? this.sessions.get(sessionId) : null;
    if (existingSession && existingSession.expiresAt > new Date()) {
      // This might be a clarification response - pass through to classifier
      // The classifier will handle it based on context
    }

    // Classify intent
    let intentResult;
    try {
      intentResult = await this.classifier.classify(shopId, message);
    } catch (err) {
      this.logger.error(`Intent classification failed: ${err}`);
      return {
        type: 'error',
        sessionId: sid,
        message: 'AI service unavailable. Please try again later.',
      };
    }

    // Handle help intent directly
    if (intentResult.intent === 'help') {
      return {
        type: 'answer',
        sessionId: sid,
        message: this.executor['getHelpMessage'](),
      };
    }

    // Handle clarification from LLM
    if (intentResult.clarification) {
      return {
        type: 'clarify',
        sessionId: sid,
        question: intentResult.clarification,
        options: intentResult.params['options'] as string[] | undefined,
      };
    }

    // Check confidence threshold
    if (intentResult.confidence < 0.85) {
      return {
        type: 'clarify',
        sessionId: sid,
        question: "I'm not sure I understood. Could you rephrase that? Or type 'help' for examples.",
      };
    }

    // Role enforcement: EMPLOYEE can only do read-only + sales
    const writeIntents: ChatIntent[] = ['register_payment', 'register_return'];
    if (userRole === 'EMPLOYEE' && writeIntents.includes(intentResult.intent)) {
      return {
        type: 'error',
        sessionId: sid,
        message: '❌ Employees cannot record payments or returns via chat. Please use the main interface.',
      };
    }

    // Resolve entities
    let resolved;
    try {
      resolved = await this.executor.resolveEntities(shopId, intentResult.intent, intentResult.params);
    } catch (err) {
      this.logger.error(`Entity resolution failed: ${err}`);
      return {
        type: 'error',
        sessionId: sid,
        message: 'An error occurred while processing your request.',
      };
    }

    // Handle clarification from entity resolution
    if (resolved.needsClarification) {
      return {
        type: 'clarify',
        sessionId: sid,
        question: resolved.needsClarification,
        options: resolved.options,
      };
    }

    // Read-only intents return answer directly
    const readOnlyIntents: ChatIntent[] = ['check_balance', 'check_stock', 'summary', 'help'];
    if (readOnlyIntents.includes(intentResult.intent)) {
      return {
        type: 'answer',
        sessionId: sid,
        message: resolved.answer || 'No data found.',
      };
    }

    // Write intents require confirmation
    const pendingAction: PendingAction = {
      intent: intentResult.intent,
      params: intentResult.params,
      resolvedData: {
        customerId: resolved.customerId || '',
        beverageIds: resolved.beverageIds,
        paymentAccountIds: resolved.paymentAccountIds,
        summary: resolved.summary,
      },
      expiresAt: new Date(Date.now() + this.SESSION_TTL_MS),
      shopId,
      userId,
    };

    this.sessions.set(sid, pendingAction);

    return {
      type: 'confirmation',
      sessionId: sid,
      intent: intentResult.intent,
      confidence: intentResult.confidence,
      summary: resolved.summary,
      message: resolved.answer,
      confirmBefore: pendingAction.expiresAt.toISOString(),
    };
  }

  async handleConfirm(
    sessionId: string,
    confirm: boolean,
  ): Promise<ChatResponse> {
    const pending = this.sessions.get(sessionId);

    if (!pending) {
      return {
        type: 'error',
        sessionId,
        message: 'Confirmation not found. Please re-enter your request.',
      };
    }

    if (pending.expiresAt < new Date()) {
      this.sessions.delete(sessionId);
      return {
        type: 'error',
        sessionId,
        message: 'Confirmation timed out. Please re-enter your request.',
      };
    }

    if (!confirm) {
      this.sessions.delete(sessionId);
      return {
        type: 'answer',
        sessionId,
        message: '❌ Action cancelled.',
      };
    }

    // Execute the action
    try {
      let result;
      switch (pending.intent) {
        case 'register_sale':
          result = await this.executor.executeSale(
            pending.shopId,
            pending.userId,
            pending.params as any,
            pending.resolvedData,
          );
          break;
        case 'register_payment':
          result = await this.executor.executePayment(
            pending.shopId,
            pending.userId,
            pending.params as any,
            pending.resolvedData,
          );
          break;
        case 'register_return':
          result = await this.executor.executeReturn(
            pending.shopId,
            pending.userId,
            pending.params as any,
            pending.resolvedData,
          );
          break;
        default:
          result = { type: 'error', message: 'Unknown intent' };
      }

      this.sessions.delete(sessionId);

      return {
        type: 'success',
        sessionId,
        message: result.message,
      };
    } catch (err) {
      this.logger.error(`Execution failed: ${err}`);
      this.sessions.delete(sessionId);
      return {
        type: 'error',
        sessionId,
        message: `Failed to execute: ${err instanceof Error ? err.message : 'Unknown error'}`,
      };
    }
  }

  private generateSessionId(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 16; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
