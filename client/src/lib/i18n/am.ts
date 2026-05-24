import { common } from './am/common';
import { nav } from './am/nav';
import { sales } from './am/sales';
import { dashboard } from './am/dashboard';
import { home } from './am/home';
import { customers } from './am/customers';
import { beverages } from './am/beverages';
import { settings } from './am/settings';
import { priceTiers } from './am/price-tiers';
import { reports } from './am/reports';
import { employees } from './am/employees';
import { auth } from './am/auth';
import { billing } from './am/billing';
import { subscription } from './am/subscription';
import { portal } from './am/portal';
import { chatbot } from './am/chatbot';
import { orders } from './am/orders';

export const am = {
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
  ...subscription,
  ...portal,
  ...chatbot,
  ...orders,
} as const;
