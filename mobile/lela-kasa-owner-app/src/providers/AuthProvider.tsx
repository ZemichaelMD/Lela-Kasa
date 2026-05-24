import React, { useState, useEffect, useCallback } from 'react';

import { AuthContext, type AuthUser } from '../context/AuthContext';
import { getSdk, tokenStore } from '../lib/sdk';
import { subscribeAuthLogout } from '../lib/event-emitter';

function mapUser(raw: any): AuthUser {
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    role: raw.role as 'OWNER' | 'EMPLOYEE',
    shopId: raw.shopId,
    shop: raw.shop,
    phone: raw.phone,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [permissions, setPermissions] = useState<string[]>([]);

  const fetchPermissions = useCallback(async () => {
    try {
      const data = await getSdk().permissions.me();
      if (data?.granted) setPermissions(data.granted);
    } catch {
      // Non-blocking
    }
  }, []);

  useEffect(() => {
    async function hydrate() {
      const token = await tokenStore.getAccessToken();
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const me = await getSdk().auth.me();
        setUser(mapUser(me));
        void fetchPermissions();
      } catch {
        await tokenStore.clearTokens();
      } finally {
        setIsLoading(false);
      }
    }
    void hydrate();

    const handleLogout = () => {
      setUser(null);
      setPermissions([]);
    };
    return subscribeAuthLogout(handleLogout);
  }, [fetchPermissions]);

  const login = useCallback(async (identifier: string, password: string) => {
    const isPhone = /^[+]?[\d\s()-]+$/.test(identifier.trim());
    const result = isPhone
      ? await getSdk().auth.loginWithPhone(identifier.trim(), password)
      : await getSdk().auth.login({ email: identifier.trim(), password });
    await tokenStore.setTokens(result.accessToken, result.refreshToken);
    setUser(mapUser(result.user));
    void fetchPermissions();
  }, [fetchPermissions]);

  const register = useCallback(async (name: string, email: string, password: string, shopName: string, phone: string) => {
    const result = await getSdk().auth.register({
      name: name.trim(),
      email: email.trim() || undefined,
      password,
      shopName: shopName.trim(),
      phone: phone.trim(),
    });
    await tokenStore.setTokens(result.accessToken, result.refreshToken);
    setUser(mapUser(result.user));
    void fetchPermissions();
  }, [fetchPermissions]);

  const logout = useCallback(async () => {
    try { await getSdk().auth.logout(); } catch {}
    await tokenStore.clearTokens();
    setUser(null);
    setPermissions([]);
  }, []);

  const hasPermission = useCallback((slug: string): boolean => {
    if (user?.role === 'OWNER') return true;
    return permissions.includes(slug);
  }, [user, permissions]);

  const refreshPermissions = useCallback(async () => {
    await fetchPermissions();
  }, [fetchPermissions]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, permissions, hasPermission, refreshPermissions }}>
      {children}
    </AuthContext.Provider>
  );
}
