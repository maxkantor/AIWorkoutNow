import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { adminLogin } from '../services/api';
import './AdminLogin.css';

function AdminLogin() {
  const [email, setEmail] = useState(() => localStorage.getItem('admin_email') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(() => !!localStorage.getItem('admin_email'));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!rememberEmail) {
      localStorage.removeItem('admin_email');
      return;
    }
    localStorage.setItem('admin_email', email);
  }, [email, rememberEmail]);

  const validateEmail = (val: string) => /\S+@\S+\.\S+/.test(val.trim());
  const isEmailValid = validateEmail(email);
  const isFormValid = isEmailValid && password.trim().length > 0 && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isFormValid) {
      setError('Invalid credentials. Please try again.');
      return;
    }
    setLoading(true);
    try {
      const token = await adminLogin(email.trim(), password);
      localStorage.setItem('admin_token', token);
      if (rememberEmail) {
        localStorage.setItem('admin_email', email.trim());
      } else {
        localStorage.removeItem('admin_email');
      }
      navigate('/admin/dashboard');
    } catch (err: any) {
      setError('Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Admin CRM - Secure Sign-In</title>
      </Helmet>
      <div className="admin-login-page">
        <div className="admin-login-card">
          <div className="admin-login-header">
            <div className="lock-circle" aria-hidden="true">🔒</div>
            <h1>Admin CRM</h1>
            <p>Secure sign-in to manage plans, purchases, tokens, and content.</p>
          </div>

          <form className="admin-login-form" onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <div className={`input-shell ${email && !isEmailValid ? 'has-error' : ''}`}>
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  aria-label="Admin email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              {email && !isEmailValid && <div className="field-error">Enter a valid email.</div>}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-shell password-shell">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  aria-label="Admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div className="form-row">
              <label className="remember">
                <input
                  type="checkbox"
                  checked={rememberEmail}
                  onChange={(e) => setRememberEmail(e.target.checked)}
                />
                <span>Remember me</span>
              </label>
              <button type="button" className="link-button" onClick={() => setShowForgot(true)}>
                Forgot password?
              </button>
            </div>

            {error && (
              <div className="error-banner" role="alert">
                Invalid credentials. Please try again.
              </div>
            )}

            <button type="submit" className="login-button" disabled={!isFormValid}>
              {loading ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  <span>Signing in…</span>
                </>
              ) : (
                <span>Sign in to Admin CRM</span>
              )}
            </button>
            <div className="subnote">Authorized admins only.</div>
          </form>
        </div>

        {showForgot && (
          <div className="modal-backdrop" role="dialog" aria-modal="true">
            <div className="modal">
              <h2>Reset access</h2>
              <p>Contact site owner to reset admin credentials.</p>
              <button className="modal-close" onClick={() => setShowForgot(false)}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default AdminLogin;


