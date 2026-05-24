import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { PermissionsService } from '../permissions.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const slug = this.reflector.get<string>(PERMISSION_KEY, ctx.getHandler());
    if (!slug) return true;

    const request = ctx.switchToHttp().getRequest();
    const user = request.user as any;
    if (!user) return false;
    if (user.role === 'OWNER' || user.role === 'SUPER_ADMIN' || user.role === 'CUSTOMER') return true;
    if (!user.shopId) return false;

    return this.permissionsService.check(user.id, user.shopId, slug);
  }
}
