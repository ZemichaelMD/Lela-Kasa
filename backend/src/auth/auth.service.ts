import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { OtpService } from "../sms/otp.service";
import { SmsService } from "../sms/sms.service";
import { SmsTemplatesService } from "../sms/sms-templates.service";
import { VerificationService } from "../verification/verification.service";
import type { JwtPayload } from "./jwt.payload";
import { AppException } from "../common/errors/app.exception";
import {
  ethiopianPhoneVariants,
  normalizeEthiopianPhone,
} from "../common/phone.util";
import { ErrorCode } from "../contract";
import {
  assertStrongPassword,
  loadPasswordPolicy,
} from "../common/password-policy";
import * as argon2 from "argon2";
import crypto from "node:crypto";

// ── DTOs ──────────────────────────────────────────────────────────────────────

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
  shopName: string;
  phone: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    shopId: string | null;
    emailVerified: boolean;
  };
  shop: {
    id: string;
    name: string;
  } | null;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
    private readonly otp: OtpService,
    private readonly sms: SmsService,
    private readonly smsTemplates: SmsTemplatesService,
    private readonly verification: VerificationService,
  ) {}

  // ── Password hashing ──────────────────────────────────────────────────────

  private async hashPassword(password: string): Promise<string> {
    const pepper = this.config.get<string>("auth.passwordPepper") ?? "";
    return argon2.hash(password + pepper, { type: argon2.argon2id });
  }

  private async verifyPassword(
    hash: string,
    password: string,
  ): Promise<boolean> {
    const pepper = this.config.get<string>("auth.passwordPepper") ?? "";
    return argon2.verify(hash, password + pepper);
  }

  // ── Token helpers ─────────────────────────────────────────────────────────

  private generateRefreshToken(): string {
    return crypto.randomBytes(48).toString("hex");
  }

  private hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  private signAccessToken(payload: JwtPayload): string {
    const ttl = this.config.get<string>("auth.jwtAccessTtl") ?? "15m";
    return this.jwt.sign(payload, {
      secret: this.config.get<string>("auth.jwtAccessSecret"),
      expiresIn: ttl as never,
    });
  }

  // ── Register ──────────────────────────────────────────────────────────────

  /**
   * Creates User (OWNER) + Shop + default PriceTier in one transaction,
   * then links User.shopId and Shop.defaultPriceTierId.
   * Both email and phone are required for dual-channel OTP verification.
   */
  async register(
    dto: RegisterDto,
  ): Promise<LoginResult & { verificationRequired: boolean }> {
    const pwSettings = await this.prisma.systemSetting.findMany();
    assertStrongPassword(dto.password, loadPasswordPolicy(pwSettings));

    if (!dto.phone?.trim()) {
      throw new BadRequestException("Phone number is required");
    }

    if (!dto.email?.trim()) {
      throw new BadRequestException("Email is required for registration");
    }

    // Canonical 2519XXXXXXXX — throws a 400 with a clear message on a bad number.
    const phone = normalizeEthiopianPhone(dto.phone);

    const regSetting = await this.prisma.systemSetting.findUnique({
      where: { key: "registration_open" },
    });
    if (regSetting?.value === "false") {
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        message:
          "Registration is currently closed. Please contact the administrator.",
      });
    }

    const email = dto.email.trim().toLowerCase();

    const existingEmail = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingEmail)
      throw new ConflictException({
        code: ErrorCode.EMAIL_TAKEN,
        message: "Email is already registered",
      });

    // Reject a phone that is already tied to another account. Match against
    // every stored format so historically inconsistent rows are still caught.
    const existingPhone = await this.prisma.user.findFirst({
      where: { phone: { in: ethiopianPhoneVariants(phone) }, deletedAt: null },
      select: { id: true },
    });
    if (existingPhone) {
      throw new ConflictException({
        code: ErrorCode.PHONE_TAKEN,
        message:
          "This phone number is already registered. Try logging in instead.",
      });
    }

    const passwordHash = await this.hashPassword(dto.password);

    const { user, shop } = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          name: dto.name,
          phone,
          passwordHash,
          role: "OWNER",
          emailVerified: false,
        },
      });

      const shop = await tx.shop.create({
        data: { name: dto.shopName, ownerId: user.id },
      });

      await tx.user.update({
        where: { id: user.id },
        data: { shopId: shop.id },
      });

      // Create default PriceTier "Retail"
      const tier = await tx.priceTier.create({
        data: {
          shopId: shop.id,
          name: "Retail",
          kind: "RETAIL",
          isDefault: true,
        },
      });

      // 5. Link Shop.defaultPriceTierId = tier.id
      const updatedShop = await tx.shop.update({
        where: { id: shop.id },
        data: { defaultPriceTierId: tier.id },
        select: { id: true, name: true },
      });

      return {
        user: { ...user, shopId: shop.id },
        shop: updatedShop,
      };
    });

    // Send a verification OTP to the phone via SMS.
    try {
      const code = await this.otp.generate(phone, "phone_verification");
      await this.sms.sendSms(phone, this.smsTemplates.otp(code));
    } catch (e) {
      this.logger.warn(
        `Failed to send registration OTP to ${phone}: ${String(e)}`,
      );
    }

    // Send email OTP for verification
    try {
      await this.sendEmailOtp(user.id, email, user.name ?? null);
    } catch (e) {
      this.logger.warn(
        `Failed to send verification email to ${email}: ${String(e)}`,
      );
    }

    // Issue tokens
    const { accessToken, refreshToken } = await this.createSession(
      user.id,
      "OWNER",
      shop.id,
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name ?? null,
        role: "OWNER",
        shopId: shop.id,
        emailVerified: false,
      },
      shop,
      verificationRequired: true,
    };
  }

  // ── Login ─────────────────────────────────────────────────────────────────

  async login(dto: LoginDto): Promise<LoginResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase(), deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        passwordHash: true,
        shopId: true,
        emailVerified: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException({
        code: ErrorCode.INVALID_CREDENTIALS,
        message: "Invalid email or password",
      });
    }

    if (!user.isActive) {
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        message: "Account is inactive",
      });
    }

    const valid = await this.verifyPassword(user.passwordHash, dto.password);
    if (!valid) {
      throw new UnauthorizedException({
        code: ErrorCode.INVALID_CREDENTIALS,
        message: "Invalid email or password",
      });
    }

    const adminEmail = (
      process.env["SEED_ADMIN_EMAIL"] || "admin@kasa.com"
    ).toLowerCase();
    const isSuperAdmin =
      user.role === "SUPER_ADMIN" ||
      user.email.toLowerCase() === adminEmail ||
      user.email.toLowerCase() === "admin@kasa.app";
    const userRole = isSuperAdmin ? "SUPER_ADMIN" : user.role;

    const { accessToken, refreshToken } = await this.createSession(
      user.id,
      userRole,
      user.shopId ?? undefined,
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    let shop: { id: string; name: string } | null = null;
    if (user.shopId) {
      shop = await this.prisma.shop.findUnique({
        where: { id: user.shopId },
        select: { id: true, name: true },
      });
    }

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name ?? null,
        role: userRole,
        shopId: user.shopId ?? null,
        emailVerified: user.emailVerified,
      },
      shop,
    };
  }

  // ── Session management ────────────────────────────────────────────────────

  private async createSession(
    userId: string,
    role: string,
    shopId?: string,
  ): Promise<{ accessToken: string; refreshToken: string; sessionId: string }> {
    const refreshToken = this.generateRefreshToken();
    const tokenHash = this.hashToken(refreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const session = await this.prisma.session.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    const payload: JwtPayload = {
      sub: userId,
      role,
      sessionId: session.id,
      shopId,
      ver: 1,
    };
    const accessToken = this.signAccessToken(payload);

    return { accessToken, refreshToken, sessionId: session.id };
  }

  // ── Refresh token ─────────────────────────────────────────────────────────

  /**
   * Validates the session, rotates tokens (revokes old, creates new).
   * If a revoked token is presented → revoke ALL sessions (replay detection).
   */
  async refreshToken(
    rawRefreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const hash = this.hashToken(rawRefreshToken);

    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hash },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            shopId: true,
            deletedAt: true,
          },
        },
      },
    });

    // If the session doesn't exist at all, just reject
    if (!session) {
      throw AppException.unauthorized(
        "Invalid or expired refresh token",
        ErrorCode.TOKEN_INVALID,
      );
    }

    // Replay detection: token was already revoked → nuke all sessions for this user
    if (session.revokedAt) {
      this.logger.warn(
        `Refresh token replay detected for userId=${session.userId} — revoking all sessions`,
      );
      await this.prisma.session.updateMany({
        where: { userId: session.userId },
        data: { revokedAt: new Date() },
      });
      throw AppException.unauthorized(
        "Refresh token already used — all sessions revoked",
        ErrorCode.TOKEN_INVALID,
      );
    }

    if (session.expiresAt < new Date() || session.user.deletedAt) {
      throw AppException.unauthorized(
        "Invalid or expired refresh token",
        ErrorCode.TOKEN_INVALID,
      );
    }

    // Rotate: revoke old session, create new one in a single tx
    const newRefreshToken = this.generateRefreshToken();
    const newHash = this.hashToken(newRefreshToken);
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 30);

    const [, newSession] = await this.prisma.$transaction([
      // Revoke old session
      this.prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      }),
      // Create new session
      this.prisma.session.create({
        data: {
          userId: session.user.id,
          tokenHash: newHash,
          expiresAt: newExpiresAt,
        },
      }),
    ]);

    const adminEmail = (
      process.env["SEED_ADMIN_EMAIL"] || "admin@kasa.com"
    ).toLowerCase();
    const isSuperAdmin =
      session.user.role === "SUPER_ADMIN" ||
      session.user.email.toLowerCase() === adminEmail ||
      session.user.email.toLowerCase() === "admin@kasa.app";
    const userRole = isSuperAdmin ? "SUPER_ADMIN" : session.user.role;

    const payload: JwtPayload = {
      sub: session.user.id,
      role: userRole,
      sessionId: newSession.id,
      shopId: session.user.shopId ?? undefined,
      ver: 1,
    };

    return {
      accessToken: this.signAccessToken(payload),
      refreshToken: newRefreshToken,
    };
  }

  // ── Logout ────────────────────────────────────────────────────────────────

  async logout(sessionId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  }

  // ── Me ────────────────────────────────────────────────────────────────────

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        shopId: true,
        emailVerified: true,
        createdAt: true,
        shop: {
          select: {
            id: true,
            name: true,
            phone: true,
            address: true,
            currency: true,
            timezone: true,
            lowStockThreshold: true,
          },
        },
      },
    });

    const adminEmail = (
      process.env["SEED_ADMIN_EMAIL"] || "admin@kasa.com"
    ).toLowerCase();
    const isSuperAdmin =
      user.role === "SUPER_ADMIN" ||
      user.email.toLowerCase() === adminEmail ||
      user.email.toLowerCase() === "admin@kasa.app";
    const userRole = isSuperAdmin ? "SUPER_ADMIN" : user.role;

    const verifications = await this.verification.getStatus(userId);

    return {
      ...user,
      role: userRole,
      verifications,
    };
  }

  async customerMe(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId, deletedAt: null },
      select: {
        id: true,
        name: true,
        phone: true,
        shopId: true,
        creditBalanceCents: true,
        outstandingBoxes: true,
        outstandingBottles: true,
        shop: { select: { id: true, name: true } },
      },
    });
    if (!customer) throw new NotFoundException("Customer not found");
    return {
      id: customer.id,
      email: customer.name ?? "customer",
      name: customer.name,
      role: "CUSTOMER",
      shopId: customer.shopId,
      shop: customer.shop,
      creditBalanceCents: customer.creditBalanceCents,
      outstandingBoxes: customer.outstandingBoxes,
      outstandingBottles: customer.outstandingBottles,
    };
  }

  // ── Forgot / Reset password ───────────────────────────────────────────────

  /**
   * Creates a PasswordResetToken and returns the raw token so the caller
   * can send the reset email.
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase(), deletedAt: null },
      select: { id: true, name: true },
    });

    if (!user) return; // silent — no email enumeration

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Delete any existing unused tokens first
    await this.prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });
    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const clientUrl =
      this.config.get<string>("app.clientUrl") ?? "http://localhost:3000";
    await this.mail.sendPasswordReset(email, { token: rawToken, clientUrl });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const pwSettings = await this.prisma.systemSetting.findMany();
    assertStrongPassword(newPassword, loadPasswordPolicy(pwSettings));

    const tokenHash = this.hashToken(token);
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!record || record.expiresAt < new Date() || record.usedAt) {
      throw AppException.badRequest(
        "Invalid or expired reset token",
        ErrorCode.TOKEN_EXPIRED,
      );
    }

    const passwordHash = await this.hashPassword(newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      // Revoke all sessions for security
      this.prisma.session.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  // ── Email verification (OTP-based) ────────────────────────────────────────

  async sendEmailOtp(
    userId: string,
    email: string,
    name: string | null,
  ): Promise<void> {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = this.hashToken(code);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await this.prisma.emailVerificationToken.deleteMany({ where: { userId } });
    await this.prisma.emailVerificationToken.create({
      data: { userId, tokenHash: codeHash, expiresAt },
    });

    await this.mail.sendOtp(email, {
      name: name ?? email,
      code,
      appName: this.config.get<string>("app.appName") ?? "LeLa Kasa",
    });
  }

  async verifyEmailOtp(userId: string, code: string): Promise<void> {
    const codeHash = this.hashToken(code);
    const record = await this.prisma.emailVerificationToken.findFirst({
      where: {
        userId,
        tokenHash: codeHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      throw new BadRequestException(
        "Invalid or expired email verification code",
      );
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { emailVerified: true },
      }),
      this.prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (user?.email) {
      await this.verification.record(userId, "EMAIL", user.email);
    }
  }

  /** Legacy token-based email verification (kept for backward compat with old links). */
  async verifyEmail(token: string): Promise<void> {
    const tokenHash = this.hashToken(token);
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
    });

    if (!record || record.expiresAt < new Date() || record.usedAt) {
      throw AppException.badRequest(
        "Invalid or expired token",
        ErrorCode.TOKEN_INVALID,
      );
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerified: true },
      }),
      this.prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    const verifiedUser = await this.prisma.user.findUnique({
      where: { id: record.userId },
      select: { email: true },
    });
    if (verifiedUser?.email) {
      await this.verification.record(
        record.userId,
        "EMAIL",
        verifiedUser.email,
      );
    }
  }

  // ── OTP / SMS auth ────────────────────────────────────────────────────────

  async requestOtp(phone: string, purpose: string): Promise<void> {
    // Reject malformed numbers up front; work with the canonical form so the
    // stored OTP key matches what verification later looks up.
    const normalized = normalizeEthiopianPhone(phone);

    // For login, don't send a code (or burn SMS quota) to an unknown number.
    if (purpose === "login") {
      const user = await this.prisma.user.findFirst({
        where: {
          phone: { in: ethiopianPhoneVariants(normalized) },
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!user) {
        throw new BadRequestException(
          "No account is registered with this phone number.",
        );
      }
    }

    const code = await this.otp.generate(normalized, purpose);
    const text = this.smsTemplates.otp(code);
    await this.sms.sendSms(normalized, text);
  }

  async loginWithOtp(phone: string, code: string): Promise<LoginResult> {
    const normalized = normalizeEthiopianPhone(phone);
    await this.otp.verify(normalized, code, "login");

    const user = await this.prisma.user.findFirst({
      where: {
        phone: { in: ethiopianPhoneVariants(normalized) },
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        shopId: true,
        emailVerified: true,
        isActive: true,
      },
    });

    if (!user)
      throw new UnauthorizedException({
        code: ErrorCode.INVALID_CREDENTIALS,
        message: "No account found with this phone number",
      });
    if (!user.isActive)
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        message: "Account is inactive",
      });

    const { accessToken, refreshToken } = await this.createSession(
      user.id,
      user.role,
      user.shopId ?? undefined,
    );
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    let shop: { id: string; name: string } | null = null;
    if (user.shopId) {
      shop = await this.prisma.shop.findUnique({
        where: { id: user.shopId },
        select: { id: true, name: true },
      });
    }

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name ?? null,
        role: user.role,
        shopId: user.shopId ?? null,
        emailVerified: user.emailVerified,
      },
      shop,
    };
  }

  async loginWithPhone(phone: string, password: string): Promise<LoginResult> {
    const user = await this.prisma.user.findFirst({
      where: { phone: { in: ethiopianPhoneVariants(phone) }, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        shopId: true,
        emailVerified: true,
        isActive: true,
        passwordHash: true,
      },
    });

    if (!user)
      throw new UnauthorizedException({
        code: ErrorCode.INVALID_CREDENTIALS,
        message: "Invalid phone or password",
      });
    if (!user.isActive)
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        message: "Account is inactive",
      });

    const valid = await this.verifyPassword(user.passwordHash, password);
    if (!valid)
      throw new UnauthorizedException({
        code: ErrorCode.INVALID_CREDENTIALS,
        message: "Invalid phone or password",
      });

    const { accessToken, refreshToken } = await this.createSession(
      user.id,
      user.role,
      user.shopId ?? undefined,
    );
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    let shop: { id: string; name: string } | null = null;
    if (user.shopId) {
      shop = await this.prisma.shop.findUnique({
        where: { id: user.shopId },
        select: { id: true, name: true },
      });
    }

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name ?? null,
        role: user.role,
        shopId: user.shopId ?? null,
        emailVerified: user.emailVerified,
      },
      shop,
    };
  }

  // ── validate local user (used by LocalStrategy) ───────────────────────────

  async validateLocalUser(
    email: string,
    password: string,
  ): Promise<{
    id: string;
    email: string;
    role: string;
    shopId: string | null;
  } | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase(), deletedAt: null },
      select: {
        id: true,
        email: true,
        role: true,
        passwordHash: true,
        shopId: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) return null;

    const valid = await this.verifyPassword(user.passwordHash, password);
    if (!valid) return null;

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      shopId: user.shopId,
    };
  }
  async getVerificationStatus(userId: string) {
    return this.verification.getStatus(userId);
  }

  async verifyPhone(
    phone: string,
    code: string,
  ): Promise<{ success: boolean }> {
    const user = await this.prisma.user.findFirst({
      where: { phone: { in: ethiopianPhoneVariants(phone) }, deletedAt: null },
      select: { id: true, phone: true },
    });
    if (!user)
      throw new UnauthorizedException("User with this phone not found");
    await this.otp.verify(user.phone ?? phone, code, "phone_verification");
    // Register the PHONE channel as verified for this user.
    await this.verification.record(user.id, "PHONE", user.phone ?? phone);
    return { success: true };
  }

  /**
   * Step 1 of changing a verified phone: sends an OTP to the *new* number.
   * The number is validated and checked for uniqueness before any SMS goes out.
   */
  async requestPhoneChange(userId: string, newPhone: string): Promise<void> {
    const normalized = normalizeEthiopianPhone(newPhone);

    const taken = await this.prisma.user.findFirst({
      where: {
        phone: { in: ethiopianPhoneVariants(normalized) },
        deletedAt: null,
        id: { not: userId },
      },
      select: { id: true },
    });
    if (taken) {
      throw new ConflictException({
        code: ErrorCode.PHONE_TAKEN,
        message: "This phone number is already in use by another account.",
      });
    }

    const code = await this.otp.generate(normalized, "phone_change");
    await this.sms.sendSms(normalized, this.smsTemplates.otp(code));
  }

  /**
   * Step 2 of changing a verified phone: validates the OTP sent to the new
   * number, then atomically updates the phone and records the new verification.
   */
  async confirmPhoneChange(
    userId: string,
    newPhone: string,
    code: string,
  ): Promise<{ success: boolean; phone: string }> {
    const normalized = normalizeEthiopianPhone(newPhone);
    await this.otp.verify(normalized, code, "phone_change");

    const taken = await this.prisma.user.findFirst({
      where: {
        phone: { in: ethiopianPhoneVariants(normalized) },
        deletedAt: null,
        id: { not: userId },
      },
      select: { id: true },
    });
    if (taken) {
      throw new ConflictException({
        code: ErrorCode.PHONE_TAKEN,
        message: "This phone number is already in use by another account.",
      });
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { phone: normalized },
    });
    await this.verification.record(userId, "PHONE", normalized);
    return { success: true, phone: normalized };
  }

  /**
   * Step 1 of changing email: sends an OTP to the *new* email.
   */
  async requestEmailChange(userId: string, newEmail: string): Promise<void> {
    const email = newEmail.trim().toLowerCase();

    const taken = await this.prisma.user.findUnique({ where: { email } });
    if (taken && taken.id !== userId && !taken.deletedAt) {
      throw new ConflictException({
        code: ErrorCode.EMAIL_TAKEN,
        message: "This email is already in use by another account.",
      });
    }

    const code = await this.otp.generate(email, "email_change");
    await this.mail.sendOtp(email, {
      name: email,
      code,
      appName: this.config.get<string>("app.appName") ?? "LeLa Kasa",
    });
  }

  /**
   * Step 2 of changing email: validates the OTP, updates the email, records verification.
   */
  async confirmEmailChange(
    userId: string,
    newEmail: string,
    code: string,
  ): Promise<{ success: boolean; email: string }> {
    const email = newEmail.trim().toLowerCase();
    await this.otp.verify(email, code, "email_change");

    const taken = await this.prisma.user.findUnique({ where: { email } });
    if (taken && taken.id !== userId && !taken.deletedAt) {
      throw new ConflictException({
        code: ErrorCode.EMAIL_TAKEN,
        message: "This email is already in use by another account.",
      });
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { email, emailVerified: false },
    });
    await this.verification.revoke(userId, "EMAIL");
    return { success: true, email };
  }

  async customerLogin(
    username: string,
    pin: string,
  ): Promise<{ accessToken: string; customer: any }> {
    const customer = await this.prisma.customer.findUnique({
      where: { username: username.trim() },
      select: {
        id: true,
        name: true,
        phone: true,
        pinHash: true,
        shopId: true,
        creditBalanceCents: true,
        outstandingBoxes: true,
        outstandingBottles: true,
        mustChangePassword: true,
        passwordChangedAt: true,
        shop: { select: { name: true } },
      },
    });
    if (!customer || !customer.pinHash) {
      throw new UnauthorizedException("Invalid username or PIN");
    }

    const valid = await argon2.verify(customer.pinHash, pin);
    if (!valid) throw new UnauthorizedException("Invalid username or PIN");

    const payload = {
      sub: customer.id,
      role: "CUSTOMER",
      shopId: customer.shopId,
      ver: 1,
      changePinRequired: customer.mustChangePassword,
    };
    const accessToken = this.jwt.sign(payload, { expiresIn: "7d" });

    return {
      accessToken,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        shopId: customer.shopId,
        shopName: customer.shop?.name,
        creditBalanceCents: customer.creditBalanceCents,
        outstandingBoxes: customer.outstandingBoxes,
        outstandingBottles: customer.outstandingBottles,
        mustChangePassword: customer.mustChangePassword,
        passwordChangedAt: customer.passwordChangedAt,
      },
    };
  }
}
