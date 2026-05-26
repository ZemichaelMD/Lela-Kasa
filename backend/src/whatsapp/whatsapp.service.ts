import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { normalizeEthiopianPhone } from "../common/phone.util";

interface WhatsAppSettings {
  enabled: boolean;
  provider: "meta" | "twilio" | "log";
  metaAccessToken: string;
  metaPhoneNumberId: string;
  metaApiVersion: string;
  twilioSid: string;
  twilioToken: string;
  twilioFrom: string;
}

const SETTING_KEYS = [
  "whatsapp_enabled",
  "whatsapp_provider",
  "whatsapp_meta_access_token",
  "whatsapp_meta_phone_number_id",
  "whatsapp_meta_api_version",
  "whatsapp_twilio_sid",
  "whatsapp_twilio_token",
  "whatsapp_twilio_from",
];

/**
 * Sends WhatsApp messages via a provider chosen in admin settings. Mirrors
 * SmsService: the provider and all keys live in SystemSetting rows so they can
 * be changed at runtime without a redeploy.
 */
@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async getSettings(): Promise<WhatsAppSettings> {
    const rows = await this.prisma.systemSetting.findMany({
      where: { key: { in: SETTING_KEYS } },
    });
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value;
    const provider = (map["whatsapp_provider"] ||
      "log") as WhatsAppSettings["provider"];
    return {
      enabled: map["whatsapp_enabled"] === "true",
      provider,
      metaAccessToken: map["whatsapp_meta_access_token"] || "",
      metaPhoneNumberId: map["whatsapp_meta_phone_number_id"] || "",
      metaApiVersion: map["whatsapp_meta_api_version"] || "v21.0",
      twilioSid: map["whatsapp_twilio_sid"] || "",
      twilioToken: map["whatsapp_twilio_token"] || "",
      twilioFrom: map["whatsapp_twilio_from"] || "",
    };
  }

  /** True when WhatsApp is enabled and a real (non-log) provider is configured. */
  async isEnabled(): Promise<boolean> {
    const s = await this.getSettings();
    return s.enabled && s.provider !== "log";
  }

  /** Sends a text message. Silently no-ops when WhatsApp is disabled. */
  async sendMessage(msisdn: string, text: string): Promise<void> {
    const settings = await this.getSettings();
    if (!settings.enabled) {
      this.logger.log(`[whatsapp:disabled] Would send to ${msisdn}: ${text}`);
      return;
    }

    const to = normalizeEthiopianPhone(msisdn);

    switch (settings.provider) {
      case "meta":
        await this.sendViaMeta(to, text, settings);
        break;
      case "twilio":
        await this.sendViaTwilio(to, text, settings);
        break;
      default:
        this.logger.log(`[whatsapp:log] To: ${to} | ${text}`);
    }
  }

  /** Sends a one-off test message and reports whether it actually went out. */
  async sendTest(to: string): Promise<{ ok: boolean; message: string }> {
    const settings = await this.getSettings();
    if (!settings.enabled) {
      return { ok: false, message: "WhatsApp is disabled — enable it first." };
    }
    if (settings.provider === "log") {
      return {
        ok: false,
        message: "WhatsApp is in log-only mode — choose Meta or Twilio first.",
      };
    }
    try {
      await this.sendMessage(
        to,
        "LeLa Kasa test message — your WhatsApp integration is working.",
      );
      return {
        ok: true,
        message: `Test WhatsApp message sent to ${to} via ${settings.provider}.`,
      };
    } catch (e) {
      return {
        ok: false,
        message:
          e instanceof Error ? e.message : "Failed to send test message.",
      };
    }
  }

  private async sendViaMeta(
    to: string,
    text: string,
    s: WhatsAppSettings,
  ): Promise<void> {
    if (!s.metaAccessToken || !s.metaPhoneNumberId) {
      this.logger.warn(
        "[whatsapp] Meta access token or phone number ID not configured",
      );
      throw new Error("WhatsApp (Meta) is not fully configured");
    }
    const res = await fetch(
      `https://graph.facebook.com/${s.metaApiVersion}/${s.metaPhoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${s.metaAccessToken}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "text",
          text: { body: text },
        }),
      },
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      this.logger.error(`[whatsapp] Meta error ${res.status}: ${body}`);
      throw new Error(`WhatsApp delivery failed (${res.status})`);
    }
  }

  private async sendViaTwilio(
    to: string,
    text: string,
    s: WhatsAppSettings,
  ): Promise<void> {
    if (!s.twilioSid || !s.twilioToken || !s.twilioFrom) {
      this.logger.warn(
        "[whatsapp] Twilio SID, token, or from-number not configured",
      );
      throw new Error("WhatsApp (Twilio) is not fully configured");
    }
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${s.twilioSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${s.twilioSid}:${s.twilioToken}`).toString("base64")}`,
        },
        body: new URLSearchParams({
          To: `whatsapp:+${to}`,
          From: `whatsapp:${s.twilioFrom}`,
          Body: text,
        }),
      },
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      this.logger.error(`[whatsapp] Twilio error ${res.status}: ${body}`);
      throw new Error(`WhatsApp delivery failed (${res.status})`);
    }
  }
}
