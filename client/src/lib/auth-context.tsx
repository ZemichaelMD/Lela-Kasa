import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type { LoginInput } from '@/contract';
import type { Shop, VerificationStatus } from '@/sdk';

import { sdk, tokenStore, API_URL } from './sdk';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'EMPLOYEE';
  shopId: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  createdAt?: string;
  verifications?: VerificationStatus;
}

export type AuthContextValue = {
  user: User | null;
  shop: Shop | null;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<User>;
  logout: () => void;
  refreshMe: () => Promise<void>;
  permissions: string[];
  hasPermission: (slug: string) => boolean;
  refreshPermissions: () => Promise<void>;
  isVerified: boolean;
  refreshVerificationStatus: () => Promise<VerificationStatus | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isVerified, setIsVerified] = useState(true);
  const loadedRef = useRef(false);

  const fetchPermissions = useCallback(async () => {
    try {
      const token = tokenStore.getAccessToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/v1/permissions/me`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const envelope = await res.json();
      const data = envelope?.data ?? envelope;
      if (data?.granted) setPermissions(data.granted);
    } catch {
      // Non-blocking
    }
  }, []);

  const updateVerificationStatus = useCallback((me: User) => {
    const v = me.verifications;
    if (!v) { setIsVerified(true); return; }
    const verified = (v.email?.verified ?? false) || (v.phone?.verified ?? false);
    setIsVerified(verified);
  }, []);

  const refreshVerificationStatus = useCallback(async (): Promise<VerificationStatus | null> => {
    try {
      const v = await sdk.auth.getVerificationStatus();
      if (v) {
        const verified = v.email?.verified || v.phone?.verified;
        setIsVerified(verified);
      }
      return v;
    } catch {
      return null;
    }
  }, []);

  const refreshMe = useCallback(async () => {
    try {
      const me = await sdk.auth.me() as unknown as User;
      if ((me as any).role === 'CUSTOMER') {
        setUser(null);
        setShop(null);
        setPermissions([]);
        setIsLoading(false);
        return;
      }
      if (me.role !== 'OWNER' && me.role !== 'EMPLOYEE') {
        tokenStore.clearTokens();
        setUser(null);
        setShop(null);
        setPermissions([]);
        setIsLoading(false);
        return;
      }
      setUser(me);
      updateVerificationStatus(me);
      void fetchPermissions();
      try {
        const myShop = await sdk.shops.getMyShop();
        setShop(myShop);
      } catch { setShop(null); }
    } catch {
      tokenStore.clearTokens();
      setUser(null);
      setShop(null);
      setPermissions([]);
    } finally { setIsLoading(false); }
  }, [fetchPermissions, updateVerificationStatus]);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    if (!tokenStore.getAccessToken()) {
      setIsLoading(false);
      return;
    }
    void refreshMe();
  }, [refreshMe]);

  const login = useCallback<AuthContextValue['login']>(async (input) => {
    const res = await sdk.auth.login(input);
    const loggedInUser = res.user as unknown as User;
    if (loggedInUser.role !== 'OWNER' && loggedInUser.role !== 'EMPLOYEE') {
      tokenStore.clearTokens();
      throw new Error('This account does not have access.');
    }
    tokenStore.setTokens(res.accessToken, res.refreshToken);
    setUser(loggedInUser);
    void fetchPermissions();
    try {
      const myShop = await sdk.shops.getMyShop();
      setShop(myShop);
    } catch { setShop(null); }
    return loggedInUser;
  }, [fetchPermissions]);

  const logout = useCallback(() => {
    sdk.auth.logout().catch(() => {});
    tokenStore.clearTokens();
    setUser(null);
    setShop(null);
    setPermissions([]);
  }, []);

  const hasPermission = useCallback((slug: string): boolean => {
    if (user?.role === 'OWNER') return true;
    return permissions.includes(slug);
  }, [user, permissions]);

  const refreshPermissions = useCallback(async () => {
    await fetchPermissions();
  }, [fetchPermissions]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, shop, isLoading, login, logout, refreshMe, permissions, hasPermission, refreshPermissions, isVerified, refreshVerificationStatus }),
    [user, shop, isLoading, login, logout, refreshMe, permissions, hasPermission, refreshPermissions, isVerified, refreshVerificationStatus],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside AuthProvider');
  return ctx;
}

/** @deprecated Use useAuthContext instead */
export function useAuth(): AuthContextValue {
  return useAuthContext();
}
