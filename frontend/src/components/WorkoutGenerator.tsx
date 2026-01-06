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
    <section className="workout-generator" aria-labelledby="workout-generator-title">
      <h2 id="workout-generator-title" className="sr-only">Generate Your AI Workout</h2>
      <form onSubmit={handleSubmit} className="workout-form" aria-label="Workout preferences form">
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="fitnessLevel">Fitness Level</label>
            <select
              id="fitnessLevel"
              value={fitnessLevel}
              onChange={(e) => setFitnessLevel(e.target.value)}
              className="input"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="workoutType">Workout Type</label>
            <select
              id="workoutType"
              value={workoutType}
              onChange={(e) => setWorkoutType(e.target.value)}
              className="input"
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

          <div className="form-group">
            <label htmlFor="duration">Duration (minutes)</label>
            <select
              id="duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="input"
            >
              <option value="15">15 min</option>
              <option value="30">30 min</option>
              <option value="45">45 min</option>
              <option value="60">60 min</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="equipment">Equipment Available</label>
            <select
              id="equipment"
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              className="input"
            >
              <option value="minimal">Minimal (Bodyweight)</option>
              <option value="dumbbells">Dumbbells</option>
              <option value="full-gym">Full Gym</option>
              <option value="resistance-bands">Resistance Bands</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="injuries">Injuries or Limitations (comma-separated, optional)</label>
          <input
            type="text"
            id="injuries"
            value={injuries}
            onChange={(e) => setInjuries(e.target.value)}
            placeholder="e.g., knee injury, lower back pain"
            className="input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="goals">Fitness Goals (comma-separated, optional)</label>
          <input
            type="text"
            id="goals"
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
            placeholder="e.g., weight loss, muscle gain, endurance"
            className="input"
          />
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <button type="submit" className="btn" disabled={loading || disabled}>
          {loading ? 'Generating Workout...' : disabled ? 'Unlock More Workouts' : 'Generate AI Workout'}
        </button>
      </form>

      {workout && <WorkoutDisplay workout={workout} />}
    </section>
  );
}

export default WorkoutGenerator;

