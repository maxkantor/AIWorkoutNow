import './WorkoutTypeHero.css';

interface WorkoutTypeHeroProps {
  title: string;
  subtitle: string;
  benefits: string[];
  ctaLabel: string;
  onCtaClick: () => void;
}

export default function WorkoutTypeHero({ title, subtitle, benefits, ctaLabel, onCtaClick }: WorkoutTypeHeroProps) {
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
        aria-label={ctaLabel}
      >
        {ctaLabel}
      </button>
    </header>
  );
}
