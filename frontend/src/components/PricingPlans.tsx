import { useState, useEffect } from 'react';
import { getPricingPlans, createCheckoutSession, PricingPlan } from '../services/api';
import { getDeviceId } from '../utils/storage';

interface PricingPlansProps {
  showHeader?: boolean;
  compact?: boolean;
  vertical?: boolean;
}

function PricingPlans({ showHeader = true, compact = false, vertical = false }: PricingPlansProps) {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const pricingPlans = await getPricingPlans();
      setPlans(pricingPlans.sort((a, b) => a.displayOrder - b.displayOrder));
    } catch (err: any) {
      setError(err.message || 'Failed to load pricing plans');
    } finally {
      setLoading(false);
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
        <div className="space-y-4" role="list">
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
                      {plan.unlimitedDays && (
                        <span className="text-slate-500 ml-1">({plan.unlimitedDays} days)</span>
                      )}
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
                      {plan.unlimitedDays && (
                        <span className="text-slate-500 ml-1">({plan.unlimitedDays} days)</span>
                      )}
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
    </section>
  );
}

export default PricingPlans;
