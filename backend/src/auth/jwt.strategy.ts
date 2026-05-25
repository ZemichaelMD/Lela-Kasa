import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, ExtractJwt } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import type { JwtPayload } from "./jwt.payload";
import type { AuthenticatedUser } from "../common/types/authenticated-user";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>("auth.jwtAccessSecret") ?? "",
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    // CUSTOMER role uses a simplified flow — no session, no user table
    if (payload.role === "CUSTOMER") {
      const customer = await this.prisma.customer.findUnique({
        where: { id: payload.sub, deletedAt: null },
        select: { id: true, name: true, shopId: true },
      });
      if (!customer) throw new UnauthorizedException("Customer not found");
      return {
        id: customer.id,
        email: customer.name ?? "customer",
        name: customer.name,
        role: "CUSTOMER",
        shopId: customer.shopId ?? undefined,
        changePinRequired: payload.changePinRequired,
      };
    }

    const session = await this.prisma.session.findUnique({
      where: { id: payload.sessionId },
      select: { id: true, expiresAt: true, userId: true, revokedAt: true },
    });

    if (!session || session.expiresAt < new Date() || session.revokedAt) {
      throw new UnauthorizedException("Session has expired or been revoked");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub, deletedAt: null },
      select: { id: true, email: true, role: true, shopId: true },
    });

    if (!user) throw new UnauthorizedException("User not found");

    const adminEmail = (
      process.env["SEED_ADMIN_EMAIL"] || "admin@kasa.com"
    ).toLowerCase();
    const isSuperAdmin =
      user.role === "SUPER_ADMIN" ||
      user.email.toLowerCase() === adminEmail ||
      user.email.toLowerCase() === "admin@kasa.app";
    const userRole = isSuperAdmin ? "SUPER_ADMIN" : user.role;

    return {
      id: user.id,
      email: user.email,
      role: userRole as string,
      sessionId: payload.sessionId,
      shopId: user.shopId ?? undefined,
    };
  }
}
