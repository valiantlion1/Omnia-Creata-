import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import en from './en.json';
import de from './de.json';
import es from './es.json';
import it from './it.json';
import ja from './ja.json';
import ru from './ru.json';
import zhCN from './zh-CN.json';

const resources = {
  en: { translation: en },
  de: { translation: de },
  es: { translation: es },
  it: { translation: it },
  ja: { translation: ja },
  ru: { translation: ru },
  'zh-CN': { translation: zhCN },
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