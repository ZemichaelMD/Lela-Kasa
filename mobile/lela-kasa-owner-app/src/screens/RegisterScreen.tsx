import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { getSdk } from '../lib/sdk';
import { useTranslation } from '../lib/i18n';
import { showToast } from '../components/Toast';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { palette, radius, spacing, type } from '../theme';
import { useTheme } from '../context/ThemeContext';

type StrengthRule = { label: string; pass: boolean };

function getStrengthRules(pw: string, minLen: number): StrengthRule[] {
  return [
    { label: `${minLen}+ chars`, pass: pw.length >= minLen },
    { label: 'Uppercase', pass: /[A-Z]/.test(pw) },
    { label: 'Lowercase', pass: /[a-z]/.test(pw) },
    { label: 'Number', pass: /[0-9]/.test(pw) },
  ];
}

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [shopName, setShopName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<{ registrationOpen: boolean; passwordMinLength: number } | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  const { register } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    getSdk().auth.config()
      .then(setConfig)
      .catch(() => setConfig({ registrationOpen: true, passwordMinLength: 8 }))
      .finally(() => setLoadingConfig(false));
  }, []);

  const handleRegister = async () => {
    if (!name.trim() || !shopName.trim() || !phone.trim()) {
      showToast(t('fillRequiredFields'), 'error');
      return;
    }
    if (password !== confirmPassword) {
      showToast(t('passwordsDoNotMatch'), 'error');
      return;
    }
    const minLen = config?.passwordMinLength ?? 8;
    if (password.length < minLen) {
      showToast(t('passwordTooShort'), 'error');
      return;
    }
    setIsLoading(true);
    try {
      await register(name, email, password, shopName, phone);
      showToast(t('registrationSuccess'), 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('registrationFailed');
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (loadingConfig) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (config && !config.registrationOpen) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={styles.topBar}>
          <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.surface }]} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <View style={[styles.iconWrap, { backgroundColor: colors.surfaceMuted }]}>
            <Ionicons name="lock-closed-outline" size={32} color={colors.textMuted} />
          </View>
          <Text style={[styles.closedTitle, { color: colors.textPrimary }]}>{t('registrationClosed')}</Text>
          <Text style={[styles.closedDesc, { color: colors.textSecondary }]}>{t('registrationClosedDesc')}</Text>
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryBtnText}>{t('signIn')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const minLen = config?.passwordMinLength ?? 8;
  const strengthRules = password.length > 0 ? getStrengthRules(password, minLen) : null;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top bar */}
          <View style={styles.topBar}>
            <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.surface }]} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <LanguageSwitcher />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headline, { color: colors.textPrimary }]}>{t('createAccount')}</Text>
            <Text style={[styles.subline, { color: colors.textSecondary }]}>{t('createAccountDesc')}</Text>
          </View>

          {/* Form card */}
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Field label={`${t('fullName')} *`} colors={colors}>
              <InputRow icon="person-outline" colors={colors}>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Selam Tadesse"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="words"
                  editable={!isLoading}
                />
              </InputRow>
            </Field>

            <Field label={`${t('shopName')} *`} colors={colors}>
              <InputRow icon="storefront-outline" colors={colors}>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  value={shopName}
                  onChangeText={setShopName}
                  placeholder="My Beverage Shop"
                  placeholderTextColor={colors.textMuted}
                  editable={!isLoading}
                />
              </InputRow>
            </Field>

            <Field label={`${t('phoneNumber')} *`} colors={colors}>
              <InputRow icon="call-outline" colors={colors}>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+251 9XX XXX XXX"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                  editable={!isLoading}
                />
              </InputRow>
            </Field>

            <Field label={`${t('email')} (${t('optional').toLowerCase()})`} colors={colors}>
              <InputRow icon="mail-outline" colors={colors}>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!isLoading}
                />
              </InputRow>
            </Field>

            <Field label={`${t('password')} *`} colors={colors}>
              <InputRow icon="lock-closed-outline" colors={colors}>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  editable={!isLoading}
                />
                <TouchableOpacity onPress={() => setShowPassword(v => !v)} hitSlop={8} style={styles.eyeBtn}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </InputRow>
              {/* Password strength */}
              {strengthRules && (
                <View style={styles.strengthRow}>
                  {strengthRules.map(rule => (
                    <View key={rule.label} style={styles.strengthItem}>
                      <View style={[styles.strengthDot, { backgroundColor: rule.pass ? colors.success : colors.border }]} />
                      <Text style={[styles.strengthLabel, { color: rule.pass ? colors.success : colors.textMuted }]}>
                        {rule.label}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </Field>

            <Field label={`${t('confirmPassword')} *`} colors={colors}>
              <InputRow icon="lock-closed-outline" colors={colors}>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showConfirm}
                  editable={!isLoading}
                  onSubmitEditing={handleRegister}
                  returnKeyType="go"
                />
                <TouchableOpacity onPress={() => setShowConfirm(v => !v)} hitSlop={8} style={styles.eyeBtn}>
                  <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </InputRow>
              {confirmPassword.length > 0 && password !== confirmPassword && (
                <Text style={[styles.errorHint, { color: colors.danger }]}>{t('passwordsDoNotMatch')}</Text>
              )}
            </Field>

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }, isLoading && styles.btnDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>{t('createAccount')}</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>{t('alreadyHaveAccount')} </Text>
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
              <Text style={[styles.footerLink, { color: colors.primary }]}>{t('signIn')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children, colors }: { label: string; children: React.ReactNode; colors: any }) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      {children}
    </View>
  );
}

function InputRow({ icon, children, colors }: { icon: string; children: React.ReactNode; colors: any }) {
  return (
    <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
      <Ionicons name={icon as any} size={18} color={colors.textMuted} style={styles.inputIcon} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing[6] },
  scroll: { flexGrow: 1, paddingHorizontal: spacing[5], paddingBottom: spacing[8] },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing[2],
    paddingBottom: spacing[2],
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  header: { paddingVertical: spacing[5] },
  headline: { ...type.h1, marginBottom: spacing[2] },
  subline: { ...type.body },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[5],
  },
  closedTitle: { ...type.h3, marginBottom: spacing[2], textAlign: 'center' },
  closedDesc: { ...type.body, textAlign: 'center', marginBottom: spacing[6] },
  card: {
    borderRadius: radius.xl,
    padding: spacing[5],
    marginBottom: spacing[5],
  },
  field: { marginBottom: spacing[4] },
  label: { ...type.caption, fontWeight: '600', marginBottom: spacing[2] },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[4],
    height: 52,
  },
  inputIcon: { marginRight: spacing[3] },
  input: { ...type.body, flex: 1, paddingVertical: 0 },
  eyeBtn: { padding: spacing[2], marginRight: -spacing[1] },
  strengthRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  strengthItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  strengthDot: { width: 7, height: 7, borderRadius: 3.5 },
  strengthLabel: { ...type.micro },
  errorHint: { ...type.micro, marginTop: spacing[1] },
  primaryBtn: {
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[2],
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { ...type.bodyBold, fontSize: 16, color: '#fff' },
  footerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { ...type.body },
  footerLink: { ...type.bodyBold },
});
