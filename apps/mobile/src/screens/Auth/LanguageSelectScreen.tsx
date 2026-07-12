import React, { useState } from 'react';
import {
  ActivityIndicator, Image, Pressable, SafeAreaView, StyleSheet, Text, View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';
import { changeLanguage } from '../../i18n';
import LogoMark from '../../../assets/adaptive-icon.png';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'LanguageSelect'>;

const LANGUAGES = [
  {
    code: 'sw' as const,
    label: 'Kiswahili',
    sublabel: 'Lugha ya Kiswahili',
    flag: '🇰🇪',
    description: 'Endelea kwa Kiswahili',
  },
  {
    code: 'en' as const,
    label: 'English',
    sublabel: 'English language',
    flag: '🇬🇧',
    description: 'Continue in English',
  },
];

export function LanguageSelectScreen() {
  const navigation = useNavigation<Nav>();
  const [selecting, setSelecting] = useState<string | null>(null);

  const pick = async (lang: 'sw' | 'en') => {
    setSelecting(lang);
    await changeLanguage(lang);
    navigation.replace('Welcome');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* App mark */}
        <View style={styles.topSection}>
          <View style={styles.logoMark}>
            <Image source={LogoMark} style={styles.logoImage} resizeMode="contain" />
          </View>
          <Text style={styles.appName}>AgroConnect</Text>
          <Text style={styles.prompt}>Chagua lugha / Choose language</Text>
        </View>

        {/* Language cards */}
        <View style={styles.cardsSection}>
          {LANGUAGES.map((lang) => {
            const isLoading = selecting === lang.code;
            return (
              <Pressable
                key={lang.code}
                style={({ pressed }) => [
                  styles.card,
                  pressed && styles.cardPressed,
                  selecting && !isLoading && styles.cardDisabled,
                ]}
                onPress={() => pick(lang.code)}
                disabled={!!selecting}
              >
                <Text style={styles.cardFlag}>{lang.flag}</Text>
                <View style={styles.cardText}>
                  <Text style={styles.cardLabel}>{lang.label}</Text>
                  <Text style={styles.cardSublabel}>{lang.sublabel}</Text>
                  <Text style={styles.cardDescription}>{lang.description}</Text>
                </View>
                <View style={styles.cardArrow}>
                  {isLoading
                    ? <ActivityIndicator size="small" color="#2E7D32" />
                    : <Text style={styles.arrowText}>›</Text>
                  }
                </View>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.footer}>
          AgroConnect · Kenya 🇰🇪
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
    justifyContent: 'space-between',
  },

  topSection: { alignItems: 'center', paddingTop: 72, gap: 12 },
  logoMark: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  logoImage: { width: 68, height: 68 },
  appName: {
    fontSize: 34,
    fontWeight: '800',
    color: '#1B5E20',
    letterSpacing: -0.5,
  },
  prompt: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
    marginTop: 4,
  },

  cardsSection: { gap: 14 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E8F5E9',
    padding: 20,
    gap: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  cardPressed: {
    borderColor: '#2E7D32',
    backgroundColor: '#F1F8F1',
  },
  cardDisabled: { opacity: 0.5 },
  cardFlag: { fontSize: 40 },
  cardText: { flex: 1, gap: 2 },
  cardLabel: { fontSize: 20, fontWeight: '800', color: '#1B1B1B' },
  cardSublabel: { fontSize: 13, color: '#757575' },
  cardDescription: { fontSize: 13, color: '#2E7D32', fontWeight: '600', marginTop: 4 },
  cardArrow: { width: 32, alignItems: 'center' },
  arrowText: { fontSize: 28, color: '#2E7D32', lineHeight: 32 },

  footer: { textAlign: 'center', fontSize: 12, color: '#BDBDBD' },
});
