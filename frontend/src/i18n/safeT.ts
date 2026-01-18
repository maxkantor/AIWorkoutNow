import i18n from './index';

// If a translation key is missing at runtime, i18next often returns the key string.
// This helper falls back to English so users never see raw keys like "pages.home.faq...".
export function safeT<T = string>(
  t: (key: string, options?: any) => any,
  key: string,
  options?: any
): T {
  const v = t(key, options);

  // Missing key: i18next returns the key itself (string).
  if (typeof v === 'string' && v === key) {
    return i18n.getFixedT('en')(key, options) as T;
  }

  return v as T;
}

