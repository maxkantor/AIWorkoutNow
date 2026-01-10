import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { adminLogin } from '../services/api';
import './AdminLogin.css';

function AdminLogin() {
  const [email, setEmail] = useState('admin@aiworkoutnow.com');
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
      
      <div className="admin-login-container">
        <div className="admin-login-wrapper">
          <div className="admin-login-card">
            <div className="admin-login-header">
              <div className="header-icons">
                <div className="icon-person">👤</div>
                <div className="icon-shield">🛡️</div>
              </div>
              <h1>Admin Login</h1>
              <p>Enter your credentials to access the admin dashboard</p>
            </div>
            
            <form onSubmit={handleSubmit} className="admin-login-form">
              <div className="form-group">
                <label htmlFor="username">
                  <span className="label-icon">👤</span>
                  Username
                </label>
                <div className="input-wrapper">
                  <input
                    type="email"
                    id="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                    placeholder="admin"
                    required
                    autoComplete="username"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="password">
                  <span className="label-icon lock-icon">🔒</span>
                  Password
                </label>
                <div className="input-wrapper">
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input"
                    placeholder="Enter password"
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>
              
              {error && (
                <div className="error-message">
                  <span className="error-icon">⚠️</span>
                  <span>{error}</span>
                </div>
              )}
              
              <button 
                type="submit" 
                className="login-button" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    <span>Logging in...</span>
                  </>
                ) : (
                  <>
                    🔒 Login
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

export default AdminLogin;


