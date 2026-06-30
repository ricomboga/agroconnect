import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
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

  const shakeAnim = useRef(new Animated.Value(0)).current;

  const handlePhoneChange = (raw: string) => {
    // Allow user to type freely; only format if they haven't typed a leading +
    if (raw.startsWith('+')) {
      setPhone(raw);
    } else {
      setPhone(formatKenyaPhone(raw));
    }
  };

  const triggerShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,  duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleLogin = async () => {
    setError(null);
    try {
      await login({ phone, password });
      // On success, RootNavigator switches to AppTabs automatically
    } catch (err) {
      const isAbort = err instanceof Error && err.name === 'AbortError';
      let raw = err instanceof Error ? err.message : null;
      const translated = raw ? t(raw) : null;
      const msg = isAbort
        ? t('auth.error.networkError')
        : (translated && translated !== raw) ? translated
        : raw ?? t('auth.error.networkError');
      setError(msg);
      triggerShake();
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#0D4A28', '#1A6B3C', '#2E8B57']}
        locations={[0, 0.6, 1.0]}
        start={{ x: 0.33, y: 0.03 }}
        end={{ x: 0.67, y: 0.97 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
          >
            {/* Hero */}
            <Text style={styles.logo}>🌱</Text>
            <Text style={styles.appName}>{t('auth.login.appName')}</Text>
            <Text style={styles.tagline}>{t('auth.login.tagline')}</Text>

            {/* Glass card */}
            <Animated.View
              style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}
            >
              {/* Phone */}
              <Text style={styles.fieldLabel}>{t('auth.login.phoneLabel')}</Text>
              <TextInput
                style={styles.phoneInput}
                value={phone}
                onChangeText={handlePhoneChange}
                keyboardType="phone-pad"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                placeholder="+254 7__ ___ ___"
                placeholderTextColor="rgba(255,255,255,0.5)"
                accessibilityLabel={t('auth.login.phone')}
              />

              {/* Password */}
              <Text style={styles.fieldLabel}>{t('auth.login.pinLabel')}</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                keyboardType="default"
                maxLength={20}
                secureTextEntry
                editable={!isLoading}
                style={styles.phoneInput}
                placeholder="••••••••••"
                placeholderTextColor="rgba(255,255,255,0.4)"
                accessibilityLabel={t('auth.login.password')}
              />

              {/* Error */}
              {error != null && (
                <Text style={styles.errorText}>{error}</Text>
              )}

              {/* Sign In */}
              <Pressable
                style={styles.signInBtn}
                onPress={() => void handleLogin()}
                disabled={isLoading}
                accessibilityRole="button"
              >
                {isLoading ? (
                  <ActivityIndicator color="#1A6B3C" />
                ) : (
                  <Text style={styles.signInText}>{t('auth.login.signIn')}</Text>
                )}
              </Pressable>
            </Animated.View>

            {/* Forgot PIN */}
            <Text style={styles.forgotPin}>{t('auth.login.forgotPin')}</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 40,
    justifyContent: 'center',
  },

  // Hero
  logo: { fontSize: 42, textAlign: 'center', marginBottom: 8 },
  appName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 2,
  },
  tagline: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    marginBottom: 28,
  },

  // Glass card
  card: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },

  // Phone input
  phoneInput: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 12,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    marginBottom: 10,
  },

  // Error
  errorText: {
    color: 'rgba(255,100,100,0.9)',
    fontSize: 9,
    marginTop: 4,
    marginBottom: 8,
  },

  // Sign In button
  signInBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  signInText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A6B3C',
    textAlign: 'center',
  },

  // Forgot PIN
  forgotPin: {
    marginTop: 14,
    fontSize: 9,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
});
