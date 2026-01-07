import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { getUserAccessStatus, UserAccessStatus } from '../services/api';
import { getDeviceId } from '../utils/storage';
import './PaymentSuccess.css';

function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [accessStatus, setAccessStatus] = useState<UserAccessStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const deviceId = getDeviceId();
        const status = await getUserAccessStatus(deviceId);
        setAccessStatus(status);
      } catch (error) {
        console.error('Failed to check access status:', error);
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      checkAccess();
    } else {
      setLoading(false);
    }
  }, [sessionId]);

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <>
      <Helmet>
        <title>Payment Successful - AIWorkoutNow</title>
        <meta name="description" content="Your payment was successful. Start generating AI workouts now!" />
      </Helmet>

      <div className="payment-success-container">
        <div className="payment-success-card">
          <div className="success-icon">✓</div>
          <h1>Payment Successful!</h1>
          <p className="success-message">
            Thank you for your purchase. Your account has been upgraded.
          </p>

          {loading ? (
            <div className="loading-status">Checking your access...</div>
          ) : accessStatus ? (
            <div className="access-status">
              {accessStatus.hasUnlimitedAccess ? (
                <div className="status-item">
                  <span className="status-icon">∞</span>
                  <span>Unlimited Access Active</span>
                  {accessStatus.unlimitedExpiresAt && (
                    <span className="status-detail">
                      (expires {new Date(accessStatus.unlimitedExpiresAt).toLocaleDateString()})
                    </span>
                  )}
                </div>
              ) : accessStatus.tokensRemaining > 0 ? (
                <div className="status-item">
                  <span className="status-icon">💪</span>
                  <span>{accessStatus.tokensRemaining} Workouts Available</span>
                </div>
              ) : null}
            </div>
          ) : null}

          <button onClick={handleGoHome} className="cta-button">
            Start Generating Workouts
          </button>

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
