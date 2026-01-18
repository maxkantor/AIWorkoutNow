import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import WorkoutGenerator from '../components/WorkoutGenerator';
import PricingPlans from '../components/PricingPlans';
import RestoreCredits from '../components/RestoreCredits';
import PromoWorkoutVideo from '../components/PromoWorkoutVideo/PromoWorkoutVideo';
import SEO from '../components/SEO';
import { getDeviceId, setTokenBalance as updateTokenStorage } from '../utils/storage';
import { generateWorkout, getFreeWorkoutsRemaining, getUserAccessStatus, UserAccessStatus } from '../services/api';
import { useHeroContext } from '../components/Layout';
import { getArray } from '../i18n/getArray';
import './Home.css';

function Home() {
  const { t, i18n } = useTranslation();
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
  const seoTitle = t('pages.home.seo.title');
  const seoDescription = t('pages.home.seo.description');

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

  const checkAccessStatus = async (forceRefresh: boolean = false): Promise<UserAccessStatus | null> => {
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
        // IMPORTANT: Free tier is always out of 3 total. Keep remaining/total null so the hero uses the free badge.
        setRemainingWorkouts(null);
        setTotalWorkouts(null);
        setTokenBalance(null);
      }
      return status;
    } catch (err) {
      console.error('Failed to check access status:', err);
      setFreeWorkoutsRemaining(3);
      setRemainingWorkouts(null);
      setTotalWorkouts(null);
      return null;
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
      const latestStatus = await checkAccessStatus(true);
      const status = latestStatus ?? accessStatus;
      const hasUnlimited = status?.hasUnlimitedAccess === true;
      const freeRemaining = status?.freeWorkoutsRemaining ?? freeWorkoutsRemaining;
      const tokensRemaining = status?.tokensRemaining ?? tokenBalance ?? 0;
      
      // Determine if free user based on API response, not localStorage
      const isFreeUser =
        tokensRemaining <= 0 &&
        !hasUnlimited &&
        freeRemaining > 0;
      
      // If no workouts remaining, just return without generating
      if (isFreeUser && freeRemaining <= 0 && !hasUnlimited) {
        setError(t('pages.home.errors.noFreeRemaining'));
          setLoading(false);
          return;
        }
      
      if (!isFreeUser && tokensRemaining <= 0 && !hasUnlimited && freeRemaining <= 0) {
        setError(t('pages.home.errors.noWorkoutsRemaining'));
        setLoading(false);
        return;
      }
      
      const result = await generateWorkout(preferences, deviceId, isFreeUser, i18n.resolvedLanguage || i18n.language || 'en');
      setWorkout(result);
      
      // Update tokens immediately from response
      if (result.tokensRemaining !== undefined) {
        if (isFreeUser) {
          // Free workout was used
          setFreeWorkoutsRemaining(Math.max(0, freeRemaining - 1));
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
      <SEO
        title={seoTitle}
        description={seoDescription}
        canonicalUrl="https://aiworkoutnow.com/"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'AIWorkoutNow',
            url: 'https://aiworkoutnow.com/',
          },
          {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'AIWorkoutNow',
            url: 'https://aiworkoutnow.com/',
            logo: 'https://aiworkoutnow.com/favicon.svg',
            contactPoint: {
              '@type': 'ContactPoint',
              contactType: 'Customer Support',
              url: 'https://aiworkoutnow.com/contact',
            },
          },
          {
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'AIWorkoutNow',
            applicationCategory: 'HealthApplication',
            operatingSystem: 'Web',
            url: 'https://aiworkoutnow.com/',
            description: seoDescription,
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'USD',
              description: t('pages.home.schema.faq.offerDesc'),
            },
          },
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: t('pages.home.schema.faq.q1'),
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: t('pages.home.schema.faq.a1'),
                },
              },
              {
                '@type': 'Question',
                name: t('pages.home.schema.faq.q2'),
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: t('pages.home.schema.faq.a2'),
                },
              },
              {
                '@type': 'Question',
                name: t('pages.home.schema.faq.q3'),
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: t('pages.home.schema.faq.a3'),
                },
              },
              {
                '@type': 'Question',
                name: t('pages.home.schema.faq.q4'),
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: t('pages.home.schema.faq.a4'),
                },
              },
            ],
          },
        ]}
      />

      {/* One H1 for SEO without changing the visual hero headline */}
      <h1 className="sr-only">{t('pages.home.h1Sr')}</h1>
      
      <main className="min-h-screen py-6 relative homeMainBg" style={{
        backgroundImage: "url('/images/main-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat"
      }}>
        {/* Semi-transparent overlay to ensure content readability */}
        <div className="absolute inset-0 bg-white/30 pointer-events-none z-0"></div>
        <div className="relative z-10">
        <div className="homeThreeColWrap">
          {/* 3-Column Area (stable CSS grid) */}
          <div className="homeThreeColGrid">
            {/* Left Column: Why Choose AIWorkoutNow? - Benefits, Stats */}
            <aside className="homeColLeft">
              {/* Why Choose Us */}
              <section className="homePanelCard">
                <h2 className="homePanelTitle" title="Why Choose AIWorkoutNow?">
                  {t('pages.home.whyTitle')}
                </h2>
                <PromoWorkoutVideo />
                <div className="homeWhyStack">
                  {getArray<{ title: string; body: string }>(
                    t('pages.home.whyCards', { returnObjects: true }),
                    []
                  ).map((card, idx) => (
                    <div key={idx} className="homeWhyCard">
                      <div className="homeWhyIcon" aria-hidden="true">
                        {idx === 0 ? '🎯' : idx === 1 ? '⚡' : idx === 2 ? '🏠' : '🔒'}
                      </div>
                      <h3 className="homeWhyTitle">{card.title}</h3>
                      <p className="homeWhyBody">{card.body}</p>
                    </div>
                  ))}
                </div>
              </section>
            </aside>

            {/* Center Column: Workout Generator Form */}
            <section id="workout-generator" className="homeColCenter">
              {/* Workout Generator Form */}
              <div className="homePanelCard homeCenterCard">
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
                        {!showRestoreCredits ? t('pages.home.restore.promptTitle') : t('pages.home.restore.restoreTitle')}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {!showRestoreCredits
                          ? t('pages.home.restore.promptBody')
                          : t('pages.home.restore.restoreBody')}
                      </p>
                    </div>
                  </div>
                  {!showRestoreCredits ? (
                    <button
                      onClick={() => setShowRestoreCredits(true)}
                      className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-lg hover:shadow-lg transition-all hover:-translate-y-0.5"
                    >
                      {t('pages.home.restore.button')}
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
                  <span className="text-sm font-bold text-slate-800">{t('pages.home.trustBadges.securePayment')}</span>
                </div>
                <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl p-4 text-center border-2 border-slate-200 shadow-md hover:shadow-lg transition-all hover:-translate-y-1">
                  <span className="text-2xl block mb-2">🚫</span>
                  <span className="text-sm font-bold text-slate-800">{t('pages.home.trustBadges.noSubscription')}</span>
                </div>
                <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl p-4 text-center border-2 border-slate-200 shadow-md hover:shadow-lg transition-all hover:-translate-y-1">
                  <span className="text-2xl block mb-2">⚡</span>
                  <span className="text-sm font-bold text-slate-800">{t('pages.home.trustBadges.instantAccess')}</span>
                </div>
                <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl p-4 text-center border-2 border-slate-200 shadow-md hover:shadow-lg transition-all hover:-translate-y-1">
                  <span className="text-2xl block mb-2">💯</span>
                  <span className="text-sm font-bold text-slate-800">{t('pages.home.trustBadges.moneyBack')}</span>
                </div>
              </section>
            </section>

            {/* Right Column: Pricing Plans */}
            <aside className="homeColRight">
              <div className="homePanelCard">
                <div className="homePricingHeader">
                  <h2 className="homePanelTitle" title={t('pages.home.pricingSide.title')}>{t('pages.home.pricingSide.title')}</h2>
                  <p className="homePricingSub">{t('pages.home.pricingSide.sub')}</p>
                </div>
                <PricingPlans showHeader={false} vertical={true} />
              </div>
            </aside>
          </div>

          {/* SEO Content (visible, below generator and above footer) */}
          <section className="mt-10 bg-white/70 rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-3">{t('pages.home.seoBlock.title')}</h2>
            <p className="text-slate-700 leading-relaxed mb-3">
              {t('pages.home.seoBlock.p1')}
            </p>
            <p className="text-slate-700 leading-relaxed mb-4">
              {t('pages.home.seoBlock.p2')}
            </p>
            <h3 className="text-lg font-bold text-slate-900 mb-3">{t('pages.home.seoBlock.listTitle')}</h3>
            <ul className="list-disc pl-5 text-slate-700 space-y-1">
              {getArray<string>(t('pages.home.seoBlock.bullets', { returnObjects: true }), []).map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>

            <h3 className="text-lg font-bold text-slate-900 mt-6 mb-2">{t('pages.home.seoBlock.noSignupTitle')}</h3>
            <p className="text-slate-700 leading-relaxed">
              {t('pages.home.seoBlock.noSignupBody')}
            </p>
          </section>

          {/* FAQ (small, appended — does not alter main layout) */}
          <section className="mt-6 bg-white/70 rounded-2xl p-6 border border-slate-200 shadow-sm" aria-labelledby="faq-heading">
            <h2 id="faq-heading" className="text-2xl font-extrabold text-slate-900 mb-3">{t('pages.home.faq.title')}</h2>
            <div className="space-y-2">
              <details className="bg-white/80 rounded-xl p-4 border border-slate-200">
                <summary className="font-semibold text-slate-900 cursor-pointer">{t('pages.home.faq.items.chatgpt.q')}</summary>
                <div className="text-slate-700 mt-2">
                  <p className="mb-3">{t('pages.home.faq.items.chatgpt.intro')}</p>
                  <ul className="list-disc pl-5 space-y-1 mb-3">
                    {getArray<string>(t('pages.home.faq.items.chatgpt.bullets', { returnObjects: true }), []).map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                  <p className="text-slate-500 text-sm">{t('pages.home.faq.items.chatgpt.outro')}</p>
                </div>
              </details>
              <details className="bg-white/80 rounded-xl p-4 border border-slate-200">
                <summary className="font-semibold text-slate-900 cursor-pointer">{t('pages.home.faq.items.signup.q')}</summary>
                <p className="text-slate-700 mt-2">{t('pages.home.faq.items.signup.a')}</p>
              </details>
              <details className="bg-white/80 rounded-xl p-4 border border-slate-200">
                <summary className="font-semibold text-slate-900 cursor-pointer">{t('pages.home.faq.items.subscription.q')}</summary>
                <p className="text-slate-700 mt-2">{t('pages.home.faq.items.subscription.a')}</p>
              </details>
              <details className="bg-white/80 rounded-xl p-4 border border-slate-200">
                <summary className="font-semibold text-slate-900 cursor-pointer">{t('pages.home.faq.items.restore.q')}</summary>
                <p className="text-slate-700 mt-2">{t('pages.home.faq.items.restore.a')}</p>
              </details>
              <details className="bg-white/80 rounded-xl p-4 border border-slate-200">
                <summary className="font-semibold text-slate-900 cursor-pointer">{t('pages.home.faq.items.counts.q')}</summary>
                <p className="text-slate-700 mt-2">{t('pages.home.faq.items.counts.a')}</p>
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
