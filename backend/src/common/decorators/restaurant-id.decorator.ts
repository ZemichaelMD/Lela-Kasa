import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/** Extracts the :restaurantId route param as a number. Used by RestaurantAccessGuard. */
export const RestaurantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): number => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return Number(request.params['restaurantId']);
  },
);

export const RESTAURANT_ID_PARAM = 'restaurantId';
