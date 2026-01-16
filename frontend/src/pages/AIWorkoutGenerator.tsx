import { useEffect, useState } from 'react';
import SEO from '../components/SEO';
import WorkoutGenerator from '../components/WorkoutGenerator';
import PricingPlans from '../components/PricingPlans';
import RestoreCredits from '../components/RestoreCredits';
import { getDeviceId, setTokenBalance as updateTokenStorage } from '../utils/storage';
import { generateWorkout, getFreeWorkoutsRemaining, getUserAccessStatus, UserAccessStatus } from '../services/api';
import './About.css';

function AIWorkoutGeneratorPage() {
  const [workout, setWorkout] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [freeWorkoutsRemaining, setFreeWorkoutsRemaining] = useState<number>(3);
  const [remainingWorkouts, setRemainingWorkouts] = useState<number | null>(null);
  const [accessStatus, setAccessStatus] = useState<UserAccessStatus | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [showRestoreCredits, setShowRestoreCredits] = useState(false);

  const seoTitle = 'AI Workout Generator (No Signup) | AIWorkoutNow';
  const seoDescription =
    'Generate an AI workout plan in seconds—personalized for home or gym. No signup. Try free workouts, then unlock more with a one-time payment.';

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
        setError('No free workouts remaining. Please purchase more workouts to continue.');
        return;
      }
      if (!isFreeUser && tokensRemaining <= 0 && !hasUnlimited && freeRemaining <= 0) {
        setError('No workouts remaining. Please purchase more workouts to continue.');
        return;
      }

      const result = await generateWorkout(preferences, deviceId, isFreeUser);
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
            <h1>AI Workout Generator</h1>
            <p>
              Build an AI-generated workout plan in seconds. Choose your level, available time, equipment,
              and goals—then get a personalized workout for home or gym with no signup required.
            </p>

            <section>
              <h2>Generate your workout</h2>
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
                <h2>Restore Workouts</h2>
                <RestoreCredits onCreditsRestored={() => checkAccessStatus(true)} />
              </section>
            ) : null}

            <section>
              <h2>Unlock more workouts</h2>
              <PricingPlans />
            </section>

            <section>
              <h2>Frequently asked questions</h2>
              <h3>Do I need to sign up?</h3>
              <p>No. You can generate workouts instantly.</p>
              <h3>Is this a subscription?</h3>
              <p>No. It’s a one-time payment for workout credits.</p>
              <h3>Home or gym?</h3>
              <p>Both—select your equipment and your plan adapts.</p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

export default AIWorkoutGeneratorPage;

