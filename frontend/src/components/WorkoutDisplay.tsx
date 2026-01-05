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
    <div className="workout-display card">
      <div className="workout-header">
        <h2>{workout.title || 'Your AI Workout'}</h2>
        {workout.type && (
          <span className="workout-type-badge">{workout.type}</span>
        )}
      </div>
      
      {workout.description && (
        <p className="workout-description">{workout.description}</p>
      )}
      
      {workout.exercises && workout.exercises.length > 0 && (
        <div className="exercises">
          <h3>Exercises</h3>
          <ol className="exercise-list">
            {workout.exercises.map((exercise: any, index: number) => (
              <li key={index} className="exercise-item">
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
        </div>
      )}
      
      {workout.tips && workout.tips.length > 0 && (
        <div className="workout-tips">
          <h3>Tips</h3>
          <ul>
            {workout.tips.map((tip: string, index: number) => (
              <li key={index}>{tip}</li>
            ))}
          </ul>
        </div>
      )}
      
      <ProductRecommendations 
        products={workout.productRecommendations} 
        workoutId={workout.workoutId}
      />
      
      <div className="workout-footer">
        <p className="workout-meta">
          Generated on {new Date(workout.createdAt || Date.now()).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}

export default WorkoutDisplay;

