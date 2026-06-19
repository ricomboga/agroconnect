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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/authStore';
import type { AuthStackParamList } from '../../navigation/types';

type LoginNav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

/** Strip non-digits, then reformat as +254XXXXXXXXX */
function formatKenyaPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '+254';
  if (digits.startsWith('254')) return `+${digits.slice(0, 12)}`;
  if (digits.startsWith('0')) return `+254${digits.slice(1, 10)}`;
  return `+254${digits.slice(0, 9)}`;
}

export function LoginScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<LoginNav>();
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [phone, setPhone] = useState('+254');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handlePhoneChange = (raw: string) => {
    // Allow user to type freely; only format if they haven't typed a leading +
    if (raw.startsWith('+')) {
      setPhone(raw);
    } else {
      setPhone(formatKenyaPhone(raw));
    }
  };

  const handleLogin = async () => {
    setError(null);
    try {
      await login({ phone, password });
      // On success, RootNavigator switches to AppTabs automatically
    } catch (err) {
      // Surface the exact API error message — never replace with a generic string
      setError(err instanceof Error ? err.message : t('auth.error.networkError'));
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
          {/* Back to Welcome */}
          <Pressable style={styles.backRow} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← {t('common.back')}</Text>
          </Pressable>

          <Text style={styles.title}>{t('auth.login.title')}</Text>

          {/* Phone */}
          <Text style={styles.label}>{t('auth.login.phone')}</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={handlePhoneChange}
            keyboardType="phone-pad"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLoading}
            accessibilityLabel={t('auth.login.phone')}
          />

          {/* Password */}
          <Text style={styles.label}>{t('auth.login.password')}</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!isLoading}
            accessibilityLabel={t('auth.login.password')}
          />

          {/* API error — exact message, not generic */}
          {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

          {/* Submit */}
          <Pressable
            style={[styles.btn, isLoading && styles.btnDisabled]}
            onPress={() => void handleLogin()}
            disabled={isLoading}
            accessibilityRole="button"
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.btnText}>{t('auth.login.submit')}</Text>
            )}
          </Pressable>

          {/* Go to Register */}
          <Pressable
            style={styles.link}
            onPress={() => navigation.navigate('Register')}
            disabled={isLoading}
          >
            <Text style={styles.linkText}>{t('auth.login.noAccount')}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },
  container: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 48 },
  backRow: { minHeight: 48, justifyContent: 'center', marginBottom: 8 },
  backText: { color: '#2E7D32', fontSize: 15 },
  title: { fontSize: 28, fontWeight: '800', color: '#1B5E20', marginBottom: 28 },
  label: { fontSize: 13, color: '#555555', marginBottom: 6, fontWeight: '600' },
  input: {
    borderWidth: 1.5,
    borderColor: '#C8E6C9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: '#111111',
    marginBottom: 16,
    minHeight: 50,
    backgroundColor: '#FAFAFA',
  },
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
});
