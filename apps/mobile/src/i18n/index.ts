import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import sw from '../locales/sw.json';
import en from '../locales/en.json';

const LANG_KEY = 'language';

export async function initI18n(): Promise<void> {
  const savedLang = await AsyncStorage.getItem(LANG_KEY);

  await i18n.use(initReactI18next).init({
    compatibilityJSON: 'v3',
    resources: {
      sw: { translation: sw },
      en: { translation: en },
    },
    lng: (savedLang as 'sw' | 'en') ?? 'sw',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });
}

export async function changeLanguage(lang: 'sw' | 'en'): Promise<void> {
  await AsyncStorage.setItem(LANG_KEY, lang);
  await i18n.changeLanguage(lang);
}

export default i18n;
