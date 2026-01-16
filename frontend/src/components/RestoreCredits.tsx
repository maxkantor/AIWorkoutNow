import { useState } from 'react';
import { getDeviceId } from '../utils/storage';
import { sendVerificationCode, verifyAndRestoreCredits } from '../services/api';
import './RestoreCredits.css';

interface RestoreCreditsProps {
  onCreditsRestored?: () => void;
}

function RestoreCredits({ onCreditsRestored }: RestoreCreditsProps) {
  const [step, setStep] = useState<'email' | 'code' | 'success'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ tokensRemaining: number; hasUnlimited: boolean; expiresAt?: string; freeWorkoutsRemaining?: number; freeWorkoutsUsed?: number } | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);

  const handleSendCode = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await sendVerificationCode(email);
      setStep('code');
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code || code.length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const deviceId = getDeviceId();
      const result = await verifyAndRestoreCredits(email, code, deviceId);
      setSuccess(result);
      setStep('success');
      // Call onCreditsRestored callback to refresh parent component state
      if (onCreditsRestored) {
        onCreditsRestored();
      }
      // Also dispatch a global event to refresh access status across the app
      window.dispatchEvent(new CustomEvent('refreshAccessStatus'));
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to verify code';
      if (errorMessage.includes('attempts')) {
        const match = errorMessage.match(/(\d+)/);
        if (match) {
          setAttemptsRemaining(parseInt(match[1]));
        }
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep('email');
    setEmail('');
    setCode('');
    setError(null);
    setSuccess(null);
    setAttemptsRemaining(null);
  };

  return (
    <div className="restore-credits-container">
      <div className="restore-credits-card">
        <h2 className="restore-credits-title">Restore Workouts from Another Device</h2>
        <p className="restore-credits-description">
          Enter the email address you used when purchasing credits. We'll send you a verification code to restore your credits on this device.
        </p>

        {step === 'email' && (
          <div className="restore-credits-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="form-input"
                disabled={loading}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !loading) {
                    handleSendCode();
                  }
                }}
              />
            </div>
            {error && <div className="error-message">{error}</div>}
            <button
              onClick={handleSendCode}
              disabled={loading || !email}
              className="cta-button"
            >
              {loading ? 'Sending...' : 'Send Verification Code'}
            </button>
          </div>
        )}

        {step === 'code' && (
          <div className="restore-credits-form">
            <div className="code-sent-message">
              <span className="check-icon">✓</span>
              <p>Verification code sent to <strong>{email}</strong></p>
              <p className="code-hint">Check your email and enter the 6-digit code below.</p>
            </div>
            <div className="form-group">
              <label htmlFor="code">Verification Code</label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setCode(value);
                }}
                placeholder="000000"
                className="form-input code-input"
                maxLength={6}
                disabled={loading}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !loading && code.length === 6) {
                    handleVerifyCode();
                  }
                }}
              />
              {attemptsRemaining !== null && (
                <p className="attempts-remaining">Attempts remaining: {attemptsRemaining}</p>
              )}
            </div>
            {error && <div className="error-message">{error}</div>}
            <div className="button-group">
              <button
                onClick={handleVerifyCode}
                disabled={loading || code.length !== 6}
                className="cta-button"
              >
              {loading ? 'Verifying...' : 'Verify & Restore Workouts'}
              </button>
              <button
                onClick={handleReset}
                disabled={loading}
                className="secondary-button"
              >
                Use Different Email
              </button>
            </div>
          </div>
        )}

        {step === 'success' && success && (
          <div className="restore-credits-success">
            <div className="success-icon">✓</div>
            <h3>Credits Restored Successfully!</h3>
            <div className="credits-info">
              {success.hasUnlimited ? (
                <div className="credits-item">
                  <span className="credits-icon">∞</span>
                  <div>
                    <strong>Unlimited Access</strong>
                    {success.expiresAt && (
                      <p className="credits-detail">Expires: {new Date(success.expiresAt).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {success.tokensRemaining > 0 && (
                    <div className="credits-item">
                      <span className="credits-icon">💪</span>
                      <div>
                        <strong>{success.tokensRemaining} Paid Workouts</strong>
                        <p className="credits-detail">Available on this device</p>
                      </div>
                    </div>
                  )}
                  {success.freeWorkoutsRemaining !== undefined && (
                    <div className="credits-item">
                      <span className="credits-icon">🎁</span>
                      <div>
                        <strong>{success.freeWorkoutsRemaining} Free Workouts</strong>
                        <p className="credits-detail">Reset and available</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            <button onClick={handleReset} className="cta-button">
              Restore More Workouts
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default RestoreCredits;
