import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
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
import { radius, spacing, type } from '../theme';
import { useTheme } from '../context/ThemeContext';

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
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (config && !config.registrationOpen) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.topBar}>
            <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.surface }]} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <LanguageSwitcher />
          </View>
          <View style={styles.centerContent}>
            <Ionicons name="lock-closed-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.centerTitle, { color: colors.textPrimary }]}>{t('registrationClosed')}</Text>
            <Text style={[styles.centerDesc, { color: colors.textSecondary }]}>{t('registrationClosedDesc')}</Text>
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={() => navigation.goBack()}>
              <Text style={styles.buttonText}>{t('signIn')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.topBar}>
            <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.surface }]} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <LanguageSwitcher />
          </View>

          <View style={styles.form}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{t('createAccount')}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('createAccountDesc')}</Text>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t('fullName')} *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                value={name}
                onChangeText={setName}
                placeholder="Selam Tadesse"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
                editable={!isLoading}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t('email')} ({t('optional').toLowerCase()})</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isLoading}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t('shopName')} *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                value={shopName}
                onChangeText={setShopName}
                placeholder="My Beverage Shop"
                placeholderTextColor={colors.textMuted}
                editable={!isLoading}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t('phoneNumber')} *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                value={phone}
                onChangeText={setPhone}
                placeholder="+251 9XX XXX XXX"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                editable={!isLoading}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t('password')} *</Text>
              <View style={[styles.passwordContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.passwordInput, { color: colors.textPrimary }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  editable={!isLoading}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.passwordToggle}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.passwordHint, { color: colors.textMuted }]}>
                {t('passwordMin')} {config?.passwordMinLength ?? 8} {t('characters')}
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t('confirmPassword')} *</Text>
              <View style={[styles.passwordContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.passwordInput, { color: colors.textPrimary }]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showConfirm}
                  editable={!isLoading}
                  onSubmitEditing={handleRegister}
                  returnKeyType="done"
                />
                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.passwordToggle}>
                  <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }, isLoading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>
                {isLoading ? t('creatingAccount') : t('createAccount')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.loginLink} onPress={() => navigation.goBack()}>
              <Text style={[styles.loginText, { color: colors.textSecondary }]}>{t('alreadyHaveAccount')} </Text>
              <Text style={[styles.loginTextBold, { color: colors.primary }]}>{t('signIn')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: spacing[6], paddingTop: spacing[4] },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[8] },
  backButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  form: { flex: 1 },
  title: { ...type.h1, marginBottom: spacing[2] },
  subtitle: { ...type.body, marginBottom: spacing[8] },
  field: { marginBottom: spacing[4] },
  label: { ...type.caption, marginBottom: spacing[2] },
  input: { ...type.body, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing[4], paddingVertical: spacing[3] },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing[4] },
  passwordInput: { ...type.body, flex: 1, paddingVertical: spacing[3] },
  passwordToggle: { padding: spacing[2] },
  passwordHint: { ...type.micro, marginTop: spacing[1] },
  button: { borderRadius: radius.md, paddingVertical: spacing[4], alignItems: 'center', marginTop: spacing[3] },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { ...type.bodyBold, fontSize: 17 },
  loginLink: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing[6], alignItems: 'center' },
  loginText: { ...type.body },
  loginTextBold: { ...type.bodyBold },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing[6] },
  centerTitle: { ...type.h3, marginTop: spacing[4], marginBottom: spacing[2], textAlign: 'center' },
  centerDesc: { ...type.body, textAlign: 'center', marginBottom: spacing[8] },
});
