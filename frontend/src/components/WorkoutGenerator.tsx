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
      <header className="mb-6">
        <h2 id="workout-generator-title" className="text-2xl font-bold text-slate-800 mb-2">
          Create Your Personalized Workout
        </h2>
        <p className="text-slate-600">
          Tell us about yourself, and we'll generate a workout plan tailored just for you.
        </p>
      </header>
      
      <form onSubmit={handleSubmit} className="space-y-4" aria-label="Workout preferences form">
        <div className="space-y-4">
          <div>
            <label htmlFor="fitnessLevel" className="block text-sm font-semibold text-slate-700 mb-2">
              Fitness Level
            </label>
            <select
              id="fitnessLevel"
              value={fitnessLevel}
              onChange={(e) => setFitnessLevel(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <div>
            <label htmlFor="workoutType" className="block text-sm font-semibold text-slate-700 mb-2">
              Workout Type
            </label>
            <select
              id="workoutType"
              value={workoutType}
              onChange={(e) => setWorkoutType(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
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

          <div>
            <label htmlFor="duration" className="block text-sm font-semibold text-slate-700 mb-2">
              Duration (minutes)
            </label>
            <select
              id="duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            >
              <option value="15">15 min</option>
              <option value="30">30 min</option>
              <option value="45">45 min</option>
              <option value="60">60 min</option>
            </select>
          </div>

          <div>
            <label htmlFor="equipment" className="block text-sm font-semibold text-slate-700 mb-2">
              Equipment Available
            </label>
            <select
              id="equipment"
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            >
              <option value="minimal">Minimal (Bodyweight)</option>
              <option value="dumbbells">Dumbbells</option>
              <option value="full-gym">Full Gym</option>
              <option value="resistance-bands">Resistance Bands</option>
            </select>
          </div>

          <div>
            <label htmlFor="injuries" className="block text-sm font-semibold text-slate-700 mb-2">
              Injuries or Limitations <span className="text-slate-400 font-normal text-xs">(optional)</span>
            </label>
            <input
              type="text"
              id="injuries"
              value={injuries}
              onChange={(e) => setInjuries(e.target.value)}
              placeholder="e.g., knee injury, lower back pain"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
          </div>

          <div>
            <label htmlFor="goals" className="block text-sm font-semibold text-slate-700 mb-2">
              Fitness Goals <span className="text-slate-400 font-normal text-xs">(optional)</span>
            </label>
            <input
              type="text"
              id="goals"
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              placeholder="e.g., weight loss, muscle gain, endurance"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading || disabled}
          className="w-full bg-gradient-to-r from-blue-600 to-green-500 text-white font-bold py-4 px-6 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
        >
          {loading ? 'Generating Workout...' : disabled ? 'Unlock More Workouts' : 'Generate AI Workout'}
        </button>
      </form>

      {workout && <WorkoutDisplay workout={workout} />}
    </section>
  );
}

export default WorkoutGenerator;
