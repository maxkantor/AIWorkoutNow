import { ReactNode, createContext, useContext, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Footer from './Footer';
import './Layout.css';

interface HeroContent {
  freeWorkoutsRemaining?: number;
  accessStatus?: {
    hasUnlimitedAccess?: boolean;
    unlimitedExpiresAt?: string;
    tokensRemaining?: number;
  };
  tokenBalance?: number | null;
  checkingAccess?: boolean;
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
  const { freeWorkoutsRemaining, accessStatus, tokenBalance, checkingAccess } = heroContent || {};
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');

  return (
    <div className="layout">
      {/* Hero Section - Hide on admin pages */}
      {!isAdminPage && (
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-content">
            {/* Main Title */}
            <div className="hero-title-section">
              <div className="flex items-center justify-center gap-3 mb-3">
                <span className="text-4xl md:text-5xl animate-pulse">💪</span>
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-white">
                  Get Your Perfect Workout in Seconds
                </h1>
              </div>
              
              {/* Primary CTA Button - Visually Dominant with Glow Effect */}
              <div className="mb-5">
                <a 
                  href="#workout-generator" 
                  className="inline-block px-10 py-5 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 text-white font-black text-xl rounded-2xl shadow-2xl hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] transform hover:-translate-y-1.5 transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-blue-400 focus:ring-offset-4 focus:ring-offset-transparent relative overflow-hidden group"
                  aria-label="Scroll to workout generator"
                  style={{
                    animation: 'slideUpFade 0.4s ease-out 0.3s both'
                  }}
                >
                  {/* Subtle glow effect */}
                  <span className="absolute inset-0 bg-gradient-to-r from-blue-400 via-purple-400 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"></span>
                  <span className="relative z-10 flex items-center gap-2">
                    Generate AI Workout
                    <span className="text-2xl group-hover:translate-x-1 transition-transform duration-300">→</span>
                  </span>
                </a>
              </div>
            </div>

            {/* Trust Signals */}
            <div className="flex flex-wrap justify-center gap-2 md:gap-3 mb-3">
              <span className="px-3 py-1.5 bg-blue-50 text-slate-700 rounded-full text-xs md:text-sm font-medium shadow-sm">🎁 3 Free Workouts</span>
              <span className="px-3 py-1.5 bg-blue-50 text-slate-700 rounded-full text-xs md:text-sm font-medium shadow-sm">🚫 No Signup</span>
              <span className="px-3 py-1.5 bg-blue-50 text-slate-700 rounded-full text-xs md:text-sm font-medium shadow-sm">💳 One-Time Payment</span>
              <span className="px-3 py-1.5 bg-blue-50 text-slate-700 rounded-full text-xs md:text-sm font-medium shadow-sm">⚡ Instant Access</span>
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
                      ∞ Unlimited Access
                      {accessStatus?.unlimitedExpiresAt && (
                        <span className="text-xs opacity-90 ml-2">
                          (expires {new Date(accessStatus.unlimitedExpiresAt).toLocaleDateString()})
                        </span>
                      )}
                    </div>
                  ) : (accessStatus?.tokensRemaining !== undefined && accessStatus.tokensRemaining > 0 && accessStatus.tokensRemaining < 999999) ||
                      (tokenBalance !== null && tokenBalance !== undefined && tokenBalance > 0 && tokenBalance < 999999) ? (
                    <div className="inline-block px-4 py-2 bg-blue-100 text-blue-800 rounded-lg font-semibold text-xs md:text-sm shadow-sm">
                      💪Remaining Workouts: {accessStatus?.tokensRemaining ?? tokenBalance ?? 0}
                    </div>
                  ) : freeWorkoutsRemaining !== undefined && freeWorkoutsRemaining > 0 ? (
                    <div className="inline-block px-4 py-2 bg-green-100 text-green-800 rounded-lg font-semibold text-xs md:text-sm shadow-sm">
                      Free workouts remaining: {freeWorkoutsRemaining} / 3
                    </div>
                  ) : freeWorkoutsRemaining !== undefined && freeWorkoutsRemaining === 0 ? (
                    <div className="inline-block px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg font-semibold text-xs md:text-sm shadow-sm">
                      Free workouts exhausted
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
        {children}
      </HeroContext.Provider>
      {!isAdminPage && <Footer />}
    </div>
  );
}

export default Layout;
