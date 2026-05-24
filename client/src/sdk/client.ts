import type { ErrorEnvelope, SuccessEnvelope } from "@/contract";

import { ApiError } from "./error";
import type { TokenStore } from "./token-store";
import { MemoryTokenStore } from "./token-store";

export interface SdkConfig {
  baseUrl: string;
  tokenStore?: TokenStore;
  /** Called when a token refresh is needed; should return new tokens or throw. */
  onRefresh?: (
    refreshToken: string,
  ) => Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }>;
  /** Called on 401 that cannot be recovered (e.g. refresh also fails) */
  onUnauthenticated?: () => void;
  /** Default headers added to every request */
  defaultHeaders?: Record<string, string>;
  /** Timeout in ms (default: 30000) */
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

  constructor(private readonly config: SdkConfig) {
    this.tokenStore = config.tokenStore ?? new MemoryTokenStore();
  }

  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;
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

    // Handle 401 — attempt token refresh once
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
      }
    }

    if (response.status === 401) {
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

    this.refreshPromise = this.config
      .onRefresh(refreshToken)
      .then(({ accessToken, refreshToken: newRefresh, expiresIn }) =>
        this.tokenStore.setTokens(accessToken, newRefresh, expiresIn),
      )
      .catch(() => this.tokenStore.clearTokens())
      .finally(() => {
        this.refreshPromise = null;
      });

    await this.refreshPromise;
    return true;
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
      const errorBody = body as ErrorEnvelope;
      throw new ApiError(
        errorBody?.error?.code ?? "UNKNOWN",
        errorBody?.error?.message ?? `HTTP ${response.status}`,
        response.status,
        errorBody?.error?.details,
        errorBody?.error?.requestId,
      );
    }

    const successBody = body as SuccessEnvelope<T>;
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

  /**
   * GET a binary resource (PDF, image, etc) with the user's auth header attached.
   * Returns the raw Response so callers can read it as a Blob and derive a
   * filename from Content-Disposition.
   */
  async getRaw(path: string, options: RequestOptions = {}): Promise<Response> {
    const url = `${this.config.baseUrl}${path}`;
    const headers: Record<string, string> = {
      ...this.config.defaultHeaders,
      ...options.headers,
    };
    if (!options.skipAuth) {
      const token = await this.tokenStore.getAccessToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }
    const response = await fetch(url, {
      method: "GET",
      headers,
      signal: options.signal,
    });
    if (response.status === 401) this.config.onUnauthenticated?.();
    if (!response.ok) {
      let message = `HTTP ${response.status}`;
      let code = "UNKNOWN";
      try {
        const body = (await response.json()) as ErrorEnvelope;
        message = body?.error?.message ?? message;
        code = body?.error?.code ?? code;
      } catch {
        /* response wasn't JSON */
      }
      throw new ApiError(code, message, response.status);
    }
    return response;
  }
}

/** Combine multiple AbortSignals — aborts when any fires */
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
