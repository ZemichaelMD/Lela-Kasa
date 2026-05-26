import { Injectable } from "@nestjs/common";

const API_VERSION = "v1";
const PACKAGE_VERSION = "0.1.0";

@Injectable()
export class AppService {
  private readonly startedAt = Date.now();

  getInfo() {
    return {
      name: "LeLa Kasa API",
      description:
        "Starter skeleton — the full API surface is specified in REBUILD_PLAN/04-API-CONTRACT.md.",
      apiVersion: API_VERSION,
      endpoints: [
        "GET /api/v1            — this message",
        "GET /api/v1/health     — liveness",
        "GET /api/v1/version    — build/runtime info",
        "GET /api/v1/ping       — { pong: true }",
        "GET /api/v1/restaurants            — sample restaurant list (?featured=true, ?q=...)",
        "GET /api/v1/restaurants/featured   — sample featured restaurants",
        "GET /api/v1/restaurants/:slug      — one sample restaurant + its menu",
      ],
      docs: "See ../REBUILD_PLAN/ for the full plan (data model, endpoints, phases, DevOps).",
    };
  }

  getHealth() {
    return {
      status: "ok",
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
      timestamp: new Date().toISOString(),
    };
  }

  getVersion() {
    return {
      name: "kasa-backend",
      version: process.env.npm_package_version ?? PACKAGE_VERSION,
      apiVersion: API_VERSION,
      node: process.version,
      env: process.env.NODE_ENV ?? "development",
      timestamp: new Date().toISOString(),
    };
  }

  ping() {
    return { pong: true, timestamp: new Date().toISOString() };
  }
}
