import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { adminLogin } from '../services/api';
import './AdminLogin.css';

function AdminLogin() {
  // Default email to admin@aiworkoutnow.com
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
      
      <div className="admin-login">
        <div className="container">
          <div className="login-card">
            <h1>Admin Login</h1>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="password">Admin Password</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  placeholder="Enter admin password"
                  autoFocus
                  required
                />
                <small className="form-hint">Email: admin@aiworkoutnow.com</small>
              </div>
              {error && <div className="error-message">{error}</div>}
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

export default AdminLogin;

