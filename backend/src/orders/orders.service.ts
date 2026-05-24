import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SalesService } from '../sales/sales.service';
import { MailService } from '../mail/mail.service';
import { SmsService } from '../sms/sms.service';
import { TelegramService } from '../telegram/telegram.service';
import { AppException } from '../common/errors/app.exception';
import { ErrorCode } from '../contract';
import type { CreateOrderDto } from './dto/create-order.dto';
import type { CustomerOrder, CustomerOrderLine } from '@/database';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sales: SalesService,
    private readonly mail: MailService,
    private readonly sms: SmsService,
    private readonly telegram: TelegramService,
  ) {}

  async create(shopId: string, dto: CreateOrderDto) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, shopId, deletedAt: null },
    });
    if (!customer) throw AppException.notFound('Customer', dto.customerId);

    const tierId = customer.priceTierId
      ? (await this.prisma.priceTier.findUnique({
          where: { id: customer.priceTierId },
        }))?.id ?? null
      : null;

    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { defaultPriceTierId: true, name: true },
    });
    if (!shop) throw AppException.notFound('Shop', shopId);

    const resolvedTierId = tierId ?? shop.defaultPriceTierId;

    const lineData: Array<{
      beverageId: string;
      boxes: number;
      bottles: number;
      pricePerBoxCents: number;
      pricePerBottleCents: number;
      lineTotalCents: number;
    }> = [];
    let subtotalCents = 0;

    for (const line of dto.lines) {
      if (line.boxes === 0 && line.bottles === 0) continue;

      const beverage = await this.prisma.beverage.findFirst({
        where: { id: line.beverageId, shopId, deletedAt: null, isActive: true },
      });
      if (!beverage) continue;

      let pricePerBoxCents = 0;
      let pricePerBottleCents = 0;

      if (resolvedTierId) {
        const price = await this.prisma.beveragePrice.findFirst({
          where: {
            beverageId: beverage.id,
            priceTierId: resolvedTierId,
            effectiveFrom: { lte: new Date() },
          },
          orderBy: { effectiveFrom: 'desc' },
        });
        if (price) {
          pricePerBoxCents = price.pricePerBoxCents;
          pricePerBottleCents = price.pricePerBottleCents;
        }
      }

      const lineTotal =
        line.boxes * pricePerBoxCents + line.bottles * pricePerBottleCents;
      subtotalCents += lineTotal;

      lineData.push({
        beverageId: beverage.id,
        boxes: line.boxes,
        bottles: line.bottles,
        pricePerBoxCents,
        pricePerBottleCents,
        lineTotalCents: lineTotal,
      });
    }

    if (lineData.length === 0) {
      throw AppException.badRequest(
        'Order must have at least one item with quantity > 0',
      );
    }

    const order = await this.prisma.customerOrder.create({
      data: {
        shopId,
        customerId: customer.id,
        subtotalCents,
        notes: dto.notes ?? null,
        status: 'PENDING',
        lines: { create: lineData },
      },
      include: { lines: { include: { beverage: true } }, customer: true },
    });

    void this.notifyOwner(order, shop.name);

    return order;
  }

  async confirm(orderId: string, shopId: string, userId: string) {
    const order = await this.prisma.customerOrder.findFirst({
      where: { id: orderId, shopId },
      include: { lines: true },
    });
    if (!order) throw AppException.notFound('CustomerOrder', orderId);
    if (order.status !== 'PENDING') {
      throw AppException.conflict(
        ErrorCode.CONFLICT,
        `Cannot confirm order with status ${order.status}`,
      );
    }

    const saleLines = order.lines.map((l) => ({
      beverageId: l.beverageId,
      boxes: l.boxes,
      bottles: l.bottles,
    }));

    const sale = await this.sales.createSale(shopId, userId, {
      customerId: order.customerId,
      saleDate: new Date().toISOString().slice(0, 10),
      lines: saleLines,
      payments: [],
      notes: order.notes
        ? `Order #${order.id.slice(0, 8)}: ${order.notes}`
        : `Order #${order.id.slice(0, 8)}`,
      boxesReturnedOnSale: 0,
      bottlesReturnedOnSale: 0,
    });

    await this.prisma.customerOrder.update({
      where: { id: order.id },
      data: {
        status: 'CONFIRMED',
        saleId: sale.id,
        confirmedAt: new Date(),
        confirmedById: userId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        shopId,
        actorUserId: userId,
        action: 'order.confirm',
        entityType: 'CustomerOrder',
        entityId: order.id,
        afterJson: JSON.stringify({ saleId: sale.id }),
      },
    });

    return {
      order: { ...order, status: 'CONFIRMED' as const, saleId: sale.id },
      sale,
    };
  }

  async reject(
    orderId: string,
    shopId: string,
    userId: string,
    reason?: string,
  ) {
    const order = await this.prisma.customerOrder.findFirst({
      where: { id: orderId, shopId },
    });
    if (!order) throw AppException.notFound('CustomerOrder', orderId);
    if (order.status !== 'PENDING') {
      throw AppException.conflict(
        ErrorCode.CONFLICT,
        `Cannot reject order with status ${order.status}`,
      );
    }

    await this.prisma.customerOrder.update({
      where: { id: order.id },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectedById: userId,
        rejectedReason: reason ?? null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        shopId,
        actorUserId: userId,
        action: 'order.reject',
        entityType: 'CustomerOrder',
        entityId: order.id,
        afterJson: JSON.stringify({ reason }),
      },
    });

    return { ...order, status: 'REJECTED' as const };
  }

  async cancel(orderId: string, customerId: string) {
    const order = await this.prisma.customerOrder.findFirst({
      where: { id: orderId, customerId },
    });
    if (!order) throw AppException.notFound('CustomerOrder', orderId);
    if (order.status !== 'PENDING') {
      throw AppException.conflict(
        ErrorCode.CONFLICT,
        'Only pending orders can be cancelled',
      );
    }

    await this.prisma.customerOrder.update({
      where: { id: order.id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });

    return { ...order, status: 'CANCELLED' as const };
  }

  async list(
    shopId: string,
    params: {
      status?: string;
      customerId?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const where: Record<string, unknown> = { shopId };
    if (params.status && params.status !== 'ALL')
      where['status'] = params.status;
    if (params.customerId) where['customerId'] = params.customerId;

    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
    const skip = (page - 1) * pageSize;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.customerOrder.findMany({
        where,
        include: { lines: { include: { beverage: true } }, customer: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.customerOrder.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async listForCustomer(customerId: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.customerOrder.findMany({
        where: { customerId },
        include: { lines: { include: { beverage: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.customerOrder.count({ where: { customerId } }),
    ]);
    return { data, total, page, pageSize };
  }

  async findOne(id: string) {
    const order = await this.prisma.customerOrder.findUnique({
      where: { id },
      include: { lines: { include: { beverage: true } }, customer: true },
    });
    if (!order) throw AppException.notFound('CustomerOrder', id);
    return order;
  }

  async getPendingCount(shopId: string) {
    return this.prisma.customerOrder.count({
      where: { shopId, status: 'PENDING' },
    });
  }

  async getPending(shopId: string) {
    return this.prisma.customerOrder.findMany({
      where: { shopId, status: 'PENDING' },
      include: { lines: { include: { beverage: true } }, customer: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  private async notifyOwner(
    order: CustomerOrder & {
      customer: { name: string; phone: string | null };
      lines: (CustomerOrderLine & { beverage: { name: string } })[];
    },
    shopName: string,
  ) {
    const itemList = order.lines
      .map(
        (l) =>
          `${l.boxes} boxes + ${l.bottles} bottles of ${l.beverage.name}`,
      )
      .join(', ');
    const total = (order.subtotalCents / 100).toFixed(2);
    const message = `New order from ${order.customer.name} for ${shopName}: ${itemList} — Total: ${total} ETB`;

    try {
      if (order.customer.phone)
        await this.sms.sendSms(order.customer.phone, message);
    } catch {}
    try {
      const shop = await this.prisma.shop.findUnique({
        where: { id: order.shopId },
        select: { email: true },
      });
      if (shop?.email) {
        await this.mail.send({
          to: shop.email,
          subject: `New order from ${order.customer.name}`,
          html: `<p>${message}</p><p>Review and confirm in your dashboard.</p>`,
          text: message,
        });
      }
    } catch {}
    try {
      await this.telegram.sendMessage(message);
    } catch {}
  }
}
