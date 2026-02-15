import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import WorkoutDisplay from './WorkoutDisplay';
import WorkoutProgressEmoji from './WorkoutProgressEmoji';
import './WorkoutGenerator.css';

interface WorkoutGeneratorProps {
  onGenerate: (preferences: any) => void;
  loading: boolean;
  error: string | null;
  workout: any;
  lastPreferences?: any;
  disabled?: boolean;
}

function WorkoutGenerator({ onGenerate, loading, error, workout, lastPreferences, disabled = false }: WorkoutGeneratorProps) {
  const { t } = useTranslation();
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
    <div className="workout-generator">
      <form onSubmit={handleSubmit} className="workout-form">
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="fitnessLevel">{t('generator.fitnessLevel')}</label>
            <select
              id="fitnessLevel"
              value={fitnessLevel}
              onChange={(e) => setFitnessLevel(e.target.value)}
              className="input"
              disabled={disabled || loading}
            >
              <option value="beginner">{t('generator.options.fitnessLevel.beginner')}</option>
              <option value="intermediate">{t('generator.options.fitnessLevel.intermediate')}</option>
              <option value="advanced">{t('generator.options.fitnessLevel.advanced')}</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="workoutType">{t('generator.workoutType')}</label>
            <select
              id="workoutType"
              value={workoutType}
              onChange={(e) => setWorkoutType(e.target.value)}
              className="input"
              disabled={disabled || loading}
            >
              <option value="full-body">{t('generator.options.workoutType.full-body')}</option>
              <option value="upper-body">{t('generator.options.workoutType.upper-body')}</option>
              <option value="lower-body">{t('generator.options.workoutType.lower-body')}</option>
              <option value="cardio">{t('generator.options.workoutType.cardio')}</option>
              <option value="strength">{t('generator.options.workoutType.strength')}</option>
              <option value="hiit">{t('generator.options.workoutType.hiit')}</option>
              <option value="yoga">{t('generator.options.workoutType.yoga')}</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="duration">{t('generator.duration')}</label>
            <select
              id="duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="input"
              disabled={disabled || loading}
            >
              <option value="15">{t('generator.options.duration.15')}</option>
              <option value="30">{t('generator.options.duration.30')}</option>
              <option value="45">{t('generator.options.duration.45')}</option>
              <option value="60">{t('generator.options.duration.60')}</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="equipment">{t('generator.equipment')}</label>
            <select
              id="equipment"
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              className="input"
              disabled={disabled || loading}
            >
              <option value="minimal">{t('generator.options.equipment.minimal')}</option>
              <option value="dumbbells">{t('generator.options.equipment.dumbbells')}</option>
              <option value="full-gym">{t('generator.options.equipment.full-gym')}</option>
              <option value="resistance-bands">{t('generator.options.equipment.resistance-bands')}</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="injuries">{t('generator.injuries')}</label>
          <input
            type="text"
            id="injuries"
            value={injuries}
            onChange={(e) => setInjuries(e.target.value)}
            placeholder={t('generator.placeholders.injuries')}
            className="input"
            disabled={disabled || loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="goals">{t('generator.goals')}</label>
          <input
            type="text"
            id="goals"
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
            placeholder={t('generator.placeholders.goals')}
            className="input"
            disabled={disabled || loading}
          />
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <button type="submit" className="btn" disabled={disabled || loading}>
          {loading ? (
            <span>
              {t('generator.button.loading')} <WorkoutProgressEmoji isLoading={loading} />
            </span>
          ) : error ? (
            t('generator.button.retry')
          ) : (
            t('generator.button.default')
          )}
        </button>
      </form>

      {workout && (
        <WorkoutDisplay
          workout={workout}
          preferences={
            lastPreferences ?? {
              fitnessLevel,
              workoutType,
              duration: parseInt(duration, 10),
              equipment,
              injuries: injuries.split(',').filter((i) => i.trim()),
              goals: goals.split(',').filter((g) => g.trim()),
            }
          }
        />
      )}
    </div>
  );
}

export default WorkoutGenerator;


