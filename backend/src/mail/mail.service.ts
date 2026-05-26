import { Injectable, Logger } from "@nestjs/common";
import nodemailer from "nodemailer";
import { PrismaService } from "../prisma/prisma.service";
import { CryptoService } from "../crypto/crypto.service";
import { ServiceUnavailableException } from "../common/errors/service-unavailable.exception";

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

const MAIL_KEYS = [
  "email_enabled",
  "mail_provider",
  "smtp_host",
  "smtp_port",
  "smtp_user",
  "smtp_password",
  "from_email",
  "resend_api_key",
];

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  private async getSettings(): Promise<{
    enabled: boolean;
    provider: string;
    from: string;
    smtp: { host: string; port: number; user: string; pass: string };
    resendApiKey: string;
  }> {
    const rows = await this.prisma.systemSetting.findMany({
      where: { key: { in: MAIL_KEYS } },
    });
    const map: Record<string, string> = {};
    for (const r of rows) {
      map[r.key] = r.iv && this.crypto.isReady()
        ? this.crypto.decrypt(r.value, r.iv)
        : r.value;
    }

    const enabled = map["email_enabled"] !== "false";
    const provider = map["mail_provider"] || "smtp";

    return {
      enabled,
      provider: enabled ? provider : "log",
      from: map["from_email"] || "noreply@kasa.app",
      smtp: {
        host: map["smtp_host"] || "",
        port: parseInt(map["smtp_port"] || "587", 10),
        user: map["smtp_user"] || "",
        pass: map["smtp_password"] || "",
      },
      resendApiKey: map["resend_api_key"] || "",
    };
  }

  async send(opts: SendMailOptions): Promise<void> {
    const settings = await this.getSettings();

    if (!settings.enabled || settings.provider === "log") {
      this.logMail(opts);
      return;
    }

    if (settings.provider === "resend") {
      if (!settings.resendApiKey) {
        throw new ServiceUnavailableException(
          "EMAIL_NOT_CONFIGURED",
          "Resend API key is not set.",
        );
      }
      await this.sendViaResend(opts, settings);
    } else {
      if (!settings.smtp.host) {
        throw new ServiceUnavailableException(
          "EMAIL_NOT_CONFIGURED",
          "SMTP host is not configured.",
        );
      }
      await this.sendViaSmtp(opts, settings);
    }
  }

  /** Sends a one-off test email and reports whether it actually went out. */
  async sendTest(to: string): Promise<{ ok: boolean; message: string }> {
    const settings = await this.getSettings();
    if (!settings.enabled || settings.provider === "log") {
      return {
        ok: false,
        message:
          "Email is in log-only mode — set a Resend API key or SMTP host first.",
      };
    }
    try {
      await this.send({
        to,
        subject: "LeLa Kasa — test email",
        html: "<p>This is a test email from Kasa. Your email integration is working.</p>",
        text: "This is a test email from Kasa. Your email integration is working.",
      });
      return {
        ok: true,
        message: `Test email sent to ${to} via ${settings.provider}.`,
      };
    } catch (e) {
      return {
        ok: false,
        message: e instanceof Error ? e.message : "Failed to send test email.",
      };
    }
  }

  private logMail(opts: SendMailOptions): void {
    this.logger.log(
      `[mail:log] To: ${Array.isArray(opts.to) ? opts.to.join(", ") : opts.to} | Subject: ${opts.subject}\n${opts.text ?? opts.html}`,
    );
  }

  private async sendViaResend(
    opts: SendMailOptions,
    settings: { from: string; resendApiKey: string },
  ): Promise<void> {
    const apiKey = settings.resendApiKey;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: settings.from,
        to: Array.isArray(opts.to) ? opts.to : [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Resend API error ${res.status}: ${body}`);
    }
  }

  private async sendViaSmtp(
    opts: SendMailOptions,
    settings: {
      from: string;
      smtp: { host: string; port: number; user: string; pass: string };
    },
  ): Promise<void> {
    const smtpPass = settings.smtp.pass;
    const transporter = nodemailer.createTransport({
      host: settings.smtp.host,
      port: settings.smtp.port,
      auth: settings.smtp.user
        ? { user: settings.smtp.user, pass: smtpPass }
        : undefined,
    });
    await transporter.sendMail({
      from: settings.from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
  }

  // ── Email templates ─────────────────────────────────────────────────────────

  async sendEmailVerification(
    to: string,
    opts: { name: string; token: string; clientUrl: string },
  ): Promise<void> {
    const link = `${opts.clientUrl}/verify-email?token=${opts.token}`;
    await this.send({
      to,
      subject: "Verify your LeLa Kasa account",
      html: `<p>Hello ${opts.name},</p><p>Click the link below to verify your email address. This link expires in 24 hours.</p><p><a href="${link}">${link}</a></p><p>If you didn't create an account, you can ignore this email.</p>`,
      text: `Verify your email: ${link}`,
    });
  }

  async sendPasswordReset(
    to: string,
    opts: { token: string; clientUrl: string },
  ): Promise<void> {
    const link = `${opts.clientUrl}/reset-password?token=${opts.token}`;
    await this.send({
      to,
      subject: "Reset your LeLa Kasa password",
      html: `<p>Someone requested a password reset for your account.</p><p>Click below to set a new password. This link expires in 1 hour.</p><p><a href="${link}">${link}</a></p><p>If you didn't request this, you can ignore this email.</p>`,
      text: `Reset your password: ${link}`,
    });
  }

  async sendWelcome(to: string, opts: { name: string }): Promise<void> {
    await this.send({
      to,
      subject: "Welcome to LeLa Kasa!",
      html: `<p>Hello ${opts.name}, welcome to Kasa! We're excited to have you.</p>`,
      text: `Hello ${opts.name}, welcome to Kasa!`,
    });
  }

  async sendOtp(to: string, opts: { name: string; code: string; appName: string }): Promise<void> {
    await this.send({
      to,
      subject: `Your ${opts.appName} verification code`,
      html: `<p>Hello ${opts.name},</p><p>Your verification code is: <strong>${opts.code}</strong></p><p>This code expires in 1 hour. Do not share this code.</p>`,
      text: `Your verification code is: ${opts.code}. Valid for 1 hour. Do not share.`,
    });
  }
}
