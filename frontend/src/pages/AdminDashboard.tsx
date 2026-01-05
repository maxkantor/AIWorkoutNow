import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { getAdminStats } from '../services/api';
import './AdminDashboard.css';

function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin');
      return;
    }

    loadStats(token);
  }, [navigate]);

  const loadStats = async (token: string) => {
    try {
      const data = await getAdminStats(token);
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load stats');
      if (err.message?.includes('401') || err.message?.includes('unauthorized')) {
        localStorage.removeItem('admin_token');
        navigate('/admin');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/admin');
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="container">
          <div className="loading">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard">
        <div className="container">
          <div className="error-message">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Admin Dashboard - AIWorkoutNow</title>
      </Helmet>
      
      <div className="admin-dashboard">
        <div className="container">
          <div className="dashboard-header">
            <h1>Admin Dashboard</h1>
            <button onClick={handleLogout} className="btn btn-secondary">
              Logout
            </button>
          </div>

          {stats && (
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Free Users</h3>
                <p className="stat-value">{stats.freeUsers || 0}</p>
              </div>
              <div className="stat-card">
                <h3>Paid Users</h3>
                <p className="stat-value">{stats.paidUsers || 0}</p>
              </div>
              <div className="stat-card">
                <h3>Total Workouts</h3>
                <p className="stat-value">{stats.totalWorkouts || 0}</p>
              </div>
              <div className="stat-card">
                <h3>Token Purchases</h3>
                <p className="stat-value">{stats.tokenPurchases || 0}</p>
              </div>
            </div>
          )}

          <div className="dashboard-nav">
            <h2>Quick Navigation</h2>
            <div className="nav-grid">
              <Link to="/admin/customers" className="nav-card">
                <div className="nav-icon">👥</div>
                <h3>Customers</h3>
                <p>View all customers and their activity</p>
              </Link>
              <Link to="/admin/contacts" className="nav-card">
                <div className="nav-icon">📧</div>
                <h3>Contact Messages</h3>
                <p>View and reply to contact messages</p>
              </Link>
              <Link to="/admin/purchases" className="nav-card">
                <div className="nav-icon">💰</div>
                <h3>Stripe Purchases</h3>
                <p>View all payment transactions</p>
              </Link>
              <Link to="/admin/activities" className="nav-card">
                <div className="nav-icon">📊</div>
                <h3>All Activities</h3>
                <p>View system-wide activity logs</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default AdminDashboard;

