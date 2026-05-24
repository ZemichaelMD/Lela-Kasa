import { Injectable } from "@nestjs/common";

/**
 * Default reminder text sent to a customer who owes money or containers.
 * Editable per-shop via the `reminder_template` ShopSetting. Placeholders:
 *   {name} {shop} {amount} {boxes} {bottles} {balance} {containers}
 * {balance} and {containers} expand to full sentences only when something
 * is actually owed, so the same template works in every situation.
 */
const DEFAULT_REMINDER_TEMPLATE =
  "Hi {name}, this is a friendly reminder from {shop}.{balance}{containers} Please settle up and return any containers at your earliest convenience. Thank you!";

@Injectable()
export class SmsTemplatesService {
  otp(code: string): string {
    return `Your Lela Kasa OTP is ${code}. Valid for 5 minutes. Do not share this code.`;
  }

  welcomeEmployee(shopName: string, name: string): string {
    return `Welcome to ${shopName}, ${name}! Your employee account has been set up. You can now log in.`;
  }

  /** The built-in reminder template. Shops may override it with their own. */
  reminderDefaultTemplate(): string {
    return DEFAULT_REMINDER_TEMPLATE;
  }

  /**
   * Renders a reminder template by substituting placeholders. {balance} and
   * {containers} produce complete sentences (or empty strings when nothing is
   * owed) so a single template reads naturally for any customer.
   */
  renderReminder(
    template: string,
    vars: {
      name: string;
      shopName: string;
      amountCents: number;
      boxes: number;
      bottles: number;
    },
  ): string {
    const amount = (Math.max(0, vars.amountCents) / 100).toFixed(2);
    const balanceSentence =
      vars.amountCents > 0
        ? ` You have an outstanding balance of ETB ${amount}.`
        : "";

    const parts: string[] = [];
    if (vars.boxes > 0)
      parts.push(`${vars.boxes} box${vars.boxes === 1 ? "" : "es"}`);
    if (vars.bottles > 0)
      parts.push(`${vars.bottles} bottle${vars.bottles === 1 ? "" : "s"}`);
    const containersSentence = parts.length
      ? ` You also have ${parts.join(" and ")} to return.`
      : "";

    return (template || DEFAULT_REMINDER_TEMPLATE)
      .replace(/\{name\}/g, vars.name)
      .replace(/\{shop\}/g, vars.shopName)
      .replace(/\{amount\}/g, amount)
      .replace(/\{boxes\}/g, String(vars.boxes))
      .replace(/\{bottles\}/g, String(vars.bottles))
      .replace(/\{balance\}/g, balanceSentence)
      .replace(/\{containers\}/g, containersSentence)
      .replace(/\s+/g, " ")
      .trim();
  }
}
