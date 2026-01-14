import { useState, useEffect } from 'react';
import { getPricingPlans, createCheckoutSession, PricingPlan } from '../services/api';
import { getDeviceId } from '../utils/storage';

interface PricingPlansProps {
  showHeader?: boolean;
  vertical?: boolean;
}

function PricingPlans({ showHeader = true, vertical = false }: PricingPlansProps) {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getBadge = (tokenCount?: number | null) => {
    if (tokenCount === 10) return 'Starter';
    if (tokenCount === 30) return 'Most Popular';
    if (tokenCount === 100) return 'Best Value';
    return null;
  };

  const isMostPopular = (tokenCount?: number | null) => tokenCount === 30;

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
        // Still fetch in background to refresh cache
        fetchPlansInBackground();
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

  const fetchPlansInBackground = async () => {
    try {
      const pricingPlans = await getPricingPlans();
      const sortedPlans = pricingPlans.sort((a: PricingPlan, b: PricingPlan) => a.displayOrder - b.displayOrder);
      setPlans(sortedPlans);
      
      // Update cache
      const cacheKey = 'pricing_plans_cache';
      const cacheExpiryKey = 'pricing_plans_cache_expiry';
      localStorage.setItem(cacheKey, JSON.stringify(sortedPlans));
      localStorage.setItem(cacheExpiryKey, (new Date().getTime() + 5 * 60 * 1000).toString());
    } catch (err) {
      console.error('[PricingPlans] Background fetch failed (non-critical):', err);
    }
  };

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
        Loading pricing plans...
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
            title="Unlock More AI Workouts"
          >
            Unlock More AI Workouts
          </h2>
        </header>
      )}

      {vertical ? (
        <div className="space-y-5" role="list">
          {plans.map((plan) => (
            <article
              key={plan.planId}
              className={`relative bg-white rounded-2xl border p-6 transition-all ${
                isMostPopular(plan.tokenCount)
                  ? 'border-blue-600 shadow-xl ring-1 ring-blue-500/20'
                  : 'border-slate-200 shadow-md hover:shadow-lg hover:border-slate-300'
              }`}
              role="listitem"
            >
              {getBadge(plan.tokenCount) && (
                <div className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-extrabold tracking-wide ${
                  isMostPopular(plan.tokenCount)
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                    : 'bg-slate-900 text-white'
                }`}>
                  {getBadge(plan.tokenCount)}
                </div>
              )}
              
              {/* Plan Name */}
              <h3 className="mt-3 text-[19px] font-semibold text-slate-900 text-center">
                {plan.name}
              </h3>
              
              {/* Price - Prominent */}
              <div className="text-center mt-3 mb-4">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-[42px] leading-none font-extrabold text-slate-900">
                    ${plan.price.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Benefits (replace repeated workouts copy) */}
              <ul className="mt-3 mb-5 text-[13px] leading-5 text-slate-700 space-y-2">
                <li className="flex gap-2"><span aria-hidden="true">✅</span><span>Instant access</span></li>
                <li className="flex gap-2"><span aria-hidden="true">✅</span><span>No signup</span></li>
                <li className="flex gap-2"><span aria-hidden="true">✅</span><span>Pay once</span></li>
                <li className="flex gap-2"><span aria-hidden="true">✅</span><span>Restore credits anytime</span></li>
              </ul>

              {/* Micro Copy - Simplified */}
              {plan.microCopy && (
                <p className="text-sm text-slate-600 text-center mb-5 font-medium">
                  {plan.microCopy}
                </p>
              )}

              {/* CTA Button */}
              <button
                className="w-full py-3.5 px-6 rounded-xl font-extrabold text-base transition-all duration-300 bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg hover:shadow-blue-500/20 focus:outline-none focus:ring-4 focus:ring-blue-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
                onClick={() => handlePurchase(plan)}
                disabled={checkoutLoading === plan.planId}
                aria-label={`Purchase ${plan.name} plan for $${plan.price.toFixed(2)}`}
              >
                {checkoutLoading === plan.planId ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⚙️</span>
                    Processing...
                  </span>
                ) : (
                  'Get Started'
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
              {getBadge(plan.tokenCount) && (
                <div className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-extrabold ${
                  isMostPopular(plan.tokenCount)
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                    : 'bg-slate-900 text-white'
                }`}>
                  {getBadge(plan.tokenCount)}
                </div>
              )}
              
              <h3 className="mt-3 text-[18px] font-semibold text-slate-900 mb-2 text-center">
                {plan.name}
              </h3>
              
              <div className="text-center mb-3">
                <span className="text-[38px] leading-none font-extrabold text-slate-900">
                  ${plan.price.toFixed(2)}
                </span>
              </div>

              <ul className="mb-4 text-[13px] leading-5 text-slate-700 space-y-2">
                <li className="flex gap-2"><span aria-hidden="true">✅</span><span>Instant access</span></li>
                <li className="flex gap-2"><span aria-hidden="true">✅</span><span>No signup</span></li>
                <li className="flex gap-2"><span aria-hidden="true">✅</span><span>Pay once</span></li>
                <li className="flex gap-2"><span aria-hidden="true">✅</span><span>Restore credits anytime</span></li>
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
                {checkoutLoading === plan.planId ? 'Processing...' : 'Get Started'}
              </button>
            </article>
          ))}
        </div>
      )}

      {showHeader && !vertical && (
        <div className="mt-6 text-center space-y-2 pt-6 border-t border-slate-200">
          <p className="text-sm text-slate-600">No login. No subscription. Pay once.</p>
          <p className="text-sm font-semibold text-slate-700">
            Other fitness apps charge $10–$30/month. We don't.
          </p>
        </div>
      )}

    </section>
  );
}

export default PricingPlans;
