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
              <h1>Admin Login</h1>
              <p>Sign in to access the admin dashboard</p>
            </div>
            
            <form onSubmit={handleSubmit} className="admin-login-form">
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  placeholder="admin@aiworkoutnow.com"
                  required
                  autoComplete="email"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
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
                  'Sign In'
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


