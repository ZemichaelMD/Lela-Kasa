import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import * as argon2 from 'argon2';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePinDto } from './dto/change-pin.dto';

@ApiTags('customer-portal')
@ApiBearerAuth()
@Controller('customer-portal')
export class CustomerPortalController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  @Get(':customerId')
  @ApiOperation({ summary: 'Get customer portal data with ledger' })
  async getPortal(
    @Param('customerId') customerId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (user.changePinRequired) {
      throw new ForbiddenException({
        error: 'CHANGE_PIN_REQUIRED',
        message: 'You must change your PIN before accessing the portal',
      });
    }

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

  @Post('change-pin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change customer PIN (forced on first login or voluntary)' })
  async changePin(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePinDto,
  ) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: user.id, deletedAt: null },
      select: { id: true, pinHash: true, name: true, phone: true, shopId: true },
    });
    if (!customer || !customer.pinHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await argon2.verify(customer.pinHash, dto.currentPin);
    if (!valid) throw new UnauthorizedException('Current PIN is incorrect');

    const newPinHash = await argon2.hash(dto.newPin);
    await this.prisma.customer.update({
      where: { id: customer.id },
      data: {
        pinHash: newPinHash,
        mustChangePassword: false,
        passwordChangedAt: new Date(),
      },
    });

    const payload = {
      sub: customer.id,
      role: 'CUSTOMER',
      shopId: customer.shopId,
      ver: 1,
      changePinRequired: false,
    };
    const accessToken = this.jwt.sign(payload, { expiresIn: '7d' });

    return {
      accessToken,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        shopId: customer.shopId,
        mustChangePassword: false,
        passwordChangedAt: new Date().toISOString(),
      },
    };
  }
}
