import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import en from './locales/en/translation.json';
import es from './locales/es/translation.json';
import ru from './locales/ru/translation.json';
import hi from './locales/hi/translation.json';
import zh from './locales/zh/translation.json';

export const SUPPORTED_LANGS = ['en', 'es', 'ru', 'hi', 'zh'] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

const resources = {
  en: { translation: en },
  es: { translation: es },
  ru: { translation: ru },
  hi: { translation: hi },
  zh: { translation: zh },
} as const;

if (!i18n.isInitialized) {
  i18n
    .use(
      new LanguageDetector(null, {
        // Read from storage first, then browser language, then fallback.
        order: ['localStorage', 'navigator'],
        lookupLocalStorage: 'aiworkoutnow_lang',
        caches: [], // IMPORTANT: we manage persistence ourselves (public-only; never in /admin).
      })
    )
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: 'en',
      supportedLngs: SUPPORTED_LANGS as unknown as string[],
      nonExplicitSupportedLngs: true,
      interpolation: { escapeValue: false },
      returnObjects: true,
      detection: {
        order: ['localStorage', 'navigator'],
        lookupLocalStorage: 'aiworkoutnow_lang',
        caches: [],
      },
    });
}

export default i18n;

