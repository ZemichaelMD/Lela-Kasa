export type PermissionSlug =
  | 'sales:view' | 'sales:create' | 'sales:void'
  | 'customers:view' | 'customers:create' | 'customers:edit' | 'customers:delete'
  | 'beverages:view' | 'beverages:create' | 'beverages:edit' | 'beverages:delete' | 'beverages:stock'
  | 'price-tiers:view' | 'price-tiers:create' | 'price-tiers:edit' | 'price-tiers:delete'
  | 'payment-accounts:view' | 'payment-accounts:create' | 'payment-accounts:edit' | 'payment-accounts:delete'
  | 'payments:view' | 'payments:record' | 'payments:void'
  | 'orders:view' | 'orders:confirm' | 'orders:reject'
  | 'reports:view'
  | 'settings:view' | 'settings:edit'
  | 'employees:view';

export interface PermissionDef {
  slug: PermissionSlug;
  label: string;
  group: string;
  description: string;
  defaultGranted: boolean;
}

export const PERMISSION_GROUPS = [
  'Sales',
  'Customers',
  'Products',
  'Pricing',
  'Finance',
  'Orders',
  'Reports',
  'Settings',
  'Employees',
] as const;

export const PERMISSION_REGISTRY: PermissionDef[] = [
  { slug: 'sales:view',              label: 'View Sales',              group: 'Sales',            description: 'See the sales list and sale details',               defaultGranted: true  },
  { slug: 'sales:create',            label: 'Create Sale',             group: 'Sales',            description: 'Record new sales transactions',                      defaultGranted: true  },
  { slug: 'sales:void',              label: 'Void Sale',               group: 'Sales',            description: 'Cancel and reverse a completed sale',                defaultGranted: false },
  { slug: 'customers:view',          label: 'View Customers',          group: 'Customers',        description: 'Browse the customer list and profiles',              defaultGranted: true  },
  { slug: 'customers:create',        label: 'Add Customer',            group: 'Customers',        description: 'Create new customer records',                        defaultGranted: true  },
  { slug: 'customers:edit',          label: 'Edit Customer',           group: 'Customers',        description: 'Modify existing customer data',                      defaultGranted: false },
  { slug: 'customers:delete',        label: 'Delete Customer',         group: 'Customers',        description: 'Permanently remove customer records',                defaultGranted: false },
  { slug: 'beverages:view',          label: 'View Products',           group: 'Products',         description: 'Browse the product catalog',                         defaultGranted: true  },
  { slug: 'beverages:create',        label: 'Add Product',             group: 'Products',         description: 'Add new beverages to the catalog',                   defaultGranted: false },
  { slug: 'beverages:edit',          label: 'Edit Product',            group: 'Products',         description: 'Modify product details and pricing',                 defaultGranted: false },
  { slug: 'beverages:delete',        label: 'Delete Product',          group: 'Products',         description: 'Remove products from the catalog',                   defaultGranted: false },
  { slug: 'beverages:stock',         label: 'Adjust Stock',            group: 'Products',         description: 'Manually adjust stock levels',                       defaultGranted: false },
  { slug: 'price-tiers:view',        label: 'View Price Tiers',        group: 'Pricing',          description: 'See pricing tier configurations',                    defaultGranted: true  },
  { slug: 'price-tiers:create',      label: 'Create Price Tier',       group: 'Pricing',          description: 'Add new price tier categories',                      defaultGranted: false },
  { slug: 'price-tiers:edit',        label: 'Edit Price Tier',         group: 'Pricing',          description: 'Modify price tier names and configurations',         defaultGranted: false },
  { slug: 'price-tiers:delete',      label: 'Delete Price Tier',       group: 'Pricing',          description: 'Remove price tier categories',                       defaultGranted: false },
  { slug: 'payment-accounts:view',   label: 'View Payment Accounts',   group: 'Finance',          description: 'See shop payment account details',                   defaultGranted: true  },
  { slug: 'payment-accounts:create', label: 'Add Payment Account',     group: 'Finance',          description: 'Add new bank/cash accounts',                         defaultGranted: false },
  { slug: 'payment-accounts:edit',   label: 'Edit Payment Account',    group: 'Finance',          description: 'Modify payment account details',                     defaultGranted: false },
  { slug: 'payment-accounts:delete', label: 'Delete Payment Account',  group: 'Finance',          description: 'Remove payment accounts',                            defaultGranted: false },
  { slug: 'payments:view',           label: 'View Payments',           group: 'Finance',          description: 'See payment records',                                defaultGranted: true  },
  { slug: 'payments:record',         label: 'Record Payment',          group: 'Finance',          description: 'Log customer payments against sales',                defaultGranted: true  },
  { slug: 'payments:void',           label: 'Void Payment',            group: 'Finance',          description: 'Reverse a recorded payment',                         defaultGranted: false },
  { slug: 'orders:view',             label: 'View Orders',             group: 'Orders',           description: 'See customer orders',                                defaultGranted: true  },
  { slug: 'orders:confirm',          label: 'Confirm Order',           group: 'Orders',           description: 'Accept and fulfill a customer order',                defaultGranted: true  },
  { slug: 'orders:reject',           label: 'Reject Order',            group: 'Orders',           description: 'Decline a customer order',                           defaultGranted: false },
  { slug: 'reports:view',            label: 'View Reports',            group: 'Reports',          description: 'Access sales and financial reports',                 defaultGranted: false },
  { slug: 'settings:view',           label: 'View Settings',           group: 'Settings',         description: 'See shop configuration',                             defaultGranted: false },
  { slug: 'settings:edit',           label: 'Edit Settings',           group: 'Settings',         description: 'Modify shop settings and preferences',               defaultGranted: false },
  { slug: 'employees:view',          label: 'View Employees',          group: 'Employees',        description: 'See the employee list (Owner-level feature)',         defaultGranted: false },
];

export function getPermissionDef(slug: PermissionSlug): PermissionDef | undefined {
  return PERMISSION_REGISTRY.find(d => d.slug === slug);
}
