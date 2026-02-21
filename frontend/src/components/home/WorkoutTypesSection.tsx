import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getAllPlanPages } from '../../seo/workoutPlanLibrary';
import './WorkoutTypesSection.css';

/**
 * Product links only — do not add company/support pages.
 * Uses workoutPlanLibrary as single source of truth for workout-generator/* routes.
 * First two cards (main generator + workout plan generator) use i18n for labels.
 */
function WorkoutTypesSection() {
  const { t } = useTranslation();
  const libraryPages = getAllPlanPages();

  const primaryLinks = [
    { path: '/', label: t('pages.home.internalLinks.aiWorkoutGenerator'), tag: 'Popular' as const },
    { path: '/workout-plan-generator', label: t('pages.home.internalLinks.workoutPlanGenerator'), tag: undefined as string | undefined },
  ];

  return (
    <section className="workout-types-section" aria-labelledby="workout-types-heading">
      <h2 id="workout-types-heading" className="workout-types-section__title">
        {t('pages.home.workoutTypesSectionTitle')}
      </h2>
      <div className="workout-types-section__grid" role="list">
        {primaryLinks.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className="workout-types-section__card"
            role="listitem"
          >
            {item.tag && (
              <span className="workout-types-section__tag" aria-hidden="true">
                {item.tag}
              </span>
            )}
            <span className="workout-types-section__title-text">{item.label}</span>
          </Link>
        ))}
        {libraryPages.map((page) => (
          <Link
            key={page.routePath}
            to={page.routePath}
            className="workout-types-section__card"
            role="listitem"
          >
            {page.tag && (
              <span className="workout-types-section__tag" aria-hidden="true">
                {page.tag}
              </span>
            )}
            <span className="workout-types-section__title-text">{page.shortLabel}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default WorkoutTypesSection;
