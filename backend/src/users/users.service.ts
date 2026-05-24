import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { AppException } from "../common/errors/app.exception";
import { MailService } from "../mail/mail.service";
import { SmsService } from "../sms/sms.service";
import { SmsTemplatesService } from "../sms/sms-templates.service";
import { PermissionsService } from "../permissions/permissions.service";
import * as argon2 from "argon2";

export interface InviteEmployeeDto {
  email: string;
  name: string;
  password: string;
  phone?: string;
}

export interface UpdateEmployeeDto {
  name?: string;
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
    private readonly sms: SmsService,
    private readonly templates: SmsTemplatesService,
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
   * The owner provides the initial password directly (v1 — in-person onboarding).
   */
  async inviteEmployee(shopId: string, dto: InviteEmployeeDto) {
    const email = dto.email.trim().toLowerCase();

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing && !existing.deletedAt) {
      throw AppException.conflict(
        "EMAIL_TAKEN" as never,
        "This email is already registered",
      );
    }

    const passwordHash = await this.hashPassword(dto.password);

    let user;
    if (existing && existing.deletedAt) {
      // Restore soft-deleted account
      user = await this.prisma.user.update({
        where: { id: existing.id },
        data: {
          deletedAt: null,
          email,
          passwordHash,
          name: dto.name,
          phone: dto.phone ?? null,
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
          email,
          passwordHash,
          name: dto.name,
          phone: dto.phone ?? null,
          role: "EMPLOYEE",
          shopId,
          isActive: true,
          emailVerified: false,
        },
        select: employeeSelect,
      });
    }

    // Send welcome/invite email (non-blocking)
    void this.mail.sendWelcome(email, { name: dto.name }).catch(() => {
      // swallow — email failure must not fail the request
    });

    // Send welcome SMS if phone is provided (non-blocking)
    if (dto.phone) {
      const shopName =
        (
          await this.prisma.shop.findUnique({
            where: { id: shopId },
            select: { name: true },
          })
        )?.name ?? "Lela Kasa";
      void this.sms
        .sendSms(dto.phone, this.templates.welcomeEmployee(shopName, dto.name))
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
}
