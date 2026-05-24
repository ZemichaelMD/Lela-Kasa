import type { AdminMenuItem, AdminRestaurant, AdminUser } from './data';

export interface RestaurantFilterState {
  q: string;
  approvalStatus: Set<AdminRestaurant['approvalStatus']>;
  priceRanges: Set<AdminRestaurant['priceRange']>;
  featuredOnly: boolean;
  verifiedOnly: boolean;
  ratingMin: 0 | 3 | 4 | 4.5;
}

export const EMPTY_RESTAURANT_FILTERS: RestaurantFilterState = {
  q: '',
  approvalStatus: new Set(),
  priceRanges: new Set(),
  featuredOnly: false,
  verifiedOnly: false,
  ratingMin: 0,
};

export function countActiveRestaurantFilters(f: RestaurantFilterState): number {
  return (
    (f.approvalStatus.size ? 1 : 0) +
    (f.priceRanges.size ? 1 : 0) +
    (f.featuredOnly ? 1 : 0) +
    (f.verifiedOnly ? 1 : 0) +
    (f.ratingMin > 0 ? 1 : 0)
  );
}

// ─── Menu items ─────────────────────────────────────────────────────────────

export interface MenuItemFilterState {
  q: string;
  approvalStatus: Set<AdminMenuItem['approvalStatus']>;
  availability: 'any' | 'available' | 'unavailable';
  dietary: Set<string>;
  restaurants: Set<string>;
}

export const EMPTY_MENU_ITEM_FILTERS: MenuItemFilterState = {
  q: '',
  approvalStatus: new Set(),
  availability: 'any',
  dietary: new Set(),
  restaurants: new Set(),
};

export function countActiveMenuItemFilters(f: MenuItemFilterState): number {
  return (
    (f.approvalStatus.size ? 1 : 0) +
    (f.availability !== 'any' ? 1 : 0) +
    (f.dietary.size ? 1 : 0) +
    (f.restaurants.size ? 1 : 0)
  );
}

export function filterMenuItems(
  rows: AdminMenuItem[],
  f: MenuItemFilterState,
): AdminMenuItem[] {
  const q = f.q.trim().toLowerCase();
  return rows.filter((m) => {
    if (q) {
      const hay = [m.name, m.restaurant, m.section, ...m.dietary].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (f.approvalStatus.size && !f.approvalStatus.has(m.approvalStatus)) return false;
    if (f.availability === 'available' && !m.isAvailable) return false;
    if (f.availability === 'unavailable' && m.isAvailable) return false;
    if (f.dietary.size && !m.dietary.some((d) => f.dietary.has(d))) return false;
    if (f.restaurants.size && !f.restaurants.has(m.restaurant)) return false;
    return true;
  });
}

// ─── Users ──────────────────────────────────────────────────────────────────

export interface UserFilterState {
  q: string;
  roles: Set<AdminUser['role']>;
  isActive: 'any' | 'active' | 'inactive';
  emailVerified: 'any' | 'verified' | 'unverified';
}

export const EMPTY_USER_FILTERS: UserFilterState = {
  q: '',
  roles: new Set(),
  isActive: 'any',
  emailVerified: 'any',
};

export function countActiveUserFilters(f: UserFilterState): number {
  return (
    (f.roles.size ? 1 : 0) +
    (f.isActive !== 'any' ? 1 : 0) +
    (f.emailVerified !== 'any' ? 1 : 0)
  );
}

export function filterUsers(rows: AdminUser[], f: UserFilterState): AdminUser[] {
  const q = f.q.trim().toLowerCase();
  return rows.filter((u) => {
    if (q) {
      const hay = [u.name, u.email, u.role].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (f.roles.size && !f.roles.has(u.role)) return false;
    if (f.isActive === 'active' && !u.isActive) return false;
    if (f.isActive === 'inactive' && u.isActive) return false;
    if (f.emailVerified === 'verified' && !u.emailVerified) return false;
    if (f.emailVerified === 'unverified' && u.emailVerified) return false;
    return true;
  });
}
