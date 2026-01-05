import { useState, useEffect } from 'react';
import { getPricingPlans, createCheckoutSession, PricingPlan } from '../services/api';
import { getDeviceId } from '../utils/storage';
import './PricingPlans.css';

interface PricingPlansProps {
  showHeader?: boolean;
  compact?: boolean;
}

function PricingPlans({ showHeader = true, compact = false }: PricingPlansProps) {
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
      
      // Redirect to Stripe checkout
      window.location.href = url;
    } catch (err: any) {
      setError(err.message || 'Failed to start checkout');
      setCheckoutLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="pricing-plans-section">
        <div className="loading">Loading pricing plans...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pricing-plans-section">
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <section className={`pricing-plans-section ${compact ? 'compact' : ''}`}>
      {showHeader && (
        <div className="pricing-header">
          <h2>Unlock More AI Workouts</h2>
          <p className="pricing-subtitle">
            Pay once. No login. No subscription. Instant access.
          </p>
        </div>
      )}

      <div className={`pricing-grid ${compact ? 'compact-grid' : ''}`}>
        {plans.map((plan) => (
          <div
            key={plan.planId}
            className={`pricing-card ${plan.isRecommended ? 'recommended' : ''}`}
          >
            {plan.isRecommended && (
              <div className="recommended-badge">
                {plan.badgeText || '⭐ Most Popular'}
              </div>
            )}
            
            <h3>{plan.name}</h3>
            
            <div className="price-display">
              <span className="price">${plan.price.toFixed(2)}</span>
              <span className="period">one-time</span>
            </div>

            <div className="features">
              {plan.isUnlimited ? (
                <div className="feature">
                  <span className="icon">∞</span>
                  <span>Unlimited workouts</span>
                  {plan.unlimitedDays && (
                    <span className="detail">({plan.unlimitedDays} days)</span>
                  )}
                </div>
              ) : (
                <div className="feature">
                  <span className="icon">💪</span>
                  <span>{plan.tokenCount} workouts</span>
                </div>
              )}
            </div>

            {plan.microCopy && (
              <p className="microcopy">{plan.microCopy}</p>
            )}

            <button
              className={`cta-button ${plan.isRecommended ? 'primary' : 'secondary'}`}
              onClick={() => handlePurchase(plan)}
              disabled={checkoutLoading === plan.planId}
            >
              {checkoutLoading === plan.planId ? 'Processing...' : 'Get Started'}
            </button>
          </div>
        ))}
      </div>

      <div className="pricing-footer">
        <p>No login. No subscription. Pay once.</p>
        <p className="comparison">Other fitness apps charge $10–$30/month. We don't.</p>
      </div>
    </section>
  );
}

export default PricingPlans;
