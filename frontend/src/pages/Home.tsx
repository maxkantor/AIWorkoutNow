import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import WorkoutGenerator from '../components/WorkoutGenerator';
import PricingPlans from '../components/PricingPlans';
import RestoreCredits from '../components/RestoreCredits';
import { getDeviceId, setTokenBalance as updateTokenStorage } from '../utils/storage';
import { generateWorkout, getFreeWorkoutsRemaining, getUserAccessStatus, UserAccessStatus } from '../services/api';
import { useHeroContext } from '../components/Layout';
import './Home.css';

function Home() {
  const [workout, setWorkout] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [freeWorkoutsRemaining, setFreeWorkoutsRemaining] = useState<number>(3);
  const [remainingWorkouts, setRemainingWorkouts] = useState<number | null>(null);
  const [totalWorkouts, setTotalWorkouts] = useState<number | null>(null);
  const [accessStatus, setAccessStatus] = useState<UserAccessStatus | null>(null);
  const [showRestoreCredits, setShowRestoreCredits] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const { setHeroContent } = useHeroContext();

  const seoTitle = "AI Workout Generator (No Signup) | Personalized Workout Plans in Seconds";
  const seoDescription =
    "Generate a personalized workout plan in seconds—no signup. Try 3 free workouts, then unlock more with a one-time payment. Equipment-aware, goals-based, gym or home.";

  useEffect(() => {
    checkAccessStatus();
    
    // Listen for restore credits event from PricingPlans
    const handleOpenRestoreCredits = () => {
      setShowRestoreCredits(true);
      setTimeout(() => {
        const section = document.getElementById('restore-credits-section');
        if (section) {
          section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    };
    
    // Listen for refresh access status event
    const handleRefreshAccessStatus = () => {
      checkAccessStatus(true); // Force refresh with cache bust
    };
    
    window.addEventListener('openRestoreCredits', handleOpenRestoreCredits);
    window.addEventListener('refreshAccessStatus', handleRefreshAccessStatus);
    return () => {
      window.removeEventListener('openRestoreCredits', handleOpenRestoreCredits);
      window.removeEventListener('refreshAccessStatus', handleRefreshAccessStatus);
    };
  }, []);

  useEffect(() => {
    setHeroContent({
      freeWorkoutsRemaining,
      accessStatus: accessStatus ? {
        hasUnlimitedAccess: accessStatus.hasUnlimitedAccess,
        unlimitedExpiresAt: accessStatus.unlimitedExpiresAt || undefined,
        tokensRemaining: accessStatus.tokensRemaining,
        remainingWorkouts: accessStatus.remainingWorkouts ?? remainingWorkouts,
        totalWorkouts: accessStatus.totalWorkouts ?? totalWorkouts,
      } : undefined,
      tokenBalance,
      checkingAccess,
      remainingWorkouts,
      totalWorkouts,
    });
  }, [freeWorkoutsRemaining, accessStatus, tokenBalance, checkingAccess, remainingWorkouts, totalWorkouts, setHeroContent]);

  const checkAccessStatus = async (forceRefresh: boolean = false) => {
    try {
      setCheckingAccess(true);
      const deviceId = getDeviceId();
      
      // Force cache bust on refresh
      const status = await getUserAccessStatus(deviceId, forceRefresh);
      console.log('[Home] Access status from API:', status);
      console.log('[Home] tokensRemaining:', status.tokensRemaining);
      console.log('[Home] hasUnlimitedAccess:', status.hasUnlimitedAccess);
      setAccessStatus(status);
      setRemainingWorkouts(status.remainingWorkouts ?? null);
      setTotalWorkouts(status.totalWorkouts ?? status.remainingWorkouts ?? null);
      
      // CRITICAL FIX: Backend returns hasUnlimitedAccess=false when tokens are reset (e.g., to 5)
      // ALWAYS respect the API response - if hasUnlimitedAccess is false, never show unlimited
      // Even if tokensRemaining is high, if hasUnlimitedAccess is false, treat it as regular tokens
      // Always persist the API-reported free workouts count when provided
      if (status.freeWorkoutsRemaining !== undefined && status.freeWorkoutsRemaining !== null) {
        setFreeWorkoutsRemaining(status.freeWorkoutsRemaining);
      }

      if (status.hasUnlimitedAccess === true && status.tokensRemaining >= 999999) {
        // Only set unlimited if API explicitly confirms it
        console.log('[Home] Setting unlimited access');
        setTokenBalance(status.tokensRemaining);
        updateTokenStorage(deviceId, status.tokensRemaining);
        setFreeWorkoutsRemaining(status.freeWorkoutsRemaining ?? 0);
        setRemainingWorkouts(status.remainingWorkouts ?? status.tokensRemaining ?? null);
        setTotalWorkouts(status.totalWorkouts ?? status.remainingWorkouts ?? status.tokensRemaining ?? null);
      } else if (status.tokensRemaining !== undefined && status.tokensRemaining !== null && status.tokensRemaining > 0) {
        // Regular token count (including when reset to 5 - hasUnlimitedAccess will be false)
        // This handles both regular tokens AND admin resets
        console.log('[Home] Setting paid tokens:', status.tokensRemaining);
        setTokenBalance(status.tokensRemaining);
        updateTokenStorage(deviceId, status.tokensRemaining);
        setRemainingWorkouts(status.remainingWorkouts ?? status.tokensRemaining);
        setTotalWorkouts(status.totalWorkouts ?? status.remainingWorkouts ?? status.tokensRemaining);
        setFreeWorkoutsRemaining(status.freeWorkoutsRemaining ?? freeWorkoutsRemaining);
      } else {
        // No paid tokens, check free workouts
        console.log('[Home] No paid tokens, checking free workouts');
        const freeWorkouts = await getFreeWorkoutsRemaining(deviceId);
        console.log('[Home] Free workouts:', freeWorkouts.remaining);
        setFreeWorkoutsRemaining(freeWorkouts.remaining);
        setRemainingWorkouts(freeWorkouts.remaining);
        setTotalWorkouts(freeWorkouts.remaining);
        setTokenBalance(null);
      }
    } catch (err) {
      console.error('Failed to check access status:', err);
      setFreeWorkoutsRemaining(3);
      setRemainingWorkouts(null);
      setTotalWorkouts(null);
    } finally {
      setCheckingAccess(false);
    }
  };

  const handleGenerateWorkout = async (preferences: any) => {
    setLoading(true);
    setError(null);
    
    try {
      const deviceId = getDeviceId();
      
      // ULTRA AGGRESSIVE FIX: Use API status, not localStorage, to determine if user is free
      // Refresh access status first to get latest data
      await checkAccessStatus(true);
      
      // Determine if free user based on API response, not localStorage
      const isFreeUser = (accessStatus?.tokensRemaining === 0 || accessStatus?.tokensRemaining === undefined) && 
                         !accessStatus?.hasUnlimitedAccess &&
                         (accessStatus?.freeWorkoutsRemaining ?? 0) > 0;
      
      // If no workouts remaining, just return without generating
      if (isFreeUser && (accessStatus?.freeWorkoutsRemaining ?? 0) <= 0 && !accessStatus?.hasUnlimitedAccess) {
        setError('No free workouts remaining. Please purchase more workouts to continue.');
        setLoading(false);
        return;
      }
      
      if (!isFreeUser && (accessStatus?.tokensRemaining ?? 0) <= 0 && !accessStatus?.hasUnlimitedAccess) {
        setError('No workouts remaining. Please purchase more workouts to continue.');
        setLoading(false);
        return;
      }
      
      const result = await generateWorkout(preferences, deviceId, isFreeUser);
      setWorkout(result);
      
      // Update tokens immediately from response
      if (result.tokensRemaining !== undefined) {
        if (isFreeUser) {
          // Free workout was used
          setFreeWorkoutsRemaining(Math.max(0, (accessStatus?.freeWorkoutsRemaining ?? freeWorkoutsRemaining) - 1));
        } else {
          // Paid token was used - update immediately
          setTokenBalance(result.tokensRemaining);
          // Update localStorage immediately
          updateTokenStorage(deviceId, result.tokensRemaining);
        }
      }
      
      // Refresh access status to ensure UI is in sync
      await checkAccessStatus();
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to generate workout. Please try again.';
      setError(errorMessage);
      
      // Error already set above
    } finally {
      setLoading(false);
    }
  };


  // Disable button if no workouts remaining (free or paid)
  const canGenerate = accessStatus?.canGenerateWorkout ?? 
    (accessStatus?.hasUnlimitedAccess === true ||
    (remainingWorkouts ?? 0) > 0 ||
    (freeWorkoutsRemaining > 0) ||
    (accessStatus?.tokensRemaining ?? 0) > 0);

  return (
    <>
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <link rel="canonical" href="https://aiworkoutnow.com/" />

        {/* Social preview */}
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:url" content="https://aiworkoutnow.com/" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://aiworkoutnow.com/images/hero-bg.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seoTitle} />
        <meta name="twitter:description" content={seoDescription} />
        <meta name="twitter:image" content="https://aiworkoutnow.com/images/hero-bg.png" />

        {/* Performance: prioritize hero image */}
        <link rel="preload" as="image" href="/images/hero-bg.png" />

        {/* Structured data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "AIWorkoutNow",
            "url": "https://aiworkoutnow.com/"
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "AIWorkoutNow",
            "applicationCategory": "HealthApplication",
            "operatingSystem": "Web",
            "url": "https://aiworkoutnow.com/",
            "description": seoDescription,
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD",
              "description": "3 free workouts, then one-time payment workout packs"
            }
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "Do I need to sign up?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "No. You can generate workouts immediately—no account or login required."
                }
              },
              {
                "@type": "Question",
                "name": "Is this a subscription?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "No. Purchases are one-time payments (no recurring charges)."
                }
              },
              {
                "@type": "Question",
                "name": "How do I restore credits on another device?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Use “Restore Credits” and enter the email used at checkout. We’ll send a verification code to restore workouts on the new device."
                }
              },
              {
                "@type": "Question",
                "name": "What counts as a workout generation?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Each time you create a new workout plan, it uses 1 workout credit (unless you are using the free trial credits)."
                }
              },
              {
                "@type": "Question",
                "name": "Refund policy",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "If you have an issue with a purchase, contact support and we’ll help you resolve it."
                }
              }
            ]
          })}
        </script>
      </Helmet>
      
      <main className="homeMain">
        <div className="homeMainOverlay" aria-hidden="true" />
        <div className="homeMainInner">
          <div className="max-w-7xl mx-auto px-4">
            {/* Primary experience */}
            <section id="workout-generator" className="homeSection">
              <header className="homeSectionHeader">
                <h2 className="homeH2">Instant Workout Plan</h2>
                <p className="homeLead">
                  Tell us your level, goals, equipment, and time. Get a personalized workout plan in seconds.
                </p>
              </header>
              <div className="bg-white shadow-2xl rounded-2xl border border-slate-200 p-6 md:p-8 lg:p-10">
                <WorkoutGenerator
                  onGenerate={handleGenerateWorkout}
                  loading={loading}
                  error={error}
                  workout={workout}
                  disabled={!canGenerate && !checkingAccess}
                />
              </div>
            </section>

            {/* Clean conversion section (no overlap) */}
            <section className="homeSection homePanel">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
                {/* Left: benefits + compact stats */}
                <aside className="lg:col-span-4 space-y-4 order-1">
                  <div className="homeCard">
                    <h2 className="homeH2Sm">Why people switch to AIWorkoutNow</h2>
                    <ul className="homeBullets" role="list">
                      <li><strong>Personalized workout plan</strong> tailored to your level, goals, and equipment.</li>
                      <li><strong>Instant workout generator</strong>—no templates, no browsing.</li>
                      <li><strong>No signup</strong> and <strong>one-time payment</strong> options (no subscription).</li>
                      <li><strong>Gym or home</strong> workouts, beginner to advanced.</li>
                    </ul>
                  </div>

                  <div className="homeCard homeStats">
                    <div className="homeStat">
                      <div className="homeStatValue">10,000+</div>
                      <div className="homeStatLabel">workouts generated</div>
                    </div>
                    <div className="homeStat">
                      <div className="homeStatValue">4.8★</div>
                      <div className="homeStatLabel">user rating</div>
                    </div>
                    <div className="homeStat">
                      <div className="homeStatValue">98%</div>
                      <div className="homeStatLabel">satisfaction</div>
                    </div>
                  </div>
                </aside>

                {/* Right: pricing (mobile order: pricing before restore) */}
                <aside className="lg:col-span-4 order-2 lg:order-3">
                  <div className="homeCard">
                    <PricingPlans showHeader={true} vertical={true} />
                    <p className="homeTrustLine">Secure checkout • Instant access • One-time payment</p>
                  </div>
                </aside>

                {/* Center: restore credits */}
                <aside className="lg:col-span-4 order-3 lg:order-2">
                  <div id="restore-credits-section" className="homeCard homeRestore">
                    <h2 className="homeH2Sm">
                      {!showRestoreCredits ? 'Restore credits on this device' : 'Restore credits'}
                    </h2>
                    <p className="homeMuted">
                      Purchased on another device? Enter your email to restore workouts here—no account needed.
                    </p>

                    {!checkingAccess && !showRestoreCredits && (
                      <button
                        onClick={() => setShowRestoreCredits(true)}
                        className="btn"
                      >
                        Restore Credits
                      </button>
                    )}

                    {!checkingAccess && showRestoreCredits && (
                      <RestoreCredits
                        onCreditsRestored={() => {
                          setShowRestoreCredits(false);
                          checkAccessStatus(true);
                        }}
                      />
                    )}

                    <div className="homeChips" role="list" aria-label="Trust highlights">
                      <span className="homeChip" role="listitem">🔒 Secure checkout</span>
                      <span className="homeChip" role="listitem">🚫 No signup</span>
                      <span className="homeChip" role="listitem">🧾 No subscription</span>
                      <span className="homeChip" role="listitem">⚡ Instant access</span>
                    </div>
                  </div>
                </aside>
              </div>
            </section>

            {/* FAQ (for conversion + SEO) */}
            <section className="homeSection">
              <header className="homeSectionHeader">
                <h2 className="homeH2">FAQ</h2>
                <p className="homeMuted">Quick answers before you buy.</p>
              </header>
              <div className="homeFaq" role="list">
                {[
                  {
                    q: 'Do I need to sign up?',
                    a: 'No. You can generate workouts immediately—no account or login required.',
                  },
                  {
                    q: 'Is this a subscription?',
                    a: 'No. Purchases are one-time payments (no recurring charges).',
                  },
                  {
                    q: 'How do I restore credits on another device?',
                    a: 'Use “Restore Credits” and enter the email used at checkout. We’ll send a verification code to restore workouts on the new device.',
                  },
                  {
                    q: 'What counts as a workout generation?',
                    a: 'Each time you create a new workout plan, it uses 1 workout credit (unless you are using the free trial credits).',
                  },
                  {
                    q: 'Refund policy',
                    a: 'If you have an issue with a purchase, contact support and we’ll help you resolve it.',
                  },
                ].map((item) => (
                  <details key={item.q} className="homeFaqItem" role="listitem">
                    <summary className="homeFaqQ">{item.q}</summary>
                    <div className="homeFaqA">{item.a}</div>
                  </details>
                ))}
              </div>
            </section>

            {/* SEO content block (visible, above footer) */}
            <section className="homeSection homeSeo">
              <h2 className="homeH2">AI Workout Generator</h2>
              <p className="homeMuted">
                AIWorkoutNow is an <strong>AI workout generator</strong> that creates an <strong>instant workout plan</strong> tailored to your
                goals, fitness level, and available equipment. Whether you train at home or in the gym, you can generate a
                <strong> personalized workout plan</strong> in seconds—no signup required.
              </p>
              <p className="homeMuted">
                Start free, then unlock more workouts with a <strong>one-time payment workout app</strong> model—no subscriptions, no recurring charges.
              </p>
              <h3 className="homeH3">Personalized Workout Plans in Seconds</h3>
              <ul className="homeBullets" role="list">
                <li>Beginner to advanced difficulty</li>
                <li>Home or gym setups</li>
                <li>Equipment-aware recommendations</li>
                <li>Goals-based plans (strength, fat loss, endurance)</li>
              </ul>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}

export default Home;
