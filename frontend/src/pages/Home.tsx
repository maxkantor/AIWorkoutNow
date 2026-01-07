import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import WorkoutGenerator from '../components/WorkoutGenerator';
import PricingPlans from '../components/PricingPlans';
import PaywallModal from '../components/PaywallModal';
import AffiliateProducts from '../components/AffiliateProducts';
import { getDeviceId, getTokenBalance } from '../utils/storage';
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
  const [checkingAccess, setCheckingAccess] = useState(true);
  const { setHeroContent } = useHeroContext();

  useEffect(() => {
    checkAccessStatus();
  }, []);

  useEffect(() => {
    setHeroContent({
      freeWorkoutsRemaining,
      accessStatus: accessStatus ? {
        hasUnlimitedAccess: accessStatus.hasUnlimitedAccess,
        unlimitedExpiresAt: accessStatus.unlimitedExpiresAt || undefined,
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
      
      // Use tokensRemaining from API response (prioritize paid tokens)
      if (status.tokensRemaining > 0) {
        setTokenBalance(status.tokensRemaining);
        // Update localStorage for consistency
        const storageData = JSON.parse(localStorage.getItem(`token_balance_${deviceId}`) || '{}');
        storageData.tokensRemaining = status.tokensRemaining;
        storageData.lastUpdated = Date.now();
        localStorage.setItem(`token_balance_${deviceId}`, JSON.stringify(storageData));
      } else {
        // Only check free workouts if no paid tokens
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
      
      if (needsToken && result.tokensRemaining !== undefined) {
        setFreeWorkoutsRemaining(Math.max(0, freeWorkoutsRemaining - 1));
      } else if (!needsToken && result.tokensRemaining !== undefined) {
        setTokenBalance(result.tokensRemaining);
      }
      
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
        <title>AI Workout Generator – 3 Free Workouts | AIWorkoutNow</title>
        <meta 
          name="description" 
          content="Get 3 free AI workouts. No signup, no subscription. Pay once and train instantly with AIWorkoutNow." 
        />
        <meta name="keywords" content="AI workout generator, free workouts, personalized fitness, home workouts, no signup, AI fitness, workout planner, fitness AI" />
        <meta name="author" content="AIWorkoutNow" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://aiworkoutnow.com" />
        
        <meta property="og:title" content="AI Workout Generator – 3 Free Workouts | AIWorkoutNow" />
        <meta property="og:description" content="Get 3 free AI workouts. No signup, no subscription. Pay once and train instantly." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://aiworkoutnow.com" />
        <meta property="og:image" content="https://aiworkoutnow.com/og-image.png" />
        <meta property="og:site_name" content="AIWorkoutNow" />
        
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="AI Workout Generator – 3 Free Workouts" />
        <meta name="twitter:description" content="Get 3 free AI workouts. No signup, no subscription. Pay once and train instantly." />
        <meta name="twitter:image" content="https://aiworkoutnow.com/og-image.png" />
        
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "AI Workout Generator – 3 Free Workouts",
            "description": "Get 3 free AI workouts. No signup, no subscription. Pay once and train instantly with AIWorkoutNow.",
            "url": "https://aiworkoutnow.com",
            "inLanguage": "en-US",
            "isPartOf": {
              "@type": "WebSite",
              "name": "AIWorkoutNow",
              "url": "https://aiworkoutnow.com"
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
      
      <main className="min-h-screen bg-slate-50 py-6">
        <div className="max-w-7xl mx-auto px-4">
          {/* 3-Column Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 lg:gap-8">
            {/* Left Column: Why Choose AIWorkoutNow? - Benefits, Stats */}
            <aside className="md:col-span-2 lg:col-span-3 space-y-6 order-3 md:order-3 lg:order-1">
              {/* Why Choose Us */}
              <section className="bg-slate-50/50 rounded-xl p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Why Choose AIWorkoutNow?</h2>
                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="text-3xl mb-2">🎯</div>
                    <h3 className="font-semibold text-slate-800 mb-1">100% Personalized</h3>
                    <p className="text-sm text-slate-600">Every workout is tailored to your fitness level, goals, and available equipment.</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="text-3xl mb-2">⚡</div>
                    <h3 className="font-semibold text-slate-800 mb-1">Instant Generation</h3>
                    <p className="text-sm text-slate-600">Get professional-quality workout plans in seconds, not hours of research.</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="text-3xl mb-2">🏠</div>
                    <h3 className="font-semibold text-slate-800 mb-1">Home or Gym</h3>
                    <p className="text-sm text-slate-600">Works with any equipment—from bodyweight to full gym setups.</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="text-3xl mb-2">🔒</div>
                    <h3 className="font-semibold text-slate-800 mb-1">No Commitment</h3>
                    <p className="text-sm text-slate-600">Pay once. No subscriptions. No recurring charges. Ever.</p>
                  </div>
                </div>
              </section>

              {/* Stats */}
              <section className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl p-6 text-white">
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-extrabold mb-1">10,000+</div>
                    <div className="text-sm opacity-90">Workouts Generated</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-extrabold mb-1">4.8★</div>
                    <div className="text-sm opacity-90">User Rating</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-extrabold mb-1">98%</div>
                    <div className="text-sm opacity-90">Satisfaction Rate</div>
                  </div>
                </div>
              </section>
            </aside>

            {/* Center Column: Workout Generator Form */}
            <section className="md:col-span-1 lg:col-span-6 order-1 md:order-1 lg:order-2">
              {/* Workout Generator Form */}
              <div className="bg-white shadow-xl rounded-2xl border border-slate-100 p-6 md:p-8">
                <WorkoutGenerator
                  onGenerate={handleGenerateWorkout}
                  loading={loading}
                  error={error}
                  workout={workout}
                  disabled={!canGenerate && !checkingAccess}
                />
              </div>

              {workout && (
                <div className="mt-6">
                  <AffiliateProducts workoutType={workout.type || 'general'} />
                </div>
              )}

              {/* Trust Badges - Under Workout Section */}
              <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
                <div className="bg-white rounded-lg p-3 text-center border border-slate-200 shadow-sm">
                  <span className="text-xl block mb-1.5">🔒</span>
                  <span className="text-xs font-semibold text-slate-700">Secure Payment</span>
                </div>
                <div className="bg-white rounded-lg p-3 text-center border border-slate-200 shadow-sm">
                  <span className="text-xl block mb-1.5">🚫</span>
                  <span className="text-xs font-semibold text-slate-700">No Subscription</span>
                </div>
                <div className="bg-white rounded-lg p-3 text-center border border-slate-200 shadow-sm">
                  <span className="text-xl block mb-1.5">⚡</span>
                  <span className="text-xs font-semibold text-slate-700">Instant Access</span>
                </div>
                <div className="bg-white rounded-lg p-3 text-center border border-slate-200 shadow-sm">
                  <span className="text-xl block mb-1.5">💯</span>
                  <span className="text-xs font-semibold text-slate-700">Money-Back Guarantee</span>
                </div>
              </section>
            </section>

            {/* Right Column: Pricing Plans */}
            <aside className="md:col-span-1 lg:col-span-3 order-2 md:order-2 lg:order-3">
              <div className="bg-slate-50/50 rounded-xl p-6">
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
