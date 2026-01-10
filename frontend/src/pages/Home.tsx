import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import WorkoutGenerator from '../components/WorkoutGenerator';
import PricingPlans from '../components/PricingPlans';
import PaywallModal from '../components/PaywallModal';
import RestoreCredits from '../components/RestoreCredits';
import { getDeviceId, getTokenBalance, setTokenBalance as updateTokenStorage } from '../utils/storage';
import { generateWorkout, getFreeWorkoutsRemaining, getUserAccessStatus, UserAccessStatus } from '../services/api';
import { useHeroContext } from '../components/Layout';
import './Home.css';

function Home() {
  const [workout, setWorkout] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [freeWorkoutsRemaining, setFreeWorkoutsRemaining] = useState<number>(3);
  const [accessStatus, setAccessStatus] = useState<UserAccessStatus | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showRestoreCredits, setShowRestoreCredits] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const { setHeroContent } = useHeroContext();

  const seoTitle = "AIWorkoutNow - Free AI Workout Generator | Personalized Fitness Plans";
  const seoDescription = "Get personalized AI-generated workouts instantly. No signup required. Free AI workout generator that creates custom fitness plans tailored to your goals, equipment, and schedule. Try 3 free workouts today!";
  const seoKeywords = "AI workouts, workout generator, fitness AI, personalized workouts, no signup workouts, free workout generator, AI fitness, custom workout plans, home workouts, gym workouts, fitness app, workout planner, exercise generator, fitness coach AI";

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
      checkAccessStatus();
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
      } : undefined,
      tokenBalance,
      checkingAccess,
    });
  }, [freeWorkoutsRemaining, accessStatus, tokenBalance, checkingAccess, setHeroContent]);

  const checkAccessStatus = async () => {
    try {
      setCheckingAccess(true);
      const deviceId = getDeviceId();
      
      const status = await getUserAccessStatus(deviceId);
      setAccessStatus(status);
      
      // CRITICAL FIX: Backend returns hasUnlimitedAccess=false when tokens are reset (e.g., to 7)
      // ALWAYS respect the API response - if hasUnlimitedAccess is false, never show unlimited
      // Even if tokensRemaining is high, if hasUnlimitedAccess is false, treat it as regular tokens
      if (status.hasUnlimitedAccess === true && status.tokensRemaining >= 999999) {
        // Only set unlimited if API explicitly confirms it
        setTokenBalance(status.tokensRemaining);
        updateTokenStorage(deviceId, status.tokensRemaining);
      } else if (status.tokensRemaining > 0) {
        // Regular token count (including when reset to 7 - hasUnlimitedAccess will be false)
        // This handles both regular tokens AND admin resets
        setTokenBalance(status.tokensRemaining);
        updateTokenStorage(deviceId, status.tokensRemaining);
      } else {
        // No paid tokens, check free workouts
        const freeWorkouts = await getFreeWorkoutsRemaining(deviceId);
        setFreeWorkoutsRemaining(freeWorkouts.remaining);
        setTokenBalance(null);
      }
    } catch (err) {
      console.error('Failed to check access status:', err);
      setFreeWorkoutsRemaining(3);
    } finally {
      setCheckingAccess(false);
    }
  };

  const handleGenerateWorkout = async (preferences: any) => {
    setLoading(true);
    setError(null);
    
    try {
      const deviceId = getDeviceId();
      const balance = getTokenBalance(deviceId);
      const needsToken = balance === null || balance === 0;
      
      if (needsToken && freeWorkoutsRemaining <= 0 && !accessStatus?.hasUnlimitedAccess) {
        setShowPaywall(true);
        setLoading(false);
        return;
      }
      
      const result = await generateWorkout(preferences, deviceId, needsToken);
      setWorkout(result);
      
      // Update tokens immediately from response
      if (result.tokensRemaining !== undefined) {
        if (needsToken) {
          // Free workout was used
          setFreeWorkoutsRemaining(Math.max(0, freeWorkoutsRemaining - 1));
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
      
      if (errorMessage.includes('3 free workouts') || err.response?.data?.code === 'FREE_TIER_EXHAUSTED') {
        setShowPaywall(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseComplete = () => {
    checkAccessStatus();
    setShowPaywall(false);
  };

  const canGenerate = accessStatus?.canGenerateWorkout ?? (freeWorkoutsRemaining > 0);

  return (
    <>
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <meta name="keywords" content={seoKeywords} />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:url" content="https://aiworkoutnow.com" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://aiworkoutnow.com/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seoTitle} />
        <meta name="twitter:description" content={seoDescription} />
        <meta name="twitter:image" content="https://aiworkoutnow.com/og-image.png" />
        <link rel="canonical" href="https://aiworkoutnow.com" />
        <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          "name": "AIWorkoutNow",
          "url": "https://aiworkoutnow.com",
          "description": seoDescription,
          "applicationCategory": "HealthApplication",
          "operatingSystem": "Web",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD",
            "description": "3 free workouts, then one-time payment options available"
          },
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.8",
            "ratingCount": "150"
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
                "name": "Is this a real trainer?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "No, this is an AI-generated workout plan. Our AI creates personalized workouts based on your preferences, but it's not a replacement for professional medical or fitness advice."
                }
              },
              {
                "@type": "Question",
                "name": "Is this medical advice?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "No, AIWorkoutNow provides AI-generated workout plans for informational purposes only. Always consult with a healthcare professional before starting any new exercise program."
                }
              },
              {
                "@type": "Question",
                "name": "Do I need an account?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "No, you don't need to create an account. You can use AIWorkoutNow immediately with 3 free workouts, no signup required."
                }
              },
              {
                "@type": "Question",
                "name": "Is there a subscription?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "No, there are no subscriptions. You pay once for additional workouts or unlimited access. No recurring charges."
                }
              }
            ]
          })}
        </script>
      </Helmet>
      
      <main className="min-h-screen py-6" style={{
        backgroundImage: "url('/images/main-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed"
      }}>
        <div className="max-w-7xl mx-auto px-4">
          {/* 3-Column Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 lg:gap-8">
            {/* Left Column: Why Choose AIWorkoutNow? - Benefits, Stats */}
            <aside className="md:col-span-2 lg:col-span-3 space-y-6 order-3 md:order-3 lg:order-1">
              {/* Why Choose Us */}
              <section className="bg-slate-50/50 rounded-2xl p-6 border-2 border-slate-200 shadow-lg">
                <h2 className="text-xl font-bold text-slate-900 mb-5">Why Choose AIWorkoutNow?</h2>
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

          {/* SEO Content - Hidden but present for SEO */}
          <section className="mt-8 hidden">
            <h2>AI Workout Generator Without Signup</h2>
            <p>Get personalized AI-generated workouts instantly without creating an account. Start with 3 free workouts and unlock more with one-time payments. No subscriptions, no commitments.</p>
            <h2>Personalized Home & Gym Workouts</h2>
            <p>Our AI creates custom workout plans tailored to your fitness level, available equipment, and personal goals. Whether you're at home or in the gym, get workouts that fit your needs.</p>
            <h2>Best AI Fitness App for Busy People</h2>
            <p>No time for long signup processes? AIWorkoutNow gives you instant access to professional-quality workout plans. Get started in seconds, not minutes.</p>
          </section>
        </div>
      </main>

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        onPurchaseComplete={handlePurchaseComplete}
      />
    </>
  );
}

export default Home;
