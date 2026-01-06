import { useState, useEffect } from 'react';
import { getPricingPlans, createCheckoutSession, PricingPlan } from '../services/api';
import { getDeviceId } from '../utils/storage';
import './PricingPlans.css';

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
      <div className="pricing-section">
        <div className="pricing-loading">Loading pricing plans...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pricing-section">
        <div className="pricing-error">{error}</div>
      </div>
    );
  }

  return (
    <section className="pricing-section" aria-labelledby={showHeader ? "pricing-heading" : undefined}>
      {showHeader && (
        <header className="pricing-header">
          <h2 id="pricing-heading">Unlock More AI Workouts</h2>
          <p>Pay once. No login. No subscription. Instant access.</p>
        </header>
      )}

      {vertical ? (
        <div className="pricing-vertical" role="list">
          {plans.map((plan) => (
            <article
              key={plan.planId}
              className={`pricing-card ${plan.isRecommended ? 'recommended' : ''}`}
              role="listitem"
            >
              {plan.isRecommended && (
                <div className="pricing-badge">
                  {plan.badgeText || '⭐ Most Popular'}
                </div>
              )}
              
              <h3 className="pricing-card-title">{plan.name}</h3>
              
              <div className="pricing-price-wrapper">
                <span className="pricing-price">${plan.price.toFixed(2)}</span>
                <span className="pricing-period">one-time</span>
              </div>

              <div className="pricing-feature">
                {plan.isUnlimited ? (
                  <>
                    <span className="pricing-feature-icon">∞</span>
                    <span className="pricing-feature-text">
                      Unlimited workouts
                      {plan.unlimitedDays && (
                        <span className="pricing-feature-detail">({plan.unlimitedDays} days)</span>
                      )}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="pricing-feature-icon">💪</span>
                    <span className="pricing-feature-text">{plan.tokenCount} workouts</span>
                  </>
                )}
              </div>

              {plan.microCopy && (
                <p className="pricing-microcopy">{plan.microCopy}</p>
              )}

              <button
                className={`pricing-button ${plan.isRecommended ? 'primary' : 'secondary'}`}
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
        <div className="pricing-grid" role="list">
          {plans.map((plan) => (
            <article
              key={plan.planId}
              className={`pricing-card ${plan.isRecommended ? 'recommended' : ''}`}
              role="listitem"
            >
              {plan.isRecommended && (
                <div className="pricing-badge">
                  {plan.badgeText || '⭐ Most Popular'}
                </div>
              )}
              
              <h3 className="pricing-card-title">{plan.name}</h3>
              
              <div className="pricing-price-wrapper">
                <span className="pricing-price">${plan.price.toFixed(2)}</span>
                <span className="pricing-period">one-time</span>
              </div>

              <div className="pricing-feature">
                {plan.isUnlimited ? (
                  <>
                    <span className="pricing-feature-icon">∞</span>
                    <span className="pricing-feature-text">
                      Unlimited workouts
                      {plan.unlimitedDays && (
                        <span className="pricing-feature-detail">({plan.unlimitedDays} days)</span>
                      )}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="pricing-feature-icon">💪</span>
                    <span className="pricing-feature-text">{plan.tokenCount} workouts</span>
                  </>
                )}
              </div>

              {plan.microCopy && (
                <p className="pricing-microcopy">{plan.microCopy}</p>
              )}

              <button
                className={`pricing-button ${plan.isRecommended ? 'primary' : 'secondary'}`}
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
