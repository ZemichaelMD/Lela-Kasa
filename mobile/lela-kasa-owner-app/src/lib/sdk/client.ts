import Constants from "expo-constants";

import { ApiError } from "./error";
import type { TokenStore } from "./token-store";
import { MemoryTokenStore } from "./token-store";

const BASE_URL =
  Constants.expoConfig?.extra?.apiUrl ??
  process.env.EXPO_PUBLIC_API_URL ??
  "http://192.168.0.186:3000";

export { BASE_URL };

export interface SdkConfig {
  baseUrl?: string;
  tokenStore?: TokenStore;
  onRefresh?: (refreshToken: string) => Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }>;
  onUnauthenticated?: () => void;
  defaultHeaders?: Record<string, string>;
  timeoutMs?: number;
}

export interface RequestOptions {
  signal?: AbortSignal;
  idempotencyKey?: string;
  skipAuth?: boolean;
  headers?: Record<string, string>;
}

export class SdkClient {
  private tokenStore: TokenStore;
  private refreshPromise: Promise<void> | null = null;
  private baseUrl: string;

  constructor(config: SdkConfig = {}) {
    this.baseUrl = config.baseUrl ?? BASE_URL;
    this.tokenStore = config.tokenStore ?? new MemoryTokenStore();
    this.config = config;
  }

  private config: SdkConfig;

  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...this.config.defaultHeaders,
      ...options.headers,
    };

    if (!options.skipAuth) {
      const token = await this.tokenStore.getAccessToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }

    if (options.idempotencyKey) {
      headers["Idempotency-Key"] = options.idempotencyKey;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.timeoutMs ?? 30000,
    );

    const signal = options.signal
      ? anySignal([options.signal, controller.signal])
      : controller.signal;

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.status === 401 && !options.skipAuth && this.config.onRefresh) {
      const refreshed = await this.tryRefresh();
      if (refreshed) {
        const retryToken = await this.tokenStore.getAccessToken();
        if (retryToken) headers["Authorization"] = `Bearer ${retryToken}`;
        response = await fetch(url, {
          method,
          headers,
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });

        if (response.status === 401) {
          this.config.onUnauthenticated?.();
        }
      }
    } else if (response.status === 401) {
      this.config.onUnauthenticated?.();
    }

    return this.parseResponse<T>(response);
  }

  private async tryRefresh(): Promise<boolean> {
    if (this.refreshPromise) {
      await this.refreshPromise;
      return true;
    }

    const refreshToken = await this.tokenStore.getRefreshToken();
    if (!refreshToken || !this.config.onRefresh) return false;

    try {
      const result = await this.config.onRefresh(refreshToken);
      await this.tokenStore.setTokens(result.accessToken, result.refreshToken, result.expiresIn);
      return true;
    } catch {
      return false;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    let body: unknown;
    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      body = await response.json();
    } else {
      body = await response.text();
    }

    if (!response.ok) {
      const errorBody = body as {
        error?: {
          code?: string;
          message?: string;
          details?: unknown[];
          requestId?: string;
        };
      };
      throw new ApiError(
        errorBody?.error?.code ?? "UNKNOWN",
        errorBody?.error?.message ?? `HTTP ${response.status}`,
        response.status,
        errorBody?.error?.details as any,
        errorBody?.error?.requestId,
      );
    }

    const successBody = body as { data?: T };
    return successBody.data ?? (body as T);
  }

  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("GET", path, undefined, options);
  }

  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>("POST", path, body, options);
  }

  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>("PUT", path, body, options);
  }

  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>("PATCH", path, body, options);
  }

  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("DELETE", path, undefined, options);
  }
}

function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      break;
    }
    signal.addEventListener("abort", () => controller.abort(signal.reason), {
      once: true,
    });
  }
  return controller.signal;
}
