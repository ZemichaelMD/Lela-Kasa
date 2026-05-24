export const SERVICE_ERROR_MESSAGES: Record<string, string> = {
  EMAIL_NOT_CONFIGURED:
    "Email notifications are not available. Please configure a mail provider first.",
  SMS_NOT_CONFIGURED:
    "SMS notifications are not available. Please configure an SMS provider first.",
  AI_NOT_CONFIGURED:
    "The AI assistant is not available. Please configure AI credentials first.",
  PAYMENT_NOT_CONFIGURED:
    "Online payment is not available. Please configure Chapa credentials first.",
  FILE_STORAGE_NOT_CONFIGURED:
    "File storage is not configured. Please set up storage credentials first.",
  WHATSAPP_NOT_CONFIGURED:
    "WhatsApp messaging is not available. Please configure a WhatsApp provider.",
  TELEGRAM_NOT_CONFIGURED:
    "Telegram messaging is not available. Please configure Telegram bot.",
};

export function getServiceErrorMessage(code: string): string {
  return SERVICE_ERROR_MESSAGES[code] ?? "This feature is temporarily unavailable. Check system settings.";
}
