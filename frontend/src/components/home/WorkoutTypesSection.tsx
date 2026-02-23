import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getAllPlanPages } from '../../seo/workoutPlanLibrary';
import type { PlanPageDefinition } from '../../seo/workoutPlanLibrary';
import './WorkoutTypesSection.css';

const NS = 'pages.home.goalTiles';

/** Single main entry tile: AI Workout Builder → hub. */
const MAIN_GOAL_PATH = '/workout-plan-generator';

/**
 * Goal-based product grid. Every tile navigates to a generator page.
 * Section title and all tile copy come from i18n so language stays consistent.
 */
function WorkoutTypesSection() {
  const { t } = useTranslation();
  const libraryPages = getAllPlanPages();

  const mainTitle = t(`${NS}.main.title`);
  const mainDesc = t(`${NS}.main.description`);
  const mainHint = t(`${NS}.main.actionHint`);
  const mainTag = t(`${NS}.main.tag`);
  const mainAriaLabel = `${mainTitle}. ${mainDesc}. ${mainHint}`;

  return (
    <section className="workout-types-section" aria-labelledby="workout-types-heading">
      <h2 id="workout-types-heading" className="workout-types-section__title">
        {t('pages.home.workoutTypesSectionTitle')}
      </h2>
      <div className="workout-types-section__grid" role="list">
        <Link
          key={MAIN_GOAL_PATH}
          to={MAIN_GOAL_PATH}
          className="workout-types-section__card"
          role="listitem"
          aria-label={mainAriaLabel}
        >
          {mainTag && (
            <span className="workout-types-section__tag" aria-hidden="true">
              {mainTag}
            </span>
          )}
          <span className="workout-types-section__title-text">{mainTitle}</span>
          <span className="workout-types-section__descriptor">{mainDesc}</span>
          <span className="workout-types-section__sublabel" aria-hidden="true">
            {mainHint}
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
  const { t } = useTranslation();
  const slug = page.slug;
  const title = t(`${NS}.${slug}.title`, { defaultValue: page.shortLabel });
  const description = t(`${NS}.${slug}.description`, { defaultValue: '' });
  const actionHint = t(`${NS}.${slug}.actionHint`, { defaultValue: 'Get plan' });
  const tag = t(`${NS}.${slug}.tag`, { defaultValue: page.tag ?? '' });
  const ariaLabel = description
    ? `${title}. ${description}. ${actionHint}`
    : `${title}. ${actionHint}`;

  return (
    <Link
      to={page.routePath}
      className="workout-types-section__card"
      role="listitem"
      aria-label={ariaLabel}
    >
      {tag && (
        <span className="workout-types-section__tag" aria-hidden="true">
          {tag}
        </span>
      )}
      <span className="workout-types-section__title-text">{title}</span>
      {description && (
        <span className="workout-types-section__descriptor">{description}</span>
      )}
      <span className="workout-types-section__sublabel" aria-hidden="true">
        {actionHint}
      </span>
    </Link>
  );
}

export default WorkoutTypesSection;
