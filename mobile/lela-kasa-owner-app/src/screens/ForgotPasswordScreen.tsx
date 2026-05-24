import React, { useState } from 'react';
import {
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

import type { RootStackParamList } from '../navigation/types';
import { getSdk } from '../lib/sdk';
import { useTranslation } from '../lib/i18n';
import { showToast } from '../components/Toast';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { radius, spacing, type } from '../theme';
import { useTheme } from '../context/ThemeContext';

export default function ForgotPasswordScreen() {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const { colors } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const isPhone = /^[+]?[\d\s()-]+$/.test(emailOrPhone.trim());

  const handleReset = async () => {
    if (!emailOrPhone.trim()) {
      showToast(t('enterEmailOrPhone'), 'error');
      return;
    }
    setIsLoading(true);
    try {
      if (isPhone) {
        await getSdk().auth.forgotPasswordPhone({ phone: emailOrPhone.trim() });
      } else {
        await getSdk().auth.forgotPassword({ email: emailOrPhone.trim() });
      }
      setSent(true);
      showToast(t('resetLinkSent'), 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('resetFailed');
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.topBar}>
            <TouchableOpacity
              style={[styles.backButton, { backgroundColor: colors.surface }]}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <LanguageSwitcher />
          </View>

          <View style={styles.form}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="lock-closed-outline" size={40} color={colors.primary} />
            </View>

            <Text style={[styles.title, { color: colors.textPrimary }]}>{t('forgotPassword')}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {sent ? t('resetLinkSentDesc') : t('forgotPasswordDesc')}
            </Text>

            {!sent && (
              <>
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>{t('emailOrPhone')}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                    value={emailOrPhone}
                    onChangeText={setEmailOrPhone}
                    placeholder={isPhone ? '+251 9XX XXX XXX' : 'shop@example.com'}
                    placeholderTextColor={colors.textMuted}
                    keyboardType={isPhone ? 'phone-pad' : 'email-address'}
                    autoCapitalize="none"
                    autoComplete={isPhone ? 'tel' : 'email'}
                    editable={!isLoading}
                    onSubmitEditing={handleReset}
                    returnKeyType="done"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.button, { backgroundColor: colors.primary }, isLoading && styles.buttonDisabled]}
                  onPress={handleReset}
                  disabled={isLoading}
                >
                  <Text style={styles.buttonText}>
                    {isLoading ? t('sending') : t('sendResetLink')}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {sent && (
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={styles.buttonText}>{t('backToLogin')}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => navigation.goBack()}
            >
              <Text style={[styles.loginText, { color: colors.textSecondary }]}>{t('rememberPassword')} </Text>
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
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: spacing[6], paddingTop: spacing[4] },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[8] },
  backButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  form: { flex: 1 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: spacing[6] },
  title: { ...type.h1, marginBottom: spacing[2] },
  subtitle: { ...type.body, marginBottom: spacing[8] },
  field: { marginBottom: spacing[5] },
  label: { ...type.caption, marginBottom: spacing[2] },
  input: { ...type.body, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing[4], paddingVertical: spacing[3] },
  button: { borderRadius: radius.md, paddingVertical: spacing[4], alignItems: 'center', marginTop: spacing[3] },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { ...type.bodyBold, fontSize: 17 },
  loginLink: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing[6], alignItems: 'center' },
  loginText: { ...type.body },
  loginTextBold: { ...type.bodyBold },
});
