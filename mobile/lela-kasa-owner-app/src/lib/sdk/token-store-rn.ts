import * as SecureStore from 'expo-secure-store';
import type { TokenStore } from './token-store';

const KEY_ACCESS = 'kasa.access';
const KEY_REFRESH = 'kasa.refresh';

/**
 * TokenStore backed by expo-secure-store (Keychain on iOS, Keystore on Android).
 */
export class RNSecureTokenStore implements TokenStore {
  async getAccessToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(KEY_ACCESS);
    } catch {
      return null;
    }
  }

  async getRefreshToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(KEY_REFRESH);
    } catch {
      return null;
    }
  }

  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await SecureStore.setItemAsync(KEY_ACCESS, accessToken);
    await SecureStore.setItemAsync(KEY_REFRESH, refreshToken);
  }

  async clearTokens(): Promise<void> {
    try { await SecureStore.deleteItemAsync(KEY_ACCESS); } catch {}
    try { await SecureStore.deleteItemAsync(KEY_REFRESH); } catch {}
  }
}

export const tokenStore = new RNSecureTokenStore();
