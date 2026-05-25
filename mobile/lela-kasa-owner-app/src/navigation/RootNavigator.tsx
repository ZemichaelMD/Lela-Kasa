import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from './types';
import MainTabs from './MainTabs';
import SubscriptionGate from '../components/SubscriptionGate';
import WelcomeScreen from '../screens/WelcomeScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import CustomerLoginScreen from '../screens/CustomerLoginScreen';
import CustomerPortalScreen from '../screens/CustomerPortalScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import VerifyPhoneScreen from '../screens/VerifyPhoneScreen';
import CustomerDetailScreen from '../screens/CustomerDetailScreen';
import SaleDetailScreen from '../screens/SaleDetailScreen';
import NewSaleScreen from '../screens/NewSaleScreen';
import PaymentDetailScreen from '../screens/PaymentDetailScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import BeveragesScreen from '../screens/BeveragesScreen';
import PriceTiersScreen from '../screens/PriceTiersScreen';
import PaymentAccountsScreen from '../screens/PaymentAccountsScreen';
import EmployeesScreen from '../screens/EmployeesScreen';
import EmployeePermissionsScreen from '../screens/EmployeePermissionsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

/** The tab app, gated behind an active/trial subscription. */
function GatedMainTabs() {
  return (
    <SubscriptionGate>
      <MainTabs />
    </SubscriptionGate>
  );
}

export default function RootNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <Stack.Screen name="MainTabs" component={GatedMainTabs} />
          <Stack.Screen name="VerifyPhone" component={VerifyPhoneScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="SaleDetail" component={SaleDetailScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="NewSale" component={NewSaleScreen} options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
          <Stack.Screen name="PaymentDetail" component={PaymentDetailScreen} options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
          <Stack.Screen name="Subscription" component={SubscriptionScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="BeveragesManagement" component={BeveragesScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="PriceTiersManagement" component={PriceTiersScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="PaymentAccountsManagement" component={PaymentAccountsScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="EmployeesManagement" component={EmployeesScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="EmployeePermissions" component={EmployeePermissionsScreen} options={{ animation: 'slide_from_right' }} />
        </>
      ) : (
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="Login" component={LoginScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="CustomerLogin" component={CustomerLoginScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="CustomerPortal" component={CustomerPortalScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ animation: 'slide_from_right' }} />
        </>
      )}
    </Stack.Navigator>
  );
}
