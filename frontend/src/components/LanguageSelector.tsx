import { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { isAdminRoute } from '../i18n/isAdminRoute';
import './LanguageSelector.css';

const STORAGE_KEY = 'aiworkoutnow_lang';

function normalizeLang(input: string | undefined | null): string {
  if (!input) return 'en';
  const raw = input.toLowerCase().trim();
  if (!raw) return 'en';
  const base = raw.split(/[-_]/)[0];
  return base === 'zh' ? 'zh' : base;
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  es: 'Español',
  ru: 'Русский',
  hi: 'हिन्दी',
  zh: '中文',
};

export default function LanguageSelector() {
  const { i18n } = useTranslation();
  const location = useLocation();
  const admin = isAdminRoute(location.pathname);
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  const currentLang = normalizeLang(i18n.resolvedLanguage || i18n.language || 'en');
  const currentLabel = LANGUAGE_NAMES[currentLang] || 'English';

  const languages = useMemo(
    () => [
      { value: 'en', label: LANGUAGE_NAMES.en },
      { value: 'es', label: LANGUAGE_NAMES.es },
      { value: 'ru', label: LANGUAGE_NAMES.ru },
      { value: 'hi', label: LANGUAGE_NAMES.hi },
      { value: 'zh', label: LANGUAGE_NAMES.zh },
    ],
    []
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setFocusedIndex(-1);
        buttonRef.current?.focus();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen || focusedIndex < 0) return;

    const handleArrowKeys = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setFocusedIndex((prev) => (prev < languages.length - 1 ? prev + 1 : 0));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : languages.length - 1));
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < languages.length) {
          handleLanguageChange(languages[focusedIndex].value);
        }
      }
    };

    document.addEventListener('keydown', handleArrowKeys);
    return () => document.removeEventListener('keydown', handleArrowKeys);
  }, [isOpen, focusedIndex, languages]);

  // Focus menu item when focusedIndex changes
  useEffect(() => {
    if (isOpen && menuRef.current && focusedIndex >= 0) {
      const menuItems = menuRef.current.querySelectorAll('[role="menuitem"]');
      const targetItem = menuItems[focusedIndex] as HTMLElement;
      if (targetItem) {
        targetItem.focus();
      }
    }
  }, [focusedIndex, isOpen]);

  const handleLanguageChange = (lang: string) => {
    const next = normalizeLang(lang);
    i18n.changeLanguage(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore storage errors
    }
    setIsOpen(false);
    setFocusedIndex(-1);
  };

  const handleToggle = () => {
    if (!isOpen && buttonRef.current) {
      // Calculate position for fixed dropdown
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 8, // 0.5rem gap
        right: window.innerWidth - rect.right,
      });
    }
    setIsOpen((prev) => !prev);
    if (!isOpen) {
      setFocusedIndex(-1);
    }
  };

  if (admin) return null;

  return (
    <div className="language-selector-wrapper" ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        className="language-selector-button"
        onClick={handleToggle}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={`Select language: ${currentLabel}`}
      >
        <span className="language-icon">🌐</span>
        <span className="language-label">{currentLabel}</span>
        <span className={`language-arrow ${isOpen ? 'open' : ''}`}>▾</span>
      </button>

      {isOpen && (
        <ul
          ref={menuRef}
          className="language-selector-menu"
          role="menu"
          aria-label="Language options"
          style={{
            top: `${menuPosition.top}px`,
            right: `${menuPosition.right}px`,
          }}
        >
          {languages.map((lang, index) => (
            <li key={lang.value} role="none">
              <button
                type="button"
                className={`language-menu-item ${lang.value === currentLang ? 'selected' : ''}`}
                role="menuitem"
                tabIndex={focusedIndex === index ? 0 : -1}
                onClick={() => handleLanguageChange(lang.value)}
                onMouseEnter={() => setFocusedIndex(index)}
              >
                <span className="language-menu-label">{lang.label}</span>
                {lang.value === currentLang && (
                  <span className="language-checkmark" aria-hidden="true">✓</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
