/**
 * FAQ order and count. Content lives in i18n: pages.faq.items.<id>.q and .a
 * Home shows first FAQ_HOME_COUNT; /faq shows all.
 */
export type FaqId =
  | 'reallyFree'
  | 'howWorks'
  | 'noAccount'
  | 'types'
  | 'betterThanTrainer'
  | 'chatgpt'
  | 'signup'
  | 'restore'
  | 'counts';

export const FAQ_IDS: FaqId[] = [
  'reallyFree',
  'howWorks',
  'noAccount',
  'types',
  'betterThanTrainer',
  'chatgpt',
  'signup',
  'restore',
  'counts',
];

/** First N items shown on homepage. */
export const FAQ_HOME_COUNT = 6;
