/**
 * ID helpers · cuid2 for entity IDs; order/reference number generators.
 */

import { createId as cuid } from "@paralleldrive/cuid2";

export { cuid };

let orderSeq = 0;

/**
 * Generate an order number like "ORD-2026051100001".
 * In production this should come from the DB sequence; this is a fallback.
 */
export function generateOrderNumber(date = new Date()): string {
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  orderSeq = (orderSeq + 1) % 100000;
  return `ORD-${dateStr}${String(orderSeq).padStart(5, "0")}`;
}

/**
 * Generate a short reference number (for transactions, refunds, etc.)
 */
export function generateReference(prefix = "REF"): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}

/**
 * Generate a short opaque QR code string (8 chars, URL-safe).
 */
export function generateQrCode(): string {
  return cuid().slice(0, 12);
}

/**
 * Generate a promo code string like "SAVE20-ABCD".
 */
export function generatePromoCode(prefix = "PROMO"): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${rand}`;
}
