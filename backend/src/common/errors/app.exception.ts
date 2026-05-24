import { HttpException, HttpStatus } from "@nestjs/common";
import { ErrorCode } from "../../contract";

export interface AppExceptionOptions {
  code: ErrorCode;
  message: string;
  status?: number;
  details?: Array<{ field: string; message: string }>;
}

export class AppException extends HttpException {
  readonly code: ErrorCode;
  readonly details?: Array<{ field: string; message: string }>;

  constructor({ code, message, status, details }: AppExceptionOptions) {
    super(message, status ?? AppException.defaultStatus(code));
    this.code = code;
    this.details = details;
  }

  static unauthorized(
    message = "Unauthorized",
    code: ErrorCode = ErrorCode.UNAUTHORIZED,
  ): AppException {
    return new AppException({ code, message, status: HttpStatus.UNAUTHORIZED });
  }

  static badRequest(
    message: string,
    code: ErrorCode = ErrorCode.BAD_REQUEST,
  ): AppException {
    return new AppException({ code, message, status: HttpStatus.BAD_REQUEST });
  }

  static notFound(resource: string, id?: string | number): AppException {
    const message = id
      ? `${resource} with id "${id}" not found`
      : `${resource} not found`;
    return new AppException({
      code: ErrorCode.NOT_FOUND,
      message,
      status: HttpStatus.NOT_FOUND,
    });
  }

  static forbidden(message = "Access denied"): AppException {
    return new AppException({
      code: ErrorCode.FORBIDDEN,
      message,
      status: HttpStatus.FORBIDDEN,
    });
  }

  static conflict(code: ErrorCode, message: string): AppException {
    return new AppException({ code, message, status: HttpStatus.CONFLICT });
  }

  private static defaultStatus(code: ErrorCode): number {
    const map: Partial<Record<ErrorCode, number>> = {
      [ErrorCode.NOT_FOUND]: HttpStatus.NOT_FOUND,
      [ErrorCode.RESTAURANT_NOT_FOUND]: HttpStatus.NOT_FOUND,
      [ErrorCode.MENU_ITEM_NOT_FOUND]: HttpStatus.NOT_FOUND,
      [ErrorCode.TEMPLATE_NOT_FOUND]: HttpStatus.NOT_FOUND,
      [ErrorCode.QR_CODE_NOT_FOUND]: HttpStatus.NOT_FOUND,
      [ErrorCode.ORDER_NOT_FOUND]: HttpStatus.NOT_FOUND,

      [ErrorCode.UNAUTHORIZED]: HttpStatus.UNAUTHORIZED,
      [ErrorCode.INVALID_CREDENTIALS]: HttpStatus.UNAUTHORIZED,
      [ErrorCode.TOKEN_EXPIRED]: HttpStatus.UNAUTHORIZED,
      [ErrorCode.TOKEN_INVALID]: HttpStatus.UNAUTHORIZED,
      [ErrorCode.SESSION_NOT_FOUND]: HttpStatus.UNAUTHORIZED,

      [ErrorCode.FORBIDDEN]: HttpStatus.FORBIDDEN,
      [ErrorCode.NOT_RESTAURANT_MEMBER]: HttpStatus.FORBIDDEN,
      [ErrorCode.FEATURE_DISABLED]: HttpStatus.FORBIDDEN,

      [ErrorCode.BAD_REQUEST]: HttpStatus.BAD_REQUEST,
      [ErrorCode.VALIDATION_ERROR]: HttpStatus.UNPROCESSABLE_ENTITY,

      [ErrorCode.CONFLICT]: HttpStatus.CONFLICT,
      [ErrorCode.EMAIL_TAKEN]: HttpStatus.CONFLICT,
      [ErrorCode.RESTAURANT_SLUG_TAKEN]: HttpStatus.CONFLICT,

      [ErrorCode.TOO_MANY_REQUESTS]: HttpStatus.TOO_MANY_REQUESTS,
      [ErrorCode.SERVICE_UNAVAILABLE]: HttpStatus.SERVICE_UNAVAILABLE,
    };
    return map[code] ?? HttpStatus.INTERNAL_SERVER_ERROR;
  }
}

// ── Factory helpers ────────────────────────────────────────────────────────────

export function notFound(resource: string, id?: string | number): AppException {
  return new AppException({
    code: ErrorCode.NOT_FOUND,
    message: id
      ? `${resource} with id "${id}" not found`
      : `${resource} not found`,
    status: 404,
  });
}

export function forbidden(message = "Access denied"): AppException {
  return new AppException({ code: ErrorCode.FORBIDDEN, message, status: 403 });
}

export function conflict(code: ErrorCode, message: string): AppException {
  return new AppException({ code, message, status: 409 });
}

export function featureDisabled(feature: string): AppException {
  return new AppException({
    code: ErrorCode.FEATURE_DISABLED,
    message: `Feature "${feature}" is not enabled`,
    status: 403,
  });
}
