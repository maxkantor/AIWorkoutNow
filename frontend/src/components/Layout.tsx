import { ReactNode, createContext, useContext, useState } from 'react';
import Footer from './Footer';
import './Layout.css';

interface HeroContent {
  freeWorkoutsRemaining?: number;
  accessStatus?: {
    hasUnlimitedAccess?: boolean;
    unlimitedExpiresAt?: string;
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

  return (
    <div className="layout">
      <header className="header" role="banner">
        <div className="max-w-7xl mx-auto px-4">
          <div className="header-hero">
            {/* Main Title */}
            <div className="header-title-section">
              <div className="flex items-center justify-center gap-3 mb-3">
                <span className="text-4xl md:text-5xl animate-pulse">💪</span>
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-white">
                  Get Your Perfect Workout in Seconds
                </h1>
              </div>
              <p className="text-white text-base md:text-lg text-center max-w-3xl mx-auto mb-6 font-medium">
                AI-powered, personalized fitness plans tailored to your goals, equipment, and schedule. No signup. No subscription. Just results.
              </p>
              
              {/* Primary CTA Button - More Prominent */}
              <div className="mb-4">
                <a 
                  href="#workout-generator" 
                  className="inline-block px-8 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 text-white font-bold text-lg rounded-xl shadow-2xl hover:shadow-blue-500/50 transform hover:-translate-y-1 transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-offset-2 focus:ring-offset-transparent"
                  aria-label="Scroll to workout generator"
                >
                  Generate AI Workout →
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

            {/* Access Status */}
            {!checkingAccess && (
              <div className="flex justify-center mb-2">
                {accessStatus?.hasUnlimitedAccess || (tokenBalance !== null && tokenBalance !== undefined && tokenBalance >= 999999) ? (
                  <div className="inline-block px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold text-xs md:text-sm shadow-md">
                    ∞ Unlimited Access
                    {accessStatus?.unlimitedExpiresAt && (
                      <span className="text-xs opacity-90 ml-2">
                        (expires {new Date(accessStatus.unlimitedExpiresAt).toLocaleDateString()})
                      </span>
                    )}
                  </div>
                ) : tokenBalance !== null && tokenBalance !== undefined && tokenBalance > 0 && tokenBalance < 999999 ? (
                  <div className="inline-block px-4 py-2 bg-blue-100 text-blue-800 rounded-lg font-semibold text-xs md:text-sm shadow-sm">
                    Tokens: {tokenBalance}
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
            )}
          </div>
        </div>
      </header>
      <HeroContext.Provider value={{ heroContent, setHeroContent }}>
        {children}
      </HeroContext.Provider>
      <Footer />
    </div>
  );
}

export default Layout;
