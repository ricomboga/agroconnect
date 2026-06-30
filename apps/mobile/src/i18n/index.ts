import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import sw from '../locales/sw.json';
import en from '../locales/en.json';

const LANG_KEY = 'language';

// Synchronous init so react-i18next never renders against an uninitialized instance.
// initI18n() below updates the language once AsyncStorage resolves.
i18n.use(initReactI18next).init({
  compatibilityJSON: 'v3',
  resources: {
    sw: { translation: sw },
    en: { translation: en },
  },
  lng: 'sw',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export async function initI18n(): Promise<void> {
  const savedLang = await AsyncStorage.getItem(LANG_KEY);
  if (savedLang && savedLang !== i18n.language) {
    await i18n.changeLanguage(savedLang);
  }
}

export async function changeLanguage(lang: 'sw' | 'en'): Promise<void> {
  await AsyncStorage.setItem(LANG_KEY, lang);
  await i18n.changeLanguage(lang);
}

export default i18n;
