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
        <div className="header-container">
          <div className="header-content">
            {/* Main Title - Compact */}
            <div className="header-title-wrapper">
              <span className="header-icon">💪</span>
              <div className="header-text">
                <h1 className="header-title">
                  Get Your Perfect Workout in Seconds
                </h1>
                <p className="header-subtitle">
                  AI-powered, personalized fitness plans tailored to your goals, equipment, and schedule. No signup. No subscription. Just results.
                </p>
              </div>
            </div>

            {/* Trust Signals - Compact */}
            <div className="header-badges">
              <span className="header-badge">🎁 3 Free Workouts</span>
              <span className="header-badge">🚫 No Signup</span>
              <span className="header-badge">💳 One-Time Payment</span>
              <span className="header-badge">⚡ Instant Access</span>
            </div>

            {/* Access Status - Compact */}
            {!checkingAccess && (
              <div className="header-status">
                {accessStatus?.hasUnlimitedAccess ? (
                  <div className="status-badge status-unlimited">
                    ∞ Unlimited Access
                    {accessStatus.unlimitedExpiresAt && (
                      <span className="status-expires">
                        (expires {new Date(accessStatus.unlimitedExpiresAt).toLocaleDateString()})
                      </span>
                    )}
                  </div>
                ) : tokenBalance !== null && tokenBalance !== undefined && tokenBalance > 0 ? (
                  <div className="status-badge status-tokens">
                    Tokens: {tokenBalance}
                  </div>
                ) : freeWorkoutsRemaining !== undefined && freeWorkoutsRemaining > 0 ? (
                  <div className="status-badge status-free">
                    Free workouts remaining: {freeWorkoutsRemaining} / 3
                  </div>
                ) : freeWorkoutsRemaining !== undefined && freeWorkoutsRemaining === 0 ? (
                  <div className="status-badge status-exhausted">
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
