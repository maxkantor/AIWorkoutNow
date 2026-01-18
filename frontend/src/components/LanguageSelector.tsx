import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { isAdminRoute } from '../i18n/isAdminRoute';

const STORAGE_KEY = 'aiworkoutnow_lang';

function normalizeLang(input: string | undefined | null): string {
  if (!input) return 'en';
  const raw = input.toLowerCase().trim();
  if (!raw) return 'en';
  const base = raw.split(/[-_]/)[0];
  return base === 'zh' ? 'zh' : base;
}

export default function LanguageSelector() {
  const { i18n, t } = useTranslation();
  const location = useLocation();
  const admin = isAdminRoute(location.pathname);

  const options = useMemo(
    () => [
      // Static labels so the selector itself never depends on i18n being ready.
      { value: 'en', label: 'EN 🇺🇸' },
      { value: 'es', label: 'ES 🇪🇸' },
      { value: 'ru', label: 'RU 🇷🇺' },
      { value: 'hi', label: 'HI 🇮🇳' },
      { value: 'zh', label: 'ZH 🇨🇳' },
    ],
    []
  );

  if (admin) return null;

  return (
    <div className="inline-flex items-center">
      <label className="sr-only" htmlFor="language-selector">
        {t('common.language')}
      </label>
      <select
        id="language-selector"
        className="px-2 py-1 rounded-md text-sm font-semibold bg-white/90 text-slate-800 border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        value={normalizeLang(i18n.resolvedLanguage || i18n.language || 'en')}
        onChange={(e) => {
          const next = normalizeLang(e.target.value);
          i18n.changeLanguage(next);
          try {
            window.localStorage.setItem(STORAGE_KEY, next);
          } catch {
            // ignore storage errors
          }
        }}
        aria-label="Language selector"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

