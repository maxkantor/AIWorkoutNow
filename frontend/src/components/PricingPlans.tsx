import { useState, useEffect } from 'react';
import { getPricingPlans, createCheckoutSession, PricingPlan } from '../services/api';
import { getDeviceId } from '../utils/storage';
import PlanBadge, { PlanBadgeVariant } from './PlanBadge';
import { useTranslation } from 'react-i18next';
import { getArray } from '../i18n/getArray';

interface PricingPlansProps {
  showHeader?: boolean;
  vertical?: boolean;
}

function PricingPlans({ showHeader = true, vertical = false }: PricingPlansProps) {
  const { t } = useTranslation();
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getBadgeVariant = (tokenCount?: number | null): PlanBadgeVariant | null => {
    if (tokenCount === 10) return 'starter';
    if (tokenCount === 30) return 'popular';
    if (tokenCount === 100) return 'value';
    return null;
  };

  const isMostPopular = (tokenCount?: number | null) => tokenCount === 30;

  const getCta = (tokenCount?: number | null) => {
    if (tokenCount === 10) return t('pricing.cta.10');
    if (tokenCount === 30) return t('pricing.cta.30');
    if (tokenCount === 100) return t('pricing.cta.100');
    return t('pricing.cta.default');
  };

  const getBenefits = (tokenCount?: number | null) => {
    const key =
      tokenCount === 10
        ? 'pricing.benefits.10'
        : tokenCount === 30
          ? 'pricing.benefits.30'
          : tokenCount === 100
            ? 'pricing.benefits.100'
            : 'pricing.benefits.default';

    return getArray<string>(t(key, { returnObjects: true }), []);
  };

  const getPlanDisplayName = (plan: PricingPlan) => {
    const tokenCount = plan.tokenCount ?? null;
    if (tokenCount === 10) return t('pricing.planName.10');
    if (tokenCount === 30) return t('pricing.planName.30');
    if (tokenCount === 100) return t('pricing.planName.100');
    return plan.name;
  };

  const costPerWorkout = (plan: PricingPlan) => {
    const count = plan.tokenCount ?? 0;
    if (!count || !plan.price) return null;
    return (plan.price / count).toFixed(2);
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    const cacheKey = 'pricing_plans_cache';
    const cacheExpiryKey = 'pricing_plans_cache_expiry';
    
    // Check localStorage cache first - do this synchronously to show plans instantly
    const cached = localStorage.getItem(cacheKey);
    const expiry = localStorage.getItem(cacheExpiryKey);
    
    if (cached && expiry && new Date().getTime() < parseInt(expiry)) {
      console.log('[PricingPlans] Using cached pricing plans (instant)');
      try {
        const pricingPlans: PricingPlan[] = JSON.parse(cached);
        setPlans(pricingPlans.sort((a: PricingPlan, b: PricingPlan) => a.displayOrder - b.displayOrder));
        setLoading(false);
        return;
      } catch (parseErr) {
        console.error('[PricingPlans] Error parsing cached plans:', parseErr);
        // Fall through to fetch from API
      }
    }
    
    // If no valid cache, fetch from API
    try {
      setLoading(true);
      const pricingPlans = await getPricingPlans();
      const sortedPlans = pricingPlans.sort((a: PricingPlan, b: PricingPlan) => a.displayOrder - b.displayOrder);
      setPlans(sortedPlans);
      
      // Cache in localStorage (5 minutes)
      localStorage.setItem(cacheKey, JSON.stringify(sortedPlans));
      localStorage.setItem(cacheExpiryKey, (new Date().getTime() + 5 * 60 * 1000).toString());
    } catch (err: any) {
      console.error('[PricingPlans] Error loading plans:', err);
      // Try to use cached plans even if expired as fallback
      if (cached) {
        console.log('[PricingPlans] Using expired cache as fallback');
        try {
          const pricingPlans: PricingPlan[] = JSON.parse(cached);
          setPlans(pricingPlans.sort((a: PricingPlan, b: PricingPlan) => a.displayOrder - b.displayOrder));
          setError(null); // Clear error if we have cached data
        } catch (parseErr) {
          setError(err.message || 'Failed to load pricing plans');
        }
      } else {
        setError(err.message || 'Failed to load pricing plans');
      }
    } finally {
      setLoading(false);
    }
  };

  // NOTE: We intentionally do NOT background-refresh on cache hits.
  // This avoids spammy duplicate requests and keeps pricing calls predictable.

  const handlePurchase = async (plan: PricingPlan) => {
    try {
      setCheckoutLoading(plan.planId);
      setError(null);
      
      const deviceId = getDeviceId();
      const { url } = await createCheckoutSession(deviceId, plan.planId);
      
      window.location.href = url;
    } catch (err: any) {
      setError(err.message || 'Failed to start checkout');
      setCheckoutLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-slate-600">
        {t('pricing.loadingPlans')}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
        {error}
      </div>
    );
  }

  return (
    <section aria-labelledby={showHeader ? "pricing-heading" : undefined}>
      {showHeader && (
        <header className="mb-6">
          <h2
            id="pricing-heading"
            className="text-lg font-bold text-slate-800 mb-2 whitespace-normal lg:whitespace-nowrap"
            title={t('pricing.header')}
          >
            {t('pricing.header')}
          </h2>
        </header>
      )}

      {vertical ? (
        <div className="space-y-5" role="list">
          {plans.map((plan) => (
            <article
              key={plan.planId}
              className={`relative bg-white rounded-2xl border transition-all p-4 sm:p-5 ${
                isMostPopular(plan.tokenCount)
                  ? 'border-blue-600 shadow-2xl ring-2 ring-blue-500/20 z-10 p-5 sm:p-6'
                  : 'border-slate-200 shadow-md hover:shadow-lg hover:border-slate-300'
              }`}
              role="listitem"
            >
              {/* Badge + Plan Name in one line */}
              <div className="flex items-center gap-2 whitespace-nowrap">
                {getBadgeVariant(plan.tokenCount) && (
                  <PlanBadge
                    variant={getBadgeVariant(plan.tokenCount)!}
                  />
                )}

                <h3 className="text-[15px] sm:text-[16px] font-extrabold text-slate-900 whitespace-nowrap">
                  {getPlanDisplayName(plan)}
                </h3>
              </div>
              
              {/* Price - Prominent */}
              <div className="text-center mt-3 mb-4">
                <div className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1">
                  <span className="text-[40px] sm:text-[42px] leading-none font-extrabold text-slate-900">
                    ${plan.price.toFixed(2)}
                  </span>
                  {plan.tokenCount && (
                    <span className="text-xs text-slate-500 font-semibold whitespace-nowrap">
                      {t('pricing.perWorkout', { price: costPerWorkout(plan) })}
                    </span>
                  )}
                </div>
              </div>

              {/* Benefits (replace repeated workouts copy) */}
              <ul className="mt-3 mb-4 text-[13px] sm:text-[14px] leading-5 text-slate-700 space-y-1 sm:space-y-1.5">
                {getBenefits(plan.tokenCount).map((b) => (
                  <li key={b} className="flex gap-2">
                    <span aria-hidden="true">✅</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              {/* Micro Copy - i18n when key exists, else API value */}
              {(plan.tokenCount ? t('pricing.microCopy.' + plan.tokenCount, { defaultValue: plan.microCopy ?? '' }) : plan.microCopy) && (
                <p className="text-sm text-slate-600 text-center mb-5 font-medium">
                  {plan.tokenCount ? t('pricing.microCopy.' + plan.tokenCount, { defaultValue: plan.microCopy ?? '' }) : plan.microCopy}
                </p>
              )}

              {/* CTA Button */}
              <button
                className="w-full py-2.75 sm:py-3 px-6 rounded-xl font-extrabold text-base transition-all duration-300 bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg hover:shadow-blue-500/20 focus:outline-none focus:ring-4 focus:ring-blue-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
                onClick={() => handlePurchase(plan)}
                disabled={checkoutLoading === plan.planId}
                aria-label={`Purchase ${plan.name} plan for $${plan.price.toFixed(2)}`}
              >
                {checkoutLoading === plan.planId ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⚙️</span>
                    {t('pricing.processing')}
                  </span>
                ) : (
                  getCta(plan.tokenCount)
                )}
              </button>

            </article>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" role="list">
          {plans.map((plan) => (
            <article
              key={plan.planId}
              className={`relative bg-white rounded-lg border p-4 transition-all ${
                isMostPopular(plan.tokenCount)
                  ? 'border-blue-600 shadow-lg ring-1 ring-blue-500/20'
                  : 'border-slate-200 shadow-sm hover:shadow-md'
              }`}
              role="listitem"
            >
              <div className="flex items-center gap-2">
                {getBadgeVariant(plan.tokenCount) && (
                  <PlanBadge variant={getBadgeVariant(plan.tokenCount)!} />
                )}
                <h3 className="text-[18px] font-semibold text-slate-900">
                  {getPlanDisplayName(plan)}
                </h3>
              </div>
              
              <div className="text-center mb-3">
                <div className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1">
                  <span className="text-[38px] leading-none font-extrabold text-slate-900">
                    ${plan.price.toFixed(2)}
                  </span>
                  {plan.tokenCount && (
                    <span className="text-xs text-slate-500 font-semibold whitespace-nowrap">
                      {t('pricing.perWorkout', { price: costPerWorkout(plan) })}
                    </span>
                  )}
                </div>
              </div>

              <ul className="mb-4 text-[13px] leading-5 text-slate-700 space-y-2">
                {getBenefits(plan.tokenCount).map((b) => (
                  <li key={b} className="flex gap-2">
                    <span aria-hidden="true">✅</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              {plan.microCopy && (
                <p className="text-xs text-slate-500 text-center italic mb-3">
                  {plan.microCopy}
                </p>
              )}

              <button
                className="w-full py-2.75 px-4 rounded-lg font-extrabold text-sm transition-all bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg hover:shadow-blue-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
                onClick={() => handlePurchase(plan)}
                disabled={checkoutLoading === plan.planId}
                aria-label={`Purchase ${plan.name} plan`}
              >
                {checkoutLoading === plan.planId ? t('pricing.processing') : getCta(plan.tokenCount)}
              </button>

            </article>
          ))}
        </div>
      )}

      {showHeader && !vertical && (
        <div className="mt-6 text-center space-y-2 pt-6 border-t border-slate-200">
          <p className="text-sm text-slate-600">{t('pricing.noLoginNoSubscription')}</p>
          <p className="text-sm font-semibold text-slate-700">
            {t('pricing.comparison')}
          </p>
        </div>
      )}

    </section>
  );
}

export default PricingPlans;
