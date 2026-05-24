import {
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
  Logger,
} from "@nestjs/common";
import { PrismaClient } from "../database";

const SOFT_DELETE_MODELS = new Set([
  "User",
  "Restaurant",
  "MenuItem",
  "MenuSection",
  "Template",
  "RestaurantReview",
  "MenuItemReview",
]);

/**
 * Wraps PrismaClient as a NestJS service.
 *
 * Soft-delete convention: services must add `where: { deletedAt: null }` explicitly
 * for models that support soft-delete (SOFT_DELETE_MODELS). This is intentionally
 * explicit to avoid query-middleware issues with Prisma v6. Helper: `PrismaService.notDeleted()`.
 *
 * Use `includeDeleted: true` in a local `where` clause override for admin "view trash" queries.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log:
        process.env["LOG_LEVEL"] === "debug"
          ? [
              { emit: "stdout", level: "query" },
              { emit: "stdout", level: "error" },
            ]
          : [{ emit: "stdout", level: "error" }],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log("Prisma connected");
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log("Prisma disconnected");
  }

  /** Use in `where` clauses to filter out soft-deleted records: `where: { ...PrismaService.notDeleted() }` */
  static notDeleted(): { deletedAt: null } {
    return { deletedAt: null };
  }

  /** Health check — used by /health/db */
  async healthCheck(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
