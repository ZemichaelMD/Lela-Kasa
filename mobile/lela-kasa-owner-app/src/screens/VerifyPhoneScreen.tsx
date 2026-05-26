import React, { useEffect, useRef, useState } from 'react';
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
import { palette, radius, spacing, type } from '../theme';

const CODE_LENGTH = 6;

export default function VerifyPhoneScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'VerifyPhone'>>();
  const phone = route.params?.phone ?? '';

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [sending, setSending] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const refs = useRef<(TextInput | null)[]>([]);

  const code = digits.join('');

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
    setTimeout(() => refs.current[0]?.focus(), 300);
  }, []);

  const handleDigit = (index: number, value: string) => {
    const clean = value.replace(/\D/g, '');

    // Handle paste (multiple chars)
    if (clean.length > 1) {
      const pasted = clean.slice(0, CODE_LENGTH);
      const newDigits = [...digits];
      for (let i = 0; i < pasted.length; i++) {
        newDigits[i] = pasted[i];
      }
      setDigits(newDigits);
      const nextFocus = Math.min(pasted.length, CODE_LENGTH - 1);
      refs.current[nextFocus]?.focus();
      return;
    }

    const char = clean.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);

    if (char && index < CODE_LENGTH - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace') {
      if (digits[index]) {
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
      } else if (index > 0) {
        refs.current[index - 1]?.focus();
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
      }
    }
  };

  async function verify() {
    if (code.length !== CODE_LENGTH) {
      showToast(t('enterSixDigitCode'), 'error');
      return;
    }
    setVerifying(true);
    try {
      await getSdk().auth.verifyPhone(phone, code);
      showToast(t('phoneVerified'), 'success');
      navigation.goBack();
    } catch (e) {
      showToast(e instanceof Error ? e.message : t('verificationFailed'), 'error');
      // Clear code on failure
      setDigits(Array(CODE_LENGTH).fill(''));
      refs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  }

  const maskedPhone = phone.length > 4
    ? phone.slice(0, -4).replace(/\d/g, '•') + phone.slice(-4)
    : phone;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Back */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.surface }]}
          onPress={() => navigation.goBack()}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        {/* Icon */}
        <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="chatbubble-ellipses" size={32} color={colors.primary} />
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('verifyPhoneTitle')}</Text>
        <Text style={[styles.desc, { color: colors.textSecondary }]}>
          {t('verifyPhoneDesc')}
        </Text>
        <Text style={[styles.phone, { color: colors.textPrimary }]}>{maskedPhone}</Text>

        {/* OTP boxes */}
        <View style={styles.otpRow}>
          {digits.map((digit, index) => {
            const isFocused = focusedIndex === index;
            return (
              <View
                key={index}
                style={[
                  styles.otpBox,
                  {
                    backgroundColor: colors.surface,
                    borderColor: digit
                      ? colors.primary
                      : isFocused
                      ? colors.primary
                      : colors.border,
                    borderWidth: isFocused || digit ? 2 : 1.5,
                  },
                ]}
              >
                <TextInput
                  ref={el => { refs.current[index] = el; }}
                  style={[styles.otpInput, { color: colors.textPrimary }]}
                  value={digit}
                  onChangeText={v => handleDigit(index, v)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
                  onFocus={() => setFocusedIndex(index)}
                  onBlur={() => setFocusedIndex(-1)}
                  keyboardType="number-pad"
                  maxLength={CODE_LENGTH}
                  selectTextOnFocus
                  editable={!verifying}
                  caretHidden
                  textAlign="center"
                />
              </View>
            );
          })}
        </View>

        {/* Verify button */}
        <TouchableOpacity
          style={[
            styles.verifyBtn,
            { backgroundColor: code.length === CODE_LENGTH ? colors.primary : colors.surfaceMuted },
            verifying && styles.btnDisabled,
          ]}
          onPress={verify}
          disabled={verifying || code.length < CODE_LENGTH}
          activeOpacity={0.85}
        >
          {verifying ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={[styles.verifyBtnText, { color: code.length === CODE_LENGTH ? '#fff' : colors.textMuted }]}>
              {t('verify')}
            </Text>
          )}
        </TouchableOpacity>

        {/* Resend */}
        <View style={styles.resendRow}>
          <Text style={[styles.resendText, { color: colors.textSecondary }]}>
            {"Didn't receive it? "}
          </Text>
          <TouchableOpacity onPress={sendCode} disabled={sending} hitSlop={8}>
            {sending ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.resendLink, { color: colors.primary }]}>{t('resendCode')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
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
  body: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing[6],
    paddingTop: spacing[6],
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[5],
  },
  title: {
    ...type.h2,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  desc: {
    ...type.body,
    textAlign: 'center',
  },
  phone: {
    ...type.bodyBold,
    marginTop: spacing[1],
    marginBottom: spacing[7],
  },
  otpRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[7],
  },
  otpBox: {
    width: 48,
    height: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpInput: {
    width: '100%',
    height: '100%',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  verifyBtn: {
    alignSelf: 'stretch',
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[5],
  },
  btnDisabled: { opacity: 0.6 },
  verifyBtnText: {
    ...type.bodyBold,
    fontSize: 16,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resendText: { ...type.body },
  resendLink: { ...type.bodyBold },
});
