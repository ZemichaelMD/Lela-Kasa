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
import CustomerLoginPage from '@/pages/customer-login';
import CustomerPortalPage from '@/pages/customer-portal';
const CustomerOrderPage = lazy(() => import('@/pages/customer-order'));
import VerifyPage from '@/pages/verify';

const HomePage = lazy(() => import('@/pages/home'));
const RegisterPage = lazy(() => import('@/pages/register'));
const DashboardPage = lazy(() => import('@/pages/dashboard'));
const SalesPage = lazy(() => import('@/pages/sales'));
const SaleDetailPage = lazy(() => import('@/pages/sale-detail'));
const CustomersPage = lazy(() => import('@/pages/customers'));
const CustomerDetailPage = lazy(() => import('@/pages/customer-detail'));
const BeveragesPage = lazy(() => import('@/pages/beverages'));
const BeverageDetailPage = lazy(() => import('@/pages/beverage-detail'));
const OrdersPage = lazy(() => import('@/pages/orders'));
const PriceTiersPage = lazy(() => import('@/pages/price-tiers'));
const PriceTierDetailPage = lazy(() => import('@/pages/price-tier-detail'));
const PaymentAccountsPage = lazy(() => import('@/pages/payment-accounts'));
const PaymentAccountDetailPage = lazy(() => import('@/pages/payment-account-detail'));
const EmployeesPage = lazy(() => import('@/pages/employees'));
const SettingsPage = lazy(() => import('@/pages/settings'));
const ReportsPage = lazy(() => import('@/pages/reports'));
const SubscriptionPage = lazy(() => import('@/pages/subscription'));
const EmployeePermissionsPage = lazy(() => import('@/pages/employee-permissions'));
const EmployeeDetailPage = lazy(() => import('@/pages/employee-detail'));

function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-r-transparent" />
    </div>
  );
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
    path: '/verify',
    element: <VerifyPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: '/customer-login',
    element: <CustomerLoginPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: '/customer-portal/:customerId',
    element: (
      <Suspense fallback={<PageLoader />}>
        <CustomerPortalPage />
      </Suspense>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: '/customer-portal/:customerId/order',
    element: (
      <Suspense fallback={<PageLoader />}>
        <CustomerOrderPage />
      </Suspense>
    ),
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
      { index: true, element: <Navigate to="/sales" replace /> },
      {
        path: 'dashboard',
        element: (
          <Suspense fallback={<PageLoader />}>
            <DashboardPage />
          </Suspense>
        ),
      },
      {
        path: 'orders',
        element: (
          <Suspense fallback={<PageLoader />}>
            <OrdersPage />
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
        path: 'employees/:id',
        element: (
          <RequireOwner>
            <Suspense fallback={<PageLoader />}>
              <EmployeeDetailPage />
            </Suspense>
          </RequireOwner>
        ),
      },
      {
        path: 'employees/:id/permissions',
        element: (
          <RequireOwner>
            <Suspense fallback={<PageLoader />}>
              <EmployeePermissionsPage />
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
      {
        path: 'subscription',
        element: (
          <Suspense fallback={<PageLoader />}>
            <SubscriptionPage />
          </Suspense>
        ),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
