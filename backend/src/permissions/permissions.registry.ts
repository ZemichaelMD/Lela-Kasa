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

export type LocalizedString = { en: string; am: string };

export interface PermissionDef {
  slug: PermissionSlug;
  label: LocalizedString;
  group: LocalizedString;
  description: LocalizedString;
  defaultGranted: boolean;
}

export const PERMISSION_GROUPS: LocalizedString[] = [
  { en: 'Sales', am: 'ሽያጮች' },
  { en: 'Customers', am: 'ደንበኞች' },
  { en: 'Products', am: 'ምርቶች' },
  { en: 'Pricing', am: 'ዋጋ አወጣጥ' },
  { en: 'Finance', am: 'ፋይናንስ' },
  { en: 'Orders', am: 'ትዕዛዞች' },
  { en: 'Reports', am: 'ሪፖርቶች' },
  { en: 'Settings', am: 'ቅንብሮች' },
  { en: 'Employees', am: 'ሰራተኞች' },
] as const;

export const PERMISSION_REGISTRY: PermissionDef[] = [
  { slug: 'sales:view',              label: { en: 'View Sales', am: 'ሽያጮችን ተመልከት' },              group: { en: 'Sales', am: 'ሽያጮች' },            description: { en: 'See the sales list and sale details', am: 'የሽያጭ ዝርዝር እና የሽያጭ ዝርዝሮችን ይመልከቱ' },               defaultGranted: true  },
  { slug: 'sales:create',            label: { en: 'Create Sale', am: 'ሽያጭ ፍጠር' },                     group: { en: 'Sales', am: 'ሽያጮች' },            description: { en: 'Record new sales transactions', am: 'አዳዲስ የሽያጭ ግብይቶችን ይመዝግቡ' },                     defaultGranted: true  },
  { slug: 'sales:void',              label: { en: 'Void Sale', am: 'ሽያጭ ሰርዝ' },                       group: { en: 'Sales', am: 'ሽያጮች' },            description: { en: 'Cancel and reverse a completed sale', am: 'የተጠናቀቀ ሽያጭ ይቀልብሱ እና ይሰርዙ' },               defaultGranted: false },
  { slug: 'customers:view',          label: { en: 'View Customers', am: 'ደንበኞችን ተመልከት' },           group: { en: 'Customers', am: 'ደንበኞች' },        description: { en: 'Browse the customer list and profiles', am: 'የደንበኞችን ዝርዝር እና መገለጫ ይመልከቱ' },             defaultGranted: true  },
  { slug: 'customers:create',        label: { en: 'Add Customer', am: 'ደንበኛ ጨምር' },                    group: { en: 'Customers', am: 'ደንበኞች' },        description: { en: 'Create new customer records', am: 'አዲስ የደንበኛ መረጃ ይፍጠሩ' },                       defaultGranted: true  },
  { slug: 'customers:edit',          label: { en: 'Edit Customer', am: 'ደንበኛ አርትዕ' },                  group: { en: 'Customers', am: 'ደንበኞች' },        description: { en: 'Modify existing customer data', am: 'ያለውን የደንበኛ መረጃ ያስተካክሉ' },                     defaultGranted: false },
  { slug: 'customers:delete',        label: { en: 'Delete Customer', am: 'ደንበኛ ሰርዝ' },                  group: { en: 'Customers', am: 'ደንበኞች' },        description: { en: 'Permanently remove customer records', am: 'የደንበኛ መረጃን በቋሚነት ያስወግዱ' },               defaultGranted: false },
  { slug: 'beverages:view',          label: { en: 'View Products', am: 'ምርቶችን ተመልከት' },              group: { en: 'Products', am: 'ምርቶች' },          description: { en: 'Browse the product catalog', am: 'የምርት ካታሎግ ይመልከቱ' },                         defaultGranted: true  },
  { slug: 'beverages:create',        label: { en: 'Add Product', am: 'ምርት ጨምር' },                       group: { en: 'Products', am: 'ምርቶች' },          description: { en: 'Add new beverages to the catalog', am: 'አዲስ መጠጦችን ወደ ካታሎግ ያክሉ' },                   defaultGranted: false },
  { slug: 'beverages:edit',          label: { en: 'Edit Product', am: 'ምርት አርትዕ' },                    group: { en: 'Products', am: 'ምርቶች' },          description: { en: 'Modify product details and pricing', am: 'የምርት ዝርዝሮችን እና ዋጋን ያስተካክሉ' },                 defaultGranted: false },
  { slug: 'beverages:delete',        label: { en: 'Delete Product', am: 'ምርት ሰርዝ' },                    group: { en: 'Products', am: 'ምርቶች' },          description: { en: 'Remove products from the catalog', am: 'ምርቶችን ከካታሎግ ያስወግዱ' },                   defaultGranted: false },
  { slug: 'beverages:stock',         label: { en: 'Adjust Stock', am: 'ክምችት አስተካክል' },                group: { en: 'Products', am: 'ምርቶች' },          description: { en: 'Manually adjust stock levels', am: 'የክምችት መጠንን በእጅ ያስተካክሉ' },                       defaultGranted: false },
  { slug: 'price-tiers:view',        label: { en: 'View Price Tiers', am: 'የዋጋ ደረጃዎችን ተመልከት' },     group: { en: 'Pricing', am: 'ዋጋ አወጣጥ' },       description: { en: 'See pricing tier configurations', am: 'የዋጋ ደረጃ ውቅሮችን ይመልከቱ' },                    defaultGranted: true  },
  { slug: 'price-tiers:create',      label: { en: 'Create Price Tier', am: 'የዋጋ ደረጃ ፍጠር' },            group: { en: 'Pricing', am: 'ዋጋ አወጣጥ' },       description: { en: 'Add new price tier categories', am: 'አዲስ የዋጋ ደረጃ ምድቦችን ያክሉ' },                      defaultGranted: false },
  { slug: 'price-tiers:edit',        label: { en: 'Edit Price Tier', am: 'የዋጋ ደረጃ አርትዕ' },             group: { en: 'Pricing', am: 'ዋጋ አወጣጥ' },       description: { en: 'Modify price tier names and configurations', am: 'የዋጋ ደረጃ ስሞችን እና ውቅሮችን ያስተካክሉ' },        defaultGranted: false },
  { slug: 'price-tiers:delete',      label: { en: 'Delete Price Tier', am: 'የዋጋ ደረጃ ሰርዝ' },            group: { en: 'Pricing', am: 'ዋጋ አወጣጥ' },       description: { en: 'Remove price tier categories', am: 'የዋጋ ደረጃ ምድቦችን ያስወግዱ' },                       defaultGranted: false },
  { slug: 'payment-accounts:view',   label: { en: 'View Payment Accounts', am: 'የክፍያ ሂሳቦችን ተመልከት' },  group: { en: 'Finance', am: 'ፋይናንስ' },         description: { en: 'See shop payment account details', am: 'የሱቅ የክፍያ ሂሳብ ዝርዝሮችን ይመልከቱ' },                  defaultGranted: true  },
  { slug: 'payment-accounts:create', label: { en: 'Add Payment Account', am: 'የክፍያ ሂሳብ ጨምር' },          group: { en: 'Finance', am: 'ፋይናንስ' },         description: { en: 'Add new bank/cash accounts', am: 'አዲስ የባንክ/የገንዘብ ሂሳቦችን ያክሉ' },                         defaultGranted: false },
  { slug: 'payment-accounts:edit',   label: { en: 'Edit Payment Account', am: 'የክፍያ ሂሳብ አርትዕ' },        group: { en: 'Finance', am: 'ፋይናንስ' },         description: { en: 'Modify payment account details', am: 'የክፍያ ሂሳብ ዝርዝሮችን ያስተካክሉ' },                     defaultGranted: false },
  { slug: 'payment-accounts:delete', label: { en: 'Delete Payment Account', am: 'የክፍያ ሂሳብ ሰርዝ' },       group: { en: 'Finance', am: 'ፋይናንስ' },         description: { en: 'Remove payment accounts', am: 'የክፍያ ሂሳቦችን ያስወግዱ' },                              defaultGranted: false },
  { slug: 'payments:view',           label: { en: 'View Payments', am: 'ክፍያዎችን ተመልከት' },             group: { en: 'Finance', am: 'ፋይናንስ' },         description: { en: 'See payment records', am: 'የክፍያ መዝገቦችን ይመልከቱ' },                                defaultGranted: true  },
  { slug: 'payments:record',         label: { en: 'Record Payment', am: 'ክፍያ መዝግብ' },                   group: { en: 'Finance', am: 'ፋይናንስ' },         description: { en: 'Log customer payments against sales', am: 'የደንበኛ ክፍያዎችን በሽያጮች ላይ ይመዝግቡ' },                defaultGranted: true  },
  { slug: 'payments:void',           label: { en: 'Void Payment', am: 'ክፍያ ሰርዝ' },                       group: { en: 'Finance', am: 'ፋይናንስ' },         description: { en: 'Reverse a recorded payment', am: 'የተመዘገበ ክፍያ ይቀልብሱ' },                           defaultGranted: false },
  { slug: 'orders:view',             label: { en: 'View Orders', am: 'ትዕዛዞችን ተመልከት' },                 group: { en: 'Orders', am: 'ትዕዛዞች' },          description: { en: 'See customer orders', am: 'የደንበኛ ትዕዛዞችን ይመልከቱ' },                                defaultGranted: true  },
  { slug: 'orders:confirm',          label: { en: 'Confirm Order', am: 'ትዕዛዝ አረጋግጥ' },                  group: { en: 'Orders', am: 'ትዕዛዞች' },          description: { en: 'Accept and fulfill a customer order', am: 'የደንበኛ ትዕዛዝ ይቀበሉ እና ያሟሉ' },                  defaultGranted: true  },
  { slug: 'orders:reject',           label: { en: 'Reject Order', am: 'ትዕዛዝ አትቀበል' },                    group: { en: 'Orders', am: 'ትዕዛዞች' },          description: { en: 'Decline a customer order', am: 'የደንበኛ ትዕዛዝ ውድቅ ያድርጉ' },                             defaultGranted: false },
  { slug: 'reports:view',            label: { en: 'View Reports', am: 'ሪፖርቶችን ተመልከት' },               group: { en: 'Reports', am: 'ሪፖርቶች' },         description: { en: 'Access sales and financial reports', am: 'የሽያጭ እና የፋይናንስ ሪፖርቶችን ይድረሱ' },                 defaultGranted: false },
  { slug: 'settings:view',           label: { en: 'View Settings', am: 'ቅንብሮችን ተመልከት' },               group: { en: 'Settings', am: 'ቅንብሮች' },        description: { en: 'See shop configuration', am: 'የሱቅ ውቅር ይመልከቱ' },                               defaultGranted: false },
  { slug: 'settings:edit',           label: { en: 'Edit Settings', am: 'ቅንብሮችን አርትዕ' },                  group: { en: 'Settings', am: 'ቅንብሮች' },        description: { en: 'Modify shop settings and preferences', am: 'የሱቅ ቅንብሮችን እና ምርጫዎችን ያስተካክሉ' },               defaultGranted: false },
  { slug: 'employees:view',          label: { en: 'View Employees', am: 'ሰራተኞችን ተመልከት' },              group: { en: 'Employees', am: 'ሰራተኞች' },       description: { en: 'See the employee list (Owner-level feature)', am: 'የሰራተኞችን ዝርዝር ይመልከቱ (የባለቤት ደረጃ ባህሪ)' },  defaultGranted: false },
];

export function getPermissionDef(slug: PermissionSlug): PermissionDef | undefined {
  return PERMISSION_REGISTRY.find(d => d.slug === slug);
}
