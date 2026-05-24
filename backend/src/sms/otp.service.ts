import * as crypto from 'crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 3;

@Injectable()
export class OtpService {
  constructor(private readonly prisma: PrismaService) {}

  private hashCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\s/g, '');
  }

  async generate(phone: string, purpose: string): Promise<string> {
    const normalized = this.normalizePhone(phone);
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    // Invalidate any existing unused OTP for this phone+purpose
    await this.prisma.otpCode.updateMany({
      where: { phone: normalized, purpose, usedAt: null },
      data: { usedAt: new Date() },
    });

    await this.prisma.otpCode.create({
      data: { phone: normalized, purpose, codeHash: this.hashCode(code), expiresAt },
    });

    return code;
  }

  async verify(phone: string, code: string, purpose: string): Promise<void> {
    const normalized = this.normalizePhone(phone);
    const now = new Date();

    const record = await this.prisma.otpCode.findFirst({
      where: { phone: normalized, purpose, usedAt: null, expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw new BadRequestException('OTP expired or not requested. Please request a new one.');
    }

    if (record.attempts >= MAX_ATTEMPTS) {
      await this.prisma.otpCode.update({ where: { id: record.id }, data: { usedAt: now } });
      throw new BadRequestException('Too many incorrect attempts. Please request a new OTP.');
    }

    if (record.codeHash !== this.hashCode(code)) {
      await this.prisma.otpCode.update({
        where: { id: record.id },
        data: { attempts: record.attempts + 1 },
      });
      const remaining = MAX_ATTEMPTS - record.attempts - 1;
      throw new BadRequestException(`Incorrect OTP. ${remaining} attempt(s) remaining.`);
    }

    await this.prisma.otpCode.update({ where: { id: record.id }, data: { usedAt: now } });
  }
}
