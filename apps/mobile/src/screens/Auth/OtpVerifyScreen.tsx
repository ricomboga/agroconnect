import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUiStore } from '../../store/ui.store';
import type { AuthStackParamList } from '../../navigation/types';

type OtpNav   = NativeStackNavigationProp<AuthStackParamList, 'OtpVerify'>;
type OtpRoute = RouteProp<AuthStackParamList, 'OtpVerify'>;

const BASE_URL = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1';
const RESEND_SECONDS = 60;

export function OtpVerifyScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<OtpNav>();
  const { params } = useRoute<OtpRoute>();
  const showToast = useUiStore((s) => s.showToast);

  const inputRef = useRef<TextInput>(null);
  const [otp, setOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [error, setError] = useState<string | null>(null);

  // Start countdown on mount
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleVerify = useCallback(async (code: string) => {
    if (code.length < 6) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch(`${BASE_URL}/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: params.phone, otp: code }),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: { message?: string } };
        throw new Error(body.error?.message ?? t('auth.otp.error.invalid'));
      }
      showToast(t('auth.otp.success'), 'success');
      navigation.navigate('Login');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.otp.error.invalid'));
      // Clear the OTP input so user can retry cleanly
      setOtp('');
      inputRef.current?.focus();
    } finally {
      setIsSubmitting(false);
    }
  }, [params.phone, navigation, showToast, t]);

  const handleOtpChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 6);
    setOtp(digits);
    setError(null);
    if (digits.length === 6) {
      void handleVerify(digits);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setError(null);
    try {
      await fetch(`${BASE_URL}/auth/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: params.phone }),
      });
      setCountdown(RESEND_SECONDS);
      setOtp('');
      inputRef.current?.focus();
    } catch {
      setError(t('auth.error.networkError'));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <Pressable style={styles.backRow} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← {t('common.back')}</Text>
          </Pressable>

          <Text style={styles.title}>{t('auth.otp.title')}</Text>
          <Text style={styles.subtitle}>
            {t('auth.otp.subtitle', { phone: params.phone })}
          </Text>

          {/* Hidden input drives the value; boxes show characters */}
          <TextInput
            ref={inputRef}
            style={styles.hiddenInput}
            value={otp}
            onChangeText={handleOtpChange}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
            editable={!isSubmitting}
          />

          {/* Visual OTP boxes */}
          <Pressable
            style={styles.otpRow}
            onPress={() => inputRef.current?.focus()}
            accessibilityRole="button"
            accessibilityLabel="OTP input"
          >
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <View
                key={i}
                style={[
                  styles.otpBox,
                  otp.length === i && styles.otpBoxActive,
                  !!error && styles.otpBoxError,
                ]}
              >
                <Text style={styles.otpChar}>{otp[i] ?? ''}</Text>
              </View>
            ))}
          </Pressable>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Loading indicator while submitting */}
          {isSubmitting ? (
            <ActivityIndicator style={styles.spinner} color="#1B5E20" size="large" />
          ) : null}

          {/* Resend */}
          <View style={styles.resendRow}>
            {countdown > 0 ? (
              <Text style={styles.resendCountdown}>
                {t('auth.otp.resendIn', { seconds: countdown })}
              </Text>
            ) : (
              <Pressable
                style={styles.resendBtn}
                onPress={() => void handleResend()}
                disabled={isResending}
              >
                {isResending ? (
                  <ActivityIndicator color="#2E7D32" size="small" />
                ) : (
                  <Text style={styles.resendText}>{t('auth.otp.resend')}</Text>
                )}
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
  backRow: { minHeight: 48, justifyContent: 'center', marginBottom: 8 },
  backText: { color: '#2E7D32', fontSize: 15 },
  title: { fontSize: 28, fontWeight: '800', color: '#1B5E20', marginBottom: 10 },
  subtitle: { fontSize: 15, color: '#555555', lineHeight: 22, marginBottom: 36 },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  otpRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginBottom: 20,
  },
  otpBox: {
    width: 48,
    height: 60,
    borderWidth: 2,
    borderColor: '#C8E6C9',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  otpBoxActive: {
    borderColor: '#1B5E20',
    backgroundColor: '#FFFFFF',
  },
  otpBoxError: {
    borderColor: '#B00020',
  },
  otpChar: { fontSize: 24, fontWeight: '700', color: '#111111' },
  errorText: {
    color: '#B00020',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  spinner: { marginVertical: 16 },
  resendRow: {
    marginTop: 24,
    alignItems: 'center',
  },
  resendCountdown: { color: '#9E9E9E', fontSize: 14 },
  resendBtn: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 16 },
  resendText: { color: '#2E7D32', fontSize: 15, fontWeight: '600' },
});
