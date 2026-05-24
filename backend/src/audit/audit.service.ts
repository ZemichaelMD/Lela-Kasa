import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuditLog } from '@/database';

export interface AuditLogInput {
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  shopId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditLogInput): Promise<AuditLog> {
    try {
      return await this.prisma.auditLog.create({
        data: {
          actorUserId: input.actorUserId,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId,
          shopId: input.shopId,
          beforeJson: input.before ? JSON.stringify(input.before) : undefined,
          afterJson: input.after ? JSON.stringify(input.after) : undefined,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        },
      });
    } catch (err) {
      this.logger.error('Failed to write audit log', { err, input });
      return {} as AuditLog;
    }
  }
}
