import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import SEO from '../components/SEO';
import Breadcrumbs from '../components/Breadcrumbs';
import WorkoutTypeHero from '../components/WorkoutTypeHero';
import WorkoutGenerator, { type WorkoutGeneratorHandle, type WorkoutGeneratorPreferences } from '../components/WorkoutGenerator';
import WorkoutProgressEmoji from '../components/WorkoutProgressEmoji';
import FAQAccordion from '../components/FAQAccordion';
import GeneratorStickyBar from '../components/GeneratorStickyBar';
import { buildBreadcrumbListSchema, buildFAQPageSchema } from '../seo/schema';
import { LANDING_PAGES } from '../seo/landingPagesConfig';
import { getDeviceId, setTokenBalance as updateTokenStorage } from '../utils/storage';
import { generateWorkout, getFreeWorkoutsRemaining, getUserAccessStatus, UserAccessStatus } from '../services/api';
import { useGeneratorCtaBehavior } from '../hooks/useGeneratorCtaBehavior';
import { trackEvent } from '../components/OptionalAnalytics';
import './About.css';

const GENERATOR_SECTION_ID = 'workout-generator';
const PAGE_PATH = '/workout-plan-generator';
const GENERATOR_TYPE = 'workout-plan-generator';

/** Default generator config for the plan generator hub (no specific type). */
const DEFAULT_GENERATOR_CONFIG = {
  fitnessLevel: 'beginner',
  workoutType: 'full-body',
  duration: '30',
  equipment: 'minimal',
  injuries: '',
  goals: '',
};

const content = LANDING_PAGES['workout-plan-generator'];
const breadcrumbItems = [
  { name: 'Home', path: '/' },
  { name: 'Workout Plan Generator', path: PAGE_PATH },
];

