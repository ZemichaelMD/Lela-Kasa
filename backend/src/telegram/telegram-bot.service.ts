import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { TelegramService } from "./telegram.service";

/** A linked Telegram chat resolves to one of these (or neither). */
interface ChatIdentity {
  user: {
    id: string;
    name: string | null;
    email: string;
    shopId: string | null;
  } | null;
  customer: {
    id: string;
    name: string;
    shopId: string;
    creditBalanceCents: number;
    outstandingBoxes: number;
    outstandingBottles: number;
  } | null;
}

interface CommandContext {
  chatId: number;
  args: string;
  identity: ChatIdentity;
}

type CommandHandler = (ctx: CommandContext) => Promise<string>;

/** Minimal shape of the Telegram update payloads we care about. */
interface TelegramUpdate {
  message?: {
    chat?: { id?: number };
    text?: string;
    from?: { first_name?: string };
  };
}

/**
 * Processes inbound Telegram webhook updates. Commands are registered in a map
 * so new control features ("/orders", "/lowstock", …) can be added by dropping
 * a handler into `buildCommands()` without touching the dispatch logic.
 */
@Injectable()
export class TelegramBotService {
  private readonly logger = new Logger(TelegramBotService.name);
  private readonly commands: Record<string, CommandHandler>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramService,
  ) {
    this.commands = this.buildCommands();
  }

  /** Entry point for the webhook controller. Never throws. */
  async handleUpdate(update: TelegramUpdate): Promise<void> {
    const message = update?.message;
    const chatId = message?.chat?.id;
    if (!chatId || typeof message?.text !== "string") return;

    try {
      const reply = await this.dispatch(chatId, message.text.trim());
      if (reply) await this.telegram.sendRaw(chatId, reply);
    } catch (e) {
      this.logger.error(`[telegram-bot] update handling failed: ${String(e)}`);
      await this.telegram
        .sendRaw(chatId, "Something went wrong. Please try again later.")
        .catch(() => undefined);
    }
  }

  private async dispatch(chatId: number, text: string): Promise<string> {
    // "/stats@KasaBot extra" → command "/stats", args "extra"
    const [rawCommand, ...rest] = text.split(/\s+/);
    const command = rawCommand.toLowerCase().split("@")[0];
    const args = rest.join(" ").trim();

    const handler = this.commands[command];
    if (!handler) {
      return "Unknown command. Send /help to see what I can do.";
    }
    const identity = await this.resolveIdentity(chatId);
    return handler({ chatId, args, identity });
  }

  private async resolveIdentity(chatId: number): Promise<ChatIdentity> {
    const chatIdStr = String(chatId);
    const [user, customer] = await Promise.all([
      this.prisma.user.findFirst({
        where: { telegramChatId: chatIdStr, deletedAt: null },
        select: { id: true, name: true, email: true, shopId: true },
      }),
      this.prisma.customer.findFirst({
        where: { telegramChatId: chatIdStr, deletedAt: null },
        select: {
          id: true,
          name: true,
          shopId: true,
          creditBalanceCents: true,
          outstandingBoxes: true,
          outstandingBottles: true,
        },
      }),
    ]);
    return { user, customer };
  }

  // ── Command registry ────────────────────────────────────────────────────

  private buildCommands(): Record<string, CommandHandler> {
    return {
      "/start": (ctx) => this.cmdStart(ctx),
      "/help": (ctx) => this.cmdHelp(ctx),
      "/unlink": (ctx) => this.cmdUnlink(ctx),
      "/stats": (ctx) => this.cmdStats(ctx),
      "/balance": (ctx) => this.cmdBalance(ctx),
    };
  }

  private async cmdStart(ctx: CommandContext): Promise<string> {
    const code = ctx.args.split(/\s+/)[0];
    if (!code) {
      if (ctx.identity.user || ctx.identity.customer) {
        return "Your account is already connected. Send /help to see commands.";
      }
      return (
        "Welcome to Kasa! To connect your account, open the Lela Kasa app, go to " +
        "Settings → Connect Telegram, and tap the link there."
      );
    }
    const linked = await this.telegram.consumeLinkCode(code, ctx.chatId);
    if (!linked) {
      return "That link is invalid or has expired. Please generate a new one in the Lela Kasa app.";
    }
    if (linked.kind === "USER") {
      return `Connected. Hi ${linked.name}! You will receive shop notifications here. Send /stats for today's numbers or /help for more.`;
    }
    return `Connected. Hi ${linked.name}! You will get payment and container reminders here. Send /balance to check what you owe.`;
  }

  private async cmdHelp(ctx: CommandContext): Promise<string> {
    const lines = [
      "<b>Lela Kasa bot commands</b>",
      "/help — show this message",
    ];
    if (ctx.identity.user) {
      lines.push("/stats — today’s sales and outstanding credit");
    }
    if (ctx.identity.customer) {
      lines.push("/balance — your outstanding balance and containers");
    }
    if (!ctx.identity.user && !ctx.identity.customer) {
      lines.push(
        "/start — connect your account with a link from the Lela Kasa app",
      );
    } else {
      lines.push("/unlink — disconnect this Telegram chat");
    }
    return lines.join("\n");
  }

  private async cmdUnlink(ctx: CommandContext): Promise<string> {
    if (!ctx.identity.user && !ctx.identity.customer) {
      return "This chat is not connected to any account.";
    }
    await this.telegram.unlinkChat(ctx.chatId);
    return "Disconnected. You will no longer receive notifications here.";
  }

  private async cmdStats(ctx: CommandContext): Promise<string> {
    const user = ctx.identity.user;
    if (!user) {
      return "Stats are only available to connected shop accounts. Connect from the Lela Kasa app.";
    }
    if (!user.shopId) return "Your account is not attached to a shop yet.";

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [salesToday, credit, customerCount] = await Promise.all([
      this.prisma.sale.aggregate({
        where: {
          shopId: user.shopId,
          status: { not: "VOIDED" },
          saleDate: { gte: startOfDay },
        },
        _sum: { subtotalCents: true },
        _count: true,
      }),
      this.prisma.customer.aggregate({
        where: { shopId: user.shopId, deletedAt: null },
        _sum: {
          creditBalanceCents: true,
          outstandingBoxes: true,
          outstandingBottles: true,
        },
      }),
      this.prisma.customer.count({
        where: { shopId: user.shopId, deletedAt: null },
      }),
    ]);

    return [
      "<b>📊 Today so far</b>",
      `Sales: ${salesToday._count} (${this.money(salesToday._sum.subtotalCents ?? 0)})`,
      "",
      "<b>Outstanding (all customers)</b>",
      `Credit: ${this.money(credit._sum.creditBalanceCents ?? 0)}`,
      `Boxes: ${credit._sum.outstandingBoxes ?? 0}  •  Bottles: ${credit._sum.outstandingBottles ?? 0}`,
      `Customers: ${customerCount}`,
    ].join("\n");
  }

  private async cmdBalance(ctx: CommandContext): Promise<string> {
    const customer = ctx.identity.customer;
    if (!customer) {
      return "Balance is only available to connected customer accounts.";
    }
    return [
      `<b>${customer.name}</b>`,
      `Outstanding balance: ${this.money(customer.creditBalanceCents)}`,
      `Boxes to return: ${customer.outstandingBoxes}`,
      `Bottles to return: ${customer.outstandingBottles}`,
    ].join("\n");
  }

  private money(cents: number): string {
    return `ETB ${(cents / 100).toFixed(2)}`;
  }
}
