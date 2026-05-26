import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import * as crypto from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { VerificationService } from "../verification/verification.service";

export type TelegramLinkKind = "USER" | "CUSTOMER";

interface TelegramConfig {
  botToken: string;
  chatId: string;
  botUsername: string;
  webhookSecret: string;
}

/** A linking code is valid for this long after it is generated. */
const LINK_CODE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly verification: VerificationService,
  ) {}

  // ── Config ──────────────────────────────────────────────────────────────

  private async getConfig(): Promise<TelegramConfig> {
    const rows = await this.prisma.systemSetting.findMany({
      where: {
        key: {
          in: [
            "telegram_bot_token",
            "telegram_chat_id",
            "telegram_bot_username",
            "telegram_webhook_secret",
          ],
        },
      },
    });
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value;
    return {
      botToken: map["telegram_bot_token"] || "",
      chatId: map["telegram_chat_id"] || "",
      botUsername: map["telegram_bot_username"] || "",
      webhookSecret: map["telegram_webhook_secret"] || "",
    };
  }

  async getWebhookSecret(): Promise<string> {
    return (await this.getConfig()).webhookSecret;
  }

  /** True when a bot token is configured (linking / sending is possible). */
  async isConfigured(): Promise<boolean> {
    return !!(await this.getConfig()).botToken;
  }

  // ── Low-level Telegram API ──────────────────────────────────────────────

  /** Hard cap on any single Telegram API request. */
  private static readonly API_TIMEOUT_MS = 15_000;

  private async callApi(
    method: string,
    payload: Record<string, unknown>,
    botToken?: string,
  ): Promise<{ ok: boolean; result?: unknown; description?: string }> {
    const token = botToken ?? (await this.getConfig()).botToken;
    if (!token) {
      this.logger.warn(
        `[telegram] ${method} skipped — bot token not configured`,
      );
      return { ok: false, description: "Bot token not configured" };
    }

    try {
      const res = await fetch(
        `https://api.telegram.org/bot${token}/${method}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          // Fail fast instead of hanging; without this a blocked network stalls
          // the request until undici's internal connect timeout.
          signal: AbortSignal.timeout(TelegramService.API_TIMEOUT_MS),
        },
      );
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        result?: unknown;
        description?: string;
      };
      if (!res.ok || !json.ok) {
        this.logger.error(
          `[telegram] ${method} failed ${res.status}: ${json.description ?? ""}`,
        );
      }
      return {
        ok: !!json.ok,
        result: json.result,
        description: json.description,
      };
    } catch (e) {
      // A network-level failure (DNS, timeout, blocked host) rejects the fetch
      // itself. Swallow it and report a clear reason rather than letting an
      // unhandled "fetch failed" become a 500.
      const timedOut = e instanceof Error && e.name === "TimeoutError";
      this.logger.error(
        `[telegram] ${method} could not reach api.telegram.org: ${String(e)}`,
      );
      return {
        ok: false,
        description: timedOut
          ? "Telegram did not respond in time — the server could not reach api.telegram.org. Check the host's internet access (Telegram may be blocked on this network)."
          : "Could not reach api.telegram.org from the server. Check the host's internet access — Telegram may be blocked on this network or require a proxy/VPN.",
      };
    }
  }

  /** Sends a message to an explicit chat id. */
  async sendRaw(chatId: string | number, text: string): Promise<boolean> {
    if (!chatId) return false;
    const res = await this.callApi("sendMessage", {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
    return res.ok;
  }

  /** Sends to the admin chat configured in system settings. Returns false when unconfigured. */
  async sendMessage(text: string): Promise<boolean> {
    const { botToken, chatId } = await this.getConfig();
    if (!botToken || !chatId) {
      this.logger.warn("[telegram] Bot token or admin chat ID not configured");
      return false;
    }
    return this.sendRaw(chatId, text);
  }

  /** Sends to a linked app user (owner/employee). Returns false when not linked. */
  async sendToUser(userId: string, text: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { telegramChatId: true },
    });
    if (!user?.telegramChatId) return false;
    return this.sendRaw(user.telegramChatId, text);
  }

  /** Sends to a linked customer. Returns false when the customer has not linked. */
  async sendToCustomer(customerId: string, text: string): Promise<boolean> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { telegramChatId: true },
    });
    if (!customer?.telegramChatId) return false;
    return this.sendRaw(customer.telegramChatId, text);
  }

  // ── Bot identity ────────────────────────────────────────────────────────

  /** Resolves the bot's @username, calling getMe and caching it if not stored. */
  async getBotUsername(): Promise<string> {
    const { botUsername, botToken } = await this.getConfig();
    if (botUsername) return botUsername;
    if (!botToken) return "";
    const res = await this.callApi("getMe", {}, botToken);
    const username =
      res.ok && res.result && typeof res.result === "object"
        ? ((res.result as { username?: string }).username ?? "")
        : "";
    if (username) {
      await this.prisma.systemSetting.upsert({
        where: { key: "telegram_bot_username" },
        update: { value: username },
        create: { key: "telegram_bot_username", value: username },
      });
    }
    return username;
  }

  // ── Linking flow ────────────────────────────────────────────────────────

  /**
   * Creates a single-use linking code and the `t.me` deep link a person opens
   * to bind their Telegram chat to a User or Customer record.
   */
  async createLinkCode(
    kind: TelegramLinkKind,
    targetId: string,
    shopId?: string | null,
  ): Promise<{ code: string; deepLink: string; botUsername: string }> {
    const botUsername = await this.getBotUsername();
    const code = crypto.randomBytes(6).toString("hex");

    // Drop any earlier unused codes for the same target so only one is live.
    await this.prisma.telegramLinkCode.deleteMany({
      where: { kind, targetId, usedAt: null },
    });
    await this.prisma.telegramLinkCode.create({
      data: {
        code,
        kind,
        targetId,
        shopId: shopId ?? null,
        expiresAt: new Date(Date.now() + LINK_CODE_TTL_MS),
      },
    });

    const deepLink = botUsername
      ? `https://t.me/${botUsername}?start=${code}`
      : "";
    return { code, deepLink, botUsername };
  }

  /**
   * Consumes a `/start` code: binds the given Telegram chat id to the target
   * record. Returns the linked entity so the bot can greet appropriately.
   */
  async consumeLinkCode(
    code: string,
    chatId: string | number,
  ): Promise<{ kind: TelegramLinkKind; name: string } | null> {
    const record = await this.prisma.telegramLinkCode.findUnique({
      where: { code },
    });
    if (!record || record.usedAt || record.expiresAt < new Date()) return null;

    const chatIdStr = String(chatId);
    if (record.kind === "USER") {
      const user = await this.prisma.user.findUnique({
        where: { id: record.targetId },
        select: { id: true, name: true, email: true },
      });
      if (!user) return null;
      // Free this chat id from any other user before binding it here.
      await this.prisma.user.updateMany({
        where: { telegramChatId: chatIdStr, id: { not: user.id } },
        data: { telegramChatId: null },
      });
      await this.prisma.user.update({
        where: { id: user.id },
        data: { telegramChatId: chatIdStr },
      });
      await this.prisma.telegramLinkCode.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      });
      // Linking the chat is itself proof of ownership — register it verified.
      await this.verification.record(user.id, "TELEGRAM", chatIdStr);
      return { kind: "USER", name: user.name || user.email };
    }

    const customer = await this.prisma.customer.findUnique({
      where: { id: record.targetId },
      select: { id: true, name: true },
    });
    if (!customer) return null;
    await this.prisma.customer.update({
      where: { id: customer.id },
      data: { telegramChatId: chatIdStr },
    });
    await this.prisma.telegramLinkCode.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
    return { kind: "CUSTOMER", name: customer.name };
  }

  /** Unbinds whatever record is linked to this chat id. */
  async unlinkChat(chatId: string | number): Promise<boolean> {
    const chatIdStr = String(chatId);
    const users = await this.prisma.user.findMany({
      where: { telegramChatId: chatIdStr },
      select: { id: true },
    });
    const u = await this.prisma.user.updateMany({
      where: { telegramChatId: chatIdStr },
      data: { telegramChatId: null },
    });
    const c = await this.prisma.customer.updateMany({
      where: { telegramChatId: chatIdStr },
      data: { telegramChatId: null },
    });
    for (const user of users) {
      await this.verification.revoke(user.id, "TELEGRAM");
    }
    return u.count + c.count > 0;
  }

  // ── Webhook management ──────────────────────────────────────────────────

  /**
   * Registers the webhook URL with Telegram and stores a fresh secret token so
   * incoming updates can be authenticated.
   */
  async setWebhook(url: string): Promise<{ ok: boolean; message: string }> {
    const { botToken } = await this.getConfig();
    if (!botToken) {
      return { ok: false, message: "Set the Telegram bot token first." };
    }
    if (!/^https:\/\//.test(url)) {
      throw new BadRequestException(
        "Webhook URL must be a public https:// URL",
      );
    }
    const secret = crypto.randomBytes(16).toString("hex");
    const res = await this.callApi(
      "setWebhook",
      {
        url,
        secret_token: secret,
        allowed_updates: ["message"],
        drop_pending_updates: true,
      },
      botToken,
    );
    if (!res.ok) {
      return {
        ok: false,
        message: res.description || "Telegram rejected the webhook URL.",
      };
    }
    await this.prisma.systemSetting.upsert({
      where: { key: "telegram_webhook_secret" },
      update: { value: secret },
      create: { key: "telegram_webhook_secret", value: secret },
    });
    return { ok: true, message: `Webhook registered at ${url}` };
  }

  // ── Pre-built notifications ─────────────────────────────────────────────

  async sendPaymentNotification(
    shopName: string,
    ownerName: string,
    amountText: string,
    reference: string,
  ): Promise<boolean> {
    const msg = `<b>💰 Payment Received</b>\n\nShop: ${shopName}\nOwner: ${ownerName}\nAmount: ${amountText}\nReference: ${reference}\n\nAction required: Mark subscription as paid in admin panel.`;
    return this.sendMessage(msg);
  }

  async sendSubscriptionAlert(shopName: string, status: string): Promise<void> {
    const msg = `<b>⚠️ Subscription Alert</b>\n\nShop: ${shopName}\nStatus: ${status}\n\nReview and take action.`;
    await this.sendMessage(msg);
  }

  /** Sends a one-off test message to the admin chat and reports the result. */
  async sendTest(): Promise<{ ok: boolean; message: string }> {
    try {
      const sent = await this.sendMessage(
        "<b>LeLa Kasa test</b> — your Telegram integration is working.",
      );
      return sent
        ? {
            ok: true,
            message: "Test message sent to the configured Telegram chat.",
          }
        : {
            ok: false,
            message: "Telegram bot token or chat ID is not configured.",
          };
    } catch (e) {
      return {
        ok: false,
        message:
          e instanceof Error ? e.message : "Failed to send test message.",
      };
    }
  }
}
