import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getAllPlanPages } from '../../seo/workoutPlanLibrary';
import './WorkoutTypesSection.css';

const SUBLABEL = 'Customize → Generate';

function slugToGeneratorName(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Product links only — do not add company/support pages.
 * Tiles are navigation-only; labels avoid "Generate" to reduce confusion.
 */
function WorkoutTypesSection() {
  const { t } = useTranslation();
  const libraryPages = getAllPlanPages();

  const primaryLinks = [
    { path: '/', label: 'Open AI Workout Generator', tag: 'Popular' as const },
    { path: '/workout-plan-generator', label: 'Open Workout Plan Generator', tag: undefined as string | undefined },
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
            aria-label={`${item.label}. ${SUBLABEL}`}
          >
            {item.tag && (
              <span className="workout-types-section__tag" aria-hidden="true">
                {item.tag}
              </span>
            )}
            <span className="workout-types-section__title-text">{item.label}</span>
            <span className="workout-types-section__sublabel" aria-hidden="true">
              {SUBLABEL}
            </span>
          </Link>
        ))}
        {libraryPages.map((page) => (
          <Link
            key={page.routePath}
            to={page.routePath}
            className="workout-types-section__card"
            role="listitem"
            aria-label={`Open ${slugToGeneratorName(page.slug)} Generator. ${SUBLABEL}`}
          >
            {page.tag && (
              <span className="workout-types-section__tag" aria-hidden="true">
                {page.tag}
              </span>
            )}
            <span className="workout-types-section__title-text">
              Open {slugToGeneratorName(page.slug)} Generator
            </span>
            <span className="workout-types-section__sublabel" aria-hidden="true">
              {SUBLABEL}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default WorkoutTypesSection;
