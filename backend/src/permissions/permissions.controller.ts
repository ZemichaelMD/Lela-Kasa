import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { PermissionsService } from './permissions.service';
import { UpdatePermissionsDto } from './dto/update-permissions.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { PERMISSION_REGISTRY } from './permissions.registry';

@ApiTags('permissions')
@ApiBearerAuth()
@Controller('permissions')
export class PermissionsController {
  constructor(
    private readonly permissionsService: PermissionsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get granted permission slugs for the current user' })
  async getMyPermissions(@CurrentUser() user: AuthenticatedUser) {
    if (user.role === 'OWNER') {
      return { granted: PERMISSION_REGISTRY.map(d => d.slug) };
    }
    if (!user.shopId) return { granted: [] };
    const slugs = await this.permissionsService.getGrantedSlugs(user.id, user.shopId);
    return { granted: slugs };
  }

  @Get('employees/:employeeId')
  @ApiOperation({ summary: 'Get all permissions for an employee (OWNER only)' })
  async getEmployeePermissions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('employeeId') employeeId: string,
  ) {
    if (!user.shopId) throw new NotFoundException('Shop not found');
    const employee = await this.prisma.user.findFirst({
      where: { id: employeeId, shopId: user.shopId, deletedAt: null },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    return this.permissionsService.getUserPermissions(employeeId, user.shopId);
  }

  @Patch('employees/:employeeId')
  @ApiOperation({ summary: 'Update employee permissions (OWNER only)' })
  async updateEmployeePermissions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('employeeId') employeeId: string,
    @Body() dto: UpdatePermissionsDto,
  ) {
    if (!user.shopId) throw new NotFoundException('Shop not found');
    const employee = await this.prisma.user.findFirst({
      where: { id: employeeId, shopId: user.shopId, deletedAt: null },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    await this.permissionsService.bulkUpdate(employeeId, user.shopId, dto.updates);
    return this.permissionsService.getUserPermissions(employeeId, user.shopId);
  }

  @Post('employees/:employeeId/sync')
  @ApiOperation({ summary: 'Sync permission registry for an employee' })
  async syncEmployeePermissions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('employeeId') employeeId: string,
  ) {
    if (!user.shopId) throw new NotFoundException('Shop not found');
    const employee = await this.prisma.user.findFirst({
      where: { id: employeeId, shopId: user.shopId, deletedAt: null },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    await this.permissionsService.syncForEmployee(employeeId, user.shopId);
    return this.permissionsService.getUserPermissions(employeeId, user.shopId);
  }
}
