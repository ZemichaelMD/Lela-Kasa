import { Injectable, Logger } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../crypto/crypto.service';
import { ServiceUnavailableException } from '../common/errors/service-unavailable.exception';

/** Runtime Chapa configuration — DB (SystemSetting) values override env defaults. */
export interface ChapaConfig {
  enabled: boolean;
  secretKey: string;
  publicKey: string;
  webhookSecret: string;
  mode: 'test' | 'live';
  baseUrl: string;
  callbackUrl: string;
  returnUrl: string;
}

export interface ChapaInitParams {
  amountCents: number;
  currency: string;
  email: string;
  firstName: string;
  lastName: string;
  txRef: string;
  title: string;
  description: string;
}

export interface ChapaVerifyResult {
  paid: boolean;
  status: string;
  amountCents: number;
  currency: string;
  txRef: string;
  raw: unknown;
}

/** SystemSetting keys that hold the admin-controlled Chapa configuration. */
const KEYS = [
  'chapa_enabled',
  'chapa_secret_key',
  'chapa_public_key',
  'chapa_webhook_secret',
  'chapa_mode',
  'chapa_base_url',
  'chapa_callback_url',
  'chapa_return_url',
] as const;

@Injectable()
export class ChapaService {
  private readonly logger = new Logger(ChapaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  /**
   * Resolves the active Chapa config. Every field prefers the admin-managed
   * SystemSetting value and falls back to the matching CHAPA_* env var.
   */
  async getConfig(): Promise<ChapaConfig> {
    const rows = await this.prisma.systemSetting.findMany({
      where: { key: { in: [...KEYS] } },
    });
    const map: Record<string, string> = {};
    for (const r of rows) {
      map[r.key] = r.iv && this.crypto.isReady()
        ? this.crypto.decrypt(r.value, r.iv)
        : r.value;
    }

    const secretKey = map['chapa_secret_key'] || '';
    const mode = (map['chapa_mode'] || 'test') as 'test' | 'live';

    return {
      enabled: map['chapa_enabled'] === 'true' && !!secretKey,
      secretKey,
      publicKey: map['chapa_public_key'] || '',
      webhookSecret: map['chapa_webhook_secret'] || '',
      mode,
      baseUrl: map['chapa_base_url'] || 'https://api.chapa.co/v1',
      callbackUrl: map['chapa_callback_url'] || '',
      returnUrl: map['chapa_return_url'] || '',
    };
  }

  /** Non-secret subset safe to expose to the owner client. */
  async getPublicConfig(): Promise<{ enabled: boolean; publicKey: string; mode: string }> {
    const cfg = await this.getConfig();
    return { enabled: cfg.enabled, publicKey: cfg.publicKey, mode: cfg.mode };
  }

  /**
   * Creates a Chapa hosted-checkout transaction and returns the checkout URL the
   * owner is redirected to.
   */
  async initialize(params: ChapaInitParams): Promise<{ checkoutUrl: string }> {
    const cfg = await this.getConfig();
    if (!cfg.enabled) throw new ServiceUnavailableException('PAYMENT_NOT_CONFIGURED', 'Payment gateway is not enabled.');
    if (!cfg.secretKey) throw new ServiceUnavailableException('PAYMENT_NOT_CONFIGURED', 'Chapa secret key is not configured.');

    const body: Record<string, unknown> = {
      amount: (params.amountCents / 100).toFixed(2),
      currency: params.currency,
      email: params.email,
      first_name: params.firstName,
      last_name: params.lastName,
      tx_ref: params.txRef,
      customization: {
        // Chapa rejects titles longer than 16 characters.
        title: params.title.slice(0, 16),
        description: params.description,
      },
    };
    if (cfg.callbackUrl) body['callback_url'] = cfg.callbackUrl;
    if (cfg.returnUrl) body['return_url'] = cfg.returnUrl;

    const res = await fetch(`${cfg.baseUrl}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as {
      status?: string;
      message?: string;
      data?: { checkout_url?: string };
    };
    if (!res.ok || json.status !== 'success' || !json.data?.checkout_url) {
      this.logger.error(`Chapa initialize failed: ${res.status} ${JSON.stringify(json)}`);
      throw new Error(json.message || 'Failed to start Chapa checkout');
    }
    return { checkoutUrl: json.data.checkout_url };
  }

  /**
   * Verifies a transaction directly with Chapa. This is the authoritative
   * check — never trust a webhook payload without it.
   */
  async verify(txRef: string): Promise<ChapaVerifyResult> {
    const cfg = await this.getConfig();
    if (!cfg.secretKey) throw new ServiceUnavailableException('PAYMENT_NOT_CONFIGURED', 'Chapa secret key is not configured.');

    const res = await fetch(`${cfg.baseUrl}/transaction/verify/${encodeURIComponent(txRef)}`, {
      headers: { Authorization: `Bearer ${cfg.secretKey}` },
    });
    const json = (await res.json().catch(() => ({}))) as {
      status?: string;
      data?: { status?: string; amount?: string | number; currency?: string; tx_ref?: string };
    };
    const txStatus = json.data?.status ?? 'unknown';
    const amount = Number(json.data?.amount ?? 0);
    return {
      paid: json.status === 'success' && txStatus === 'success',
      status: txStatus,
      amountCents: Math.round(amount * 100),
      currency: json.data?.currency ?? 'ETB',
      txRef: json.data?.tx_ref ?? txRef,
      raw: json,
    };
  }

  /**
   * Best-effort webhook signature check: HMAC-SHA256 of the raw request body
   * keyed with the webhook secret. Returns true when no secret is configured
   * (the verify() API call remains the real security gate either way).
   */
  verifySignature(rawBody: Buffer | undefined, signature: string | undefined, secret: string): boolean {
    if (!secret) return true;
    if (!rawBody || !signature) return false;
    try {
      const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
      const a = Buffer.from(expected);
      const b = Buffer.from(signature);
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }
}