export default function WorkoutPlanGeneratorPage() {
  const { t, i18n } = useTranslation();
  const sectionRef = useRef<HTMLElement | null>(null);
  const generatorFormRef = useRef<WorkoutGeneratorHandle>(null);
  const liveRegionRef = useRef<HTMLDivElement | null>(null);
  const [latestPreferences, setLatestPreferences] = useState<WorkoutGeneratorPreferences | null>(null);

  const [workout, setWorkout] = useState<any>(null);
  const [lastPreferences, setLastPreferences] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [freeWorkoutsRemaining, setFreeWorkoutsRemaining] = useState<number>(3);
  const [accessStatus, setAccessStatus] = useState<UserAccessStatus | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(true);

  const checkAccessStatus = async (forceRefresh: boolean = false) => {
    try {
      setCheckingAccess(true);
      const deviceId = getDeviceId();
      const status = await getUserAccessStatus(deviceId, forceRefresh);
      setAccessStatus(status);
      if (status.freeWorkoutsRemaining !== undefined && status.freeWorkoutsRemaining !== null) {
        setFreeWorkoutsRemaining(status.freeWorkoutsRemaining);
      } else {
        const free = await getFreeWorkoutsRemaining(deviceId);
        setFreeWorkoutsRemaining(free.remaining);
      }
      return status;
    } catch {
      setFreeWorkoutsRemaining(3);
      return null;
    } finally {
      setCheckingAccess(false);
    }
  };

  useEffect(() => {
    checkAccessStatus();
    const handleOpenRestoreCredits = () => {};
    const handleRefreshAccessStatus = () => checkAccessStatus(true);
    window.addEventListener('openRestoreCredits', handleOpenRestoreCredits);
    window.addEventListener('refreshAccessStatus', handleRefreshAccessStatus);
    return () => {
      window.removeEventListener('openRestoreCredits', handleOpenRestoreCredits);
      window.removeEventListener('refreshAccessStatus', handleRefreshAccessStatus);
    };
  }, []);

  const handleGenerateWorkout = async (preferences: any) => {
    trackEvent('generator_submitted', {
      page: PAGE_PATH,
      generatorType: GENERATOR_TYPE,
      level: preferences.fitnessLevel,
      duration: preferences.duration,
      equipment: preferences.equipment,
      workoutType: preferences.workoutType,
    });
    setLoading(true);
    setError(null);
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = 'Generating workout…';
    }
    try {
      const deviceId = getDeviceId();
      const latest = await checkAccessStatus(true);
      const status = latest ?? accessStatus;
      const hasUnlimited = status?.hasUnlimitedAccess === true;
      const freeRemaining = status?.freeWorkoutsRemaining ?? freeWorkoutsRemaining;
      const tokensRemaining = status?.tokensRemaining ?? 0;
      const isFreeUser = tokensRemaining <= 0 && !hasUnlimited && freeRemaining > 0;

      if (isFreeUser && freeRemaining <= 0 && !hasUnlimited) {
        setError(t('pages.home.errors.noFreeRemaining'));
        return;
      }
      if (!isFreeUser && tokensRemaining <= 0 && !hasUnlimited && freeRemaining <= 0) {
        setError(t('pages.home.errors.noWorkoutsRemaining'));
        return;
      }

      const result = await generateWorkout(
        preferences,
        deviceId,
        isFreeUser,
        i18n.resolvedLanguage || i18n.language || 'en'
      );
      setLastPreferences(preferences);
      setWorkout(result);
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = 'Workout generated';
      }
      setTimeout(() => {
        const resultsEl = document.getElementById('workout-results');
        if (resultsEl) {
          const rect = resultsEl.getBoundingClientRect();
          const belowTheFold = rect.top > window.innerHeight;
          if (belowTheFold) {
            resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }, 100);

      if (result.tokensRemaining !== undefined) {
        if (isFreeUser) {
          setFreeWorkoutsRemaining(Math.max(0, freeRemaining - 1));
        } else {
          updateTokenStorage(deviceId, result.tokensRemaining);
        }
      }
      await checkAccessStatus();
    } catch (err: any) {
      setError(err?.message || 'Failed to generate workout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const canGenerate =
    accessStatus?.canGenerateWorkout ??
    (accessStatus?.hasUnlimitedAccess === true ||
      (accessStatus?.remainingWorkouts ?? 0) > 0 ||
      freeWorkoutsRemaining > 0 ||
      (accessStatus?.tokensRemaining ?? 0) > 0);

  const trackHeroCta = (pagePath: string, generatorType: string) => {
    trackEvent('hero_cta_clicked', { page: pagePath, generatorType });
  };
  const trackHeroCtaGenerated = (pagePath: string, generatorType: string) => {
    trackEvent('hero_cta_generated', { page: pagePath, generatorType });
  };

  const { handleHeroCtaClick, isFormVisible } = useGeneratorCtaBehavior({
    generatorFormRef,
    sectionRef,
    generatorType: GENERATOR_TYPE,
    pagePath: PAGE_PATH,
    trackHeroCta,
    trackHeroCtaGenerated,
  });

  return (
    <>
      <SEO
        title={content.title}
        description={content.description}
        canonicalPath={content.slug}
        jsonLd={[
          buildBreadcrumbListSchema(breadcrumbItems),
          buildFAQPageSchema(content.faqItems),
        ]}
      />
      <div className={`about-page ${isFormVisible ? 'generator-sticky-bar-visible' : ''}`} aria-busy={loading}>
        {loading && (
          <div
            className="about-page-loading-overlay"
            role="status"
            aria-live="polite"
            aria-label={t('generator.button.loading')}
          >
            <span className="about-page-loading-overlay__text">
              {t('generator.button.loading')} <WorkoutProgressEmoji isLoading={loading} />
            </span>
          </div>
        )}
        <div className="container">
          <Breadcrumbs items={breadcrumbItems} className="mb-4" />
          <div className="content-card">
            <WorkoutTypeHero
              title={content.h1}
              subtitle={content.intro}
              benefits={content.howItWorks}
              ctaLabelDesktop="Generate Workout"
              ctaLabelMobile="Generate Workout"
              onCtaClick={handleHeroCtaClick}
              loading={loading}
              disabled={!canGenerate || checkingAccess}
              loadingLabel={t('generator.button.loading')}
            />

            <h2 className="text-xl font-bold text-slate-900 mb-3 mt-6">How it works</h2>
            <ul className="list-disc pl-5 text-slate-700 space-y-2 mb-8">
              {content.howItWorks.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ul>

            <section id={GENERATOR_SECTION_ID} ref={sectionRef} aria-labelledby="generator-heading">
              <div
                ref={liveRegionRef}
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="visually-hidden"
              />
              <h2 id="generator-heading" className="workout-type-section-title">
                Generate your workout
              </h2>
              <WorkoutGenerator
                ref={generatorFormRef}
                onGenerate={handleGenerateWorkout}
                loading={loading}
                error={error}
                workout={workout}
                lastPreferences={lastPreferences}
                disabled={!canGenerate || checkingAccess}
                initialDefaults={DEFAULT_GENERATOR_CONFIG}
                onPreferencesChange={setLatestPreferences}
              />
            </section>

            <FAQAccordion title="Frequently asked questions" items={content.faqItems} />
          </div>
        </div>
        <GeneratorStickyBar
          visible={isFormVisible}
          preferences={latestPreferences}
          onSubmit={() => generatorFormRef.current?.submit()}
          loading={loading}
          disabled={!canGenerate || checkingAccess}
        />
      </div>
    </>
  );
}
