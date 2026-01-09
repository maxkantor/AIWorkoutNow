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
          <h2 id="pricing-heading" className="text-xl font-bold text-slate-800 mb-2">
            Unlock More AI Workouts
          </h2>
          <p className="text-sm text-slate-600">
            Pay once. No login. No subscription. Instant access.
          </p>
        </header>
      )}

      {vertical ? (
        <div className="space-y-5" role="list">
          {plans.map((plan) => (
            <article
              key={plan.planId}
              className={`relative bg-white rounded-2xl border-2 p-6 transition-all ${
                plan.isRecommended 
                  ? 'border-blue-600 bg-gradient-to-br from-blue-50 via-white to-purple-50 shadow-xl ring-2 ring-blue-500/20 scale-[1.02]' 
                  : 'border-slate-200 shadow-md hover:shadow-lg hover:border-slate-300'
              }`}
              role="listitem"
            >
              {plan.isRecommended && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg">
                  {plan.badgeText || '⭐ BEST VALUE'}
                </div>
              )}
              
              {/* Plan Name */}
              <h3 className={`text-xl font-bold mb-3 text-center ${plan.isRecommended ? 'text-slate-900' : 'text-slate-800'}`}>
                {plan.name}
              </h3>
              
              {/* Price - Prominent */}
              <div className="text-center mb-4">
                <div className="flex items-baseline justify-center gap-1">
                  <span className={`text-4xl font-extrabold ${plan.isRecommended ? 'text-blue-600' : 'text-slate-800'}`}>
                    ${plan.price.toFixed(2)}
                  </span>
                </div>
                <span className="text-xs text-slate-500 font-medium uppercase tracking-wide block mt-1">One-Time Payment</span>
              </div>

              {/* Value Proposition */}
              <div className="mb-4 pb-4 border-b border-slate-200">
                {plan.isUnlimited ? (
                  <div className="flex items-center justify-center gap-2 text-slate-700">
                    <span className="text-2xl">∞</span>
                    <span className="text-base font-semibold">
                      Unlimited Workouts
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-slate-700">
                    <span className="text-xl">💪</span>
                    <span className="text-base font-semibold">{plan.tokenCount} Workouts</span>
                  </div>
                )}
              </div>

              {/* Micro Copy - Simplified */}
              {plan.microCopy && (
                <p className="text-sm text-slate-600 text-center mb-5 font-medium">
                  {plan.microCopy}
                </p>
              )}

              {/* CTA Button */}
              <button
                className={`w-full py-3.5 px-6 rounded-xl font-bold text-base transition-all duration-300 ${
                  plan.isRecommended
                    ? 'bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 text-white hover:shadow-2xl hover:shadow-blue-500/40 transform hover:-translate-y-1 hover:scale-[1.02]'
                    : 'bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-700'
                } disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none focus:outline-none focus:ring-4 focus:ring-blue-500/30`}
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
              className={`relative bg-white rounded-lg border-2 p-4 transition-all ${
                plan.isRecommended 
                  ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-white shadow-md' 
                  : 'border-slate-200 shadow-sm hover:shadow-md'
              }`}
              role="listitem"
            >
              {plan.isRecommended && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                  {plan.badgeText || '⭐ Most Popular'}
                </div>
              )}
              
              <h3 className="text-lg font-semibold text-slate-800 mb-2 text-center">
                {plan.name}
              </h3>
              
              <div className="text-center mb-3">
                <span className="text-2xl font-bold text-blue-600">
                  ${plan.price.toFixed(2)}
                </span>
                <span className="text-xs text-slate-500 uppercase ml-1">one-time</span>
              </div>

              <div className="mb-3">
                {plan.isUnlimited ? (
                  <div className="flex items-center justify-center gap-2 text-slate-700">
                    <span className="text-xl">∞</span>
                    <span className="text-sm font-medium">
                      Unlimited workouts
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-slate-700">
                    <span className="text-lg">💪</span>
                    <span className="text-sm font-medium">{plan.tokenCount} workouts</span>
                  </div>
                )}
              </div>

              {plan.microCopy && (
                <p className="text-xs text-slate-500 text-center italic mb-3">
                  {plan.microCopy}
                </p>
              )}

              <button
                className={`w-full py-2.5 px-4 rounded-lg font-semibold text-sm transition-all ${
                  plan.isRecommended
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg transform hover:-translate-y-0.5'
                    : 'bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white'
                } disabled:opacity-60 disabled:cursor-not-allowed`}
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

      {/* Restore Credits Link */}
      <div className="mt-4 text-center">
        <button
          onClick={() => {
            // Scroll to restore credits section or trigger modal
            const restoreSection = document.getElementById('restore-credits-section');
            if (restoreSection) {
              restoreSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
              // Trigger the restore credits modal
              const event = new CustomEvent('openRestoreCredits');
              window.dispatchEvent(event);
            }
          }}
          className="text-sm text-blue-600 hover:text-blue-700 underline font-medium"
        >
          📱 Restore credits from another device
        </button>
      </div>
    </section>
  );
}

export default PricingPlans;
