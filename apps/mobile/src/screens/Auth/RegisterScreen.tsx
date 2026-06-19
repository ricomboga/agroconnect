import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';
import { useAuthStore } from '../../stores/authStore';
import { KENYA_COUNTIES } from '../../constants/counties';
import type { AuthStackParamList } from '../../navigation/types';

type RegisterNav = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

const BASE_URL = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1';

const KE_PHONE_RE = /^\+2547\d{8}$|^\+2541\d{8}$/;

const registerSchema = z
  .object({
    full_name: z.string().min(2, 'nameRequired'),
    phone: z.string().regex(KE_PHONE_RE, 'phoneInvalid'),
    county: z.string().min(1, 'countyRequired'),
    password: z.string().min(8, 'passwordShort'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'passwordMismatch',
    path: ['confirmPassword'],
  });

type FieldErrors = Partial<Record<'full_name' | 'phone' | 'county' | 'password' | 'confirmPassword', string>>;

function formatKenyaPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '+254';
  if (digits.startsWith('254')) return `+${digits.slice(0, 12)}`;
  if (digits.startsWith('0')) return `+254${digits.slice(1, 10)}`;
  return `+254${digits.slice(0, 9)}`;
}

export function RegisterScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<RegisterNav>();
  const login = useAuthStore((s) => s.login);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('+254');
  const [county, setCounty] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [countyPickerOpen, setCountyPickerOpen] = useState(false);

  const handlePhoneChange = (raw: string) => {
    if (raw.startsWith('+')) {
      setPhone(raw);
    } else {
      setPhone(formatKenyaPhone(raw));
    }
  };

  const handleSubmit = async () => {
    setApiError(null);
    setFieldErrors({});

    const result = registerSchema.safeParse({ full_name: fullName, phone, county, password, confirmPassword });
    if (!result.success) {
      const errors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof FieldErrors;
        const msgKey = issue.message as string;
        errors[key] = t(`auth.register.error.${msgKey}`);
      }
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: result.data.phone,
          password: result.data.password,
          full_name: result.data.full_name,
          role: 'farmer',
          county: result.data.county,
          language: i18n.language,
        }),
      });

      if (!res.ok) {
        const body = await res.json() as { error?: { message?: string } };
        throw new Error(body.error?.message ?? t('auth.error.networkError'));
      }

      // Send OTP then navigate to verification
      await fetch(`${BASE_URL}/auth/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: result.data.phone }),
      });

      navigation.navigate('OtpVerify', { phone: result.data.phone });
    } catch (err) {
      setApiError(err instanceof Error ? err.message : t('auth.error.networkError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable style={styles.backRow} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← {t('common.back')}</Text>
          </Pressable>

          <Text style={styles.title}>{t('auth.register.title')}</Text>

          {/* Full name */}
          <Field
            label={t('auth.register.fullName')}
            error={fieldErrors.full_name}
          >
            <TextInput
              style={[styles.input, !!fieldErrors.full_name && styles.inputError]}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              editable={!isLoading}
              accessibilityLabel={t('auth.register.fullName')}
            />
          </Field>

          {/* Phone */}
          <Field label={t('auth.register.phone')} error={fieldErrors.phone}>
            <TextInput
              style={[styles.input, !!fieldErrors.phone && styles.inputError]}
              value={phone}
              onChangeText={handlePhoneChange}
              keyboardType="phone-pad"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
              accessibilityLabel={t('auth.register.phone')}
            />
          </Field>

          {/* County picker */}
          <Field label={t('auth.register.county')} error={fieldErrors.county}>
            <Pressable
              style={[styles.input, styles.pickerBtn, !!fieldErrors.county && styles.inputError]}
              onPress={() => setCountyPickerOpen(true)}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel={t('auth.register.county')}
            >
              <Text style={county ? styles.pickerValue : styles.pickerPlaceholder}>
                {county || t('auth.register.county')}
              </Text>
              <Text style={styles.pickerChevron}>›</Text>
            </Pressable>
          </Field>

          {/* Password */}
          <Field label={t('auth.register.password')} error={fieldErrors.password}>
            <TextInput
              style={[styles.input, !!fieldErrors.password && styles.inputError]}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!isLoading}
              accessibilityLabel={t('auth.register.password')}
            />
          </Field>

          {/* Confirm password */}
          <Field label={t('auth.register.confirmPassword')} error={fieldErrors.confirmPassword}>
            <TextInput
              style={[styles.input, !!fieldErrors.confirmPassword && styles.inputError]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              editable={!isLoading}
              accessibilityLabel={t('auth.register.confirmPassword')}
            />
          </Field>

          {/* API-level error */}
          {apiError ? (
            <Text style={styles.errorBanner}>{apiError}</Text>
          ) : null}

          {/* Submit */}
          <Pressable
            style={[styles.btn, isLoading && styles.btnDisabled]}
            onPress={() => void handleSubmit()}
            disabled={isLoading}
            accessibilityRole="button"
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.btnText}>{t('auth.register.submit')}</Text>
            )}
          </Pressable>

          <Pressable
            style={styles.link}
            onPress={() => navigation.navigate('Login')}
            disabled={isLoading}
          >
            <Text style={styles.linkText}>{t('auth.register.haveAccount')}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* County picker modal */}
      <Modal
        visible={countyPickerOpen}
        animationType="slide"
        onRequestClose={() => setCountyPickerOpen(false)}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('auth.register.countyPickerTitle')}</Text>
            <Pressable
              style={styles.modalClose}
              onPress={() => setCountyPickerOpen(false)}
            >
              <Text style={styles.modalCloseText}>{t('common.cancel')}</Text>
            </Pressable>
          </View>
          <FlatList
            data={KENYA_COUNTIES}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <Pressable
                style={styles.countyRow}
                onPress={() => {
                  setCounty(item);
                  setCountyPickerOpen(false);
                }}
              >
                <Text style={[styles.countyText, item === county && styles.countySelected]}>
                  {item}
                </Text>
                {item === county ? <Text style={styles.countyCheck}>✓</Text> : null}
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

/** Wraps a form field with its label and inline error message. */
function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={fieldStyles.container}>
      <Text style={fieldStyles.label}>{label}</Text>
      {children}
      {error ? <Text style={fieldStyles.error}>{error}</Text> : null}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  container: { marginBottom: 14 },
  label: { fontSize: 13, color: '#555555', marginBottom: 6, fontWeight: '600' },
  error: { color: '#B00020', fontSize: 12, marginTop: 4 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },
  container: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 48 },
  backRow: { minHeight: 48, justifyContent: 'center', marginBottom: 8 },
  backText: { color: '#2E7D32', fontSize: 15 },
  title: { fontSize: 28, fontWeight: '800', color: '#1B5E20', marginBottom: 20 },
  input: {
    borderWidth: 1.5,
    borderColor: '#C8E6C9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: '#111111',
    minHeight: 50,
    backgroundColor: '#FAFAFA',
  },
  inputError: { borderColor: '#B00020' },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerValue: { fontSize: 16, color: '#111111' },
  pickerPlaceholder: { fontSize: 16, color: '#9E9E9E' },
  pickerChevron: { fontSize: 20, color: '#9E9E9E' },
  errorBanner: {
    backgroundColor: '#FFF3F3',
    color: '#B00020',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#B00020',
  },
  btn: {
    backgroundColor: '#1B5E20',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  link: { marginTop: 20, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  linkText: { color: '#2E7D32', fontSize: 15 },
  // Modal
  modalSafe: { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1B2E20' },
  modalClose: { minHeight: 48, minWidth: 48, justifyContent: 'center', alignItems: 'flex-end' },
  modalCloseText: { color: '#2E7D32', fontSize: 16 },
  countyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    minHeight: 52,
  },
  countyText: { fontSize: 16, color: '#111111' },
  countySelected: { color: '#1B5E20', fontWeight: '700' },
  countyCheck: { color: '#1B5E20', fontSize: 18, fontWeight: '700' },
  separator: { height: 1, backgroundColor: '#F5F5F5', marginHorizontal: 20 },
});
