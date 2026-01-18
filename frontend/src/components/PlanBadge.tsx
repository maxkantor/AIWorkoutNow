export type PlanBadgeVariant = 'starter' | 'popular' | 'value';

interface PlanBadgeProps {
  variant: PlanBadgeVariant;
  className?: string;
}

import { useTranslation } from 'react-i18next';

const VARIANT_STYLES: Record<PlanBadgeVariant, { labelKey: string; icon?: string; className: string }> = {
  starter: {
    labelKey: 'pricing.badges.starter',
    icon: '🚀',
    className:
      'bg-sky-100 text-sky-900 border border-sky-200 shadow-sm',
  },
  popular: {
    labelKey: 'pricing.badges.popular',
    icon: '⭐',
    className:
      'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-sm',
  },
  value: {
    labelKey: 'pricing.badges.value',
    icon: '💰',
    className:
      'bg-emerald-600 text-white shadow-sm',
  },
};

export default function PlanBadge({ variant, className }: PlanBadgeProps) {
  const { t } = useTranslation();
  const v = VARIANT_STYLES[variant];

  return (
    <span
      className={[
        'inline-flex items-center justify-center gap-1.5',
        'px-3 py-1.5',
        'rounded-full',
        'text-xs font-bold',
        'whitespace-nowrap',
        'leading-none',
        v.className,
        className ?? '',
      ].join(' ')}
    >
      {v.icon ? <span aria-hidden="true">{v.icon}</span> : null}
      <span>{t(v.labelKey)}</span>
    </span>
  );
}

