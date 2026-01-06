import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import WorkoutGenerator from '../components/WorkoutGenerator';
import PricingPlans from '../components/PricingPlans';
import PaywallModal from '../components/PaywallModal';
import AffiliateProducts from '../components/AffiliateProducts';
import { getDeviceId, getTokenBalance } from '../utils/storage';
import { generateWorkout, getFreeWorkoutsRemaining, getUserAccessStatus, UserAccessStatus } from '../services/api';
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

  useEffect(() => {
    checkAccessStatus();
  }, []);

  const checkAccessStatus = async () => {
    try {
      setCheckingAccess(true);
      const deviceId = getDeviceId();
      
      // Check access status from API
      const status = await getUserAccessStatus(deviceId);
      setAccessStatus(status);
      
      // Check free workouts
      const freeWorkouts = await getFreeWorkoutsRemaining(deviceId);
      setFreeWorkoutsRemaining(freeWorkouts.remaining);
      
      // Check token balance
      const balance = getTokenBalance(deviceId);
      setTokenBalance(balance);
    } catch (err) {
      console.error('Failed to check access status:', err);
      // Default to free tier if API fails
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
      
      // Check if user can generate workout
      if (needsToken && freeWorkoutsRemaining <= 0 && !accessStatus?.hasUnlimitedAccess) {
        setShowPaywall(true);
        setLoading(false);
        return;
      }
      
      const result = await generateWorkout(preferences, deviceId, needsToken);
      setWorkout(result);
      
      // Update state after successful generation
      if (needsToken && result.tokensRemaining !== undefined) {
        // This is a free workout
        setFreeWorkoutsRemaining(Math.max(0, freeWorkoutsRemaining - 1));
      } else if (!needsToken && result.tokensRemaining !== undefined) {
        // This is a paid workout
        setTokenBalance(result.tokensRemaining);
      }
      
      // Refresh access status
      await checkAccessStatus();
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to generate workout. Please try again.';
      setError(errorMessage);
      
      // Check if it's a free tier exhausted error
      if (errorMessage.includes('3 free workouts') || err.response?.data?.code === 'FREE_TIER_EXHAUSTED') {
        setShowPaywall(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseComplete = () => {
    // Refresh access status after purchase
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
        
        {/* Open Graph */}
        <meta property="og:title" content="AI Workout Generator – 3 Free Workouts | AIWorkoutNow" />
        <meta property="og:description" content="Get 3 free AI workouts. No signup, no subscription. Pay once and train instantly." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://aiworkoutnow.com" />
        <meta property="og:image" content="https://aiworkoutnow.com/og-image.png" />
        <meta property="og:site_name" content="AIWorkoutNow" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="AI Workout Generator – 3 Free Workouts" />
        <meta name="twitter:description" content="Get 3 free AI workouts. No signup, no subscription. Pay once and train instantly." />
        <meta name="twitter:image" content="https://aiworkoutnow.com/og-image.png" />
        
        {/* Structured Data - WebPage */}
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
        
        {/* FAQ Schema */}
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
      
      <main className="home">
        <div className="container">
          <div className="home-layout">
            <div className="home-main">
              {/* Free Tier Banner */}
              {freeWorkoutsRemaining > 0 && (
                <section className="free-tier-banner" aria-label="Free workout offer">
                  <span className="banner-icon" aria-hidden="true">🎁</span>
                  <span className="banner-text">3 Free AI Workouts — No Signup Required</span>
                </section>
              )}

              <section className="hero">
                <h1>Instant AI Workouts. No Signup.</h1>
                <p className="hero-subtitle">
                  No account. No subscription. Just train.
                </p>
                
                <div className="trust-signals" role="list" aria-label="Key features">
                  <span role="listitem">🎁 3 Free Workouts</span>
                  <span role="listitem">🚫 No Signup</span>
                  <span role="listitem">💳 One-Time Payment</span>
                </div>

                {/* Access Status Display */}
                {!checkingAccess && (
                  <div className="access-status" aria-live="polite">
                    {accessStatus?.hasUnlimitedAccess ? (
                      <div className="status-badge unlimited">
                        <span>∞ Unlimited Access</span>
                        {accessStatus.unlimitedExpiresAt && (
                          <span className="expires">
                            (expires {new Date(accessStatus.unlimitedExpiresAt).toLocaleDateString()})
                          </span>
                        )}
                      </div>
                    ) : tokenBalance !== null && tokenBalance > 0 ? (
                      <div className="status-badge tokens">
                        <span>Tokens: {tokenBalance}</span>
                      </div>
                    ) : freeWorkoutsRemaining > 0 ? (
                      <div className="status-badge free">
                        <span>Free workouts remaining: {freeWorkoutsRemaining} / 3</span>
                      </div>
                    ) : (
                      <div className="status-badge exhausted">
                        <span>Free workouts exhausted</span>
                      </div>
                    )}
                  </div>
                )}
              </section>

              <WorkoutGenerator
                onGenerate={handleGenerateWorkout}
                loading={loading}
                error={error}
                workout={workout}
                disabled={!canGenerate && !checkingAccess}
              />

              {workout && (
                <AffiliateProducts workoutType={workout.type || 'general'} />
              )}

              {/* SEO Content Sections */}
              <section className="seo-content" aria-label="About AI Workout Generator">
                <h2>AI Workout Generator Without Signup</h2>
                <p>
                  Get personalized AI-generated workouts instantly without creating an account. 
                  Start with 3 free workouts and unlock more with one-time payments. No subscriptions, no commitments.
                </p>

                <h2>Personalized Home & Gym Workouts</h2>
                <p>
                  Our AI creates custom workout plans tailored to your fitness level, available equipment, 
                  and personal goals. Whether you're at home or in the gym, get workouts that fit your needs.
                </p>

                <h2>Best AI Fitness App for Busy People</h2>
                <p>
                  No time for long signup processes? AIWorkoutNow gives you instant access to professional-quality 
                  workout plans. Get started in seconds, not minutes.
                </p>
              </section>
            </div>

            <aside className="home-sidebar" aria-label="Pricing plans">
              <PricingPlans showHeader={false} compact={true} />
            </aside>
          </div>

          <section className="home-full-width" aria-label="Pricing plans">
            <PricingPlans showHeader={true} />
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
