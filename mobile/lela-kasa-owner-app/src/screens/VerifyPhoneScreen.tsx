import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { getSdk } from '../lib/sdk';
import type { RootStackParamList } from '../navigation/types';
import { useTheme } from '../context/ThemeContext';
import { showToast } from '../components/Toast';
import { t } from '../lib/i18n';
import { radius, spacing, type } from '../theme';

/**
 * Confirms a phone number with the OTP sent during registration. A fresh code
 * is requested on mount so the screen also works when reached later from
 * Settings, well after the registration code has expired.
 */
export default function VerifyPhoneScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'VerifyPhone'>>();
  const phone = route.params?.phone ?? '';

  const [code, setCode] = useState('');
  const [sending, setSending] = useState(true);
  const [verifying, setVerifying] = useState(false);

  async function sendCode() {
    setSending(true);
    try {
      await getSdk().auth.requestOtp(phone, 'phone_verification');
      showToast(t('otpSent'), 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : t('otpSendFailed'), 'error');
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    void sendCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function verify() {
    if (code.trim().length !== 6) {
      showToast(t('enterSixDigitCode'), 'error');
      return;
    }
    setVerifying(true);
    try {
      await getSdk().auth.verifyPhone(phone, code.trim());
      showToast(t('phoneVerified'), 'success');
      navigation.goBack();
    } catch (e) {
      showToast(e instanceof Error ? e.message : t('verificationFailed'), 'error');
    } finally {
      setVerifying(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.surface }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="chatbubble-ellipses" size={32} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('verifyPhoneTitle')}
        </Text>
        <Text style={[styles.desc, { color: colors.textSecondary }]}>
          {t('verifyPhoneDesc')} {phone}
        </Text>

        <TextInput
          style={[
            styles.input,
            { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary },
          ]}
          value={code}
          onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          maxLength={6}
          editable={!verifying}
        />

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }, verifying && styles.disabled]}
          onPress={verify}
          disabled={verifying}
        >
          <Text style={[styles.buttonText, { color: colors.textInverse }]}>
            {verifying ? t('verifying') : t('verify')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.resend} onPress={sendCode} disabled={sending}>
          {sending ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.resendText, { color: colors.primary }]}>
              {t('resendCode')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { paddingHorizontal: spacing[6], paddingTop: spacing[4] },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[5],
  },
  title: { ...type.h2, textAlign: 'center', marginBottom: spacing[2] },
  desc: { ...type.body, textAlign: 'center', marginBottom: spacing[6] },
  input: {
    ...type.h2,
    alignSelf: 'stretch',
    textAlign: 'center',
    letterSpacing: 8,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing[4],
  },
  button: {
    alignSelf: 'stretch',
    borderRadius: radius.md,
    paddingVertical: spacing[4],
    alignItems: 'center',
    marginTop: spacing[4],
  },
  disabled: { opacity: 0.6 },
  buttonText: { ...type.bodyBold, fontSize: 17 },
  resend: { marginTop: spacing[6], padding: spacing[2] },
  resendText: { ...type.bodyBold },
});
