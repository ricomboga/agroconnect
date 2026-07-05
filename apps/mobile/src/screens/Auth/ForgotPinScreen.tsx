import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import type { AuthStackParamList } from '../../navigation/types';

type ForgotPinNav = NativeStackNavigationProp<AuthStackParamList, 'ForgotPin'>;

const BASE_URL = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3000/api/v1';

/** Strip non-digits, then reformat as +254XXXXXXXXX */
function formatKenyaPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '+254';
  if (digits.startsWith('254')) return `+${digits.slice(0, 12)}`;
  if (digits.startsWith('0')) return `+254${digits.slice(1, 10)}`;
  return `+254${digits.slice(0, 9)}`;
}

export function ForgotPinScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<ForgotPinNav>();

  const [phone, setPhone] = useState('+254');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePhoneChange = (raw: string) => {
    if (raw.startsWith('+')) setPhone(raw);
    else setPhone(formatKenyaPhone(raw));
  };

  const isValidPhone = /^\+2547\d{8}$|^\+2541\d{8}$/.test(phone);

  const handleSendCode = async () => {
    if (!isValidPhone) {
      setError(t('auth.forgotPin.error.phoneInvalid'));
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch(`${BASE_URL}/auth/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: { message?: string }; message_key?: string };
        throw new Error(body.error?.message ?? body.message_key ?? t('auth.error.networkError'));
      }
      navigation.navigate('ResetPin', { phone });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.error.networkError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.container}>
          <Pressable style={styles.backRow} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← {t('common.back')}</Text>
          </Pressable>

          <Text style={styles.title}>{t('auth.forgotPin.title')}</Text>
          <Text style={styles.subtitle}>{t('auth.forgotPin.subtitle')}</Text>

          <Text style={styles.fieldLabel}>{t('auth.login.phoneLabel')}</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={handlePhoneChange}
            keyboardType="phone-pad"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isSubmitting}
            placeholder="+254 7__ ___ ___"
            placeholderTextColor="#9CA3AF"
            accessibilityLabel={t('auth.login.phoneLabel')}
          />

          {error != null && <Text style={styles.errorText}>{error}</Text>}

          <Pressable
            style={styles.submitBtn}
            onPress={() => void handleSendCode()}
            disabled={isSubmitting}
            accessibilityRole="button"
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitText}>{t('auth.forgotPin.sendCode')}</Text>
            )}
          </Pressable>
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
  title: { fontSize: 24, fontWeight: '800', color: '#1B5E20', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#555555', lineHeight: 20, marginBottom: 28 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    marginBottom: 12,
  },
  errorText: { color: '#B00020', fontSize: 13, marginBottom: 12 },
  submitBtn: {
    backgroundColor: '#1A6B3C',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginTop: 8,
  },
  submitText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
