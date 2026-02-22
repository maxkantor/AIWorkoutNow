import { useTranslation } from 'react-i18next';
import type { WorkoutGeneratorPreferences } from './WorkoutGenerator';
import './GeneratorStickyBar.css';

interface GeneratorStickyBarProps {
  visible: boolean;
  preferences: WorkoutGeneratorPreferences | null;
  onSubmit: () => void;
  loading: boolean;
  disabled: boolean;
}

function formatSummary(prefs: WorkoutGeneratorPreferences, t: (key: string) => string): string {
  const duration = t(`generator.options.duration.${prefs.duration}`) || `${prefs.duration} min`;
  const workoutType = t(`generator.options.workoutType.${prefs.workoutType}`) || prefs.workoutType;
  const equipment = t(`generator.options.equipment.${prefs.equipment}`) || prefs.equipment;
  return `${duration} • ${workoutType} • ${equipment}`;
}

export default function GeneratorStickyBar({
  visible,
  preferences,
  onSubmit,
  loading,
  disabled,
}: GeneratorStickyBarProps) {
  const { t } = useTranslation();
  if (!visible) return null;

  const summary = preferences ? formatSummary(preferences, t) : '';

  return (
    <div className="generator-sticky-bar" role="region" aria-label="Generate workout">
      <div className="generator-sticky-bar__inner">
        {summary && (
          <p className="generator-sticky-bar__summary" aria-hidden="true">
            {summary}
          </p>
        )}
        <button
          type="button"
          className="generator-sticky-bar__btn"
          onClick={onSubmit}
          disabled={disabled || loading}
          aria-label={t('generator.button.default')}
        >
          {loading ? t('generator.button.loading') : t('generator.button.default')}
        </button>
      </div>
    </div>
  );
}
