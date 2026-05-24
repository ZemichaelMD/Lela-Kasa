/**
 * Token store interface — allows swapping between memory, httpOnly cookies (via BFF),
 * and expo-secure-store for React Native.
 */

export interface TokenStore {
  getAccessToken(): string | null | Promise<string | null>;
  getRefreshToken(): string | null | Promise<string | null>;
  setTokens(
    accessToken: string,
    refreshToken: string,
    expiresIn?: number,
  ): void | Promise<void>;
  clearTokens(): void | Promise<void>;
}

/** In-memory token store — suitable for server-side / Node usage */
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

/** No-op token store — for public/unauthenticated requests */
export class NoopTokenStore implements TokenStore {
  getAccessToken() { return null; }
  getRefreshToken() { return null; }
  setTokens(): void {}
  clearTokens(): void {}
}
