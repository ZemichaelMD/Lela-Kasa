import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CryptoService } from "../crypto/crypto.service";
import { ServiceUnavailableException } from "../common/errors/service-unavailable.exception";
import { normalizeEthiopianPhone } from "../common/phone.util";

const SMS_KEYS = [
  "sms_enabled",
  "sms_provider",
  "sms_api_key",
  "smsethiopia_api_key",
  "afromessage_token",
  "afromessage_sender",
  "afromessage_from",
];

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  private async getSettings(): Promise<{
    enabled: boolean;
    provider: string;
    apiKey: string;
    smsEthiopiaApiKey: string;
    afroMessageToken: string;
    afroMessageSender: string;
    afroMessageFrom: string;
  }> {
    const rows = await this.prisma.systemSetting.findMany({
      where: { key: { in: SMS_KEYS } },
    });
    const map: Record<string, string> = {};
    for (const r of rows) {
      map[r.key] = r.iv && this.crypto.isReady()
        ? this.crypto.decrypt(r.value, r.iv)
        : r.value;
    }

    return {
      enabled: map["sms_enabled"] !== "false",
      provider: map["sms_provider"] || "log",
      apiKey: map["sms_api_key"] || "",
      smsEthiopiaApiKey: map["smsethiopia_api_key"] || "",
      afroMessageToken: map["afromessage_token"] || "",
      afroMessageSender: map["afromessage_sender"] || "",
      afroMessageFrom: map["afromessage_from"] || "",
    };
  }

  async sendSms(msisdn: string, text: string): Promise<void> {
    const settings = await this.getSettings();

    if (!settings.enabled) {
      throw new ServiceUnavailableException(
        "SMS_NOT_CONFIGURED",
        "SMS is not enabled.",
      );
    }

    if (settings.provider === "log") {
      this.logger.log(`[sms:log] Would send to ${msisdn}: ${text}`);
      return;
    }

    // Canonical 2519XXXXXXXX — throws a 400 validation error on a bad number.
    // SMS Ethiopia wants the bare form; Twilio / Africa's Talking want E.164.
    const to = normalizeEthiopianPhone(msisdn);

    switch (settings.provider) {
      case "africastalking":
        await this.sendViaAfricaTalking(`+${to}`, text, settings.apiKey);
        break;
      case "smsethiopia":
        await this.sendViaSmsEthiopia(
          to,
          text,
          settings.smsEthiopiaApiKey || settings.apiKey,
        );
        break;
      case "twilio":
        await this.sendViaTwilio(`+${to}`, text, settings.apiKey);
        break;
      case "afromessage":
        await this.sendViaAfroMessage(
          `+${to}`,
          text,
          settings.afroMessageToken,
          settings.afroMessageSender,
          settings.afroMessageFrom,
        );
        break;
      default:
        this.logger.log(`[sms:log] To: ${to} | ${text}`);
    }
  }

  /** Sends a one-off test SMS and reports whether it actually went out. */
  async sendTest(to: string): Promise<{ ok: boolean; message: string }> {
    const settings = await this.getSettings();
    if (!settings.enabled) {
      return { ok: false, message: "SMS is disabled — enable it first." };
    }
    if (settings.provider === "log") {
      return {
        ok: false,
        message: "SMS is in log-only mode — choose a real provider first.",
      };
    }
    try {
      await this.sendSms(
        to,
        "LeLa Kasa test message — your SMS integration is working.",
      );
      return {
        ok: true,
        message: `Test SMS sent to ${to} via ${settings.provider}.`,
      };
    } catch (e) {
      return {
        ok: false,
        message: e instanceof Error ? e.message : "Failed to send test SMS.",
      };
    }
  }

  private async sendViaAfricaTalking(
    msisdn: string,
    text: string,
    apiKey: string,
  ): Promise<void> {
    if (!apiKey) {
      this.logger.warn(`[sms] Africa's Talking API key not configured`);
      return;
    }
    const username = "sandbox";
    const res = await fetch(
      "https://api.africastalking.com/version1/messaging",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          ApiKey: apiKey,
          Accept: "application/json",
        },
        body: new URLSearchParams({ username, to: msisdn, message: text }),
      },
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      this.logger.error(`[sms] Africa's Talking error ${res.status}: ${body}`);
      throw new Error(`SMS delivery failed (${res.status})`);
    }
  }

  private async sendViaSmsEthiopia(
    msisdn: string,
    text: string,
    apiKey: string,
  ): Promise<void> {
    if (!apiKey) {
      this.logger.warn(`[sms] SMS Ethiopia API key not configured`);
      return;
    }
    const res = await fetch("https://smsethiopia.et/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", KEY: apiKey },
      body: JSON.stringify({ msisdn, text }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      this.logger.error(`[sms] SMS Ethiopia error ${res.status}: ${body}`);
      throw new Error(`SMS delivery failed (${res.status})`);
    }
  }

  private async sendViaTwilio(
    msisdn: string,
    text: string,
    apiKey: string,
  ): Promise<void> {
    if (!apiKey) {
      this.logger.warn(`[sms] Twilio API key not configured`);
      return;
    }
    const [sid, token] = apiKey.split(":");
    if (!sid || !token) {
      this.logger.warn(
        `[sms] Twilio key format should be "accountSID:authToken"`,
      );
      return;
    }
    const from = "+15005550006";
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        },
        body: new URLSearchParams({ To: msisdn, From: from, Body: text }),
      },
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      this.logger.error(`[sms] Twilio error ${res.status}: ${body}`);
      throw new Error(`SMS delivery failed (${res.status})`);
    }
  }

  async checkAfroMessageBalance(): Promise<{
    ok: boolean;
    balance?: string;
    estimatedMessages?: string;
    message?: string;
  }> {
    const settings = await this.getSettings();
    if (!settings.afroMessageToken) {
      return { ok: false, message: "AfroMessage token not configured." };
    }
    try {
      const res = await fetch("https://api.afromessage.com/api/balance", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.afroMessageToken}`,
        },
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.acknowledge === "success") {
        return {
          ok: true,
          balance: body.response.balance,
          estimatedMessages: body.response.estimatedMessages,
        };
      }
      return {
        ok: false,
        message: body.response?.errors?.[0] ?? "Failed to fetch balance.",
      };
    } catch (e) {
      return {
        ok: false,
        message: e instanceof Error ? e.message : "Unknown error.",
      };
    }
  }

  private async sendViaAfroMessage(
    msisdn: string,
    text: string,
    token: string,
    sender: string,
    from: string,
  ): Promise<void> {
    if (!token) {
      this.logger.warn(`[sms] AfroMessage token not configured`);
      return;
    }
    const res = await fetch("https://api.afromessage.com/api/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        from: from || undefined,
        sender: sender || undefined,
        to: msisdn,
        message: text,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.acknowledge !== "success") {
      this.logger.error(
        `[sms] AfroMessage error ${res.status}: ${JSON.stringify(body)}`,
      );
      throw new Error(`SMS delivery failed (${res.status})`);
    }
  }
}
