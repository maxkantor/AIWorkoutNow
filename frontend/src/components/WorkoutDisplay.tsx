import { useEffect } from 'react';
import { saveWorkout } from '../utils/storage';
import { getDeviceId } from '../utils/storage';
import ProductRecommendations from './ProductRecommendations';
import './WorkoutDisplay.css';

interface WorkoutDisplayProps {
  workout: any;
}

function WorkoutDisplay({ workout }: WorkoutDisplayProps) {
  useEffect(() => {
    // Save workout to localStorage for offline access
    const deviceId = getDeviceId();
    saveWorkout(deviceId, workout);
  }, [workout]);

  return (
    <article className="workout-display card" aria-labelledby="workout-title">
      <header className="workout-header">
        <h2 id="workout-title">{workout.title || 'Your AI Workout'}</h2>
        {workout.type && (
          <span className="workout-type-badge" aria-label={`Workout type: ${workout.type}`}>{workout.type}</span>
        )}
      </header>
      
      {workout.description && (
        <p className="workout-description">{workout.description}</p>
      )}
      
      {workout.exercises && workout.exercises.length > 0 && (
        <section className="exercises" aria-labelledby="exercises-heading">
          <h3 id="exercises-heading">Exercises</h3>
          <ol className="exercise-list" role="list">
            {workout.exercises.map((exercise: any, index: number) => (
              <li key={index} className="exercise-item" role="listitem">
                <div className="exercise-header">
                  <strong>{exercise.name}</strong>
                  {exercise.sets && exercise.reps && (
                    <span className="exercise-specs">
                      {exercise.sets} sets × {exercise.reps} reps
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
                  <p className="exercise-rest">Rest: {exercise.rest}</p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
      
      {workout.tips && workout.tips.length > 0 && (
        <section className="workout-tips" aria-labelledby="tips-heading">
          <h3 id="tips-heading">Tips</h3>
          <ul role="list">
            {workout.tips.map((tip: string, index: number) => (
              <li key={index} role="listitem">{tip}</li>
            ))}
          </ul>
        </section>
      )}
      
      <ProductRecommendations 
        products={workout.productRecommendations} 
        workoutId={workout.workoutId}
      />
      
      <footer className="workout-footer">
        <p className="workout-meta">
          Generated on {new Date(workout.createdAt || Date.now()).toLocaleDateString()}
        </p>
      </footer>
    </article>
  );
}

export default WorkoutDisplay;

