import {
  type CanActivate,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../../prisma/prisma.service";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import type { Request } from "express";

/** Routes that must always be accessible */
const SUBSCRIPTION_WHITELIST = [
  "/api/v1/subscriptions/my",
  "/api/v1/subscriptions/plans",
  "/api/v1/subscriptions/providers",
  "/api/v1/billing",
  "/api/v1/customer-portal",
  "/api/v1/orders",
  "/api/v1/auth/config",
  "/api/v1/health",
];

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const url = request.url?.split("?")[0] ?? "";
    if (SUBSCRIPTION_WHITELIST.some((p) => url === p || url.startsWith(p)))
      return true;

    const user = (request as any).user;
    if (!user) return true;
    if (user.role === "SUPER_ADMIN" || user.role === "CUSTOMER") return true;
    if (!user.shopId) return true;

    const sub = await this.prisma.subscription.findUnique({
      where: { shopId: user.shopId },
    });

    if (!sub) return true;
    if (sub.status === "ACTIVE" || sub.status === "TRIAL") return true;

    throw new HttpException(
      "Your subscription is not active. Please renew to continue using Lela Kasa.",
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}
