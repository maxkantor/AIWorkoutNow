import { ReactNode, createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Footer from './layout/Footer';
import LanguageSelector from './LanguageSelector';
import './Layout.css';

interface HeroContent {
  freeWorkoutsRemaining?: number;
  accessStatus?: {
    hasUnlimitedAccess?: boolean;
    unlimitedExpiresAt?: string;
    tokensRemaining?: number;
    remainingWorkouts?: number | null;
    totalWorkouts?: number | null;
  };
  tokenBalance?: number | null;
  checkingAccess?: boolean;
  remainingWorkouts?: number | null;
  totalWorkouts?: number | null;
}

const HeroContext = createContext<{
  heroContent: HeroContent | null;
  setHeroContent: (content: HeroContent | null) => void;
}>({
  heroContent: null,
  setHeroContent: () => {},
});

export function useHeroContext() {
  return useContext(HeroContext);
}

interface LayoutProps {
  children: ReactNode;
}

function Layout({ children }: LayoutProps) {
  const [heroContent, setHeroContent] = useState<HeroContent | null>(null);
  const { freeWorkoutsRemaining, accessStatus, tokenBalance, checkingAccess, remainingWorkouts, totalWorkouts } = heroContent || {};
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');
  const isPlatformPage = location.pathname === '/platform';
  const { t, i18n } = useTranslation();

  // Add/remove admin-body class to body element
  useEffect(() => {
    if (isAdminPage) {
      document.body.classList.add('admin-body');
    } else {
      document.body.classList.remove('admin-body');
    }
    return () => {
      document.body.classList.remove('admin-body');
    };
  }, [isAdminPage]);

  return (
    <div className={`layout ${isAdminPage ? 'admin-layout' : ''}`}>
      {/* Hero Section - Hide on admin pages */}
      {!isAdminPage && !isPlatformPage && (
      <section className="hero-section">
        {/* Decorative side fills for wide screens (do not affect layout) */}
        <div className="hero-sides" aria-hidden="true">
          <div className="hero-side hero-side-left" />
          <div className="hero-side hero-side-right" />
        </div>
        <div className="hero-container">
          <div className="hero-content">
            {/* Main Title */}
            <div className="hero-title-section">
              <div className="flex items-center justify-center gap-3 mb-3">
                <p className="hero-main-title">
                  {t('hero.title')}
                </p>
              </div>
              
              {/* Primary CTA Button with Language Selector */}
              <div className="hero-cta-container mb-5">
                <a 
                  href="#workout-generator" 
                  className="hero-cta-button inline-block px-10 py-5 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 text-white font-black text-xl rounded-2xl shadow-2xl hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] transform hover:-translate-y-1.5 transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-blue-400 focus:ring-offset-4 focus:ring-offset-transparent relative overflow-hidden group"
                  aria-label={t('hero.ctaAria')}
                  style={{
                    animation: 'slideUpFade 0.4s ease-out 0.3s both'
                  }}
                >
                  {/* Subtle glow effect */}
                  <span className="absolute inset-0 bg-gradient-to-r from-blue-400 via-purple-400 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"></span>
                  <span className="relative z-10 flex items-center gap-2">
                    {t('hero.cta')}
                    <span className="text-2xl group-hover:translate-x-1 transition-transform duration-300">→</span>
                  </span>
                </a>
                <div className="hero-language-selector">
                  <LanguageSelector />
                </div>
              </div>
            </div>

            {/* Trust Signals */}
            <div className="flex flex-wrap justify-center gap-2 md:gap-3 mb-3">
              <span className="px-3 py-1.5 bg-blue-50 text-slate-700 rounded-full text-xs md:text-sm font-medium shadow-sm">{t('hero.chips.free')}</span>
              <span className="px-3 py-1.5 bg-blue-50 text-slate-700 rounded-full text-xs md:text-sm font-medium shadow-sm">{t('hero.chips.noSignup')}</span>
              <span className="px-3 py-1.5 bg-blue-50 text-slate-700 rounded-full text-xs md:text-sm font-medium shadow-sm">{t('hero.chips.oneTime')}</span>
              <span className="px-3 py-1.5 bg-blue-50 text-slate-700 rounded-full text-xs md:text-sm font-medium shadow-sm">{t('hero.chips.instant')}</span>
            </div>

            {/* Access Status with Restore Credits Button */}
            {!checkingAccess && (
              <div className="flex flex-col items-center gap-2 mb-2">
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {/* CRITICAL FIX: Backend returns hasUnlimitedAccess=false when tokens are reset to 7 */}
                  {/* ALWAYS respect hasUnlimitedAccess flag from API - it takes absolute precedence */}
                  {accessStatus?.hasUnlimitedAccess === true && 
                   accessStatus?.tokensRemaining !== undefined && 
                   accessStatus.tokensRemaining >= 999999 ? (
                    <div className="inline-block px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold text-xs md:text-sm shadow-md">
                      {t('hero.status.unlimited')}
                      {accessStatus?.unlimitedExpiresAt && (
                        <span className="text-xs opacity-90 ml-2">
                          {t('hero.status.expires', {
                            date: new Date(accessStatus.unlimitedExpiresAt).toLocaleDateString(i18n.resolvedLanguage || i18n.language),
                          })}
                        </span>
                      )}
                    </div>
                  ) : (freeWorkoutsRemaining !== undefined &&
                      (accessStatus?.tokensRemaining ?? tokenBalance ?? 0) <= 0 &&
                      accessStatus?.hasUnlimitedAccess !== true) ? (
                    <div className="inline-block px-4 py-2 bg-green-100 text-green-800 rounded-lg font-semibold text-xs md:text-sm shadow-sm">
                      {t('hero.status.freeRemaining', { remaining: freeWorkoutsRemaining, total: 3 })}
                    </div>
                  ) : ((remainingWorkouts !== null && remainingWorkouts !== undefined && totalWorkouts !== null && totalWorkouts !== undefined) ||
                      (accessStatus?.tokensRemaining !== undefined && accessStatus.tokensRemaining > 0 && accessStatus.tokensRemaining < 999999) ||
                      (tokenBalance !== null && tokenBalance !== undefined && tokenBalance > 0 && tokenBalance < 999999)) ? (
                    <div
                      className="inline-block px-4 py-2 bg-blue-100 text-blue-800 rounded-lg font-semibold text-xs md:text-sm shadow-sm"
                      title={t('hero.status.remainingWorkoutsTitle')}
                    >
                      {(() => {
                        const paid = accessStatus?.tokensRemaining ?? tokenBalance ?? 0;
                        const remaining = remainingWorkouts ?? paid;
                        const total = totalWorkouts ?? remaining;
                        return t('hero.status.remainingWorkouts', { remaining, total });
                      })()}
                    </div>
                  ) : freeWorkoutsRemaining !== undefined && freeWorkoutsRemaining === 0 ? (
                    <div className="inline-block px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg font-semibold text-xs md:text-sm shadow-sm">
                      {t('hero.status.freeExhausted')}
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
      )}

      <HeroContext.Provider value={{ heroContent, setHeroContent }}>
        <div className={isPlatformPage ? 'layout-main layout-main-platform' : 'layout-main'}>
          {children}
        </div>
      </HeroContext.Provider>
      {!isAdminPage && !isPlatformPage && <Footer />}
    </div>
  );
}

export default Layout;
