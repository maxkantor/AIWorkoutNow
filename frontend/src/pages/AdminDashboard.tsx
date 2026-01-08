import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { getAdminStats } from '../services/api';
import './AdminDashboard.css';

function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState<string>('all');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin');
      return;
    }

    loadStats(token);
  }, [navigate, dateRange]);

  const loadStats = async (token: string, showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      const data = await getAdminStats(token);
      setStats(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load stats');
      if (err.message?.includes('401') || err.message?.includes('unauthorized')) {
        localStorage.removeItem('admin_token');
        navigate('/admin');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      loadStats(token, true);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/admin');
  };

  if (loading) {
    return (
      <div className="admin-dashboard-modern">
        <div className="dashboard-container">
          <div className="dashboard-skeleton">
            <div className="skeleton-header"></div>
            <div className="skeleton-kpis">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="skeleton-kpi"></div>
              ))}
            </div>
            <div className="skeleton-content"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Admin Dashboard - AIWorkoutNow</title>
      </Helmet>
      
      <div className="admin-dashboard-modern">
        {/* Sticky Header */}
        <header className="dashboard-header-sticky">
          <div className="header-content">
            <div className="header-left">
              <h1 className="dashboard-title">
                <span className="title-icon">💪</span>
                Admin Dashboard
              </h1>
            </div>
            <div className="header-right">
              <button 
                onClick={handleRefresh} 
                className="btn-refresh"
                disabled={refreshing}
                aria-label="Refresh data"
              >
                <span className={refreshing ? 'refresh-icon spinning' : 'refresh-icon'}>↻</span>
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
              <button onClick={handleLogout} className="btn-logout">
                <span className="logout-icon">🚪</span>
                Logout
              </button>
            </div>
          </div>
        </header>

        <div className="dashboard-container">
          {/* Date Range Filter */}
          <div className="dashboard-filters">
            <div className="filter-group">
              <label className="filter-label">Time Range</label>
              <div className="filter-buttons">
                {[
                  { value: 'all', label: 'All Time' },
                  { value: 'today', label: 'Today' },
                  { value: '7d', label: '7 Days' },
                  { value: '30d', label: '30 Days' },
                ].map(range => (
                  <button
                    key={range.value}
                    onClick={() => setDateRange(range.value)}
                    className={`filter-btn ${dateRange === range.value ? 'active' : ''}`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="toast toast-error" role="alert">
              <span className="toast-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* KPI Cards */}
          {stats && (
            <div className="kpi-grid">
              <div className="kpi-card kpi-primary">
                <div className="kpi-icon">👥</div>
                <div className="kpi-content">
                  <div className="kpi-label">Free Users</div>
                  <div className="kpi-value">{stats.freeUsers || 0}</div>
                  <div className="kpi-trend">
                    <span className="trend-up">↗</span>
                    <span className="trend-text">Active</span>
                  </div>
                </div>
              </div>

              <div className="kpi-card kpi-success">
                <div className="kpi-icon">⭐</div>
                <div className="kpi-content">
                  <div className="kpi-label">Paid Users</div>
                  <div className="kpi-value">{stats.paidUsers || 0}</div>
                  <div className="kpi-trend">
                    <span className="trend-up">↗</span>
                    <span className="trend-text">Subscribed</span>
                  </div>
                </div>
              </div>

              <div className="kpi-card kpi-info">
                <div className="kpi-icon">💪</div>
                <div className="kpi-content">
                  <div className="kpi-label">Total Workouts</div>
                  <div className="kpi-value">{stats.totalWorkouts || 0}</div>
                  <div className="kpi-trend">
                    <span className="trend-up">↗</span>
                    <span className="trend-text">Generated</span>
                  </div>
                </div>
              </div>

              <div className="kpi-card kpi-warning">
                <div className="kpi-icon">💰</div>
                <div className="kpi-content">
                  <div className="kpi-label">Token Purchases</div>
                  <div className="kpi-value">{stats.tokenPurchases || 0}</div>
                  <div className="kpi-trend">
                    <span className="trend-up">↗</span>
                    <span className="trend-text">Transactions</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Admin Action Panel */}
          <section className="dashboard-section">
            <h2 className="section-title">Admin Actions</h2>
            <div className="action-grid">
              <Link to="/admin/customers" className="action-card">
                <div className="action-icon customers">👥</div>
                <div className="action-content">
                  <h3>Customers</h3>
                  <p>View and manage all customer accounts, purchases, and activity</p>
                </div>
                <div className="action-arrow">→</div>
              </Link>

              <Link to="/admin/contacts" className="action-card">
                <div className="action-icon contacts">📧</div>
                <div className="action-content">
                  <h3>Contact Messages</h3>
                  <p>Review and respond to customer inquiries and support requests</p>
                </div>
                <div className="action-arrow">→</div>
              </Link>

              <Link to="/admin/purchases" className="action-card">
                <div className="action-icon purchases">💳</div>
                <div className="action-content">
                  <h3>Stripe Purchases</h3>
                  <p>Monitor payment transactions, revenue, and purchase analytics</p>
                </div>
                <div className="action-arrow">→</div>
              </Link>

              <Link to="/admin/activities" className="action-card">
                <div className="action-icon activities">📊</div>
                <div className="action-content">
                  <h3>Activity Logs</h3>
                  <p>Track system-wide events, workouts, and user interactions</p>
                </div>
                <div className="action-arrow">→</div>
              </Link>
            </div>
          </section>

          {/* Analytics Placeholder */}
          <section className="dashboard-section">
            <h2 className="section-title">Analytics Overview</h2>
            <div className="analytics-grid">
              <div className="analytics-card">
                <h3 className="analytics-title">User Growth</h3>
                <div className="analytics-placeholder">
                  <p className="placeholder-text">📈 Chart visualization coming soon</p>
                  <p className="placeholder-subtext">Track user acquisition trends over time</p>
                </div>
              </div>
              <div className="analytics-card">
                <h3 className="analytics-title">Revenue Trend</h3>
                <div className="analytics-placeholder">
                  <p className="placeholder-text">💰 Chart visualization coming soon</p>
                  <p className="placeholder-subtext">Monitor revenue and purchase patterns</p>
                </div>
              </div>
              <div className="analytics-card">
                <h3 className="analytics-title">Workout Activity</h3>
                <div className="analytics-placeholder">
                  <p className="placeholder-text">💪 Chart visualization coming soon</p>
                  <p className="placeholder-subtext">Analyze workout generation frequency</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

export default AdminDashboard;
