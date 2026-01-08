import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { adminLogin } from '../services/api';
import './AdminLogin.css';

function AdminLogin() {
  const [email] = useState('admin@aiworkoutnow.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const token = await adminLogin(email, password);
      localStorage.setItem('admin_token', token);
      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Admin Login - AIWorkoutNow</title>
      </Helmet>
      
      <div className="admin-login-modern">
        <div className="login-container">
          <div className="login-card-modern">
            <div className="login-header">
              <div className="login-logo">
                <span className="logo-icon">💪</span>
              </div>
              <h1>Admin Portal</h1>
              <p className="login-subtitle">AIWorkoutNow Management Dashboard</p>
            </div>
            
            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group-modern">
                <label htmlFor="email" className="form-label">Email</label>
                <div className="input-wrapper">
                  <input
                    type="email"
                    id="email"
                    value={email}
                    readOnly
                    className="input-modern input-readonly"
                    tabIndex={-1}
                  />
                  <span className="input-badge">Default</span>
                </div>
              </div>
              
              <div className="form-group-modern">
                <label htmlFor="password" className="form-label">Password</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-modern"
                  placeholder="Enter your admin password"
                  autoFocus
                  required
                />
              </div>
              
              {error && (
                <div className="error-message-modern" role="alert">
                  <span className="error-icon">⚠️</span>
                  {error}
                </div>
              )}
              
              <button 
                type="submit" 
                className="btn-login-modern" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Signing in...
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <span className="btn-arrow">→</span>
                  </>
                )}
              </button>
            </form>
            
            <div className="login-footer">
              <p className="security-note">
                🔒 Secure admin access only
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default AdminLogin;
