import {
  Injectable,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { AppException } from "../common/errors/app.exception";
import { MailService } from "../mail/mail.service";
import { SmsService } from "../sms/sms.service";
import { SmsTemplatesService } from "../sms/sms-templates.service";
import { OtpService } from "../sms/otp.service";
import { VerificationService } from "../verification/verification.service";
import { PermissionsService } from "../permissions/permissions.service";
import {
  ethiopianPhoneVariants,
  normalizeEthiopianPhone,
} from "../common/phone.util";
import * as argon2 from "argon2";
import crypto from "node:crypto";

/**
 * Server-side password policy. Stops trivially weak passwords from
 * entering the system regardless of client-side validation.
 */
function assertStrongPassword(password: string): void {
  if (password.length < 8) {
    throw new BadRequestException("Password must be at least 8 characters");
  }
  if (password.length > 128) {
    throw new BadRequestException("Password must be at most 128 characters");
  }
  const classes = [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;
  if (classes < 3) {
    throw new BadRequestException(
      "Password must contain at least 3 of: lowercase, uppercase, numbers, symbols",
    );
  }
}

export interface InviteEmployeeDto {
  email?: string;
  name: string;
  password: string;
  phone?: string;
  username?: string;
}

export interface UpdateEmployeeDto {
  name?: string;
  email?: string;
  phone?: string | null;
  isActive?: boolean;
  username?: string;
  pin?: string;
}

const employeeSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  role: true,
  isActive: true,
  emailVerified: true,
  shopId: true,
  createdAt: true,
  updatedAt: true,
  username: true,
  pinHash: true,
} as const;

type EmployeeSelect = typeof employeeSelect;

function mapEmployee(user: any) {
  const { pinHash, ...rest } = user;
  return { ...rest, hasPin: !!pinHash };
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
    private readonly sms: SmsService,
    private readonly templates: SmsTemplatesService,
    private readonly otp: OtpService,
    private readonly verification: VerificationService,
    private readonly permissionsService: PermissionsService,
  ) {}

  private async hashPassword(password: string): Promise<string> {
    const pepper = this.config.get<string>("auth.passwordPepper") ?? "";
    return argon2.hash(password + pepper, { type: argon2.argon2id });
  }

  // ── Employee management ───────────────────────────────────────────────────

  /** Returns all non-owner active users belonging to this shop. */
  async listEmployees(shopId: string) {
    const users = await this.prisma.user.findMany({
      where: { shopId, role: "EMPLOYEE", deletedAt: null },
      orderBy: { createdAt: "asc" },
      select: employeeSelect,
    });
    return users.map(mapEmployee);
  }

  async getEmployee(shopId: string, userId: string) {
    const employee = await this.prisma.user.findFirst({
      where: { id: userId, shopId, deletedAt: null },
      select: employeeSelect,
    });
    if (!employee) throw AppException.notFound("Employee", userId);
    return mapEmployee(employee);
  }

  /**
   * Creates a User with role=EMPLOYEE in the given shop.
   * The owner provides the initial password. Phone and email are both required
   * for dual-channel OTP verification.
   */
  async inviteEmployee(shopId: string, dto: InviteEmployeeDto) {
    // Validate password policy
    assertStrongPassword(dto.password);

    // At least one of email or phone is required
    if (!dto.email?.trim() && !dto.phone?.trim()) {
      throw new BadRequestException('Either email or phone number is required');
    }

    const email = dto.email?.trim().toLowerCase();
    const phone = dto.phone?.trim();

    // Generate a placeholder email when only phone is provided
    const finalEmail = email || (phone ? `emp_${phone.replace(/[^0-9]/g, '')}@kasa.app` : null);

    // Check email uniqueness
    if (finalEmail) {
      const existing = await this.prisma.user.findUnique({ where: { email: finalEmail } });
      if (existing && !existing.deletedAt) {
        throw AppException.conflict("EMAIL_TAKEN" as never, "This email is already registered");
      }
    }

    // Check phone uniqueness
    if (phone) {
      const existingPhone = await this.prisma.user.findFirst({
        where: { phone: { in: ethiopianPhoneVariants(phone) }, deletedAt: null },
        select: { id: true },
      });
      if (existingPhone) {
        throw AppException.conflict("PHONE_TAKEN" as never, "This phone number is already in use");
      }
    }

    if (!finalEmail && !phone) {
      throw new BadRequestException("Either email or phone is required");
    }

    // finalEmail is guaranteed to be set here (either from input or generated)
    const safeEmail = finalEmail!;
    const passwordHash = await this.hashPassword(dto.password);

    let existingUser = await this.prisma.user.findUnique({ where: { email: safeEmail } }) || null;

    let user;
    if (existingUser && existingUser.deletedAt) {
      // Restore soft-deleted account
      user = await this.prisma.user.update({
        where: { id: existingUser.id },
        data: {
          deletedAt: null,
          email: safeEmail,
          passwordHash,
          name: dto.name,
          phone,
          role: "EMPLOYEE",
          shopId,
          isActive: true,
          emailVerified: false,
        },
        select: employeeSelect,
      });
    } else {
      user = await this.prisma.user.create({
        data: {
          email: safeEmail,
          passwordHash,
          name: dto.name,
          phone,
          role: "EMPLOYEE",
          shopId,
          isActive: true,
          emailVerified: false,
        },
        select: employeeSelect,
      });
    }

    // Send verification OTP to phone (if phone provided)
    if (phone) {
      void (async () => {
        try {
          const code = await this.otp.generate(phone, 'phone_verification');
          await this.sms.sendSms(phone, this.templates.otp(code));
        } catch (e) {
          this.logger.warn(`Failed to send employee phone OTP to ${phone}: ${String(e)}`);
        }
      })();
    }

    // Send verification OTP to email (if email provided)
    if (email) {
      void (async () => {
        try {
          const code = String(Math.floor(100000 + Math.random() * 900000));
          const codeHash = crypto.createHash('sha256').update(code).digest('hex');
          const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
          await this.prisma.emailVerificationToken.create({
            data: { userId: user.id, tokenHash: codeHash, expiresAt },
          });
          await this.mail.sendOtp(email, {
            name: dto.name,
            code,
            appName: this.config.get<string>("app.appName") ?? "Lela Kasa",
          });
        } catch (e) {
          this.logger.warn(`Failed to send employee email OTP to ${email}: ${String(e)}`);
        }
      })();
    }

    // Send welcome SMS
    if (phone) {
      const shopName =
        (await this.prisma.shop.findUnique({
          where: { id: shopId },
          select: { name: true },
        }))?.name ?? "Lela Kasa";
      void this.sms
        .sendSms(phone, this.templates.welcomeEmployee(shopName, dto.name))
        .catch(() => {});
    }

    // Sync permissions for the new employee
    void this.permissionsService.syncForEmployee(user.id, shopId).catch((e) => {
      // Non-blocking — permissions sync failure shouldn't fail employee creation
    });

    return mapEmployee(user);
  }

  /**
   * Updates an employee's name/phone/isActive/username/pin.
   * Only EMPLOYEE role users can be updated via this path (not other OWNERs).
   */
  async updateEmployee(shopId: string, userId: string, dto: UpdateEmployeeDto) {
    const employee = await this.prisma.user.findFirst({
      where: { id: userId, shopId, deletedAt: null },
    });

    if (!employee) throw AppException.notFound("Employee", userId);
    if (employee.role !== "EMPLOYEE") {
      throw AppException.forbidden(
        "Cannot edit owner accounts via this endpoint",
      );
    }

    const data: any = {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    };

    // Email update with uniqueness check
    if (dto.email !== undefined) {
      const newEmail = dto.email.trim().toLowerCase();
      const existing = await this.prisma.user.findUnique({ where: { email: newEmail } });
      if (existing && existing.id !== userId && !existing.deletedAt) {
        throw AppException.conflict(
          "EMAIL_TAKEN" as never,
          "This email is already registered to another account",
        );
      }
      data.email = newEmail;
    }

    // Phone update with uniqueness check
    if (dto.phone !== undefined && dto.phone?.trim()) {
      const normalized = normalizeEthiopianPhone(dto.phone);
      const existing = await this.prisma.user.findFirst({
        where: {
          phone: { in: ethiopianPhoneVariants(normalized) },
          deletedAt: null,
          id: { not: userId },
        },
        select: { id: true },
      });
      if (existing) {
        throw AppException.conflict(
          "PHONE_TAKEN" as never,
          "This phone number is already in use by another employee",
        );
      }
      data.phone = normalized;
    }

    if (dto.username !== undefined) {
      if (dto.username.trim()) {
        const existing = await this.prisma.user.findFirst({
          where: {
            username: dto.username.trim(),
            id: { not: userId },
            deletedAt: null,
          },
        });
        if (existing)
          throw AppException.conflict(
            "USERNAME_TAKEN" as never,
            "Username already taken",
          );
        data.username = dto.username.trim();
      } else {
        data.username = null;
      }
    }

    if (dto.pin !== undefined) {
      if (dto.pin && dto.pin.length >= 4) {
        data.pinHash = await argon2.hash(dto.pin);
      } else if (dto.pin === "") {
        data.pinHash = null;
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: employeeSelect,
    });

    // If reactivating, sync permissions to catch any new registry entries
    if (dto.isActive === true && !employee.isActive) {
      void this.permissionsService.syncForEmployee(userId, shopId).catch(() => {});
    }

    return mapEmployee(updated);
  }

  /**
   * Soft-deletes an employee (sets deletedAt).
   * Only EMPLOYEE role users can be removed; owners are protected.
   */
  async removeEmployee(shopId: string, userId: string): Promise<void> {
    const employee = await this.prisma.user.findFirst({
      where: { id: userId, shopId, deletedAt: null },
    });

    if (!employee) throw AppException.notFound("Employee", userId);
    if (employee.role !== "EMPLOYEE") {
      throw AppException.forbidden(
        "Cannot remove owner accounts via this endpoint",
      );
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Owner resets an employee's password. Validates the new password against
   * the password policy and revokes all existing sessions for security.
   */
  async resetEmployeePassword(shopId: string, userId: string, newPassword: string): Promise<void> {
    assertStrongPassword(newPassword);

    const employee = await this.prisma.user.findFirst({
      where: { id: userId, shopId, deletedAt: null },
    });

    if (!employee) throw AppException.notFound("Employee", userId);
    if (employee.role !== "EMPLOYEE") {
      throw AppException.forbidden("Cannot reset password for non-employee accounts");
    }

    const passwordHash = await this.hashPassword(newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      }),
      // Revoke all sessions for security
      this.prisma.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }
}
