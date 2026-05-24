import { registerAs } from "@nestjs/config";

import type { Env } from "./env.schema";

/** Typed accessor — use `appConfig()` in services instead of ConfigService.get<string>('PORT') */

export const appConfig = registerAs("app", () => ({
  nodeEnv: process.env["NODE_ENV"] as Env["NODE_ENV"],
  port: Number(process.env["PORT"] ?? 3001),
  role: (process.env["ROLE"] ?? "web") as Env["ROLE"],
  appUrl: process.env["APP_URL"] ?? "http://localhost:3001",
  clientUrl: process.env["CLIENT_URL"] ?? "http://localhost:3000",
  adminUrl: process.env["ADMIN_URL"] ?? "http://localhost:5173",
  // for local development, we support catch all
  corsOrigins: (process.env["NODE_ENV"] == "development"
    ? "/*"
    : (process.env["CORS_ORIGINS"] ?? "")
  )
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  logLevel: (process.env["LOG_LEVEL"] ?? "info") as Env["LOG_LEVEL"],
  isProduction: process.env["NODE_ENV"] === "production",
  isDevelopment: process.env["NODE_ENV"] === "development",
  isTest: process.env["NODE_ENV"] === "test",
}));

export const dbConfig = registerAs("db", () => ({
  url: process.env["DATABASE_URL"] ?? "",
  directUrl: process.env["DIRECT_DATABASE_URL"],
}));

export const redisConfig = registerAs("redis", () => ({
  url: process.env["REDIS_URL"] ?? "redis://localhost:6379",
  /** When true, the cache module skips Redis entirely (memory cache). */
  disabled: (process.env["REDIS_DISABLED"] ?? "false").toLowerCase() === "true",
}));

export const authConfig = registerAs("auth", () => ({
  jwtAccessSecret: process.env["JWT_ACCESS_SECRET"] ?? "",
  jwtRefreshSecret: process.env["JWT_REFRESH_SECRET"] ?? "",
  jwtAccessTtl: process.env["JWT_ACCESS_TTL"] ?? "15m",
  jwtRefreshTtl: process.env["JWT_REFRESH_TTL"] ?? "30d",
  passwordPepper: process.env["PASSWORD_PEPPER"],
  sessionCookieDomain: process.env["SESSION_COOKIE_DOMAIN"],
}));

export const storageConfig = registerAs("storage", () => ({
  driver: (process.env["STORAGE_DRIVER"] ?? "local") as Env["STORAGE_DRIVER"],
  localPath: process.env["STORAGE_LOCAL_PATH"] ?? "./uploads",
  s3: {
    bucket: process.env["STORAGE_S3_BUCKET"],
    region: process.env["STORAGE_S3_REGION"],
    accessKeyId: process.env["STORAGE_S3_ACCESS_KEY_ID"],
    secretAccessKey: process.env["STORAGE_S3_SECRET_ACCESS_KEY"],
  },
  r2: {
    accountId: process.env["STORAGE_R2_ACCOUNT_ID"],
    accessKeyId: process.env["STORAGE_R2_ACCESS_KEY_ID"],
    secretAccessKey: process.env["STORAGE_R2_SECRET_ACCESS_KEY"],
    bucket: process.env["STORAGE_R2_BUCKET"],
  },
  vercelBlob: {
    readWriteToken: process.env["VERCEL_BLOB_READ_WRITE_TOKEN"],
  },
}));

export const mailConfig = registerAs("mail", () => ({
  driver: (process.env["MAIL_DRIVER"] ?? "smtp") as Env["MAIL_DRIVER"],
  from: process.env["MAIL_FROM"] ?? "noreply@kasa.app",
  resendApiKey: process.env["RESEND_API_KEY"],
  smtp: {
    host: process.env["SMTP_HOST"],
    port: Number(process.env["SMTP_PORT"] ?? 587),
    user: process.env["SMTP_USER"],
    pass: process.env["SMTP_PASS"],
  },
}));

export const rateLimitConfig = registerAs("rateLimit", () => ({
  ttl: Number(process.env["RATE_LIMIT_TTL"] ?? 60000),
  limit: Number(process.env["RATE_LIMIT_LIMIT"] ?? 100),
}));

export const observabilityConfig = registerAs("observability", () => ({
  sentryDsn: process.env["SENTRY_DSN"],
}));

export const chapaConfig = registerAs("chapa", () => ({
  secretKey: process.env["CHAPA_SECRET_KEY"] ?? "",
  publicKey: process.env["CHAPA_PUBLIC_KEY"] ?? "",
  webhookSecret: process.env["CHAPA_WEBHOOK_SECRET"] ?? "",
  mode: (process.env["CHAPA_MODE"] ?? "test") as "test" | "live",
  baseUrl: process.env["CHAPA_BASE_URL"] ?? "https://api.chapa.co/v1",
  callbackUrl: process.env["CHAPA_CALLBACK_URL"] ?? "",
  returnUrl: process.env["CHAPA_RETURN_URL"] ?? "",
}));

export const ALL_CONFIG_NAMESPACES = [
  appConfig,
  dbConfig,
  redisConfig,
  authConfig,
  storageConfig,
  mailConfig,
  rateLimitConfig,
  observabilityConfig,
  chapaConfig,
];
