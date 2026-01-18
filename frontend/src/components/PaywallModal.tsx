import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPricingPlans, createCheckoutSession, PricingPlan } from '../services/api';
import { getDeviceId } from '../utils/storage';
import { useTranslation } from 'react-i18next';
import { safeT } from '../i18n/safeT';
import './PaywallModal.css';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchaseComplete?: () => void;
}

function PaywallModal({ isOpen, onClose, onPurchaseComplete: _onPurchaseComplete }: PaywallModalProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const handleBackToHome = () => {
    navigate('/');
  };

  useEffect(() => {
    if (isOpen) {
      loadPlans();
    }
  }, [isOpen]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      
      // Check localStorage cache first
      const cacheKey = 'pricing_plans_cache';
      const cacheExpiryKey = 'pricing_plans_cache_expiry';
      const cached = localStorage.getItem(cacheKey);
      const expiry = localStorage.getItem(cacheExpiryKey);
      
      if (cached && expiry && new Date().getTime() < parseInt(expiry)) {
        console.log('[PaywallModal] Using cached pricing plans');
        const pricingPlans: PricingPlan[] = JSON.parse(cached);
        setPlans(pricingPlans.sort((a: PricingPlan, b: PricingPlan) => a.displayOrder - b.displayOrder));
        setLoading(false);
        return;
      }
      
      // Fetch from API
      const pricingPlans = await getPricingPlans();
      const sortedPlans = pricingPlans.sort((a: PricingPlan, b: PricingPlan) => a.displayOrder - b.displayOrder);
      setPlans(sortedPlans);
      
      // Cache in localStorage (5 minutes)
      localStorage.setItem(cacheKey, JSON.stringify(sortedPlans));
      localStorage.setItem(cacheExpiryKey, (new Date().getTime() + 5 * 60 * 1000).toString());
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

  if (!isOpen) return null;

  return (
    <div className="paywall-overlay" onClick={onClose}>
      <div className="paywall-modal" onClick={(e) => e.stopPropagation()}>
        <button className="paywall-close" onClick={onClose}>×</button>
        
        <button className="paywall-back" onClick={handleBackToHome}>
          {safeT(t, 'paywall.backToHome')}
        </button>
        
        <div className="paywall-header">
          <h2>{safeT(t, 'paywall.title')}</h2>
          <p className="paywall-subheadline">
            {safeT(t, 'paywall.subheadline')}
          </p>
        </div>

        {error && (
          <div className="paywall-error">{error}</div>
        )}

        {loading ? (
          <div className="paywall-loading">{safeT(t, 'paywall.loadingPlans')}</div>
        ) : (
          <>
            <div className="pricing-plans-grid">
              {plans.map((plan) => (
                <div
                  key={plan.planId}
                  className={`pricing-plan-card ${plan.isRecommended ? 'recommended' : ''}`}
                >
                  {plan.isRecommended && (
                    <div className="recommended-badge">
                      {safeT(t, 'paywall.mostPopular')}
                    </div>
                  )}
                  
                  <h3>
                    {plan.tokenCount === 10
                      ? safeT(t, 'pricing.planName.10')
                      : plan.tokenCount === 30
                        ? safeT(t, 'pricing.planName.30')
                        : plan.tokenCount === 100
                          ? safeT(t, 'pricing.planName.100')
                          : plan.name}
                  </h3>
                  
                  <div className="plan-price">
                    <span className="price-amount">${plan.price.toFixed(2)}</span>
                    <span className="price-period">{safeT(t, 'paywall.oneTime')}</span>
                  </div>

                  <div className="plan-features">
                    {plan.isUnlimited ? (
                      <div className="feature-item">
                        <span className="feature-icon">∞</span>
                        <span>{safeT(t, 'paywall.unlimitedWorkouts')}</span>
                      </div>
                    ) : (
                      <div className="feature-item">
                        <span className="feature-icon">💪</span>
                        <span>{safeT(t, 'paywall.workouts', { count: plan.tokenCount })}</span>
                      </div>
                    )}
                  </div>

                  {plan.microCopy && (
                    <p className="plan-microcopy">{plan.microCopy}</p>
                  )}

                  <button
                    className={`plan-cta ${plan.isRecommended ? 'cta-primary' : 'cta-secondary'}`}
                    onClick={() => handlePurchase(plan)}
                    disabled={checkoutLoading === plan.planId}
                  >
                    {checkoutLoading === plan.planId ? safeT(t, 'pricing.processing') : safeT(t, 'paywall.cta')}
                  </button>
                </div>
              ))}
            </div>

            <div className="pricing-disclaimer">
              <p>{safeT(t, 'paywall.disclaimerLine')}</p>
              <p className="comparison-text">
                {safeT(t, 'pricing.comparison')}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default PaywallModal;
