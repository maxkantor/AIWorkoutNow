/**
 * Config for Choose Your Goal cards — badge, emoji, and i18n keys.
 * All cards have a top-left badge with emoji for scan speed.
 */

export interface GoalCardConfig {
  id: string;
  routePath: string;
  /** i18n key for title (pages.home.goalTiles.{id}.title) */
  titleKey: string;
  /** i18n key for description */
  descKey: string;
  /** i18n key for badge label (pages.home.goalTiles.badges.{badgeKey}) */
  badgeKey: string;
  /** Emoji appended to badge (accessibility: aria-hidden) */
  badgeEmoji: string;
}

/** Main AI Workout Builder tile — always first. */
export const MAIN_GOAL_CONFIG: GoalCardConfig = {
  id: 'main',
  routePath: '/workout-plan-generator',
  titleKey: 'pages.home.goalTiles.main.title',
  descKey: 'pages.home.goalTiles.main.description',
  badgeKey: 'popular',
  badgeEmoji: '⭐',
};

/** Maps library slug → badge config. Every card gets a badge. */
export const BADGE_CONFIG_BY_SLUG: Record<string, { badgeKey: string; badgeEmoji: string }> = {
  women: { badgeKey: 'women', badgeEmoji: '👩' },
  men: { badgeKey: 'men', badgeEmoji: '👨' },
  beginners: { badgeKey: 'beginner', badgeEmoji: '🟢' },
  hiit: { badgeKey: 'fatLoss', badgeEmoji: '🔥' },
  home: { badgeKey: 'noEquipment', badgeEmoji: '🏠' },
  strength: { badgeKey: 'strength', badgeEmoji: '💪' },
  'weight-loss': { badgeKey: 'weightLoss', badgeEmoji: '⚖️' },
  endurance: { badgeKey: 'endurance', badgeEmoji: '🫀' },
};
