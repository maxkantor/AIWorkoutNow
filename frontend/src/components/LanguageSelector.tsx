import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { isAdminRoute } from '../i18n/isAdminRoute';

const STORAGE_KEY = 'aiworkoutnow_lang';

export default function LanguageSelector() {
  const { i18n, t } = useTranslation();
  const location = useLocation();
  const admin = isAdminRoute(location.pathname);

  const options = useMemo(
    () => [
      { value: 'en', label: t('language.en') },
      { value: 'es', label: t('language.es') },
      { value: 'ru', label: t('language.ru') },
      { value: 'hi', label: t('language.hi') },
      { value: 'zh', label: t('language.zh') },
    ],
    [t]
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
        value={i18n.resolvedLanguage || i18n.language || 'en'}
        onChange={(e) => {
          const next = e.target.value;
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

