export type RootStackParamList = {
  Welcome: undefined;
  Onboarding: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  VerifyPhone: { phone: string };
  MainTabs: undefined;
  CustomerDetail: { customerId: string; customerName: string };
  SaleDetail: { saleId: string };
  NewSale: { customerId?: string };
  PaymentDetail: { paymentId: string; saleId: string | null };
  Subscription: undefined;
  BeveragesManagement: undefined;
  PriceTiersManagement: undefined;
  PaymentAccountsManagement: undefined;
  EmployeesManagement: undefined;
  EmployeePermissions: { employeeId: string; employeeName: string };
};

export type MainTabParamList = {
  Dashboard: undefined;
  Customers: undefined;
  Sales: undefined;
  Reports: undefined;
  Settings: undefined;
};
