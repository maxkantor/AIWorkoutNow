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
const SUPPORTED_SET = new Set<string>(SUPPORTED_LANGS as unknown as string[]);
const STORAGE_KEY = 'aiworkoutnow_lang';

function normalizeLang(input: string | undefined | null): string | null {
  if (!input) return null;
  const raw = input.toLowerCase().trim();
  if (!raw) return null;
  const base = raw.split(/[-_]/)[0];
  if (!base) return null;
  if (base === 'zh') return 'zh';
  return base;
}

function getStoredLang(): string | null {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    const norm = normalizeLang(v);
    return norm && SUPPORTED_SET.has(norm) ? norm : null;
  } catch {
    return null;
  }
}

function getNavigatorLang(): string | null {
  if (typeof navigator === 'undefined') return null;
  const candidates = Array.isArray(navigator.languages) && navigator.languages.length
    ? navigator.languages
    : [navigator.language];

  for (const c of candidates) {
    const norm = normalizeLang(c);
    if (norm && SUPPORTED_SET.has(norm)) return norm;
  }
  return null;
}

const initialLng = getStoredLang() ?? getNavigatorLang() ?? 'en';

const resources = {
  en: { translation: en },
  es: { translation: es },
  ru: { translation: ru },
  hi: { translation: hi },
  zh: { translation: zh },
} as const;

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: 'en',
      lng: initialLng,
      supportedLngs: SUPPORTED_LANGS as unknown as string[],
      load: 'languageOnly',
      lowerCaseLng: true,
      interpolation: { escapeValue: false },
      returnObjects: true,
      react: { useSuspense: false },
      detection: {
        order: ['localStorage', 'navigator'],
        lookupLocalStorage: STORAGE_KEY,
        caches: [],
        convertDetectedLanguage: (lng: string) => normalizeLang(lng) ?? 'en',
      },
    });
}

export default i18n;

