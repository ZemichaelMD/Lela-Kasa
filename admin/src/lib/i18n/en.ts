import { common } from './en/common';
import { nav } from './en/nav';
import { sales } from './en/sales';
import { dashboard } from './en/dashboard';
import { home } from './en/home';
import { customers } from './en/customers';
import { beverages } from './en/beverages';
import { settings } from './en/settings';
import { priceTiers } from './en/price-tiers';
import { reports } from './en/reports';
import { employees } from './en/employees';
import { auth } from './en/auth';
import { billing } from './en/billing';

export const en = {
  ...common,
  ...nav,
  ...sales,
  ...dashboard,
  ...home,
  ...customers,
  ...beverages,
  ...settings,
  ...priceTiers,
  ...reports,
  ...employees,
  ...auth,
  ...billing,
} as const;
