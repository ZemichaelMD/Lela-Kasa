import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Response } from "express";
import { Prisma } from "../../database";
import { ErrorCode } from "../../contract";

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(
    exception: Prisma.PrismaClientKnownRequestError,
    host: ArgumentsHost,
  ): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR;
    let message = "Database error";

    switch (exception.code) {
      case "P2002": // Unique constraint violation
        status = HttpStatus.CONFLICT;
        code = ErrorCode.CONFLICT;
        message = `A record with this value already exists`;
        break;

      case "P2025": // Record not found
        status = HttpStatus.NOT_FOUND;
        code = ErrorCode.NOT_FOUND;
        message = `Record not found`;
        break;

      case "P2003": // FK constraint violation
        status = HttpStatus.UNPROCESSABLE_ENTITY;
        code = ErrorCode.UNPROCESSABLE_ENTITY;
        message = `Related record not found`;
        break;

      case "P2014": // Relation violation
        status = HttpStatus.CONFLICT;
        code = ErrorCode.CONFLICT;
        message = `This operation would violate a relationship constraint`;
        break;

      default:
        this.logger.error(
          `Unhandled Prisma error ${exception.code}: ${exception.message}`,
        );
        message = "A database error occurred";
    }

    response.status(status).json({
      success: false,
      error: {
        code,
        message,
      },
    });
  }
}
