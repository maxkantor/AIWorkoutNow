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
      
      const freeWorkouts = await getFreeWorkoutsRemaining(deviceId);
      setFreeWorkoutsRemaining(freeWorkouts.remaining);
      
      const balance = getTokenBalance(deviceId);
      setTokenBalance(balance);
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
      
      <main className="main-content">
        <div className="content-container">
          {/* 3-Column Grid Layout */}
          <div className="main-grid">
            {/* Left Column: Why Choose AIWorkoutNow? - Benefits, Stats */}
            <aside className="sidebar-left">
              {/* Why Choose Us */}
              <section className="benefits-section">
                <h2>Why Choose AIWorkoutNow?</h2>
                <div>
                  <div>
                    <div>🎯</div>
                    <h3>100% Personalized</h3>
                    <p>Every workout is tailored to your fitness level, goals, and available equipment.</p>
                  </div>
                  <div>
                    <div>⚡</div>
                    <h3>Instant Generation</h3>
                    <p>Get professional-quality workout plans in seconds, not hours of research.</p>
                  </div>
                  <div>
                    <div>🏠</div>
                    <h3>Home or Gym</h3>
                    <p>Works with any equipment—from bodyweight to full gym setups.</p>
                  </div>
                  <div>
                    <div>🔒</div>
                    <h3>No Commitment</h3>
                    <p>Pay once. No subscriptions. No recurring charges. Ever.</p>
                  </div>
                </div>
              </section>

              {/* Stats */}
              <section className="stats-section">
                <div>
                  <div>
                    <div>10,000+</div>
                    <div>Workouts Generated</div>
                  </div>
                  <div>
                    <div>4.8★</div>
                    <div>User Rating</div>
                  </div>
                  <div>
                    <div>98%</div>
                    <div>Satisfaction Rate</div>
                  </div>
                </div>
              </section>
            </aside>

            {/* Center Column: Workout Generator Form */}
            <section className="main-form-section">
              {/* Workout Generator Form */}
              <div className="form-container">
                <WorkoutGenerator
                  onGenerate={handleGenerateWorkout}
                  loading={loading}
                  error={error}
                  workout={workout}
                  disabled={!canGenerate && !checkingAccess}
                />
              </div>

              {workout && (
                <div className="affiliate-products-wrapper">
                  <AffiliateProducts workoutType={workout.type || 'general'} />
                </div>
              )}
            </section>

            {/* Right Column: Pricing Plans */}
            <aside className="sidebar-right">
              <div className="pricing-container">
                <PricingPlans showHeader={true} vertical={true} />
              </div>
            </aside>
          </div>

          {/* Trust Badges - Full Width */}
          <section className="trust-badges-section">
            <div>
              <span>🔒</span>
              <span>Secure Payment</span>
            </div>
            <div>
              <span>🚫</span>
              <span>No Subscription</span>
            </div>
            <div>
              <span>⚡</span>
              <span>Instant Access</span>
            </div>
            <div>
              <span>💯</span>
              <span>Money-Back Guarantee</span>
            </div>
          </section>

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
