import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getAllPlanPages } from '../../seo/workoutPlanLibrary';
import type { PlanPageDefinition } from '../../seo/workoutPlanLibrary';
import './WorkoutTypesSection.css';

/** Goal-based label and action hint per library slug. Used for "Choose Your Goal" grid. */
const GOAL_LABELS: Record<string, { title: string; description: string; actionHint: string }> = {
  'weight-loss': {
    title: 'Lose Weight',
    description: 'Burn fat with cardio + strength workouts',
    actionHint: 'Get plan',
  },
  strength: {
    title: 'Strength Training',
    description: 'Structured sets & progressive overload',
    actionHint: 'Start building',
  },
  home: {
    title: 'Home Workouts (No Equipment)',
    description: 'Train anywhere',
    actionHint: 'Get plan',
  },
  beginners: {
    title: 'Beginner Workouts',
    description: 'Safe, simple routines for new users',
    actionHint: 'Get plan',
  },
  hiit: {
    title: 'Quick Fat-Burn Workouts',
    description: 'High-intensity sessions (20–30 min)',
    actionHint: 'Get plan',
  },
  men: {
    title: 'Workouts for Men',
    description: 'Strength & conditioning programs',
    actionHint: 'Get plan',
  },
  women: {
    title: 'Workouts for Women',
    description: 'Tone, strength, fat loss',
    actionHint: 'Get plan',
  },
};

/** Single main entry tile: AI Workout Builder → hub. */
const MAIN_GOAL_TILE = {
  path: '/workout-plan-generator',
  title: 'AI Workout Builder',
  description: 'Create a fully personalized workout plan',
  actionHint: 'Get plan',
  tag: 'Popular' as const,
};

/**
 * Goal-based product grid. Every tile navigates to a generator page.
 * Section title: "Choose Your Goal". No "Open" wording; outcome-focused labels.
 */
function WorkoutTypesSection() {
  const { t } = useTranslation();
  const libraryPages = getAllPlanPages();

  const mainAriaLabel = `${MAIN_GOAL_TILE.title}. ${MAIN_GOAL_TILE.description}. ${MAIN_GOAL_TILE.actionHint}`;

  return (
    <section className="workout-types-section" aria-labelledby="workout-types-heading">
      <h2 id="workout-types-heading" className="workout-types-section__title">
        {t('pages.home.workoutTypesSectionTitle')}
      </h2>
      <div className="workout-types-section__grid" role="list">
        <Link
          key={MAIN_GOAL_TILE.path}
          to={MAIN_GOAL_TILE.path}
          className="workout-types-section__card"
          role="listitem"
          aria-label={mainAriaLabel}
        >
          {MAIN_GOAL_TILE.tag && (
            <span className="workout-types-section__tag" aria-hidden="true">
              {MAIN_GOAL_TILE.tag}
            </span>
          )}
          <span className="workout-types-section__title-text">{MAIN_GOAL_TILE.title}</span>
          <span className="workout-types-section__descriptor">{MAIN_GOAL_TILE.description}</span>
          <span className="workout-types-section__sublabel" aria-hidden="true">
            {MAIN_GOAL_TILE.actionHint}
          </span>
        </Link>
        {libraryPages.map((page) => (
          <GoalTile key={page.routePath} page={page} />
        ))}
      </div>
    </section>
  );
}

function GoalTile({ page }: { page: PlanPageDefinition }) {
  const config = GOAL_LABELS[page.slug] ?? {
    title: page.shortLabel,
    description: '',
    actionHint: 'Get plan',
  };
  const ariaLabel = config.description
    ? `${config.title}. ${config.description}. ${config.actionHint}`
    : `${config.title}. ${config.actionHint}`;

  return (
    <Link
      to={page.routePath}
      className="workout-types-section__card"
      role="listitem"
      aria-label={ariaLabel}
    >
      {page.tag && (
        <span className="workout-types-section__tag" aria-hidden="true">
          {page.tag}
        </span>
      )}
      <span className="workout-types-section__title-text">{config.title}</span>
      {config.description && (
        <span className="workout-types-section__descriptor">{config.description}</span>
      )}
      <span className="workout-types-section__sublabel" aria-hidden="true">
        {config.actionHint}
      </span>
    </Link>
  );
}

export default WorkoutTypesSection;
