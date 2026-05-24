import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../common/errors/app.exception';
import { ErrorCode } from '../contract';
import type { CreatePaymentAccountDto } from './dto/create-payment-account.dto';
import type { UpdatePaymentAccountDto } from './dto/update-payment-account.dto';

@Injectable()
export class PaymentAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(shopId: string) {
    return this.prisma.paymentAccount.findMany({
      where: { shopId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(shopId: string, id: string) {
    const account = await this.prisma.paymentAccount.findFirst({
      where: { id, shopId, deletedAt: null },
    });
    if (!account) throw AppException.notFound('PaymentAccount', id);
    return account;
  }

  async create(shopId: string, dto: CreatePaymentAccountDto, actorUserId: string) {
    const account = await this.prisma.paymentAccount.create({
      data: {
        shopId,
        name: dto.name,
        kind: dto.kind,
        holderName: dto.holderName ?? null,
        bankName: dto.bankName ?? null,
        accountNumber: dto.accountNumber ?? null,
        notes: dto.notes ?? null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        shopId,
        actorUserId,
        action: 'payment_account.create',
        entityType: 'PaymentAccount',
        entityId: account.id,
        afterJson: JSON.stringify(account),
      },
    });

    return account;
  }

  async update(
    shopId: string,
    id: string,
    dto: UpdatePaymentAccountDto,
    actorUserId: string,
  ) {
    await this.findOne(shopId, id);

    const account = await this.prisma.paymentAccount.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.holderName !== undefined ? { holderName: dto.holderName } : {}),
        ...(dto.bankName !== undefined ? { bankName: dto.bankName } : {}),
        ...(dto.accountNumber !== undefined ? { accountNumber: dto.accountNumber } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        shopId,
        actorUserId,
        action: 'payment_account.update',
        entityType: 'PaymentAccount',
        entityId: account.id,
        afterJson: JSON.stringify(account),
      },
    });

    return account;
  }

  async remove(shopId: string, id: string, actorUserId: string) {
    await this.findOne(shopId, id);

    const paymentCount = await this.prisma.payment.count({
      where: { paymentAccountId: id },
    });

    if (paymentCount > 0) {
      throw AppException.conflict(
        ErrorCode.CONFLICT,
        'Cannot delete payment account that has payments',
      );
    }

    const deleted = await this.prisma.paymentAccount.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        shopId,
        actorUserId,
        action: 'payment_account.delete',
        entityType: 'PaymentAccount',
        entityId: id,
        afterJson: JSON.stringify(deleted),
      },
    });

    return { success: true };
  }
}
