import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('customer-portal')
@ApiBearerAuth()
@Controller('customer-portal')
export class CustomerPortalController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':customerId')
  @ApiOperation({ summary: 'Get customer portal data with ledger' })
  async getPortal(@Param('customerId') customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId, deletedAt: null },
      select: {
        id: true, name: true, phone: true, shopId: true, creditBalanceCents: true,
        outstandingBoxes: true, outstandingBottles: true,
        shop: { select: { name: true } },
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const [sales, payments] = await Promise.all([
      this.prisma.sale.findMany({
        where: { customerId, status: { not: 'VOIDED' } },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { id: true, createdAt: true, subtotalCents: true, paidCents: true, status: true, notes: true },
      }),
      this.prisma.payment.findMany({
        where: { customerId, voidedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { id: true, createdAt: true, amountCents: true, notes: true },
      }),
    ]);

    const ledger = [
      ...sales.map(s => ({ type: 'sale' as const, id: s.id, date: s.createdAt, subtotalCents: s.subtotalCents, paidCents: s.paidCents, status: s.status, notes: s.notes })),
      ...payments.map(p => ({ type: 'payment' as const, id: p.id, date: p.createdAt, amountCents: p.amountCents, notes: p.notes })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { customer, ledger };
  }
}
