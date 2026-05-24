import { HttpException, HttpStatus } from '@nestjs/common';

export class ServiceUnavailableException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(
      {
        success: false,
        error: { code, message },
      },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}
