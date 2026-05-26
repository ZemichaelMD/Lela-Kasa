import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { useTranslation } from '../lib/i18n';
import { showToast } from '../components/Toast';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { palette, radius, spacing, type } from '../theme';
import { useTheme } from '../context/ThemeContext';

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      showToast(t('fillBothFields'), 'error');
      return;
    }
    setIsLoading(true);
    try {
      await login(identifier.trim(), password);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('invalidCredentials');
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const isPhone = /^[+]?[\d\s()-]+$/.test(identifier.trim()) && identifier.trim().length > 0;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.surface }]}
          onPress={() => navigation.goBack()}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <LanguageSwitcher />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand section */}
          <View style={styles.brand}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={[styles.headline, { color: colors.textPrimary }]}>{t('welcomeBack')}</Text>
            <Text style={[styles.subline, { color: colors.textSecondary }]}>{t('signInToManage')}</Text>
          </View>

          {/* Form card */}
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            {/* Identifier field */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {isPhone ? t('phoneNumber') : t('email')}
              </Text>
              <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Ionicons
                  name={isPhone ? 'call-outline' : 'mail-outline'}
                  size={18}
                  color={colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  value={identifier}
                  onChangeText={setIdentifier}
                  placeholder={isPhone ? '+251 9XX XXX XXX' : t('email')}
                  placeholderTextColor={colors.textMuted}
                  keyboardType={isPhone ? 'phone-pad' : 'email-address'}
                  autoCapitalize="none"
                  autoComplete={isPhone ? 'tel' : 'email'}
                  editable={!isLoading}
                />
              </View>
            </View>

            {/* Password field */}
            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>{t('password')}</Text>
                <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} hitSlop={8}>
                  <Text style={[styles.forgotLink, { color: colors.primary }]}>{t('forgotPassword')}</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  editable={!isLoading}
                  onSubmitEditing={handleLogin}
                  returnKeyType="go"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(v => !v)}
                  hitSlop={8}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Sign in button */}
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }, isLoading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <View style={styles.loadingRow}>
                  <Ionicons name="ellipsis-horizontal" size={20} color="#fff" />
                </View>
              ) : (
                <Text style={styles.primaryBtnText}>{t('signIn')}</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer links */}
          <View style={styles.links}>
            <View style={styles.linkRow}>
              <Text style={[styles.linkText, { color: colors.textSecondary }]}>{t('noAccount')} </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register' as never)} hitSlop={8}>
                <Text style={[styles.linkBold, { color: colors.primary }]}>{t('signUp')}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.ghostBtn, { borderColor: colors.border }]}
              onPress={() => navigation.navigate('CustomerLogin')}
              activeOpacity={0.7}
            >
              <Ionicons name="storefront-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.ghostBtnText, { color: colors.textSecondary }]}>{t('customerPortal')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingTop: spacing[2],
    paddingBottom: spacing[2],
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[8],
  },
  brand: {
    alignItems: 'center',
    paddingVertical: spacing[6],
  },
  logoImage: {
    width: 96,
    height: 96,
    borderRadius: 20,
    marginBottom: spacing[5],
  },
  headline: {
    ...type.h1,
    marginBottom: spacing[2],
    textAlign: 'center',
  },
  subline: {
    ...type.body,
    textAlign: 'center',
  },
  card: {
    borderRadius: radius.xl,
    padding: spacing[5],
    marginBottom: spacing[5],
    // subtle shadow handled by surface color contrast
  },
  field: {
    marginBottom: spacing[4],
  },
  label: {
    ...type.caption,
    fontWeight: '600',
    marginBottom: spacing[2],
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  forgotLink: {
    ...type.caption,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[4],
    height: 52,
  },
  inputIcon: {
    marginRight: spacing[3],
  },
  input: {
    ...type.body,
    flex: 1,
    paddingVertical: 0,
  },
  eyeBtn: {
    padding: spacing[2],
    marginRight: -spacing[1],
  },
  primaryBtn: {
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[2],
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: {
    ...type.bodyBold,
    fontSize: 16,
    color: '#fff',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  links: {
    alignItems: 'center',
    gap: spacing[4],
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkText: { ...type.body },
  linkBold: { ...type.bodyBold },
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  ghostBtnText: {
    ...type.bodyMedium,
    fontSize: 14,
  },
});
