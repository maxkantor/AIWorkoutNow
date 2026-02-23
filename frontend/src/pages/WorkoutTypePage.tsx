import { useEffect, useRef, useState } from 'react';
import { useParams, useLocation, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SEO from '../components/SEO';
import Breadcrumbs from '../components/Breadcrumbs';
import WorkoutTypeHero from '../components/WorkoutTypeHero';
import SampleWorkout from '../components/SampleWorkout';
import WorkoutGenerator, { type WorkoutGeneratorHandle, type WorkoutGeneratorPreferences } from '../components/WorkoutGenerator';
import GenerationLoadingModal from '../components/GenerationLoadingModal';
import WorkoutTypeFAQ from '../components/WorkoutTypeFAQ';
import EquipmentRecommendations from '../components/EquipmentRecommendations';
import GeneratorStickyBar from '../components/GeneratorStickyBar';
import { buildBreadcrumbListSchema, buildFAQPageSchema } from '../seo/schema';
import { getPlanPage, getDefaultGeneratorConfigFromLibrary, WORKOUT_PLAN_SLUGS, type AffiliateProduct } from '../seo/workoutPlanLibrary';
import { getArray } from '../i18n/getArray';
import { safeT } from '../i18n/safeT';
import { getDeviceId, setTokenBalance as updateTokenStorage } from '../utils/storage';
import { generateWorkout, getFreeWorkoutsRemaining, getUserAccessStatus, UserAccessStatus } from '../services/api';
import { useGeneratorCtaBehavior } from '../hooks/useGeneratorCtaBehavior';
import { trackEvent } from '../components/OptionalAnalytics';
import './About.css';

const GENERATOR_SECTION_ID = 'workout-generator';

export default function WorkoutTypePage() {
  const { type: paramType } = useParams<{ type: string }>();
  const location = useLocation();
  const type = location.pathname === '/workout-plans/endurance' ? 'endurance' : paramType;
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

  const page = type ? getPlanPage(type) : undefined;
  const initialDefaults = type ? getDefaultGeneratorConfigFromLibrary(type) : undefined;

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
  }, [type]);

  const handleGenerateWorkout = async (preferences: any) => {
    if (type && page) {
      trackEvent('generator_submitted', {
        page: page.routePath,
        generatorType: type,
        level: preferences.fitnessLevel,
        duration: preferences.duration,
        equipment: preferences.equipment,
        workoutType: preferences.workoutType,
      });
    }
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
    generatorType: type ?? '',
    pagePath: page?.routePath ?? '',
    trackHeroCta,
    trackHeroCtaGenerated,
  });

  if (!type || !WORKOUT_PLAN_SLUGS.includes(type as any) || !page) {
    return <Navigate to="/workout-plan-generator" replace />;
  }

  const breadcrumbItems = [
    { name: safeT(t, 'common.home'), path: '/' },
    { name: safeT(t, 'pages.home.goalTiles.' + type + '.title') || page.shortLabel, path: page.routePath },
  ];

  const slugPhrase = t('pages.workoutPlan.slugPhrase.' + type, { defaultValue: page.slug.replace(/-/g, ' ') });
  const generatorSectionTitle = t('pages.workoutPlan.sectionGenerator', { type: slugPhrase, defaultValue: 'Generate your ' + page.slug.replace(/-/g, ' ') + ' workout' });

  const heroH1 = safeT(t, 'pages.workoutPlan.plans.' + type + '.h1') || page.h1;
  const introParagraphsList = getArray<string>(t('pages.workoutPlan.plans.' + type + '.introParagraphs', { returnObjects: true }), page.introParagraphs);
  const keyBenefitsList = getArray<string>(t('pages.workoutPlan.plans.' + type + '.keyBenefits', { returnObjects: true }), page.keyBenefits);
  const tipsList = getArray<string>(t('pages.workoutPlan.tips.' + type, { returnObjects: true }), page.tips);
  type EquipmentItem = { name?: string; description?: string };
  const translatedEquipment = getArray<EquipmentItem>(t('pages.workoutPlan.equipment.' + type, { returnObjects: true }), []);
  const productsToShow: AffiliateProduct[] = page.affiliateProducts.map((p, i) => {
    const tr = translatedEquipment[i];
    return {
      ...p,
      name: (tr && tr.name) ? tr.name : p.name,
      description: (tr && tr.description) ? tr.description : p.description,
    };
  });

  type FAQItem = { question: string; answer: string };
  const faqToShow = getArray<FAQItem>(t('pages.workoutPlan.faq.' + type, { returnObjects: true }), page.faq);

  return (
    <>
      <SEO
        title={page.title}
        description={page.metaDescription}
        canonicalPath={page.routePath}
        jsonLd={[
          buildBreadcrumbListSchema(breadcrumbItems),
          buildFAQPageSchema(faqToShow),
        ]}
      />
      <div className={`about-page ${isFormVisible ? 'generator-sticky-bar-visible' : ''}`} aria-busy={loading}>
        <GenerationLoadingModal visible={loading} />
        <div className="container">
          <Breadcrumbs items={breadcrumbItems} className="mb-4" />
          <div className="content-card">
            <WorkoutTypeHero
              title={heroH1}
              subtitle={introParagraphsList[0] ?? ''}
              benefits={keyBenefitsList}
              ctaLabelDesktop={safeT(t, 'generator.button.default')}
              ctaLabelMobile={safeT(t, 'generator.button.default')}
              onCtaClick={handleHeroCtaClick}
              loading={loading}
              disabled={!canGenerate || checkingAccess}
              loadingLabel={t('generator.button.loading')}
            />
            <div className="workout-type-intro">
              {introParagraphsList.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>

            <SampleWorkout data={page.sampleWorkout} title={safeT(t, 'pages.workoutPlan.sectionSampleWorkout')} />

            {tipsList.length > 0 && (
              <section className="workout-type-tips" aria-labelledby="workout-type-tips-heading">
                <h2 id="workout-type-tips-heading" className="workout-type-section-title">
                  {safeT(t, 'pages.workoutPlan.sectionTips')}
                </h2>
                <ul className="workout-type-tips-list">
                  {tipsList.map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </section>
            )}

            <EquipmentRecommendations products={productsToShow} title={safeT(t, 'pages.workoutPlan.sectionEquipment')} />

            <section id={GENERATOR_SECTION_ID} ref={sectionRef} aria-labelledby="generator-heading">
              <div
                ref={liveRegionRef}
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="visually-hidden"
              />
              <h2 id="generator-heading" className="workout-type-section-title">
                {generatorSectionTitle}
              </h2>
              <WorkoutGenerator
                ref={generatorFormRef}
                onGenerate={handleGenerateWorkout}
                loading={loading}
                error={error}
                workout={workout}
                lastPreferences={lastPreferences}
                disabled={!canGenerate || checkingAccess}
                initialDefaults={initialDefaults}
                onPreferencesChange={setLatestPreferences}
              />
            </section>

            <WorkoutTypeFAQ items={faqToShow} title={safeT(t, 'pages.workoutPlan.sectionFaq')} />
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
