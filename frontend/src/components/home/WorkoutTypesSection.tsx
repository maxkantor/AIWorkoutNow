import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getAllPlanPages } from '../../seo/workoutPlanLibrary';
import type { PlanPageDefinition } from '../../seo/workoutPlanLibrary';
import {
  MAIN_GOAL_CONFIG,
  BADGE_CONFIG_BY_SLUG,
} from './workoutGoalConfig';
import './WorkoutTypesSection.css';

const CTA_KEY = 'pages.home.goalTiles.cta';
const BADGES_NS = 'pages.home.goalTiles.badges';

/**
 * Goal-based product grid. Every tile navigates to a generator page.
 * All copy from i18n. Every card has a badge + emoji and consistent CTA.
 */
function WorkoutTypesSection() {
  const { t } = useTranslation();
  const libraryPages = getAllPlanPages();
  const cta = t(CTA_KEY);

  const mainTitle = t(MAIN_GOAL_CONFIG.titleKey);
  const mainDesc = t(MAIN_GOAL_CONFIG.descKey);
  const mainBadgeLabel = t(`${BADGES_NS}.${MAIN_GOAL_CONFIG.badgeKey}`);

  return (
    <section className="workout-types-section" aria-labelledby="workout-types-heading">
      <h2 id="workout-types-heading" className="workout-types-section__title">
        {t('pages.home.workoutTypesSectionTitle')}
      </h2>
      <div className="workout-types-section__grid" role="list">
        <Link
          key={MAIN_GOAL_CONFIG.routePath}
          to={MAIN_GOAL_CONFIG.routePath}
          className="workout-types-section__card"
          role="listitem"
          aria-label={`${mainTitle}. ${mainDesc}. ${cta}`}
        >
          <span className="workout-types-section__tag" aria-hidden="true">
            {mainBadgeLabel} {MAIN_GOAL_CONFIG.badgeEmoji}
          </span>
          <span className="workout-types-section__title-text">{mainTitle}</span>
          <span className="workout-types-section__descriptor">{mainDesc}</span>
          <span className="workout-types-section__cta" aria-hidden="true">
            {cta}
          </span>
        </Link>
        {libraryPages.map((page) => (
          <GoalTile key={page.routePath} page={page} cta={cta} />
        ))}
      </div>
    </section>
  );
}

function GoalTile({ page, cta }: { page: PlanPageDefinition; cta: string }) {
  const { t } = useTranslation();
  const slug = page.slug;
  const badgeConfig = BADGE_CONFIG_BY_SLUG[slug] ?? {
    badgeKey: slug,
    badgeEmoji: '✨',
  };

  const title = t(`pages.home.goalTiles.${slug}.title`, { defaultValue: page.shortLabel });
  const description = t(`pages.home.goalTiles.${slug}.description`, { defaultValue: '' });
  const badgeLabel = t(`${BADGES_NS}.${badgeConfig.badgeKey}`, { defaultValue: page.shortLabel });

  return (
    <Link
      to={page.routePath}
      className="workout-types-section__card"
      role="listitem"
      aria-label={description ? `${title}. ${description}. ${cta}` : `${title}. ${cta}`}
    >
      <span className="workout-types-section__tag" aria-hidden="true">
        {badgeLabel} {badgeConfig.badgeEmoji}
      </span>
      <span className="workout-types-section__title-text">{title}</span>
      {description && (
        <span className="workout-types-section__descriptor">{description}</span>
      )}
      <span className="workout-types-section__cta" aria-hidden="true">
        {cta}
      </span>
    </Link>
  );
}

export default WorkoutTypesSection;
