import './WorkoutTypeHero.css';
import WorkoutProgressEmoji from './WorkoutProgressEmoji';

interface WorkoutTypeHeroProps {
  title: string;
  subtitle: string;
  benefits: string[];
  /** Desktop label, e.g. "Generate Workout" */
  ctaLabelDesktop: string;
  /** Mobile label, e.g. "Generate Workout" */
  ctaLabelMobile: string;
  onCtaClick: () => void;
  /** When true, show loading label and disable button (prevents double submit). */
  loading?: boolean;
  /** When true, disable the CTA (e.g. while checking access). */
  disabled?: boolean;
  /** Shown when loading (e.g. "Generating…"). */
  loadingLabel?: string;
}

export default function WorkoutTypeHero({
  title,
  subtitle,
  benefits,
  ctaLabelDesktop,
  ctaLabelMobile,
  onCtaClick,
  loading = false,
  disabled = false,
  loadingLabel = 'Generating…',
}: WorkoutTypeHeroProps) {
  const isDisabled = disabled || loading;
  const ariaLabel = loading ? loadingLabel : ctaLabelDesktop;
  const labelDesktop = loading ? loadingLabel : ctaLabelDesktop;
  const labelMobile = loading ? loadingLabel : ctaLabelMobile;
  return (
    <header className="workout-type-hero">
      <h1 className="workout-type-hero__title">{title}</h1>
      <p className="workout-type-hero__subtitle">{subtitle}</p>
      {benefits.length > 0 && (
        <ul className="workout-type-hero__benefits" aria-label="Benefits">
          {benefits.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}
      <button
        type="button"
        className="workout-type-hero__cta"
        onClick={onCtaClick}
        aria-label={ariaLabel}
        disabled={isDisabled}
        aria-busy={loading}
      >
        <span className="workout-type-hero__cta-desktop">
          {labelDesktop}
          {loading && <WorkoutProgressEmoji isLoading={loading} className="workout-type-hero__cta-emoji" />}
        </span>
        <span className="workout-type-hero__cta-mobile">
          {labelMobile}
          {loading && <WorkoutProgressEmoji isLoading={loading} className="workout-type-hero__cta-emoji" />}
        </span>
      </button>
    </header>
  );
}
