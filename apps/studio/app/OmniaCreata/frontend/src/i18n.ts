import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import en from './i18n/en.json';
import de from './i18n/de.json';
import es from './i18n/es.json';
import it from './i18n/it.json';
import ja from './i18n/ja.json';
import zhCN from './i18n/zh-CN.json';
import ru from './i18n/ru.json';

const resources = {
  en: { translation: en },
  de: { translation: de },
  es: { translation: es },
  it: { translation: it },
  ja: { translation: ja },
  'zh-CN': { translation: zhCN },
  ru: { translation: ru },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: false,
    
    interpolation: {
      escapeValue: false,
    },
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  });

export default i18n;

// Export supported languages for UI
export const supportedLanguages = [
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
  { code: 'es', name: 'Español' },
  { code: 'it', name: 'Italiano' },
  { code: 'ja', name: '日本語' },
  { code: 'zh-CN', name: '中文 (简体)' },
  { code: 'ru', name: 'Русский' },
];

// Helper function to get current language
export const getCurrentLanguage = () => i18n.language;

// Helper function to change language
export const changeLanguage = (lng: string) => {
  return i18n.changeLanguage(lng);
};