import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export interface PaginationParams {
  page: number;
  limit: number;
}

/** Extract and clamp pagination query params. */
export const Paginate = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): PaginationParams => {
    const query = ctx.switchToHttp().getRequest<Request>().query;
    const page = Math.max(1, parseInt(String(query['page'] ?? '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(query['limit'] ?? '20'), 10) || 20));
    return { page, limit };
  },
);
