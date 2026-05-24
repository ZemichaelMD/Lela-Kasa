import type { ErrorCode, ValidationFieldError } from "@/contract";

export class ApiError extends Error {
  constructor(
    public readonly code: ErrorCode | string,
    message: string,
    public readonly status: number,
    public readonly details?: ValidationFieldError[],
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  isNotFound(): boolean {
    return this.status === 404;
  }

  isUnauthorized(): boolean {
    return this.status === 401;
  }

  isForbidden(): boolean {
    return this.status === 403;
  }

  isValidationError(): boolean {
    return this.status === 422 || this.status === 400;
  }

  isServerError(): boolean {
    return this.status >= 500;
  }

  isRateLimit(): boolean {
    return this.status === 429;
  }
}
