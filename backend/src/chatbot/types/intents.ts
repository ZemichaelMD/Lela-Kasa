export type ChatIntent =
  | 'register_sale'
  | 'register_payment'
  | 'register_return'
  | 'check_balance'
  | 'check_stock'
  | 'summary'
  | 'help';

export interface ChatMessageRequest {
  message: string;
  sessionId?: string;
}

export interface ChatConfirmRequest {
  sessionId: string;
  confirm: boolean;
}

export interface LLMIntentResult {
  intent: ChatIntent;
  confidence: number;
  params: Record<string, unknown>;
  clarification: string | null;
}

export interface ResolvedCustomer {
  id: string;
  name: string;
  matched: boolean;
}

export interface ResolvedBeverage {
  id: string;
  name: string;
  brand: string | null;
  pricePerBoxCents: number;
  pricePerBottleCents: number;
  bottlesPerBox: number;
  matched: boolean;
}

export interface ResolvedPaymentAccount {
  id: string;
  name: string;
  kind: string;
  matched: boolean;
}

export interface SaleLineParam {
  beverageName: string;
  boxes: number;
  bottles: number;
}

export interface PaymentParam {
  amountBirr: number;
  method: string;
  accountName?: string;
}

export interface RegisterSaleParams {
  customerName: string;
  lines: SaleLineParam[];
  payments: PaymentParam[];
  applyCredit: boolean;
  notes?: string;
}

export interface RegisterPaymentParams {
  customerName: string;
  amountBirr: number;
  method: string;
  accountName?: string;
  notes?: string;
}

export interface RegisterReturnParams {
  customerName: string;
  boxes: number;
  bottles: number;
  notes?: string;
}

export interface CheckBalanceParams {
  customerName?: string;
  showAllWithCredit?: boolean;
}

export interface CheckStockParams {
  beverageName?: string;
  showLowStock?: boolean;
}

export interface SummaryParams {
  period: 'today' | 'week' | 'month';
}

export type ChatResponseType = 'answer' | 'confirmation' | 'clarify' | 'error' | 'success';

export interface ChatConfirmationSummary {
  customer: ResolvedCustomer;
  lines?: Array<{
    beverage: ResolvedBeverage;
    boxes: number;
    bottles: number;
    lineTotalCents: number;
  }>;
  payments?: Array<{
    amountCents: number;
    method: string;
    account: ResolvedPaymentAccount;
  }>;
  subtotalCents?: number;
  paidCents?: number;
  creditDeltaCents?: number;
  boxes?: number;
  bottles?: number;
}

export interface ChatResponse {
  type: ChatResponseType;
  sessionId: string;
  message?: string;
  intent?: ChatIntent;
  confidence?: number;
  summary?: ChatConfirmationSummary;
  question?: string;
  options?: string[];
  confirmBefore?: string;
}

export interface PendingAction {
  intent: ChatIntent;
  params: Record<string, unknown>;
  resolvedData: {
    customerId: string;
    beverageIds?: string[];
    paymentAccountIds?: string[];
    summary: ChatConfirmationSummary;
  };
  expiresAt: Date;
  shopId: string;
  userId: string;
}
