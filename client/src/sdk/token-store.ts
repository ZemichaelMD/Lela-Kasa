/**
 * Token store interface · allows swapping between memory, httpOnly cookies (via BFF),
 * and expo-secure-store for React Native.
 */

export interface TokenStore {
  getAccessToken(): string | null | Promise<string | null>;
  getRefreshToken(): string | null | Promise<string | null>;
  setTokens(
    accessToken: string,
    refreshToken: string,
    expiresIn: number,
  ): void | Promise<void>;
  clearTokens(): void | Promise<void>;
}

/** In-memory token store · suitable for server-side / Node usage */
export class MemoryTokenStore implements TokenStore {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  setTokens(accessToken: string, refreshToken: string): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
  }
}

/** No-op token store · for public/unauthenticated requests */
export class NoopTokenStore implements TokenStore {
  getAccessToken() {
    return null;
  }
  getRefreshToken() {
    return null;
  }
  setTokens(): void {}
  clearTokens(): void {}
}

/**
 * Persists tokens in the browser via Web Storage. Suitable for the Next.js client
 * and Vite admin SPA when running in the browser; falls back to in-memory on the
 * server side so SSR doesn't crash. localStorage trades some XSS risk for UX ·
 * upgrade to a BFF + httpOnly cookies if XSS is in your threat model.
 */
export class BrowserTokenStore implements TokenStore {
  private memoryAccess: string | null = null;
  private memoryRefresh: string | null = null;

  constructor(private readonly storageKey = "kasa.auth") {
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(this.storageKey);
        if (raw) {
          const parsed = JSON.parse(raw) as {
            accessToken?: string;
            refreshToken?: string;
          };
          this.memoryAccess = parsed.accessToken ?? null;
          this.memoryRefresh = parsed.refreshToken ?? null;
        }
      } catch {
        // Ignore corrupt storage; treat as logged out.
      }
    }
  }

  getAccessToken(): string | null {
    return this.memoryAccess;
  }

  getRefreshToken(): string | null {
    return this.memoryRefresh;
  }

  setTokens(accessToken: string, refreshToken: string): void {
    this.memoryAccess = accessToken;
    this.memoryRefresh = refreshToken;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          this.storageKey,
          JSON.stringify({ accessToken, refreshToken }),
        );
      } catch {
        // Quota or privacy-mode failures fall back to memory-only.
      }
    }
  }

  clearTokens(): void {
    this.memoryAccess = null;
    this.memoryRefresh = null;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(this.storageKey);
      } catch {
        // Best-effort cleanup.
      }
    }
  }
}
