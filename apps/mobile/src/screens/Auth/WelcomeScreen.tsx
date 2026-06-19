import React from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { AuthStackParamList } from '../../navigation/types';

type WelcomeNav = NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;

export function WelcomeScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<WelcomeNav>();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Logo */}
        <View style={styles.logoSection}>
          <View style={styles.logoMark}>
            <Text style={styles.logoMarkText}>🌱</Text>
          </View>
          <Text style={styles.appName}>AgroConnect</Text>
          <Text style={styles.tagline}>{t('auth.welcome.tagline')}</Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonSection}>
          <Pressable
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.primaryBtnText}>{t('auth.welcome.login')}</Text>
          </Pressable>

          <Pressable
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.secondaryBtnText}>{t('auth.welcome.register')}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingTop: 80,
    paddingBottom: 48,
  },
  logoSection: { alignItems: 'center', gap: 12 },
  logoMark: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoMarkText: { fontSize: 48 },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1B5E20',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 17,
    color: '#555555',
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonSection: { gap: 14 },
  primaryBtn: {
    backgroundColor: '#1B5E20',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    borderWidth: 2,
    borderColor: '#1B5E20',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: '#1B5E20',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
