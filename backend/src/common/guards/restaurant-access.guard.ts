import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import type { Request } from "express";
import { UserRole } from "../../contract";

import { PrismaService } from "../../prisma/prisma.service";
import type { AuthenticatedUser } from "../types/authenticated-user";

/**
 * Guards routes that are scoped to a shop.
 * OWNER always passes; EMPLOYEE must belong to the shop.
 * This replaces the old restaurant-based access guard.
 */
@Injectable()
export class RestaurantAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) throw new ForbiddenException("Authentication required");

    // Owners always have access (they own the shop)
    if (user.role === UserRole.OWNER) return true;

    // For employees, ensure they are assigned to a shop
    if (!user.shopId) {
      throw new ForbiddenException("You are not assigned to any shop");
    }

    // Verify the employee is still active in the shop
    const employee = await this.prisma.user.findFirst({
      where: { id: user.id, shopId: user.shopId, isActive: true },
    });

    if (!employee) {
      throw new ForbiddenException("You do not have access to this shop");
    }

    return true;
  }
}
