import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './en.json';
import es from './es.json';

const LANG_KEY = '@kindo_language';

export async function initI18n() {
  let savedLang = null;
  try { savedLang = await AsyncStorage.getItem(LANG_KEY); } catch {}
  const deviceLang = Localization.getLocales()[0]?.languageCode || 'en';
  const lng = savedLang || (deviceLang.startsWith('es') ? 'es' : 'en');

  await i18n.use(initReactI18next).init({
    compatibilityJSON: 'v3',
    resources: { en: { translation: en }, es: { translation: es } },
    lng,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });
  return i18n;
}

export async function changeLanguage(lang) {
  await i18n.changeLanguage(lang);
  try { await AsyncStorage.setItem(LANG_KEY, lang); } catch {}
}

export default i18n;
