import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { LlmService } from './llm.service';
import type { LLMIntentResult, ChatIntent } from './types/intents';

interface ContextCache {
  customers: Array<{ id: string; name: string; phone: string | null }>;
  beverages: Array<{ id: string; name: string; brand: string | null; bottlesPerBox: number; stockBottles: number }>;
  paymentAccounts: Array<{ id: string; name: string; kind: string }>;
  priceTierId: string;
  shopName: string;
  lowStockThreshold: number;
}

@Injectable()
export class IntentClassifierService {
  private readonly logger = new Logger(IntentClassifierService.name);
  private readonly CACHE_TTL = 60_000; // 60 seconds

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly llm: LlmService,
  ) {}

  async getContextCache(shopId: string): Promise<ContextCache> {
    const cacheKey = `chatbot:context:${shopId}`;
    const cached = await this.cache.get<ContextCache>(cacheKey);
    if (cached) return cached;

    const [shop, customers, beverages, paymentAccounts] = await Promise.all([
      this.prisma.shop.findUnique({
        where: { id: shopId },
        select: { name: true, defaultPriceTierId: true, lowStockThreshold: true },
      }),
      this.prisma.customer.findMany({
        where: { shopId, deletedAt: null },
        select: { id: true, name: true, phone: true },
        orderBy: { name: 'asc' },
        take: 200,
      }),
      this.prisma.beverage.findMany({
        where: { shopId, deletedAt: null, isActive: true },
        select: { id: true, name: true, brand: true, bottlesPerBox: true, stockBottles: true },
        orderBy: { name: 'asc' },
        take: 200,
      }),
      this.prisma.paymentAccount.findMany({
        where: { shopId, deletedAt: null, isActive: true },
        select: { id: true, name: true, kind: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    const result: ContextCache = {
      customers,
      beverages,
      paymentAccounts,
      priceTierId: shop?.defaultPriceTierId || '',
      shopName: shop?.name || '',
      lowStockThreshold: shop?.lowStockThreshold ?? 2,
    };

    await this.cache.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  async invalidateContextCache(shopId: string): Promise<void> {
    await this.cache.del(`chatbot:context:${shopId}`);
  }

  private buildSystemPrompt(ctx: ContextCache): string {
    const today = new Date().toISOString().split('T')[0];

    const customersJson = JSON.stringify(
      ctx.customers.map((c) => ({ name: c.name, id: c.id })),
    );

    const beveragesJson = JSON.stringify(
      ctx.beverages.map((b) => ({
        name: b.name,
        brand: b.brand,
        id: b.id,
        bottlesPerBox: b.bottlesPerBox,
        stockBottles: b.stockBottles,
      })),
    );

    const accountsJson = JSON.stringify(
      ctx.paymentAccounts.map((a) => ({ name: a.name, id: a.id, kind: a.kind })),
    );

    return `You are a sales assistant for a beverage shop called "${ctx.shopName}" in Ethiopia.
You understand English and Amharic.

The shop's customers are:
${customersJson}

The shop's beverages are:
${beveragesJson}

The shop's payment accounts are:
${accountsJson}

Available payment methods: CASH, BANK_TRANSFER, MOBILE_MONEY, OTHER
Payment method mapping:
- "cash", "ጥሬ" → CASH
- "bank", "ባንክ", "transfer", "ድረስ" → BANK_TRANSFER
- "mobile", "ሞባይል", "telebirr", "ቴሌብር" → MOBILE_MONEY

Today's date is ${today}.

Analyze the user's message and return ONLY a valid JSON object (no markdown, no code blocks):
{
  "intent": "register_sale" | "register_payment" | "register_return" | "check_balance" | "check_stock" | "summary" | "help",
  "confidence": 0.0 to 1.0,
  "params": { ... intent-specific params },
  "clarification": null | "question to ask the user"
}

Rules:
- Match customer names by fuzzy matching (allow slight spelling errors). Use the EXACT name from the list above.
- Match beverage names by fuzzy matching on name AND brand. Use the EXACT name from the list above.
- Match payment account names by fuzzy matching. Use the EXACT name from the list above.
- If a match is ambiguous (multiple close matches), set clarification instead of guessing.
- If confidence < 0.85, set clarification asking for more detail.
- NEVER invent customers, beverages, or payment accounts that are not in the lists above.
- For register_sale: include lines array with beverageName, boxes, bottles. Include payments array with amountBirr (in birr, not cents), method, accountName.
- For register_payment: include customerName, amountBirr (in birr), method, accountName.
- For register_return: include customerName, boxes, bottles.
- For check_balance: include customerName if specified, or showAllWithCredit: true if asking for all customers with credit.
- For check_stock: include beverageName if specified, or showLowStock: true if asking for low stock.
- For summary: include period ("today", "week", or "month"). Default to "today" if not specified.
- If customer name doesn't match any in the list, set clarification.
- If beverage name doesn't match any in the list, set clarification.
- Default payment method to CASH if not specified.
- Default payment account to the first CASH_PERSON account if not specified.
- Return ONLY valid JSON. No explanation, no markdown formatting.`;
  }

  async classify(shopId: string, userMessage: string): Promise<LLMIntentResult> {
    const ctx = await this.getContextCache(shopId);
    const systemPrompt = this.buildSystemPrompt(ctx);

    const response = await this.llm.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage.trim() },
      ],
      500,
      0,
    );

    let result: LLMIntentResult;
    try {
      const cleaned = response.text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      result = JSON.parse(cleaned) as LLMIntentResult;
    } catch {
      this.logger.error(`Failed to parse LLM response: ${response.text}`);
      return {
        intent: 'help',
        confidence: 0,
        params: {},
        clarification: "I couldn't understand that. Please try again or type 'help' for examples.",
      };
    }

    // Validate required fields
    if (!result.intent || !['register_sale', 'register_payment', 'register_return', 'check_balance', 'check_stock', 'summary', 'help'].includes(result.intent)) {
      return {
        intent: 'help',
        confidence: 0,
        params: {},
        clarification: "I couldn't understand that. Please try again or type 'help' for examples.",
      };
    }

    return result;
  }
}
