import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { saveWorkout } from '../utils/storage';
import { getDeviceId } from '../utils/storage';
import AffiliateRecommendations from './AffiliateRecommendations';
import type { WorkoutPreferences } from '../services/api';
import './WorkoutDisplay.css';

interface WorkoutDisplayProps {
  workout: any;
  preferences?: WorkoutPreferences;
}

function WorkoutDisplay({ workout, preferences }: WorkoutDisplayProps) {
  const { t, i18n } = useTranslation();
  useEffect(() => {
    // Save workout to localStorage for offline access
    const deviceId = getDeviceId();
    saveWorkout(deviceId, workout);
  }, [workout]);

  return (
    <article className="workout-display card" aria-labelledby="workout-title">
      <header className="workout-header">
        <h2 id="workout-title">{workout.title || t('workoutDisplay.titleFallback')}</h2>
        {workout.type && (
          <span className="workout-type-badge" aria-label={t('workoutDisplay.workoutTypeAria', { type: workout.type })}>{workout.type}</span>
        )}
      </header>
      
      {workout.description && (
        <p className="workout-description">{workout.description}</p>
      )}
      
      {workout.exercises && workout.exercises.length > 0 && (
        <section className="exercises" aria-labelledby="exercises-heading">
          <h3 id="exercises-heading">{t('workoutDisplay.exercises')}</h3>
          <ol className="exercise-list" role="list">
            {workout.exercises.map((exercise: any, index: number) => (
              <li key={index} className="exercise-item" role="listitem">
                <div className="exercise-header">
                  <strong>{exercise.name}</strong>
                  {exercise.sets && exercise.reps && (
                    <span className="exercise-specs">
                      {t('workoutDisplay.setsReps', { sets: exercise.sets, reps: exercise.reps })}
                    </span>
                  )}
                  {exercise.duration && (
                    <span className="exercise-specs">{exercise.duration}</span>
                  )}
                </div>
                {exercise.instructions && (
                  <p className="exercise-instructions">{exercise.instructions}</p>
                )}
                {exercise.rest && (
                  <p className="exercise-rest">{t('workoutDisplay.rest', { rest: exercise.rest })}</p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
      
      {workout.tips && workout.tips.length > 0 && (
        <section className="workout-tips" aria-labelledby="tips-heading">
          <h3 id="tips-heading">{t('workoutDisplay.tips')}</h3>
          <ul role="list">
            {workout.tips.map((tip: string, index: number) => (
              <li key={index} role="listitem">{tip}</li>
            ))}
          </ul>
        </section>
      )}
      
      {preferences && (workout.workoutId || workout.workout_id) && (
        <AffiliateRecommendations
          preferences={preferences}
          workoutId={workout.workoutId || workout.workout_id || `workout-${Date.now()}`}
        />
      )}
      
      <footer className="workout-footer">
        <p className="workout-meta">
          {t('workoutDisplay.generatedOn', {
            date: new Date(workout.createdAt || Date.now()).toLocaleDateString(i18n.resolvedLanguage || i18n.language),
          })}
        </p>
      </footer>
    </article>
  );
}

export default WorkoutDisplay;


