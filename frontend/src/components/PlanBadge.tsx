export type PlanBadgeVariant = 'starter' | 'popular' | 'value';

interface PlanBadgeProps {
  variant: PlanBadgeVariant;
  className?: string;
}

const VARIANT_STYLES: Record<PlanBadgeVariant, { label: string; icon?: string; className: string }> = {
  starter: {
    label: 'Quick Start',
    icon: '🚀',
    className:
      'bg-slate-100 text-slate-800 border border-slate-200 shadow-sm',
  },
  popular: {
    label: 'Most Popular',
    icon: '⭐',
    className:
      'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-sm',
  },
  value: {
    label: 'Best Value',
    icon: '💰',
    className:
      'bg-emerald-600 text-white shadow-sm',
  },
};

export default function PlanBadge({ variant, className }: PlanBadgeProps) {
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
      <span>{v.label}</span>
    </span>
  );
}

