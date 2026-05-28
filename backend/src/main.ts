import "reflect-metadata";
import { Logger, ValidationPipe, VersioningType } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import compression from "compression";
import * as path from "path";
import { networkInterfaces } from "os";

import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    logger: ["log", "warn", "error", "debug"],
    // Capture raw bodies so webhook signature verification can hash the bytes
    // exactly as the provider signed them (Chapa et al.).
    rawBody: true,
  });

  // Static-serve locally-uploaded media — bypasses Nest's guard/interceptor
  // pipeline and is the same content the local storage driver writes to.
  const uploadRoot = path.resolve(
    process.env["STORAGE_LOCAL_PATH"] ?? "./uploads",
  );
  app.useStaticAssets(uploadRoot, {
    prefix: "/uploads/",
    maxAge: "1y",
    immutable: true,
    fallthrough: true,
  });

  // Global prefix + URI versioning → all routes are /api/v1/...
  app.setGlobalPrefix("api");
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });

  // Security & compression
  app.use(
    helmet({
      contentSecurityPolicy: process.env["NODE_ENV"] === "production",
    }),
  );
  app.use(compression());

  // CORS
  const isDev = process.env["NODE_ENV"] !== "production";
  app.enableCors({
    origin: isDev
      ? (origin, callback) => callback(null, origin ?? "*")
      : (
          process.env["CORS_ORIGINS"] ??
          "http://localhost:3000,http://localhost:5173"
        )
          .split(",")
          .map((o) => o.trim())
          .filter(Boolean),
    credentials: true,
    allowedHeaders: [
      "Authorization",
      "X-Api-Key",
      "Idempotency-Key",
      "X-Request-Id",
      "Content-Type",
      "Accept",
    ],
    exposedHeaders: [
      "X-Request-Id",
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
    ],
  });

  // Global validation pipe for class-validator DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  );

  // OpenAPI / Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle("LeLa Kasa API")
    .setDescription(
      [
        "REST API for the LeLa Kasa platform.",
        "",
        "**Base URL**: `/api/v1`",
        "",
        "**Auth**: Bearer JWT (issued by `/auth/login`).",
        "",
        "**Envelope**: every successful response is wrapped as `{ data, meta? }`.",
        "",
        "**Errors**: `{ error: { code, message, details?, requestId } }` with HTTP 4xx/5xx.",
      ].join("\n"),
    )
    .setVersion("1.0")
    .setContact("LeLa Kasa", "https://lelakasa.com", "support@kasa.com")
    .setLicense("Proprietary", "")
    .addServer("/", "API v1")
    .addBearerAuth(
      { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      "bearer",
    )
    .addApiKey({ type: "apiKey", name: "X-Api-Key", in: "header" }, "api-key")
    .addTag("Auth", "Sign-in, registration, password reset, sessions")
    .addTag("Users", "Profile + addresses")
    .addTag("Restaurants", "Public restaurant browse + owner CRUD")
    .addTag("Menu", "Sections, items, modifier groups")
    .addTag("Taxonomy", "Categories, tags, cuisines")
    .addTag("Templates", "Restaurant page templates")
    .addTag("QR", "QR codes + themes + scan tracking")
    .addTag("Reviews", "Restaurant + menu-item reviews")
    .addTag("Bookmarks", "User bookmarks")
    .addTag("Collections", "User curated collections")
    .addTag("Reports", "Abuse / quality reports")
    .addTag("Messages", "In-app messaging threads")
    .addTag("Notifications", "In-app notifications + preferences")
    .addTag("Owner Requests", "Promote-to-owner requests")
    .addTag("Admin", "Admin-only endpoints")
    .addTag("Health", "Liveness / readiness probes")
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, document, {
    jsonDocumentUrl: "docs-json",
    yamlDocumentUrl: "docs-yaml",
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: "none",
      filter: true,
      tagsSorter: "alpha",
      operationsSorter: "alpha",
      tryItOutEnabled: true,
    },
    customSiteTitle: "LeLa Kasa API Docs",
  });

  app.enableShutdownHooks();

  const host = process.env["HOST"] ?? "0.0.0.0";
  const port = Number(process.env["PORT"] ?? 3001);
  await app.listen(port, host);

  const lanIp = Object.values(networkInterfaces())
    .flat()
    .find((iface) => iface?.family === "IPv4" && !iface.internal)?.address;
  const localUrl = `http://localhost:${port}`;
  const lanUrl = lanIp ? `http://${lanIp}:${port}` : null;

  Logger.log(`LeLa Kasa API ready → ${localUrl}/api/v1`, "Bootstrap");
  if (host === "0.0.0.0" && lanUrl) {
    Logger.log(`LeLa Kasa API network URL → ${lanUrl}/api/v1`, "Bootstrap");
    Logger.log(`Swagger docs (network) → ${lanUrl}/docs`, "Bootstrap");
  }
  Logger.log(`Swagger docs → ${localUrl}/docs`, "Bootstrap");
}

void bootstrap();
