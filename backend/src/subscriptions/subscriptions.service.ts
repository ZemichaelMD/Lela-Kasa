import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { SmsService } from '../sms/sms.service';
import { TelegramService } from '../telegram/telegram.service';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly smsService: SmsService,
    private readonly telegramService: TelegramService,
  ) {}

  async getMySubscription(shopId: string) {
    if (!shopId) return { hasSubscription: false, status: null };
    const sub = await this.prisma.subscription.findUnique({
      where: { shopId },
      include: { plan: true },
    });
    if (!sub) return { hasSubscription: false, status: null };
    const monthlyPriceCents = sub.plan?.monthlyPriceCents ?? 0;
    const yearlyPriceCents = sub.plan?.yearlyPriceCents ?? 0;
    const currentPriceCents = sub.billingCycle === 'yearly' ? yearlyPriceCents : monthlyPriceCents;
    return {
      hasSubscription: true,
      status: sub.status,
      planId: sub.planId,
      planName: sub.plan?.name ?? '—',
      planPriceCents: monthlyPriceCents,
      monthlyPriceCents,
      yearlyPriceCents,
      currentPriceCents,
      billingCycle: sub.billingCycle,
      amountCents: sub.amountCents || currentPriceCents,
      paidUntil: sub.paidUntil,
      trialEndsAt: sub.trialEndsAt,
      isActive: sub.status === 'ACTIVE',
    };
  }

  async listPlans() {
    const plans = await this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    return plans.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      monthlyPriceCents: p.monthlyPriceCents,
      yearlyPriceCents: p.yearlyPriceCents,
      trialDays: p.trialDays,
      features: JSON.parse(p.features || '[]'),
      maxShops: p.maxShops,
      maxUsers: p.maxUsers,
      maxCustomers: p.maxCustomers,
    }));
  }

  async getMyHistory(shopId: string) {
    if (!shopId) return [];
    const logs = await this.prisma.subscriptionLog.findMany({
      where: { shopId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    // A PENDING_VERIFICATION entry becomes stale once a later log activates the
    // subscription — hide those so confirmed payments no longer read "pending".
    const lastActivation = logs.find((l) => l.newStatus === 'ACTIVE')?.createdAt;
    const visible = lastActivation
      ? logs.filter(
          (l) =>
            l.newStatus !== 'PENDING_VERIFICATION' || l.createdAt > lastActivation,
        )
      : logs;
    const planIds = [...new Set(visible.map(l => l.planId).filter(Boolean))] as string[];
    const plans = planIds.length > 0 ? await this.prisma.subscriptionPlan.findMany({ where: { id: { in: planIds } }, select: { id: true, name: true } }) : [];
    const planMap = new Map(plans.map(p => [p.id, p.name]));
    return visible.map(l => ({ ...l, plan: l.planId ? { name: planMap.get(l.planId) } : null }));
  }

  async listProviders() {
    return this.prisma.paymentProvider.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        kind: true,
        instructions: true,
        contactInfo: true,
      },
    });
  }

  /** A payment notification / reminder may only be sent once per this window. */
  private static readonly NOTIFY_THROTTLE_MS = 2 * 60 * 60 * 1000; // 2 hours

  async notifyPayment(
    shopId: string,
    user: { id: string; email: string; name?: string | null },
    dto: { planId?: string; providerId?: string; reference?: string; notes?: string; screenshotUrl?: string; billingCycle?: string },
  ) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId }, select: { name: true } });
    if (!shop) throw new Error('Shop not found');

    // ── Rate limit ──────────────────────────────────────────────────────────
    // One payment notification or reminder per shop per 2 hours — otherwise the
    // SMS/Telegram channels would be exhausted by repeated clicks.
    const lastNotice = await this.prisma.subscriptionLog.findFirst({
      where: { shopId, action: 'PAYMENT' },
      orderBy: { createdAt: 'desc' },
    });
    if (lastNotice) {
      const elapsedMs = Date.now() - lastNotice.createdAt.getTime();
      if (elapsedMs < SubscriptionsService.NOTIFY_THROTTLE_MS) {
        const retryAfterMinutes = Math.ceil(
          (SubscriptionsService.NOTIFY_THROTTLE_MS - elapsedMs) / 60000,
        );
        return {
          success: false,
          throttled: true,
          retryAfterMinutes,
          channels: [] as string[],
          message: `The admin was already notified recently. You can remind again in about ${retryAfterMinutes} minute${retryAfterMinutes === 1 ? '' : 's'}.`,
        };
      }
    }

    const plan = dto.planId
      ? await this.prisma.subscriptionPlan.findUnique({ where: { id: dto.planId } })
      : null;
    // Resolve the provider defensively — a reminder may pass no/invalid id.
    const provider = dto.providerId
      ? await this.prisma.paymentProvider.findUnique({ where: { id: dto.providerId } })
      : null;
    const amountCents = dto.billingCycle === 'yearly'
      ? (plan?.yearlyPriceCents ?? 0)
      : (plan?.monthlyPriceCents ?? 0);

    // Only a genuine payment report (with a real provider) records a transaction.
    if (provider) {
      await this.prisma.paymentTransaction.create({
        data: {
          shopId,
          providerId: provider.id,
          amountCents,
          status: 'PENDING',
          reference: dto.reference || null,
          notes: dto.notes || null,
          screenshotUrl: dto.screenshotUrl || null,
        },
      });
    }

    // Log it — also serves as the rate-limit marker for the next call.
    await this.prisma.subscriptionLog.create({
      data: {
        shopId,
        action: 'PAYMENT',
        planId: dto.planId || null,
        amountCents,
        newStatus: 'PENDING_VERIFICATION',
        notes: `Payment reported — ${dto.reference || 'no reference'} (pending verification)`,
      },
    });

    // ── Notify every configured channel ─────────────────────────────────────
    const settings = await this.prisma.systemSetting.findMany({
      where: { key: { in: ['notify_payment_sms_to', 'notify_payment_email_to'] } },
    });
    const config: Record<string, string> = {};
    for (const s of settings) config[s.key] = s.value;

    const smsTo = config['notify_payment_sms_to'];
    const emailTo = config['notify_payment_email_to'];
    const reference = dto.reference || '—';
    const amountDisplay = plan
      ? `${(amountCents / 100).toFixed(2)} ETB`
      : '—';
    const ownerName = user.name ?? user.email;
    const channels: string[] = [];

    if (smsTo) {
      try {
        await this.smsService.sendSms(
          smsTo,
          `Payment notification from ${shop.name}: ${amountDisplay} for ${plan?.name ?? '—'}. Reference: ${reference}`,
        );
        channels.push('SMS');
      } catch (e) {
        this.logger.error(`[notifyPayment] SMS failed: ${String(e)}`);
      }
    }

    if (emailTo) {
      try {
        await this.mailService.send({
          to: emailTo,
          subject: `💰 Payment Received — ${shop.name}`,
          html: `
            <h2>Payment Notification</h2>
            <p><strong>Shop:</strong> ${shop.name}</p>
            <p><strong>Owner:</strong> ${ownerName}</p>
            <p><strong>Plan:</strong> ${plan?.name ?? '—'}</p>
            <p><strong>Amount:</strong> ${amountDisplay}</p>
            <p><strong>Provider:</strong> ${provider?.name ?? '—'}</p>
            <p><strong>Reference:</strong> ${reference}</p>
            ${dto.notes ? `<p><strong>Notes:</strong> ${dto.notes}</p>` : ''}
            <p>Action required: Mark subscription as paid in the admin panel.</p>
          `,
        });
        channels.push('Email');
      } catch (e) {
        this.logger.error(`[notifyPayment] Email failed: ${String(e)}`);
      }
    }

    try {
      const sent = await this.telegramService.sendPaymentNotification(
        shop.name,
        ownerName,
        amountDisplay,
        reference,
      );
      if (sent) channels.push('Telegram');
    } catch (e) {
      this.logger.error(`[notifyPayment] Telegram failed: ${String(e)}`);
    }

    return {
      success: true,
      throttled: false,
      channels,
      message: channels.length
        ? `Admin notified via ${channels.join(', ')}.`
        : 'Payment recorded — the admin will see it in the admin panel.',
    };
  }

  async selectPlan(shopId: string, planId: string, billingCycle: 'monthly' | 'yearly') {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });
    if (!plan || !plan.isActive) throw new Error('Plan not found or inactive');

    const amountCents = billingCycle === 'yearly' ? plan.yearlyPriceCents : plan.monthlyPriceCents;
    const existing = await this.prisma.subscription.findUnique({ where: { shopId } });

    // Log the intent only — do NOT update the subscription row until payment is confirmed.
    await this.prisma.subscriptionLog.create({
      data: {
        shopId,
        action: 'PLAN_SELECTED',
        planId,
        amountCents,
        notes: `Plan selection intent: ${plan.name} (${billingCycle})`,
      },
    });

    return {
      planId,
      planName: plan.name,
      billingCycle,
      amountCents,
      status: existing?.status || 'TRIAL',
      intentOnly: true,
    };
  }
}
