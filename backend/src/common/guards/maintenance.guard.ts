import { type CanActivate, type ExecutionContext, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { Request } from 'express';

@Injectable()
export class MaintenanceGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Allow public endpoints through (login, register, health, etc.)
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;

    // If user is SUPER_ADMIN, always allow
    if (user?.role === 'SUPER_ADMIN') return true;

    const setting = await this.prisma.systemSetting.findUnique({ where: { key: 'maintenance_mode' } });
    if (setting?.value === 'true') {
      throw new ServiceUnavailableException('Platform is under maintenance. Please try again later.');
    }

    return true;
  }
}
