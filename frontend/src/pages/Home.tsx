import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import WorkoutGenerator from '../components/WorkoutGenerator';
import PricingPlans from '../components/PricingPlans';
import RestoreCredits from '../components/RestoreCredits';
import PromoWorkoutVideo from '../components/PromoWorkoutVideo/PromoWorkoutVideo';
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

  // SEO: keep title ~50–60 chars and description ~140–160 chars
  const seoTitle = "AI Workout Generator (No Signup) | One-Time Payment";
  const seoDescription =
    "Generate a personalized workout plan instantly—no signup. Try 3 free workouts, then unlock more with a one-time payment. Gym or home, equipment-aware, goals-based.";

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
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
        <link rel="canonical" href="https://aiworkoutnow.com/" />

        {/* Open Graph / Twitter */}
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:url" content="https://aiworkoutnow.com/" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://aiworkoutnow.com/og-image.svg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="AIWorkoutNow" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://aiworkoutnow.com/" />
        <meta name="twitter:title" content={seoTitle} />
        <meta name="twitter:description" content={seoDescription} />
        <meta name="twitter:image" content="https://aiworkoutnow.com/og-image.svg" />

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
            "@type": "Organization",
            "name": "AIWorkoutNow",
            "url": "https://aiworkoutnow.com/",
            "logo": "https://aiworkoutnow.com/favicon.svg",
            "contactPoint": {
              "@type": "ContactPoint",
              "contactType": "Customer Support",
              "url": "https://aiworkoutnow.com/contact"
            }
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
                  "text": "Use “Restore Credits” and enter the email used at checkout. We’ll send a verification code."
                }
              },
              {
                "@type": "Question",
                "name": "What counts as a workout generation?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Each time you create a new workout plan, it uses 1 workout credit (unless you’re using free trial credits)."
                }
              }
            ]
          })}
        </script>
      </Helmet>
      
      <main className="min-h-screen py-6 relative homeMainBg" style={{
        backgroundImage: "url('/images/main-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat"
      }}>
        {/* Semi-transparent overlay to ensure content readability */}
        <div className="absolute inset-0 bg-white/30 pointer-events-none z-0"></div>
        <div className="relative z-10">
        <div className="max-w-7xl mx-auto px-4">
          {/* 3-Column Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 lg:gap-8">
            {/* Left Column: Why Choose AIWorkoutNow? - Benefits, Stats */}
            <aside className="md:col-span-2 lg:col-span-3 space-y-6 order-3 md:order-3 lg:order-1">
              {/* Why Choose Us */}
              <section className="bg-slate-50/50 rounded-2xl p-6 border-2 border-slate-200 shadow-lg">
                <h2 className="text-xl font-bold text-slate-900 mb-5">Why Choose AIWorkoutNow?</h2>
                <PromoWorkoutVideo />
                <div className="space-y-4">
                  <div className="bg-white rounded-xl p-5 shadow-md border border-slate-100 hover:shadow-lg transition-all">
                    <div className="text-3xl mb-3">🎯</div>
                    <h3 className="font-bold text-slate-900 mb-2 text-base">100% Personalized</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">Every workout is tailored to your fitness level, goals, and available equipment.</p>
                  </div>
                  <div className="bg-white rounded-xl p-5 shadow-md border border-slate-100 hover:shadow-lg transition-all">
                    <div className="text-3xl mb-3">⚡</div>
                    <h3 className="font-bold text-slate-900 mb-2 text-base">Instant Generation</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">Get professional-quality workout plans in seconds, not hours of research.</p>
                  </div>
                  <div className="bg-white rounded-xl p-5 shadow-md border border-slate-100 hover:shadow-lg transition-all">
                    <div className="text-3xl mb-3">🏠</div>
                    <h3 className="font-bold text-slate-900 mb-2 text-base">Home or Gym</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">Works with any equipment—from bodyweight to full gym setups.</p>
                  </div>
                  <div className="bg-white rounded-xl p-5 shadow-md border border-slate-100 hover:shadow-lg transition-all">
                    <div className="text-3xl mb-3">🔒</div>
                    <h3 className="font-bold text-slate-900 mb-2 text-base">No Commitment</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">Pay once. No subscriptions. No recurring charges. Ever.</p>
                  </div>
                </div>
              </section>

              {/* Stats - Enhanced Visual Hierarchy */}
              <section className="bg-gradient-to-br from-blue-600 via-purple-600 to-blue-700 rounded-2xl p-6 text-white shadow-xl">
                <div className="space-y-6">
                  <div className="text-center pb-4 border-b border-white/20">
                    <div className="text-4xl font-black mb-2">10,000+</div>
                    <div className="text-sm font-semibold opacity-95 uppercase tracking-wide">Workouts Generated</div>
                  </div>
                  <div className="text-center pb-4 border-b border-white/20">
                    <div className="text-4xl font-black mb-2">4.8★</div>
                    <div className="text-sm font-semibold opacity-95 uppercase tracking-wide">User Rating</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-black mb-2">98%</div>
                    <div className="text-sm font-semibold opacity-95 uppercase tracking-wide">Satisfaction Rate</div>
                  </div>
                </div>
              </section>
            </aside>

            {/* Center Column: Workout Generator Form */}
            <section id="workout-generator" className="md:col-span-1 lg:col-span-6 order-1 md:order-1 lg:order-2">
              {/* Workout Generator Form */}
              <div className="bg-white shadow-2xl rounded-2xl border-2 border-slate-200 p-6 md:p-8 lg:p-10">
                <WorkoutGenerator
                  onGenerate={handleGenerateWorkout}
                  loading={loading}
                  error={error}
                  workout={workout}
                  disabled={!canGenerate && !checkingAccess}
                />
              </div>

              {/* Restore Credits Section - Always visible */}
              {!checkingAccess && (
                <div id="restore-credits-section" className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-6 mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 mb-1">
                        {!showRestoreCredits ? 'Access Your Credits from Another Device?' : 'Restore Credits'}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {!showRestoreCredits 
                          ? 'Purchased credits on another device? Enter your email to restore them here.' 
                          : 'Enter the email you used when purchasing to restore your credits.'}
                      </p>
                    </div>
                  </div>
                  {!showRestoreCredits ? (
                    <button
                      onClick={() => setShowRestoreCredits(true)}
                      className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-lg hover:shadow-lg transition-all hover:-translate-y-0.5"
                    >
                      Restore Credits
                    </button>
                  ) : (
                    <RestoreCredits
                      onCreditsRestored={() => {
                        setShowRestoreCredits(false);
                        checkAccessStatus();
                      }}
                    />
                  )}
                </div>
              )}

              {/* Trust Badges - Cleaner, More Prominent */}
              <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl p-4 text-center border-2 border-slate-200 shadow-md hover:shadow-lg transition-all hover:-translate-y-1">
                  <span className="text-2xl block mb-2">🔒</span>
                  <span className="text-sm font-bold text-slate-800">Secure Payment</span>
                </div>
                <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl p-4 text-center border-2 border-slate-200 shadow-md hover:shadow-lg transition-all hover:-translate-y-1">
                  <span className="text-2xl block mb-2">🚫</span>
                  <span className="text-sm font-bold text-slate-800">No Subscription</span>
                </div>
                <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl p-4 text-center border-2 border-slate-200 shadow-md hover:shadow-lg transition-all hover:-translate-y-1">
                  <span className="text-2xl block mb-2">⚡</span>
                  <span className="text-sm font-bold text-slate-800">Instant Access</span>
                </div>
                <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl p-4 text-center border-2 border-slate-200 shadow-md hover:shadow-lg transition-all hover:-translate-y-1">
                  <span className="text-2xl block mb-2">💯</span>
                  <span className="text-sm font-bold text-slate-800">Money-Back Guarantee</span>
                </div>
              </section>
            </section>

            {/* Right Column: Pricing Plans */}
            <aside className="md:col-span-1 lg:col-span-3 order-2 md:order-2 lg:order-3">
              <div className="bg-slate-50/50 rounded-2xl p-6 border-2 border-slate-200 shadow-lg">
                <PricingPlans showHeader={true} vertical={true} />
              </div>
            </aside>
          </div>

          {/* SEO Content (visible, below generator and above footer) */}
          <section className="mt-10 bg-white/70 rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-3">AI Workout Generator</h2>
            <p className="text-slate-700 leading-relaxed mb-3">
              AIWorkoutNow is an <strong>AI workout generator</strong> that creates a <strong>personalized workout plan</strong> based on your fitness level,
              goals, equipment, and time. Get an <strong>instant workout plan</strong> in seconds—no signup required.
            </p>
            <p className="text-slate-700 leading-relaxed mb-4">
              Start free, then unlock more workouts with a <strong>one-time payment workout</strong> model. No subscriptions. No recurring charges.
            </p>
            <h3 className="text-lg font-bold text-slate-900 mb-3">Personalized Workout Plans in Seconds</h3>
            <ul className="list-disc pl-5 text-slate-700 space-y-1">
              <li>Beginner to advanced difficulty</li>
              <li>Home or gym setups</li>
              <li>Equipment-aware recommendations</li>
              <li>Goals-based workouts (strength, fat loss, endurance)</li>
              <li>Instant access — no signup required</li>
            </ul>

            <h3 className="text-lg font-bold text-slate-900 mt-6 mb-2">No Signup. One-Time Payment.</h3>
            <p className="text-slate-700 leading-relaxed">
              Try the workout generator free, then choose a one-time payment pack when you’re ready. No recurring subscription.
            </p>
          </section>

          {/* FAQ (small, appended — does not alter main layout) */}
          <section className="mt-6 bg-white/70 rounded-2xl p-6 border border-slate-200 shadow-sm" aria-labelledby="faq-heading">
            <h2 id="faq-heading" className="text-2xl font-extrabold text-slate-900 mb-3">FAQ</h2>
            <div className="space-y-2">
              <details className="bg-white/80 rounded-xl p-4 border border-slate-200">
                <summary className="font-semibold text-slate-900 cursor-pointer">Do I need to sign up?</summary>
                <p className="text-slate-700 mt-2">No. You can generate workouts immediately—no account or login required.</p>
              </details>
              <details className="bg-white/80 rounded-xl p-4 border border-slate-200">
                <summary className="font-semibold text-slate-900 cursor-pointer">Is this a subscription?</summary>
                <p className="text-slate-700 mt-2">No. Purchases are one-time payments (no recurring charges).</p>
              </details>
              <details className="bg-white/80 rounded-xl p-4 border border-slate-200">
                <summary className="font-semibold text-slate-900 cursor-pointer">How do I restore credits on another device?</summary>
                <p className="text-slate-700 mt-2">Use “Restore Credits” and enter the email used at checkout. We’ll send a verification code.</p>
              </details>
              <details className="bg-white/80 rounded-xl p-4 border border-slate-200">
                <summary className="font-semibold text-slate-900 cursor-pointer">What counts as a workout generation?</summary>
                <p className="text-slate-700 mt-2">Each time you create a new workout plan, it uses 1 workout credit (unless you’re using free trial credits).</p>
              </details>
            </div>
          </section>
        </div>
      </div>
      </main>
    </>
  );
}

export default Home;
