import { createContext, useContext } from 'react';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'EMPLOYEE';
  shopId: string;
  shop?: { id: string; name: string };
  phone?: string | null;
}

export interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, shopName: string, phone: string) => Promise<void>;
  logout: () => Promise<void>;
  permissions: string[];
  hasPermission: (slug: string) => boolean;
  refreshPermissions: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  permissions: [],
  hasPermission: () => false,
  refreshPermissions: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}
