import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import { useTranslation } from 'react-i18next';
import { getUserAccessStatus, verifyPayment, UserAccessStatus } from '../services/api';
import { getDeviceId, setDeviceId } from '../utils/storage';
import './PaymentSuccess.css';

function PaymentSuccess() {
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [accessStatus, setAccessStatus] = useState<UserAccessStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const sessionId = searchParams.get('session_id');
  const deviceIdFromUrl = searchParams.get('deviceId');

  useEffect(() => {
    const processPayment = async () => {
      if (!sessionId) {
        setLoading(false);
        return;
      }

      try {
        if (deviceIdFromUrl) {
          // Persist deviceId passed through Stripe redirect so we don't "lose" credits when domain/origin changes.
          setDeviceId(deviceIdFromUrl);
        }
        const deviceId = deviceIdFromUrl || getDeviceId();
        
        // First, verify payment and grant tokens if needed
        setVerifying(true);
        try {
          const verification = await verifyPayment(sessionId, deviceId);
          console.log('[PaymentSuccess] Payment verification:', verification);
          
          if (verification.verified && !verification.alreadyProcessed) {
            console.log('[PaymentSuccess] Tokens granted:', verification.tokensGranted);
          }
        } catch (error) {
          console.error('[PaymentSuccess] Failed to verify payment:', error);
          // Continue anyway - webhook might have processed it
        } finally {
          setVerifying(false);
        }

        // Wait a moment for backend to process, then check access status
        // Retry a few times to ensure unlimited access is detected
        let status: UserAccessStatus | null = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1))); // 500ms, 1s, 1.5s
          status = await getUserAccessStatus(deviceId);
          setAccessStatus(status);
          
          // If we have unlimited access, we're done
          if (status.hasUnlimitedAccess) {
            break;
          }
        }
        
        setAccessStatus(status);
        
        // CRITICAL: Force refresh access status on home page after redirect
        window.dispatchEvent(new CustomEvent('refreshAccessStatus'));
        
        // Auto-redirect to home after 2 seconds
        setTimeout(() => {
          navigate('/');
          // Force a hard refresh after a short delay to ensure tokens are loaded
          setTimeout(() => {
            window.location.reload();
          }, 500);
        }, 2000);
      } catch (error) {
        console.error('Failed to check access status:', error);
      } finally {
        setLoading(false);
      }
    };

    processPayment();
  }, [sessionId, deviceIdFromUrl, navigate]);

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <>
      <SEO
        title={t('pages.paymentSuccess.seo.title')}
        description={t('pages.paymentSuccess.seo.description')}
        canonicalUrl="https://aiworkoutnow.com/payment-success"
        robots="noindex, nofollow"
      />

      <div className="payment-success-container">
        <div className="payment-success-card">
          <div className="success-icon">✓</div>
          <h1>{t('pages.paymentSuccess.title')}</h1>
          <p className="success-message">
            {t('pages.paymentSuccess.message')}
          </p>

          {loading || verifying ? (
            <div className="loading-status">
              {verifying ? t('pages.paymentSuccess.verifying') : t('pages.paymentSuccess.checking')}
            </div>
          ) : accessStatus ? (
            <div className="access-status">
              {accessStatus.hasUnlimitedAccess ? (
                <div className="status-item">
                  <span className="status-icon">∞</span>
                  <span>{t('pages.paymentSuccess.unlimitedActive')}</span>
                  {accessStatus.unlimitedExpiresAt && (
                    <span className="status-detail">
                      {t('pages.paymentSuccess.expires', {
                        date: new Date(accessStatus.unlimitedExpiresAt).toLocaleDateString(i18n.resolvedLanguage || i18n.language),
                      })}
                    </span>
                  )}
                </div>
              ) : accessStatus.tokensRemaining > 0 && accessStatus.tokensRemaining < 999999 ? (
                <div className="status-item">
                  <span className="status-icon">💪</span>
                  <span>{t('pages.paymentSuccess.workoutsAvailable', { count: accessStatus.tokensRemaining })}</span>
                </div>
              ) : accessStatus.tokensRemaining >= 999999 ? (
                <div className="status-item">
                  <span className="status-icon">∞</span>
                  <span>{t('pages.paymentSuccess.unlimitedActive')}</span>
                </div>
              ) : null}
            </div>
          ) : null}
          
          {!loading && !verifying && (
            <p className="redirect-message" style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#64748b' }}>
              {t('pages.paymentSuccess.redirecting')}
            </p>
          )}

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={handleGoHome} className="cta-button">
              {t('pages.paymentSuccess.start')}
            </button>
            <button onClick={handleGoHome} className="back-button" style={{ 
              padding: '0.75rem 1.5rem',
              background: 'transparent',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
              color: '#64748b',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}>
              {t('pages.paymentSuccess.backToHome')}
            </button>
          </div>

          {sessionId && (
            <p className="session-info">
              Session ID: {sessionId.substring(0, 20)}...
            </p>
          )}
        </div>
      </div>
    </>
  );
}

export default PaymentSuccess;
