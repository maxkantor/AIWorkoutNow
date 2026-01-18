import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getDeviceId } from '../utils/storage';
import { sendVerificationCode, verifyAndRestoreCredits } from '../services/api';
import { safeT } from '../i18n/safeT';
import './RestoreCredits.css';

interface RestoreCreditsProps {
  onCreditsRestored?: () => void;
}

function RestoreCredits({ onCreditsRestored }: RestoreCreditsProps) {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState<'email' | 'code' | 'success'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ tokensRemaining: number; hasUnlimited: boolean; expiresAt?: string; freeWorkoutsRemaining?: number; freeWorkoutsUsed?: number } | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);

  const handleSendCode = async () => {
    if (!email || !email.includes('@')) {
      setError(safeT(t, 'restore.errors.invalidEmail'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await sendVerificationCode(email);
      setStep('code');
    } catch (err: any) {
      setError(err.message || safeT(t, 'restore.errors.sendFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code || code.length !== 6) {
      setError(safeT(t, 'restore.errors.invalidCode'));
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
      const errorMessage = err.message || safeT(t, 'restore.errors.verifyFailed');
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
        <h2 className="restore-credits-title">{safeT(t, 'restore.title')}</h2>
        <p className="restore-credits-description">
          {safeT(t, 'restore.description')}
        </p>

        {step === 'email' && (
          <div className="restore-credits-form">
            <div className="form-group">
              <label htmlFor="email">{safeT(t, 'restore.emailLabel')}</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={safeT(t, 'restore.emailPlaceholder')}
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
              {loading ? safeT(t, 'restore.sending') : safeT(t, 'restore.sendCode')}
            </button>
          </div>
        )}

        {step === 'code' && (
          <div className="restore-credits-form">
            <div className="code-sent-message">
              <span className="check-icon">✓</span>
              <p>{safeT(t, 'restore.codeSentTo', { email })}</p>
              <p className="code-hint">{safeT(t, 'restore.codeHint')}</p>
            </div>
            <div className="form-group">
              <label htmlFor="code">{safeT(t, 'restore.codeLabel')}</label>
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
                <p className="attempts-remaining">{safeT(t, 'restore.attemptsRemaining', { count: attemptsRemaining })}</p>
              )}
            </div>
            {error && <div className="error-message">{error}</div>}
            <div className="button-group">
              <button
                onClick={handleVerifyCode}
                disabled={loading || code.length !== 6}
                className="cta-button"
              >
              {loading ? safeT(t, 'restore.verifying') : safeT(t, 'restore.verifyRestore')}
              </button>
              <button
                onClick={handleReset}
                disabled={loading}
                className="secondary-button"
              >
                {safeT(t, 'restore.useDifferentEmail')}
              </button>
            </div>
          </div>
        )}

        {step === 'success' && success && (
          <div className="restore-credits-success">
            <div className="success-icon">✓</div>
            <h3>{safeT(t, 'restore.successTitle')}</h3>
            <div className="credits-info">
              {success.hasUnlimited ? (
                <div className="credits-item">
                  <span className="credits-icon">∞</span>
                  <div>
                    <strong>{safeT(t, 'restore.unlimited')}</strong>
                    {success.expiresAt && (
                      <p className="credits-detail">
                        {safeT(t, 'restore.expires', {
                          date: new Date(success.expiresAt).toLocaleDateString(i18n.resolvedLanguage || i18n.language),
                        })}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {success.tokensRemaining > 0 && (
                    <div className="credits-item">
                      <span className="credits-icon">💪</span>
                      <div>
                        <strong>{safeT(t, 'restore.paidWorkouts', { count: success.tokensRemaining })}</strong>
                        <p className="credits-detail">{safeT(t, 'restore.paidDetail')}</p>
                      </div>
                    </div>
                  )}
                  {success.freeWorkoutsRemaining !== undefined && (
                    <div className="credits-item">
                      <span className="credits-icon">🎁</span>
                      <div>
                        <strong>{safeT(t, 'restore.freeWorkouts', { count: success.freeWorkoutsRemaining })}</strong>
                        <p className="credits-detail">{safeT(t, 'restore.freeDetail')}</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            <button onClick={handleReset} className="cta-button">
              {safeT(t, 'restore.restoreMore')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default RestoreCredits;
