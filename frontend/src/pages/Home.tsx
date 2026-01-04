import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import WorkoutGenerator from '../components/WorkoutGenerator';
import TokenPacks from '../components/TokenPacks';
import AffiliateProducts from '../components/AffiliateProducts';
import { getDeviceId, getStoredWorkouts, getTokenBalance } from '../utils/storage';
import { generateWorkout, checkTokenBalance } from '../services/api';
import './Home.css';

function Home() {
  const [workout, setWorkout] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [isFreeUser, setIsFreeUser] = useState(true);
  const [dailyLimitReached, setDailyLimitReached] = useState(false);

  useEffect(() => {
    const deviceId = getDeviceId();
    const balance = getTokenBalance(deviceId);
    setTokenBalance(balance);
    setIsFreeUser(balance === null || balance === 0);
    
    // Check daily free limit
    const today = new Date().toISOString().split('T')[0];
    const storedWorkouts = getStoredWorkouts(deviceId);
    const todayWorkouts = storedWorkouts.filter((w: any) => 
      w.createdAt?.startsWith(today)
    );
    setDailyLimitReached(todayWorkouts.length >= 1);
  }, []);

  const handleGenerateWorkout = async (preferences: any) => {
    setLoading(true);
    setError(null);
    
    try {
      const deviceId = getDeviceId();
      const balance = getTokenBalance(deviceId);
      const needsToken = balance === null || balance === 0;
      
      if (needsToken) {
        // Check daily free limit
        const today = new Date().toISOString().split('T')[0];
        const storedWorkouts = getStoredWorkouts(deviceId);
        const todayWorkouts = storedWorkouts.filter((w: any) => 
          w.createdAt?.startsWith(today)
        );
        
        if (todayWorkouts.length >= 1) {
          setDailyLimitReached(true);
          setError('You\'ve reached your daily free workout limit. Purchase a token pack to unlock unlimited workouts!');
          setLoading(false);
          return;
        }
      }
      
      const result = await generateWorkout(preferences, deviceId, needsToken);
      setWorkout(result);
      
      // Update token balance if paid user
      if (!needsToken && result.tokensRemaining !== undefined) {
        setTokenBalance(result.tokensRemaining);
      }
      
      setDailyLimitReached(false);
    } catch (err: any) {
      setError(err.message || 'Failed to generate workout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>AIWorkoutNow - Free AI Workout Generator | Personalized Fitness Plans</title>
        <meta name="description" content="Get personalized AI-generated workouts instantly. No signup required! Try our free AI workout generator today." />
        <meta property="og:title" content="AIWorkoutNow - Free AI Workout Generator" />
        <meta property="og:description" content="Get personalized AI-generated workouts instantly. No signup required!" />
      </Helmet>
      
      <div className="home">
        <div className="container">
          <div className="hero">
            <h1>Get Your Personalized AI Workout</h1>
            <p className="hero-subtitle">
              No signup required. Get instant, personalized workout plans powered by AI.
            </p>
            
            {tokenBalance !== null && tokenBalance > 0 && (
              <div className="token-badge">
                <span>Tokens: {tokenBalance}</span>
              </div>
            )}
            
            {dailyLimitReached && (
              <div className="limit-message">
                <p>You've used your free daily workout. Purchase a token pack for unlimited workouts!</p>
              </div>
            )}
          </div>

          <WorkoutGenerator
            onGenerate={handleGenerateWorkout}
            loading={loading}
            error={error}
            workout={workout}
          />

          {workout && (
            <AffiliateProducts workoutType={workout.type || 'general'} />
          )}

          <TokenPacks />
        </div>
      </div>
    </>
  );
}

export default Home;

