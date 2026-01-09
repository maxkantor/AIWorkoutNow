import { useState } from 'react';
import WorkoutDisplay from './WorkoutDisplay';
import './WorkoutGenerator.css';
import './WorkoutLoading.css';

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
      
      <form onSubmit={handleSubmit} className="space-y-6" aria-label="Workout preferences form">
        {/* Core Preferences Group */}
        <div className="space-y-5">
          <div className="border-b border-slate-200 pb-3 mb-1">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Core Preferences</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="fitnessLevel" className="block text-sm font-bold text-slate-800 mb-2.5">
                Fitness Level <span className="text-slate-500 font-normal">*</span>
              </label>
              <select
                id="fitnessLevel"
                value={fitnessLevel}
                onChange={(e) => setFitnessLevel(e.target.value)}
                className="w-full px-4 py-3.5 border-2 border-slate-300 rounded-xl bg-white text-slate-800 font-medium focus:ring-4 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all hover:border-slate-400"
                aria-required="true"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label htmlFor="workoutType" className="block text-sm font-bold text-slate-800 mb-2.5">
                Workout Type <span className="text-slate-500 font-normal">*</span>
              </label>
              <select
                id="workoutType"
                value={workoutType}
                onChange={(e) => setWorkoutType(e.target.value)}
                className="w-full px-4 py-3.5 border-2 border-slate-300 rounded-xl bg-white text-slate-800 font-medium focus:ring-4 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all hover:border-slate-400"
                aria-required="true"
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="duration" className="block text-sm font-bold text-slate-800 mb-2.5">
                Duration <span className="text-slate-500 font-normal">*</span>
              </label>
              <select
                id="duration"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-4 py-3.5 border-2 border-slate-300 rounded-xl bg-white text-slate-800 font-medium focus:ring-4 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all hover:border-slate-400"
                aria-required="true"
              >
                <option value="15">15 min</option>
                <option value="30">30 min</option>
                <option value="45">45 min</option>
                <option value="60">60 min</option>
              </select>
            </div>

            <div>
              <label htmlFor="equipment" className="block text-sm font-bold text-slate-800 mb-2.5">
                Equipment <span className="text-slate-500 font-normal">*</span>
              </label>
              <select
                id="equipment"
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
                className="w-full px-4 py-3.5 border-2 border-slate-300 rounded-xl bg-white text-slate-800 font-medium focus:ring-4 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all hover:border-slate-400"
                aria-required="true"
              >
                <option value="minimal">Minimal (Bodyweight)</option>
                <option value="dumbbells">Dumbbells</option>
                <option value="full-gym">Full Gym</option>
                <option value="resistance-bands">Resistance Bands</option>
              </select>
            </div>
          </div>
        </div>

        {/* Optional Details Group */}
        <div className="space-y-5 pt-2">
          <div className="border-b border-slate-200 pb-3 mb-1">
            <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wide">Optional Details</h3>
          </div>

          <div>
            <label htmlFor="injuries" className="block text-sm font-semibold text-slate-700 mb-2.5">
              Injuries or Limitations
              <span className="text-slate-400 font-normal text-xs ml-1">(optional)</span>
            </label>
            <input
              type="text"
              id="injuries"
              value={injuries}
              onChange={(e) => setInjuries(e.target.value)}
              placeholder="e.g., knee injury, lower back pain"
              className="w-full px-4 py-3.5 border-2 border-slate-300 rounded-xl bg-white text-slate-800 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all hover:border-slate-400 placeholder:text-slate-400"
            />
          </div>

          <div>
            <label htmlFor="goals" className="block text-sm font-semibold text-slate-700 mb-2.5">
              Fitness Goals
              <span className="text-slate-400 font-normal text-xs ml-1">(optional)</span>
            </label>
            <input
              type="text"
              id="goals"
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              placeholder="e.g., weight loss, muscle gain, endurance"
              className="w-full px-4 py-3.5 border-2 border-slate-300 rounded-xl bg-white text-slate-800 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all hover:border-slate-400 placeholder:text-slate-400"
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
          className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 text-white font-bold py-4.5 px-8 rounded-xl shadow-xl hover:shadow-2xl hover:shadow-blue-500/30 transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none focus:outline-none focus:ring-4 focus:ring-blue-500/50 focus:ring-offset-2 text-lg"
          aria-label={loading ? 'Generating workout' : disabled ? 'Unlock more workouts to continue' : 'Generate AI workout'}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⚙️</span>
              Generating Workout...
            </span>
          ) : disabled ? (
            'Unlock More Workouts'
          ) : (
            <span className="flex items-center justify-center gap-2">
              Generate AI Workout
              <span>→</span>
            </span>
          )}
        </button>
      </form>

      {loading && (
        <div className="mt-8 workout-loading-container">
          <div className="workout-loading-content">
            <div className="running-character">
              <div className="runner-body">
                <div className="runner-head"></div>
                <div className="runner-torso"></div>
                <div className="runner-arm runner-arm-left"></div>
                <div className="runner-arm runner-arm-right"></div>
                <div className="runner-leg runner-leg-left"></div>
                <div className="runner-leg runner-leg-right"></div>
              </div>
            </div>
            <p className="workout-loading-text">AI is crafting your perfect workout... 💪</p>
          </div>
        </div>
      )}

      {workout && <WorkoutDisplay workout={workout} />}
    </section>
  );
}

export default WorkoutGenerator;
