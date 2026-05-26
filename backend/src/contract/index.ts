/**
 * Shared contract types used across the backend.
 * ErrorCodes are string constants sent in API error responses.
 */

// ── Error codes ───────────────────────────────────────────────────────────────

export enum ErrorCode {
  // Auth
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_INVALID = 'TOKEN_INVALID',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',

  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',

  // Resource
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  EMAIL_TAKEN = 'EMAIL_TAKEN',
  PHONE_TAKEN = 'PHONE_TAKEN',
  FORBIDDEN = 'FORBIDDEN',

  // Server errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  UNPROCESSABLE_ENTITY = 'UNPROCESSABLE_ENTITY',

  // Verification
  VERIFICATION_REQUIRED = 'VERIFICATION_REQUIRED',

  // Rate limiting / availability
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',

  // Legacy codes kept for compat with existing filters/services
  RESTAURANT_NOT_FOUND = 'RESTAURANT_NOT_FOUND',
  MENU_ITEM_NOT_FOUND = 'MENU_ITEM_NOT_FOUND',
  TEMPLATE_NOT_FOUND = 'TEMPLATE_NOT_FOUND',
  QR_CODE_NOT_FOUND = 'QR_CODE_NOT_FOUND',
  ORDER_NOT_FOUND = 'ORDER_NOT_FOUND',
  NOT_RESTAURANT_MEMBER = 'NOT_RESTAURANT_MEMBER',
  FEATURE_DISABLED = 'FEATURE_DISABLED',
  RESTAURANT_SLUG_TAKEN = 'RESTAURANT_SLUG_TAKEN',
}

// ── Role enum ─────────────────────────────────────────────────────────────────

export enum UserRole {
  OWNER = 'OWNER',
  EMPLOYEE = 'EMPLOYEE',
}
