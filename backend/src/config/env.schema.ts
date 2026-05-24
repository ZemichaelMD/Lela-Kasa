import { z } from "zod";

const coerceInt = (fallback: number) =>
  z.coerce.number().int().positive().default(fallback);

export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: coerceInt(3001),
  ROLE: z.enum(["web", "worker"]).default("web"),

  APP_URL: z.string().url().default("http://localhost:3001"),
  CLIENT_URL: z.string().url().default("http://localhost:3000"),
  ADMIN_URL: z.string().url().default("http://localhost:5173"),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:3000,http://localhost:5173"),

  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("info"),

  // Database
  DATABASE_URL: z.string().min(1),
  DIRECT_DATABASE_URL: z.string().optional(),

  // Redis / Cache
  REDIS_URL: z.string().default("redis://localhost:6379"),
  // Set REDIS_DISABLED=true to fall back to in-memory cache (dev).
  REDIS_DISABLED: z
    .union([z.literal("true"), z.literal("false")])
    .default("false"),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("30d"),

  // Keys encryption
  KEYS_SECRET: z.string().min(64).optional(),

  // Auth
  PASSWORD_PEPPER: z.string().optional(),
  SESSION_COOKIE_DOMAIN: z.string().optional(),

  // Storage
  STORAGE_DRIVER: z.enum(["local", "s3", "r2", "vercel_blob"]).default("local"),
  STORAGE_LOCAL_PATH: z.string().default("./uploads"),
  STORAGE_S3_BUCKET: z.string().optional(),
  STORAGE_S3_REGION: z.string().optional(),
  STORAGE_S3_ACCESS_KEY_ID: z.string().optional(),
  STORAGE_S3_SECRET_ACCESS_KEY: z.string().optional(),
  STORAGE_R2_ACCOUNT_ID: z.string().optional(),
  STORAGE_R2_ACCESS_KEY_ID: z.string().optional(),
  STORAGE_R2_SECRET_ACCESS_KEY: z.string().optional(),
  STORAGE_R2_BUCKET: z.string().optional(),
  VERCEL_BLOB_READ_WRITE_TOKEN: z.string().optional(),

  // Mail
  MAIL_DRIVER: z.enum(["resend", "smtp", "log"]).default("smtp"),
  MAIL_FROM: z.string().email().default("noreply@kasa.app"),
  RESEND_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: coerceInt(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),

  // Rate limiting
  RATE_LIMIT_TTL: coerceInt(60000),
  RATE_LIMIT_LIMIT: coerceInt(10000),

  // Observability
  SENTRY_DSN: z.string().url().optional(),

  // SMS
  ETHIO_SMS_API_KEY: z.string().optional(),

  // Chapa payments (admin-overridable via SystemSetting at runtime)
  CHAPA_SECRET_KEY: z.string().optional(),
  CHAPA_PUBLIC_KEY: z.string().optional(),
  CHAPA_WEBHOOK_SECRET: z.string().optional(),
  CHAPA_MODE: z.enum(["test", "live"]).default("test"),
  CHAPA_BASE_URL: z.string().default("https://api.chapa.co/v1"),
  CHAPA_CALLBACK_URL: z.string().optional(),
  CHAPA_RETURN_URL: z.string().optional(),

  // Seeds
  SEED_ADMIN_EMAIL: z.string().email().default("admin@kasa.app"),
  SEED_ADMIN_PASSWORD: z.string().min(8).default("Password00"),
});

export type Env = z.infer<typeof envSchema>;

export function validate(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const formatted = result.error.errors
      .map((e) => `  ${e.path.join(".")}: ${e.message}`)
      .join("\n");
    throw new Error(`Environment variable validation failed:\n${formatted}`);
  }
  return result.data;
}
