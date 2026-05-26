import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/app-shell';
import { RequireAuth } from '@/components/require-auth';
import { RequireOwner } from '@/components/require-owner';
import { RouteErrorBoundary } from '@/components/route-error-boundary';
import LoginPage from '@/pages/login';
import ForgotPasswordPage from '@/pages/forgot-password';
import ResetPasswordPage from '@/pages/reset-password';
import NotFoundPage from '@/pages/not-found';

const HomePage = lazy(() => import('@/pages/home'));
const RegisterPage = lazy(() => import('@/pages/register'));
const DashboardPage = lazy(() => import('@/pages/dashboard'));
const SalesPage = lazy(() => import('@/pages/sales'));
const SaleDetailPage = lazy(() => import('@/pages/sale-detail'));
const CustomersPage = lazy(() => import('@/pages/customers'));
const CustomerDetailPage = lazy(() => import('@/pages/customer-detail'));
const BeveragesPage = lazy(() => import('@/pages/beverages'));
const BeverageDetailPage = lazy(() => import('@/pages/beverage-detail'));
const PriceTiersPage = lazy(() => import('@/pages/price-tiers'));
const PriceTierDetailPage = lazy(() => import('@/pages/price-tier-detail'));
const PaymentAccountsPage = lazy(() => import('@/pages/payment-accounts'));
const PaymentAccountDetailPage = lazy(() => import('@/pages/payment-account-detail'));
const EmployeesPage = lazy(() => import('@/pages/employees'));
const UsersPage = lazy(() => import('@/pages/users'));
const UserDetailPage = lazy(() => import('@/pages/user-detail'));
const ShopsPage = lazy(() => import('@/pages/shops'));
const ShopDetailPage = lazy(() => import('@/pages/shop-detail'));
const AuditLogsPage = lazy(() => import('@/pages/audit-logs'));
const SettingsPage = lazy(() => import('@/pages/settings'));
const SystemSettingsPage = lazy(() => import('@/pages/system-settings'));
const ReportsPage = lazy(() => import('@/pages/reports'));
const SubscriptionsPage = lazy(() => import('@/pages/subscriptions'));
const PlansPage = lazy(() => import('@/pages/plans'));

import { useAuthContext } from '@/lib/auth-context';

function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-r-transparent" />
    </div>
  );
}

function IndexRedirect() {
  const { user } = useAuthContext();
  const target = user?.role === 'SUPER_ADMIN' ? '/dashboard' : '/sales';
  return <Navigate to={target} replace />;
}

export const router = createBrowserRouter([
  {
    path: '/home',
    element: (
      <Suspense fallback={<PageLoader />}>
        <HomePage />
      </Suspense>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: '/login',
    element: <LoginPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: '/register',
    element: (
      <Suspense fallback={<PageLoader />}>
        <RegisterPage />
      </Suspense>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: '/reset-password',
    element: <ResetPasswordPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <IndexRedirect /> },
      {
        path: 'dashboard',
        element: (
          <Suspense fallback={<PageLoader />}>
            <DashboardPage />
          </Suspense>
        ),
      },
      {
        path: 'sales',
        element: (
          <Suspense fallback={<PageLoader />}>
            <SalesPage />
          </Suspense>
        ),
      },
      {
        path: 'sales/:id',
        element: (
          <Suspense fallback={<PageLoader />}>
            <SaleDetailPage />
          </Suspense>
        ),
      },
      {
        path: 'customers',
        element: (
          <Suspense fallback={<PageLoader />}>
            <CustomersPage />
          </Suspense>
        ),
      },
      {
        path: 'customers/:id',
        element: (
          <Suspense fallback={<PageLoader />}>
            <CustomerDetailPage />
          </Suspense>
        ),
      },
      {
        path: 'shops',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ShopsPage />
          </Suspense>
        ),
      },
      {
        path: 'shops/:id',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ShopDetailPage />
          </Suspense>
        ),
      },
      {
        path: 'audit-logs',
        element: (
          <Suspense fallback={<PageLoader />}>
            <AuditLogsPage />
          </Suspense>
        ),
      },
      {
        path: 'system',
        element: (
          <Suspense fallback={<PageLoader />}>
            <SystemSettingsPage />
          </Suspense>
        ),
      },
      {
        path: 'subscriptions',
        element: (
          <Suspense fallback={<PageLoader />}>
            <SubscriptionsPage />
          </Suspense>
        ),
      },
      {
        path: 'plans',
        element: (
          <Suspense fallback={<PageLoader />}>
            <PlansPage />
          </Suspense>
        ),
      },
      {
        path: 'beverages',
        element: (
          <Suspense fallback={<PageLoader />}>
            <BeveragesPage />
          </Suspense>
        ),
      },
      {
        path: 'beverages/:id',
        element: (
          <Suspense fallback={<PageLoader />}>
            <BeverageDetailPage />
          </Suspense>
        ),
      },
      {
        path: 'price-tiers',
        element: (
          <Suspense fallback={<PageLoader />}>
            <PriceTiersPage />
          </Suspense>
        ),
      },
      {
        path: 'price-tiers/:id',
        element: (
          <Suspense fallback={<PageLoader />}>
            <PriceTierDetailPage />
          </Suspense>
        ),
      },
      {
        path: 'payment-accounts',
        element: (
          <Suspense fallback={<PageLoader />}>
            <PaymentAccountsPage />
          </Suspense>
        ),
      },
      {
        path: 'payment-accounts/:id',
        element: (
          <Suspense fallback={<PageLoader />}>
            <PaymentAccountDetailPage />
          </Suspense>
        ),
      },
      {
        path: 'users',
        element: (
          <Suspense fallback={<PageLoader />}>
            <UsersPage />
          </Suspense>
        ),
      },
      {
        path: 'users/:id',
        element: (
          <Suspense fallback={<PageLoader />}>
            <UserDetailPage />
          </Suspense>
        ),
      },
      {
        path: 'employees',
        element: (
          <RequireOwner>
            <Suspense fallback={<PageLoader />}>
              <EmployeesPage />
            </Suspense>
          </RequireOwner>
        ),
      },
      {
        path: 'settings',
        element: (
          <Suspense fallback={<PageLoader />}>
            <SettingsPage />
          </Suspense>
        ),
      },
      {
        path: 'reports',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ReportsPage />
          </Suspense>
        ),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
