import { useState } from 'react';
import WorkoutDisplay from './WorkoutDisplay';
import './WorkoutGenerator.css';

interface WorkoutGeneratorProps {
  onGenerate: (preferences: any) => void;
  loading: boolean;
  error: string | null;
  workout: any;
  disabled?: boolean;
}

function WorkoutGenerator({ onGenerate, loading, error, workout, disabled = false }: WorkoutGeneratorProps) {
  const [fitnessLevel, setFitnessLevel] = useState('beginner');
  const [workoutType, setWorkoutType] = useState('full-body');
  const [duration, setDuration] = useState('30');
  const [equipment, setEquipment] = useState('minimal');
  const [injuries, setInjuries] = useState('');
  const [goals, setGoals] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate({
      fitnessLevel,
      workoutType,
      duration: parseInt(duration),
      equipment,
      injuries: injuries.split(',').filter(i => i.trim()),
      goals: goals.split(',').filter(g => g.trim()),
    });
  };

  return (
    <section aria-labelledby="workout-generator-title">
      <header className="form-header">
        <h2 id="workout-generator-title" className="form-title">
          Create Your Personalized Workout
        </h2>
        <p className="form-subtitle">
          Tell us about yourself, and we'll generate a workout plan tailored just for you.
        </p>
      </header>
      
      <form onSubmit={handleSubmit} className="workout-form" aria-label="Workout preferences form">
        <div className="form-fields">
          <div className="form-field">
            <label htmlFor="fitnessLevel" className="form-label">
              Fitness Level
            </label>
            <select
              id="fitnessLevel"
              value={fitnessLevel}
              onChange={(e) => setFitnessLevel(e.target.value)}
              className="form-input form-select"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="workoutType" className="form-label">
              Workout Type
            </label>
            <select
              id="workoutType"
              value={workoutType}
              onChange={(e) => setWorkoutType(e.target.value)}
              className="form-input form-select"
            >
              <option value="full-body">Full Body</option>
              <option value="upper-body">Upper Body</option>
              <option value="lower-body">Lower Body</option>
              <option value="cardio">Cardio</option>
              <option value="strength">Strength</option>
              <option value="hiit">HIIT</option>
              <option value="yoga">Yoga</option>
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="duration" className="form-label">
              Duration (minutes)
            </label>
            <select
              id="duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="form-input form-select"
            >
              <option value="15">15 min</option>
              <option value="30">30 min</option>
              <option value="45">45 min</option>
              <option value="60">60 min</option>
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="equipment" className="form-label">
              Equipment Available
            </label>
            <select
              id="equipment"
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              className="form-input form-select"
            >
              <option value="minimal">Minimal (Bodyweight)</option>
              <option value="dumbbells">Dumbbells</option>
              <option value="full-gym">Full Gym</option>
              <option value="resistance-bands">Resistance Bands</option>
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="injuries" className="form-label">
              Injuries or Limitations <span className="form-label-optional">(optional)</span>
            </label>
            <input
              type="text"
              id="injuries"
              value={injuries}
              onChange={(e) => setInjuries(e.target.value)}
              placeholder="e.g., knee injury, lower back pain"
              className="form-input"
            />
          </div>

          <div className="form-field">
            <label htmlFor="goals" className="form-label">
              Fitness Goals <span className="form-label-optional">(optional)</span>
            </label>
            <input
              type="text"
              id="goals"
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              placeholder="e.g., weight loss, muscle gain, endurance"
              className="form-input"
            />
          </div>
        </div>

        {error && (
          <div className="form-error">
            {error}
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading || disabled}
          className="form-submit-button"
        >
          {loading ? 'Generating Workout...' : disabled ? 'Unlock More Workouts' : 'Generate AI Workout'}
        </button>
      </form>

      {workout && <WorkoutDisplay workout={workout} />}
    </section>
  );
}

export default WorkoutGenerator;
