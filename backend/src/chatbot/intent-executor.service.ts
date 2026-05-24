import { Injectable, Logger } from "@nestjs/common";
import { PaymentMethod } from "../database";
import { PrismaService } from "../prisma/prisma.service";
import { SalesService } from "../sales/sales.service";
import { CustomersService } from "../customers/customers.service";
import { BeveragesService } from "../beverages/beverages.service";
import { ReportsService } from "../reports/reports.service";
import { AuditService } from "../audit/audit.service";
import { IntentClassifierService } from "./intent-classifier.service";
import type {
  ChatIntent,
  ChatConfirmationSummary,
  ResolvedCustomer,
  ResolvedBeverage,
  ResolvedPaymentAccount,
  PendingAction,
  RegisterSaleParams,
  RegisterPaymentParams,
  RegisterReturnParams,
  CheckBalanceParams,
  CheckStockParams,
  SummaryParams,
} from "./types/intents";

function birrToCents(birr: number): number {
  return Math.round(birr * 100);
}

function formatBirr(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function parsePaymentMethod(method: string): PaymentMethod {
  const upper = method.toUpperCase();
  if (upper === "CASH") return PaymentMethod.CASH;
  if (upper === "BANK_TRANSFER") return PaymentMethod.BANK_TRANSFER;
  if (upper === "MOBILE_MONEY") return PaymentMethod.MOBILE_MONEY;
  return PaymentMethod.OTHER;
}

@Injectable()
export class IntentExecutorService {
  private readonly logger = new Logger(IntentExecutorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly salesService: SalesService,
    private readonly customersService: CustomersService,
    private readonly beveragesService: BeveragesService,
    private readonly reportsService: ReportsService,
    private readonly auditService: AuditService,
    private readonly classifier: IntentClassifierService,
  ) {}

  async resolveEntities(
    shopId: string,
    intent: ChatIntent,
    params: Record<string, unknown>,
  ): Promise<{
    customerId?: string;
    beverageIds?: string[];
    paymentAccountIds?: string[];
    summary: ChatConfirmationSummary;
    answer?: string;
    needsClarification?: string;
    options?: string[];
  }> {
    const ctx = await this.classifier.getContextCache(shopId);

    switch (intent) {
      case "register_sale": {
        return this.resolveSaleEntities(
          ctx,
          params as unknown as RegisterSaleParams,
        );
      }
      case "register_payment": {
        return this.resolvePaymentEntities(
          ctx,
          params as unknown as RegisterPaymentParams,
        );
      }
      case "register_return": {
        return this.resolveReturnEntities(
          ctx,
          params as unknown as RegisterReturnParams,
        );
      }
      case "check_balance": {
        return this.resolveBalanceQuery(
          ctx,
          shopId,
          params as unknown as CheckBalanceParams,
        );
      }
      case "check_stock": {
        return this.resolveStockQuery(ctx, shopId, params as CheckStockParams);
      }
      case "summary": {
        return this.resolveSummaryQuery(
          shopId,
          params as unknown as SummaryParams,
        );
      }
      case "help": {
        return {
          summary: { customer: { id: "", name: "", matched: false } },
          answer: this.getHelpMessage(),
        };
      }
      default: {
        return {
          summary: { customer: { id: "", name: "", matched: false } },
          needsClarification:
            "I'm not sure I understood. Type 'help' for examples.",
        };
      }
    }
  }

  private findCustomer(
    ctx: { customers: Array<{ id: string; name: string }> },
    name: string,
  ): {
    customer: { id: string; name: string; matched: boolean } | null;
    clarification?: string;
    options?: string[];
  } {
    if (!name)
      return {
        customer: null,
        clarification: "Please specify a customer name.",
      };

    const lower = name.toLowerCase();
    const exact = ctx.customers.find((c) => c.name.toLowerCase() === lower);
    if (exact)
      return { customer: { id: exact.id, name: exact.name, matched: true } };

    const contains = ctx.customers.filter((c) =>
      c.name.toLowerCase().includes(lower),
    );
    if (contains.length === 1)
      return {
        customer: { id: contains[0].id, name: contains[0].name, matched: true },
      };
    if (contains.length > 1) {
      return {
        customer: null,
        clarification: `Which customer did you mean?`,
        options: contains.map((c) => c.name),
      };
    }

    // Try fuzzy: check if any customer name contains any word from the input
    const words = lower.split(/\s+/);
    const fuzzy = ctx.customers.filter((c) => {
      const cn = c.name.toLowerCase();
      return words.some((w) => cn.includes(w) && w.length > 2);
    });
    if (fuzzy.length === 1)
      return {
        customer: { id: fuzzy[0].id, name: fuzzy[0].name, matched: true },
      };
    if (fuzzy.length > 1) {
      return {
        customer: null,
        clarification: `I don't see a customer named "${name}". Did you mean one of these?`,
        options: fuzzy.slice(0, 5).map((c) => c.name),
      };
    }

    return {
      customer: null,
      clarification: `I don't see a customer named "${name}" in your shop.`,
    };
  }

  private findBeverage(
    ctx: {
      beverages: Array<{
        id: string;
        name: string;
        brand: string | null;
        bottlesPerBox: number;
        stockBottles: number;
        pricePerBoxCents?: number;
        pricePerBottleCents?: number;
      }>;
    },
    name: string,
  ): {
    beverage: {
      id: string;
      name: string;
      brand: string | null;
      bottlesPerBox: number;
      stockBottles: number;
      matched: boolean;
    } | null;
    clarification?: string;
    options?: string[];
  } {
    if (!name)
      return {
        beverage: null,
        clarification: "Please specify a beverage name.",
      };

    const lower = name.toLowerCase();
    const exact = ctx.beverages.find(
      (b) =>
        b.name.toLowerCase() === lower ||
        (b.brand && b.brand.toLowerCase() === lower),
    );
    if (exact)
      return {
        beverage: {
          id: exact.id,
          name: exact.name,
          brand: exact.brand,
          bottlesPerBox: exact.bottlesPerBox,
          stockBottles: exact.stockBottles,
          matched: true,
        },
      };

    const contains = ctx.beverages.filter(
      (b) =>
        b.name.toLowerCase().includes(lower) ||
        (b.brand && b.brand.toLowerCase().includes(lower)),
    );
    if (contains.length === 1)
      return {
        beverage: {
          id: contains[0].id,
          name: contains[0].name,
          brand: contains[0].brand,
          bottlesPerBox: contains[0].bottlesPerBox,
          stockBottles: contains[0].stockBottles,
          matched: true,
        },
      };
    if (contains.length > 1) {
      return {
        beverage: null,
        clarification: `Which "${name}" did you mean?`,
        options: contains.map((b) => b.name + (b.brand ? ` (${b.brand})` : "")),
      };
    }

    return {
      beverage: null,
      clarification: `I don't see a beverage named "${name}" in your shop.`,
    };
  }

  private findPaymentAccount(
    ctx: { paymentAccounts: Array<{ id: string; name: string; kind: string }> },
    name?: string,
    method?: string,
  ): {
    account: {
      id: string;
      name: string;
      kind: string;
      matched: boolean;
    } | null;
    clarification?: string;
    options?: string[];
  } {
    if (!name) {
      // Default to first cash account
      const cashAccount = ctx.paymentAccounts.find(
        (a) => a.kind === "CASH_PERSON",
      );
      if (cashAccount)
        return {
          account: {
            id: cashAccount.id,
            name: cashAccount.name,
            kind: cashAccount.kind,
            matched: true,
          },
        };
      if (ctx.paymentAccounts.length > 0)
        return {
          account: {
            id: ctx.paymentAccounts[0].id,
            name: ctx.paymentAccounts[0].name,
            kind: ctx.paymentAccounts[0].kind,
            matched: true,
          },
        };
      return {
        account: null,
        clarification: "No payment accounts found. Please create one first.",
      };
    }

    const lower = name.toLowerCase();
    const exact = ctx.paymentAccounts.find(
      (a) => a.name.toLowerCase() === lower,
    );
    if (exact)
      return {
        account: {
          id: exact.id,
          name: exact.name,
          kind: exact.kind,
          matched: true,
        },
      };

    const contains = ctx.paymentAccounts.filter((a) =>
      a.name.toLowerCase().includes(lower),
    );
    if (contains.length === 1)
      return {
        account: {
          id: contains[0].id,
          name: contains[0].name,
          kind: contains[0].kind,
          matched: true,
        },
      };
    if (contains.length > 1) {
      return {
        account: null,
        clarification: `Which payment account did you mean?`,
        options: contains.map((a) => a.name),
      };
    }

    return {
      account: null,
      clarification: `I don't see a payment account named "${name}".`,
    };
  }

  private async resolveSaleEntities(
    ctx: Awaited<ReturnType<IntentClassifierService["getContextCache"]>>,
    params: RegisterSaleParams,
  ) {
    // Resolve customer
    const customerResult = this.findCustomer(ctx, params.customerName);
    if (!customerResult.customer) {
      return {
        summary: {
          customer: { id: "", name: params.customerName, matched: false },
        },
        needsClarification: customerResult.clarification,
        options: customerResult.options,
      };
    }

    // Resolve beverages and compute line totals
    const lines: Array<{
      beverage: ResolvedBeverage;
      boxes: number;
      bottles: number;
      lineTotalCents: number;
    }> = [];
    let subtotalCents = 0;

    // We need prices - fetch them
    const priceTierId = ctx.priceTierId;
    const now = new Date();

    for (const lineParam of params.lines) {
      const bevResult = this.findBeverage(ctx, lineParam.beverageName);
      if (!bevResult.beverage) {
        return {
          summary: { customer: customerResult.customer, lines },
          needsClarification: bevResult.clarification,
          options: bevResult.options,
        };
      }

      // Fetch price
      const price = await this.prisma.beveragePrice.findFirst({
        where: {
          beverageId: bevResult.beverage.id,
          priceTierId,
          effectiveFrom: { lte: now },
        },
        orderBy: { effectiveFrom: "desc" },
      });

      const pricePerBoxCents = price?.pricePerBoxCents ?? 0;
      const pricePerBottleCents = price?.pricePerBottleCents ?? 0;
      const lineTotalCents =
        lineParam.boxes * pricePerBoxCents +
        lineParam.bottles * pricePerBottleCents;

      lines.push({
        beverage: {
          id: bevResult.beverage.id,
          name: bevResult.beverage.name,
          brand: bevResult.beverage.brand,
          pricePerBoxCents,
          pricePerBottleCents,
          bottlesPerBox: bevResult.beverage.bottlesPerBox,
          matched: true,
        },
        boxes: lineParam.boxes,
        bottles: lineParam.bottles,
        lineTotalCents,
      });
      subtotalCents += lineTotalCents;
    }

    // Resolve payment accounts
    const payments: Array<{
      amountCents: number;
      method: string;
      account: ResolvedPaymentAccount;
    }> = [];
    let paidCents = 0;

    for (const payParam of params.payments) {
      const accResult = this.findPaymentAccount(
        ctx,
        payParam.accountName,
        payParam.method,
      );
      if (!accResult.account) {
        return {
          summary: { customer: customerResult.customer, lines },
          needsClarification: accResult.clarification,
          options: accResult.options,
        };
      }

      const amountCents = birrToCents(payParam.amountBirr);
      payments.push({
        amountCents,
        method: payParam.method,
        account: accResult.account,
      });
      paidCents += amountCents;
    }

    const creditDeltaCents = subtotalCents - paidCents;

    // Build summary text
    const linesText = lines
      .map(
        (l) =>
          `  ${l.boxes > 0 ? l.boxes + " box(es) " : ""}${l.bottles > 0 ? l.bottles + " bottle(s) " : ""}${l.beverage.name}`,
      )
      .join("\n");
    const paymentsText = payments
      .map((p) => `  ${formatBirr(p.amountCents)} ETB (${p.method})`)
      .join("\n");
    const creditText =
      creditDeltaCents > 0
        ? `\n  Credit: ${formatBirr(creditDeltaCents)} ETB`
        : "";

    const summaryText = `🧾 New Sale\nCustomer: ${customerResult.customer.name}\nItems:\n${linesText}\nPayments:\n${paymentsText}${creditText}`;

    return {
      customerId: customerResult.customer.id,
      beverageIds: lines.map((l) => l.beverage.id),
      paymentAccountIds: payments.map((p) => p.account.id),
      summary: {
        customer: customerResult.customer,
        lines,
        payments,
        subtotalCents,
        paidCents,
        creditDeltaCents,
      },
      answer: summaryText,
    };
  }

  private async resolvePaymentEntities(
    ctx: Awaited<ReturnType<IntentClassifierService["getContextCache"]>>,
    params: RegisterPaymentParams,
  ) {
    const customerResult = this.findCustomer(ctx, params.customerName);
    if (!customerResult.customer) {
      return {
        summary: {
          customer: { id: "", name: params.customerName, matched: false },
        },
        needsClarification: customerResult.clarification,
        options: customerResult.options,
      };
    }

    const accResult = this.findPaymentAccount(
      ctx,
      params.accountName,
      params.method,
    );
    if (!accResult.account) {
      return {
        summary: { customer: customerResult.customer },
        needsClarification: accResult.clarification,
        options: accResult.options,
      };
    }

    const amountCents = birrToCents(params.amountBirr);

    // Get customer's current balance
    const customer = await this.customersService.findOne(
      "",
      customerResult.customer.id,
    );

    const summaryText = `💰 Record Payment\nCustomer: ${customerResult.customer.name}\nAmount: ${formatBirr(amountCents)} ETB (${params.method})\nAccount: ${accResult.account.name}\nCurrent balance: ${formatBirr(customer.creditBalanceCents)} ETB`;

    return {
      customerId: customerResult.customer.id,
      paymentAccountIds: [accResult.account.id],
      summary: {
        customer: customerResult.customer,
        payments: [
          { amountCents, method: params.method, account: accResult.account },
        ],
      },
      answer: summaryText,
    };
  }

  private async resolveReturnEntities(
    ctx: Awaited<ReturnType<IntentClassifierService["getContextCache"]>>,
    params: RegisterReturnParams,
  ) {
    const customerResult = this.findCustomer(ctx, params.customerName);
    if (!customerResult.customer) {
      return {
        summary: {
          customer: { id: "", name: params.customerName, matched: false },
        },
        needsClarification: customerResult.clarification,
        options: customerResult.options,
      };
    }

    const customer = await this.customersService.findOne(
      "",
      customerResult.customer.id,
    );

    const summaryText = `📦 Record Return\nCustomer: ${customerResult.customer.name}\nBoxes: ${params.boxes}\nBottles: ${params.bottles}\nCurrent outstanding: ${customer.outstandingBoxes} boxes, ${customer.outstandingBottles} bottles`;

    return {
      customerId: customerResult.customer.id,
      summary: {
        customer: customerResult.customer,
        boxes: params.boxes,
        bottles: params.bottles,
      },
      answer: summaryText,
    };
  }

  private async resolveBalanceQuery(
    ctx: Awaited<ReturnType<IntentClassifierService["getContextCache"]>>,
    shopId: string,
    params: CheckBalanceParams,
  ) {
    if (params.showAllWithCredit) {
      const customers = await this.prisma.customer.findMany({
        where: { shopId, creditBalanceCents: { gt: 0 }, deletedAt: null },
        select: {
          name: true,
          creditBalanceCents: true,
          outstandingBoxes: true,
          outstandingBottles: true,
        },
        orderBy: { creditBalanceCents: "desc" },
        take: 20,
      });

      if (customers.length === 0) {
        return {
          summary: { customer: { id: "", name: "", matched: false } },
          answer: "✅ No customers have outstanding credit.",
        };
      }

      const lines = customers
        .map(
          (c) =>
            `  ${c.name}: ${formatBirr(c.creditBalanceCents)} ETB | ${c.outstandingBoxes} boxes | ${c.outstandingBottles} bottles`,
        )
        .join("\n");
      return {
        summary: { customer: { id: "", name: "", matched: false } },
        answer: `👥 Customers with Credit:\n${lines}`,
      };
    }

    if (!params.customerName) {
      return {
        summary: { customer: { id: "", name: "", matched: false } },
        needsClarification: "Which customer would you like to check?",
      };
    }

    const customerResult = this.findCustomer(ctx, params.customerName);
    if (!customerResult.customer) {
      return {
        summary: {
          customer: { id: "", name: params.customerName, matched: false },
        },
        needsClarification: customerResult.clarification,
        options: customerResult.options,
      };
    }

    const customer = await this.customersService.findOne(
      shopId,
      customerResult.customer.id,
    );

    const summaryText = `👤 ${customer.name}\nCredit: ${formatBirr(customer.creditBalanceCents)} ETB\nBoxes: ${customer.outstandingBoxes} outstanding\nBottles: ${customer.outstandingBottles} outstanding`;

    return {
      customerId: customerResult.customer.id,
      summary: { customer: customerResult.customer },
      answer: summaryText,
    };
  }

  private async resolveStockQuery(
    ctx: Awaited<ReturnType<IntentClassifierService["getContextCache"]>>,
    shopId: string,
    params: CheckStockParams,
  ) {
    if (params.showLowStock) {
      const allStock = ctx.beverages
        .map((b) => {
          const boxes = Math.floor(b.stockBottles / b.bottlesPerBox);
          const loose = b.stockBottles % b.bottlesPerBox;
          const isLow =
            b.stockBottles < b.bottlesPerBox * ctx.lowStockThreshold;
          return { ...b, boxes, loose, isLow };
        })
        .filter((b) => b.isLow || b.stockBottles === 0);

      if (allStock.length === 0) {
        return {
          summary: { customer: { id: "", name: "", matched: false } },
          answer: "✅ All beverages are well stocked!",
        };
      }

      const lines = allStock
        .map((b) => {
          const status = b.stockBottles === 0 ? "🔴 Out of stock" : "⚠️ Low";
          return `  ${b.name}: ${b.boxes} boxes + ${b.loose} bottles ${status}`;
        })
        .join("\n");

      return {
        summary: { customer: { id: "", name: "", matched: false } },
        answer: `⚠️ Low Stock:\n${lines}`,
      };
    }

    if (params.beverageName) {
      const bevResult = this.findBeverage(ctx, params.beverageName);
      if (!bevResult.beverage) {
        return {
          summary: { customer: { id: "", name: "", matched: false } },
          needsClarification: bevResult.clarification,
          options: bevResult.options,
        };
      }

      const boxes = Math.floor(
        bevResult.beverage.stockBottles / bevResult.beverage.bottlesPerBox,
      );
      const loose =
        bevResult.beverage.stockBottles % bevResult.beverage.bottlesPerBox;
      const status =
        bevResult.beverage.stockBottles === 0
          ? "🔴 Out of stock"
          : bevResult.beverage.stockBottles <
              bevResult.beverage.bottlesPerBox * 2
            ? "⚠️ Low"
            : "✅";

      return {
        summary: { customer: { id: "", name: "", matched: false } },
        answer: `📦 ${bevResult.beverage.name}${bevResult.beverage.brand ? ` (${bevResult.beverage.brand})` : ""}\nStock: ${boxes} boxes + ${loose} bottles (${bevResult.beverage.stockBottles} total) ${status}`,
      };
    }

    // Show all stock
    const lines = ctx.beverages
      .map((b) => {
        const boxes = Math.floor(b.stockBottles / b.bottlesPerBox);
        const loose = b.stockBottles % b.bottlesPerBox;
        const status =
          b.stockBottles === 0
            ? "🔴"
            : b.stockBottles < b.bottlesPerBox * 2
              ? "⚠️"
              : "✅";
        return `  ${b.name}: ${boxes} boxes + ${loose} bottles ${status}`;
      })
      .join("\n");

    return {
      summary: { customer: { id: "", name: "", matched: false } },
      answer: `📦 Stock Report:\n${lines}`,
    };
  }

  private async resolveSummaryQuery(shopId: string, params: SummaryParams) {
    const now = new Date();
    let from: Date;

    switch (params.period) {
      case "week": {
        from = new Date(now);
        from.setDate(from.getDate() - 6);
        from.setHours(0, 0, 0, 0);
        break;
      }
      case "month": {
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      }
      default: {
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      }
    }

    const summary = await this.reportsService.salesSummary(shopId, {
      from: from.toISOString(),
      to: now.toISOString(),
    });

    const periodLabel =
      params.period === "today"
        ? "Today's"
        : params.period === "week"
          ? "This Week's"
          : "This Month's";

    const summaryText = `📊 ${periodLabel} Summary\nSales: ${summary.totalCount} transactions\nRevenue: ${formatBirr(summary.totalAmountCents)} ETB`;

    return {
      summary: { customer: { id: "", name: "", matched: false } },
      answer: summaryText,
    };
  }

  private getHelpMessage(): string {
    return `I can help you with:

🧾 **Register a Sale**
  "Tigist took 5 boxes of Harar and paid 250 birr"
  "Record a sale for Abebe — 2 boxes St. George, credit"

💰 **Record a Payment**
  "Tigist paid 500 birr via bank"
  "Record a payment of 300 from Abebe"

📦 **Record a Return**
  "Tigist returned 2 boxes and 5 bottles"
  "Abebe brought back 1 box"

👤 **Check Balance**
  "How much does Tigist owe?"
  "Show me customers with credit"

📦 **Check Stock**
  "How many boxes of Harar do I have?"
  "What's low on stock?"

📊 **Summary**
  "What happened today?"
  "Show me this week's sales"

Type your request in English or Amharic!`;
  }

  async executeSale(
    shopId: string,
    userId: string,
    params: RegisterSaleParams,
    resolved: {
      customerId: string;
      beverageIds?: string[];
      paymentAccountIds?: string[];
      summary: ChatConfirmationSummary;
    },
  ) {
    const today = new Date().toISOString().split("T")[0];

    const createSaleDto = {
      saleDate: today,
      customerId: resolved.customerId,
      lines:
        resolved.summary.lines?.map((l, i) => ({
          beverageId: l.beverage.id,
          boxes: l.boxes,
          bottles: l.bottles,
        })) || [],
      payments:
        resolved.summary.payments?.map((p, i) => ({
          amountCents: p.amountCents,
          method: parsePaymentMethod(p.method),
          paymentAccountId: p.account.id,
        })) || [],
      boxesReturnedOnSale: 0,
      bottlesReturnedOnSale: 0,
    };

    const sale = await this.salesService.createSale(
      shopId,
      userId,
      createSaleDto,
    );

    await this.auditService.log({
      shopId,
      actorUserId: userId,
      action: "chatbot.register_sale",
      entityType: "Sale",
      entityId: sale.id,
      after: { saleId: sale.id, params },
    });

    await this.classifier.invalidateContextCache(shopId);

    return {
      type: "success",
      message: `✅ Sale registered: ${resolved.summary.customer.name} — ${resolved.summary.lines?.length || 0} item(s) — ${formatBirr(resolved.summary.paidCents || 0)} ETB paid`,
    };
  }

  async executePayment(
    shopId: string,
    userId: string,
    params: RegisterPaymentParams,
    resolved: {
      customerId: string;
      paymentAccountIds?: string[];
      summary: ChatConfirmationSummary;
    },
  ) {
    const payment = resolved.summary.payments?.[0];
    if (!payment) throw new Error("No payment data found");

    const recordPaymentDto = {
      amountCents: payment.amountCents,
      method: parsePaymentMethod(payment.method),
      paymentAccountId: payment.account.id,
    };

    const customer = await this.customersService.recordPayment(
      shopId,
      resolved.customerId,
      recordPaymentDto,
      userId,
    );

    await this.auditService.log({
      shopId,
      actorUserId: userId,
      action: "chatbot.register_payment",
      entityType: "Payment",
      entityId: customer.id,
      after: { customerId: resolved.customerId, params },
    });

    await this.classifier.invalidateContextCache(shopId);

    return {
      type: "success",
      message: `✅ Payment recorded: ${resolved.summary.customer.name} — ${formatBirr(payment.amountCents)} ETB`,
    };
  }

  async executeReturn(
    shopId: string,
    userId: string,
    params: RegisterReturnParams,
    resolved: { customerId: string; summary: ChatConfirmationSummary },
  ) {
    const recordReturnDto = {
      boxes: resolved.summary.boxes || 0,
      bottles: resolved.summary.bottles || 0,
    };

    const customer = await this.customersService.recordReturn(
      shopId,
      resolved.customerId,
      recordReturnDto,
      userId,
    );

    await this.auditService.log({
      shopId,
      actorUserId: userId,
      action: "chatbot.register_return",
      entityType: "Customer",
      entityId: resolved.customerId,
      after: { customerId: resolved.customerId, params },
    });

    await this.classifier.invalidateContextCache(shopId);

    return {
      type: "success",
      message: `✅ Return recorded: ${resolved.summary.customer.name} — ${resolved.summary.boxes} box(es), ${resolved.summary.bottles} bottle(s)`,
    };
  }
}
