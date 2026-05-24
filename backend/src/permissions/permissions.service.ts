import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PERMISSION_REGISTRY, PERMISSION_GROUPS } from './permissions.registry';

export interface PermissionGroupDto {
  group: string;
  permissions: Array<{
    slug: string;
    label: string;
    description: string;
    granted: boolean;
  }>;
}

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async syncForEmployee(userId: string, shopId: string): Promise<void> {
    await this.prisma.userPermission.createMany({
      data: PERMISSION_REGISTRY.map((def) => ({
        userId,
        shopId,
        slug: def.slug,
        granted: def.defaultGranted,
      })),
      skipDuplicates: true,
    });
  }

  async getUserPermissions(userId: string, shopId: string): Promise<PermissionGroupDto[]> {
    const rows = await this.prisma.userPermission.findMany({
      where: { userId, shopId },
    });
    const grantedMap = new Map(rows.map(r => [r.slug, r.granted]));

    const groups = new Map<string, PermissionGroupDto['permissions']>();
    for (const def of PERMISSION_REGISTRY) {
      const list = groups.get(def.group) || [];
      list.push({
        slug: def.slug,
        label: def.label,
        description: def.description,
        granted: grantedMap.get(def.slug) ?? def.defaultGranted,
      });
      groups.set(def.group, list);
    }

    return PERMISSION_GROUPS
      .filter(g => groups.has(g))
      .map(group => ({
        group,
        permissions: groups.get(group)!,
      }));
  }

  async bulkUpdate(
    userId: string,
    shopId: string,
    updates: Array<{ slug: string; granted: boolean }>,
  ): Promise<void> {
    for (const { slug, granted } of updates) {
      await this.prisma.userPermission.upsert({
        where: {
          userId_shopId_slug: { userId, shopId, slug },
        },
        update: { granted },
        create: { userId, shopId, slug, granted },
      });
    }
  }

  async check(userId: string, shopId: string, slug: string): Promise<boolean> {
    const row = await this.prisma.userPermission.findUnique({
      where: {
        userId_shopId_slug: { userId, shopId, slug },
      },
      select: { granted: true },
    });
    return row?.granted ?? false;
  }

  async getGrantedSlugs(userId: string, shopId: string): Promise<string[]> {
    const rows = await this.prisma.userPermission.findMany({
      where: { userId, shopId, granted: true },
      select: { slug: true },
    });
    return rows.map(r => r.slug);
  }
}
