import React, { useState, useEffect, useCallback } from 'react';

import { AuthContext, type AuthUser } from '../context/AuthContext';
import { getSdk, tokenStore } from '../lib/sdk';
import { subscribeAuthLogout } from '../lib/event-emitter';
import { getDb, getOutboxCounts } from '../offline';

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

async function getCachedUser(): Promise<AuthUser | null> {
  try {
    const db = await getDb();
    const row = await db.getFirstAsync<any>(
      'SELECT * FROM users WHERE deleted_at IS NULL LIMIT 1',
    );
    if (!row) return null;
    const shopRow = await db.getFirstAsync<any>(
      'SELECT id, name FROM shops WHERE deleted_at IS NULL LIMIT 1',
    );
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role as 'OWNER' | 'EMPLOYEE',
      shopId: row.shop_id,
      shop: shopRow ? { id: shopRow.id, name: shopRow.name } : undefined,
      phone: row.phone,
    };
  } catch {
    return null;
  }
}

async function cacheUser(user: any): Promise<void> {
  try {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO users (id, shop_id, name, email, role, phone, avatar_url,
        server_version, server_updated_at, local_updated_at, sync_status, last_synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, datetime('now'), 'synced', datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
        name = ?, email = ?, role = ?, phone = ?, avatar_url = ?,
        server_updated_at = ?, sync_status = 'synced', last_synced_at = datetime('now')`,
      [
        user.id, user.shopId, user.name, user.email, user.role, user.phone ?? null, user.avatarUrl ?? null,
        user.updatedAt ?? null,
        user.name, user.email, user.role, user.phone ?? null, user.avatarUrl ?? null,
        user.updatedAt ?? null,
      ],
    );
  } catch {
    // Non-blocking
  }
}

async function cachePermissions(slugs: string[]): Promise<void> {
  try {
    const db = await getDb();
    const shopRow = await db.getFirstAsync<any>('SELECT id FROM shops LIMIT 1');
    if (!shopRow) return;
    const now = new Date().toISOString();
    await db.runAsync('DELETE FROM permissions WHERE shop_id = ?', [shopRow.id]);
    for (const slug of slugs) {
      await db.runAsync(
        `INSERT INTO permissions (shop_id, slug, granted, server_updated_at, local_updated_at, sync_status, last_synced_at)
         VALUES (?, ?, 1, ?, ?, 'synced', ?)`,
        [shopRow.id, slug, now, now, now],
      );
    }
  } catch {
    // Non-blocking
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isOfflineStartup, setIsOfflineStartup] = useState(false);

  const fetchPermissions = useCallback(async () => {
    try {
      const data = await getSdk().permissions.me();
      if (data?.granted) {
        setPermissions(data.granted);
        void cachePermissions(data.granted);
      }
    } catch {
      // Non-blocking
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const token = await tokenStore.getAccessToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const me = await getSdk().auth.me();
        if (cancelled) return;
        setUser(mapUser(me));
        void cacheUser(me);
        void fetchPermissions();
      } catch (err: any) {
        // Distinguish network failure from auth failure
        const isNetworkError = !err?.status || err?.status === 0 || err?.message?.includes('network') || err?.message?.includes('fetch');
        const isUnauthorized = err?.status === 401;

        if (isNetworkError && !cancelled) {
          // Network failure - try cached user for offline startup
          const cached = await getCachedUser();
          if (cached && !cancelled) {
            setUser(cached);
            setIsOfflineStartup(true);
            // Load cached permissions
            try {
              const db = await getDb();
              const permRows = await db.getAllAsync<any>(
                'SELECT slug FROM permissions WHERE granted = 1',
              );
              if (permRows.length > 0) {
                setPermissions(permRows.map((r: any) => r.slug));
              }
            } catch {}
          }
        } else if (isUnauthorized) {
          // Confirmed auth failure - clear tokens
          await tokenStore.clearTokens();
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void hydrate();

    const handleLogout = () => {
      setUser(null);
      setPermissions([]);
      setIsOfflineStartup(false);
    };
    const unsubscribe = subscribeAuthLogout(handleLogout);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [fetchPermissions]);

  const login = useCallback(async (identifier: string, password: string) => {
    const isPhone = /^[+]?[\d\s()-]+$/.test(identifier.trim());
    const result = isPhone
      ? await getSdk().auth.loginWithPhone(identifier.trim(), password)
      : await getSdk().auth.login({ email: identifier.trim(), password });
    await tokenStore.setTokens(result.accessToken, result.refreshToken);
    setUser(mapUser(result.user));
    void cacheUser(result.user);
    void fetchPermissions();
    setIsOfflineStartup(false);
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
    void cacheUser(result.user);
    void fetchPermissions();
    setIsOfflineStartup(false);
  }, [fetchPermissions]);

  const logout = useCallback(async () => {
    // Warn if pending writes exist
    try {
      if (user?.shopId) {
        const counts = await getOutboxCounts(user.shopId);
        if (counts.pending > 0 || counts.failed > 0) {
          // TODO: show warning dialog
        }
      }
    } catch {}

    try { await getSdk().auth.logout(); } catch {}
    await tokenStore.clearTokens();
    setUser(null);
    setPermissions([]);
    setIsOfflineStartup(false);
  }, [user]);

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
