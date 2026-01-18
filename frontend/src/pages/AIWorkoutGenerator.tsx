import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import SEO from '../components/SEO';
import WorkoutGenerator from '../components/WorkoutGenerator';
import PricingPlans from '../components/PricingPlans';
import RestoreCredits from '../components/RestoreCredits';
import { getDeviceId, setTokenBalance as updateTokenStorage } from '../utils/storage';
import { generateWorkout, getFreeWorkoutsRemaining, getUserAccessStatus, UserAccessStatus } from '../services/api';
import './About.css';

function AIWorkoutGeneratorPage() {
  const { t, i18n } = useTranslation();
  const [workout, setWorkout] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [freeWorkoutsRemaining, setFreeWorkoutsRemaining] = useState<number>(3);
  const [remainingWorkouts, setRemainingWorkouts] = useState<number | null>(null);
  const [accessStatus, setAccessStatus] = useState<UserAccessStatus | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [showRestoreCredits, setShowRestoreCredits] = useState(false);

  const seoTitle = t('pages.aiWorkoutGenerator.seo.title');
  const seoDescription = t('pages.aiWorkoutGenerator.seo.description');

  const checkAccessStatus = async (forceRefresh: boolean = false) => {
    try {
      setCheckingAccess(true);
      const deviceId = getDeviceId();
      const status = await getUserAccessStatus(deviceId, forceRefresh);
      setAccessStatus(status);
      setRemainingWorkouts(status.remainingWorkouts ?? null);
      setTokenBalance(status.tokensRemaining ?? null);
      if (status.freeWorkoutsRemaining !== undefined && status.freeWorkoutsRemaining !== null) {
        setFreeWorkoutsRemaining(status.freeWorkoutsRemaining);
      } else {
        const free = await getFreeWorkoutsRemaining(deviceId);
        setFreeWorkoutsRemaining(free.remaining);
      }
      return status;
    } catch {
      setFreeWorkoutsRemaining(3);
      setRemainingWorkouts(null);
      setTokenBalance(null);
      return null;
    } finally {
      setCheckingAccess(false);
    }
  };

  useEffect(() => {
    checkAccessStatus();

    const handleOpenRestoreCredits = () => setShowRestoreCredits(true);
    const handleRefreshAccessStatus = () => checkAccessStatus(true);
    window.addEventListener('openRestoreCredits', handleOpenRestoreCredits);
    window.addEventListener('refreshAccessStatus', handleRefreshAccessStatus);
    return () => {
      window.removeEventListener('openRestoreCredits', handleOpenRestoreCredits);
      window.removeEventListener('refreshAccessStatus', handleRefreshAccessStatus);
    };
  }, []);

  const handleGenerateWorkout = async (preferences: any) => {
    setLoading(true);
    setError(null);
    try {
      const deviceId = getDeviceId();
      const latest = await checkAccessStatus(true);
      const status = latest ?? accessStatus;
      const hasUnlimited = status?.hasUnlimitedAccess === true;
      const freeRemaining = status?.freeWorkoutsRemaining ?? freeWorkoutsRemaining;
      const tokensRemaining = status?.tokensRemaining ?? tokenBalance ?? 0;

      const isFreeUser = tokensRemaining <= 0 && !hasUnlimited && freeRemaining > 0;

      if (isFreeUser && freeRemaining <= 0 && !hasUnlimited) {
        setError(t('pages.home.errors.noFreeRemaining'));
        return;
      }
      if (!isFreeUser && tokensRemaining <= 0 && !hasUnlimited && freeRemaining <= 0) {
        setError(t('pages.home.errors.noWorkoutsRemaining'));
        return;
      }

      const result = await generateWorkout(preferences, deviceId, isFreeUser, i18n.resolvedLanguage || i18n.language || 'en');
      setWorkout(result);

      if (result.tokensRemaining !== undefined) {
        if (isFreeUser) {
          setFreeWorkoutsRemaining(Math.max(0, freeRemaining - 1));
        } else {
          setTokenBalance(result.tokensRemaining);
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
      (remainingWorkouts ?? 0) > 0 ||
      freeWorkoutsRemaining > 0 ||
      (accessStatus?.tokensRemaining ?? 0) > 0);

  return (
    <>
      <SEO
        title={seoTitle}
        description={seoDescription}
        canonicalUrl="https://aiworkoutnow.com/ai-workout-generator"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'AIWorkoutNow',
            applicationCategory: 'HealthApplication',
            operatingSystem: 'Web',
            url: 'https://aiworkoutnow.com/ai-workout-generator',
            description: seoDescription,
          },
        ]}
      />

      <div className="about-page">
        <div className="container">
          <div className="content-card">
            <h1>{t('pages.aiWorkoutGenerator.title')}</h1>
            <p>{t('pages.aiWorkoutGenerator.intro')}</p>

            <section>
              <h2>{t('pages.aiWorkoutGenerator.generateSection')}</h2>
              <WorkoutGenerator
                onGenerate={handleGenerateWorkout}
                loading={loading}
                error={error}
                workout={workout}
                disabled={!canGenerate || checkingAccess}
              />
            </section>

            {showRestoreCredits ? (
              <section id="restore-credits-section">
                <h2>{t('pages.aiWorkoutGenerator.restoreTitle')}</h2>
                <RestoreCredits onCreditsRestored={() => checkAccessStatus(true)} />
              </section>
            ) : null}

            <section>
              <h2>{t('pages.aiWorkoutGenerator.unlockTitle')}</h2>
              <PricingPlans />
            </section>

            <section>
              <h2>{t('pages.aiWorkoutGenerator.faqTitle')}</h2>
              <h3>{t('pages.aiWorkoutGenerator.faq.signupQ')}</h3>
              <p>{t('pages.aiWorkoutGenerator.faq.signupA')}</p>
              <h3>{t('pages.aiWorkoutGenerator.faq.subQ')}</h3>
              <p>{t('pages.aiWorkoutGenerator.faq.subA')}</p>
              <h3>{t('pages.aiWorkoutGenerator.faq.homeGymQ')}</h3>
              <p>{t('pages.aiWorkoutGenerator.faq.homeGymA')}</p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

export default AIWorkoutGeneratorPage;

