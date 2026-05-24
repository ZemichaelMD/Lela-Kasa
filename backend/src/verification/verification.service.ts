import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type VerificationChannel = 'PHONE' | 'EMAIL' | 'TELEGRAM' | 'WHATSAPP';

/** The verification state of a single channel for a user. */
export interface ChannelStatus {
  channel: VerificationChannel;
  /** The current value of the channel on the user (phone, email, chat id). */
  value: string | null;
  verified: boolean;
  verifiedAt: string | null;
}

export type VerificationStatus = Record<
  'phone' | 'email' | 'telegram',
  ChannelStatus
>;

/**
 * Reusable, channel-agnostic verification registry.
 *
 * A channel is considered *verified* only when a `UserVerification` row exists
 * AND its stored `identifier` still equals the user's current value. This means
 * changing a phone number or email transparently invalidates the badge — there
 * is no separate "clear the flag" step to forget. New channels are supported by
 * adding to the `VerificationChannel` enum; no code here needs to change.
 */
@Injectable()
export class VerificationService {
  constructor(private readonly prisma: PrismaService) {}

  /** Records (or refreshes) a verified channel for a user. */
  async record(
    userId: string,
    channel: VerificationChannel,
    identifier: string,
  ): Promise<void> {
    await this.prisma.userVerification.upsert({
      where: { userId_channel: { userId, channel } },
      update: { identifier, verifiedAt: new Date() },
      create: { userId, channel, identifier },
    });
  }

  /** Removes a channel's verification (e.g. when the value is unlinked). */
  async revoke(userId: string, channel: VerificationChannel): Promise<void> {
    await this.prisma.userVerification.deleteMany({ where: { userId, channel } });
  }

  /** Full verification status for one user, keyed by channel. */
  async getStatus(userId: string): Promise<VerificationStatus> {
    const [user, rows] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { phone: true, email: true, telegramChatId: true },
      }),
      this.prisma.userVerification.findMany({ where: { userId } }),
    ]);
    const byChannel = new Map(rows.map((r) => [r.channel, r]));

    const status = (
      channel: VerificationChannel,
      value: string | null | undefined,
    ): ChannelStatus => {
      const row = byChannel.get(channel);
      const verified = !!value && !!row && row.identifier === value;
      return {
        channel,
        value: value ?? null,
        verified,
        verifiedAt: verified ? row!.verifiedAt.toISOString() : null,
      };
    };

    return {
      phone: status('PHONE', user?.phone),
      email: status('EMAIL', user?.email),
      telegram: status('TELEGRAM', user?.telegramChatId),
    };
  }

  /** True when the given channel is currently verified for the user. */
  async isVerified(
    userId: string,
    channel: VerificationChannel,
  ): Promise<boolean> {
    const status = await this.getStatus(userId);
    if (channel === 'PHONE') return status.phone.verified;
    if (channel === 'EMAIL') return status.email.verified;
    if (channel === 'TELEGRAM') return status.telegram.verified;
    return false;
  }

  /**
   * Bulk PHONE-verified lookup for a set of users — used by admin list views
   * so they avoid an N+1 query. Returns a map of userId → verified boolean.
   */
  async getPhoneVerifiedMap(
    users: Array<{ id: string; phone: string | null }>,
  ): Promise<Record<string, boolean>> {
    const ids = users.map((u) => u.id);
    if (ids.length === 0) return {};
    const rows = await this.prisma.userVerification.findMany({
      where: { userId: { in: ids }, channel: 'PHONE' },
    });
    const rowByUser = new Map(rows.map((r) => [r.userId, r]));
    const result: Record<string, boolean> = {};
    for (const u of users) {
      const row = rowByUser.get(u.id);
      result[u.id] = !!u.phone && !!row && row.identifier === u.phone;
    }
    return result;
  }
}
