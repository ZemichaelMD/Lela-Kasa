export const SERVICE_ERROR_MESSAGES: Record<string, string> = {
  EMAIL_NOT_CONFIGURED:
    "Email notifications are not available. Please contact your administrator.",
  SMS_NOT_CONFIGURED:
    "SMS notifications are not available. Please contact your administrator.",
  AI_NOT_CONFIGURED:
    "The AI assistant is currently unavailable. Please contact your administrator.",
  PAYMENT_NOT_CONFIGURED:
    "Online payment is not available. Please contact your administrator to complete payment manually.",
  FILE_STORAGE_NOT_CONFIGURED:
    "File uploads are temporarily unavailable. Please try again later.",
  WHATSAPP_NOT_CONFIGURED:
    "WhatsApp messaging is not available at this time.",
  TELEGRAM_NOT_CONFIGURED:
    "Telegram messaging is not available at this time.",
};

export function getServiceErrorMessage(code: string): string {
  return SERVICE_ERROR_MESSAGES[code] ?? "This feature is temporarily unavailable.";
}
