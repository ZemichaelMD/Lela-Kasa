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
import type { Shop } from '@/sdk';

import { sdk, tokenStore } from './sdk';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'EMPLOYEE' | 'SUPER_ADMIN';
  shopId: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  createdAt?: string;
}

export type AuthContextValue = {
  user: User | null;
  shop: Shop | null;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<User>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const loadedRef = useRef(false);

  const refreshMe = useCallback(async () => {
    try {
      const me = await sdk.auth.me() as unknown as User;
      if (me.role !== 'SUPER_ADMIN') {
        tokenStore.clearTokens();
        setUser(null);
        setShop(null);
        setIsLoading(false);
        return;
      }
      setUser(me);
      setShop(null);
    } catch {
      tokenStore.clearTokens();
      setUser(null);
      setShop(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
    if (loggedInUser.role !== 'SUPER_ADMIN') {
      tokenStore.clearTokens();
      throw new Error('Only super administrators can access the admin portal.');
    }
    tokenStore.setTokens(res.accessToken, res.refreshToken);
    setUser(loggedInUser);
    setShop(null);
    return loggedInUser;
  }, []);

  const logout = useCallback(() => {
    sdk.auth.logout().catch(() => {
      // Ignore — proceed with local clear.
    });
    tokenStore.clearTokens();
    setUser(null);
    setShop(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, shop, isLoading, login, logout, refreshMe }),
    [user, shop, isLoading, login, logout, refreshMe],
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
