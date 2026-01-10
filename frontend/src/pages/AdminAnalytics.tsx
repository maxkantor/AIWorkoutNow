import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { getAnalytics, AnalyticsData } from '../services/api';
import './AdminAnalytics.css';

function AdminAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<string>('day');
  const [daysRange, setDaysRange] = useState<number>(30);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin');
      return;
    }

    loadAnalytics(token);
  }, [navigate, period, daysRange]);

  const loadAnalytics = async (token: string) => {
    try {
      setLoading(true);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysRange);

      const data = await getAnalytics(token, startDate, endDate, period);
      setAnalytics(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
      if (err.message?.includes('401') || err.message?.includes('unauthorized')) {
        localStorage.removeItem('admin_token');
        navigate('/admin');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getMaxValue = (series: any[], key: string) => {
    if (!series || series.length === 0) return 1;
    return Math.max(...series.map(s => s[key] || 0), 1);
  };

  if (loading) {
    return (
      <div className="admin-analytics">
        <div className="container">
          <div className="loading">Loading analytics...</div>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="admin-analytics">
        <div className="container">
          <div className="error-message">{error || 'Failed to load analytics'}</div>
        </div>
      </div>
    );
  }

  const maxWorkouts = getMaxValue(analytics.timeSeries, 'workoutsGenerated');
  const maxPurchases = getMaxValue(analytics.timeSeries, 'tokenPurchases');
  const maxUsers = getMaxValue(analytics.timeSeries, 'uniqueUsers');
  const maxRevenue = getMaxValue(analytics.timeSeries, 'revenue');

  return (
    <>
      <Helmet>
        <title>Analytics - Admin Dashboard</title>
      </Helmet>
      
      <div className="admin-analytics">
        <div className="container">
          <div className="page-header">
            <h1>Analytics Dashboard</h1>
            <Link to="/admin/dashboard" className="btn btn-secondary">Back to Dashboard</Link>
          </div>

          {/* Date Range & Period Selector */}
          <div className="analytics-controls">
            <div className="control-group">
              <label>Date Range:</label>
              <select 
                value={daysRange} 
                onChange={(e) => setDaysRange(Number(e.target.value))}
                className="control-select"
              >
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={365}>Last year</option>
              </select>
            </div>
            <div className="control-group">
              <label>Period:</label>
              <select 
                value={period} 
                onChange={(e) => setPeriod(e.target.value)}
                className="control-select"
              >
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
              </select>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="metrics-grid">
            <div className="metric-card">
              <h3>Total Users</h3>
              <p className="metric-value">{analytics.users?.totalUsers || 0}</p>
              <div className="metric-breakdown">
                <span>New: {analytics.users?.newUsers || 0}</span>
                <span>Returning: {analytics.users?.returningUsers || 0}</span>
              </div>
            </div>
            <div className="metric-card">
              <h3>Total Revenue</h3>
              <p className="metric-value">{formatCurrency(analytics.revenue?.totalRevenue || 0)}</p>
              <div className="metric-breakdown">
                <span>Transactions: {analytics.revenue?.totalTransactions || 0}</span>
                <span>AOV: {formatCurrency(analytics.revenue?.averageOrderValue || 0)}</span>
              </div>
            </div>
            <div className="metric-card">
              <h3>Conversion Rate</h3>
              <p className="metric-value">{formatPercent(analytics.conversion?.freeToPaidConversionRate || 0)}</p>
              <div className="metric-breakdown">
                <span>Converted: {analytics.conversion?.freeUsersConverted || 0}</span>
                <span>Not Converted: {analytics.conversion?.freeUsersNotConverted || 0}</span>
              </div>
            </div>
            <div className="metric-card">
              <h3>Avg Workouts/User</h3>
              <p className="metric-value">{analytics.users?.averageWorkoutsPerUser.toFixed(1) || '0.0'}</p>
              <div className="metric-breakdown">
                <span>Free Users: {analytics.users?.freeUsers || 0}</span>
                <span>Paid Users: {analytics.users?.paidUsers || 0}</span>
              </div>
            </div>
          </div>

          {/* Events Summary */}
          <div className="events-section">
            <h2>Event Summary</h2>
            <div className="events-grid">
              <div className="event-card">
                <div className="event-icon">💪</div>
                <div className="event-info">
                  <h3>Workouts Generated</h3>
                  <p className="event-count">{analytics.events?.totalWorkoutsGenerated || 0}</p>
                </div>
              </div>
              <div className="event-card">
                <div className="event-icon">💰</div>
                <div className="event-info">
                  <h3>Token Purchases</h3>
                  <p className="event-count">{analytics.events?.totalTokenPurchases || 0}</p>
                </div>
              </div>
              <div className="event-card">
                <div className="event-icon">📧</div>
                <div className="event-info">
                  <h3>Contact Submissions</h3>
                  <p className="event-count">{analytics.events?.totalContactSubmissions || 0}</p>
                </div>
              </div>
              <div className="event-card">
                <div className="event-icon">🔄</div>
                <div className="event-info">
                  <h3>Token Resets</h3>
                  <p className="event-count">{analytics.events?.totalTokenResets || 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Time Series Charts */}
          <div className="charts-section">
            <h2>Time Series Data</h2>
            
            {/* Workouts Generated Chart */}
            <div className="chart-container">
              <h3>Workouts Generated</h3>
              <div className="chart">
                {analytics.timeSeries?.map((point, index) => (
                  <div key={index} className="chart-bar-container">
                    <div 
                      className="chart-bar" 
                      style={{ 
                        height: `${(point.workoutsGenerated / maxWorkouts) * 100}%`,
                        backgroundColor: '#3b82f6'
                      }}
                      title={`${point.date}: ${point.workoutsGenerated} workouts`}
                    ></div>
                    <span className="chart-label">{point.date}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Token Purchases Chart */}
            <div className="chart-container">
              <h3>Token Purchases</h3>
              <div className="chart">
                {analytics.timeSeries?.map((point, index) => (
                  <div key={index} className="chart-bar-container">
                    <div 
                      className="chart-bar" 
                      style={{ 
                        height: `${(point.tokenPurchases / maxPurchases) * 100}%`,
                        backgroundColor: '#10b981'
                      }}
                      title={`${point.date}: ${point.tokenPurchases} purchases`}
                    ></div>
                    <span className="chart-label">{point.date}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Unique Users Chart */}
            <div className="chart-container">
              <h3>Unique Users</h3>
              <div className="chart">
                {analytics.timeSeries?.map((point, index) => (
                  <div key={index} className="chart-bar-container">
                    <div 
                      className="chart-bar" 
                      style={{ 
                        height: `${(point.uniqueUsers / maxUsers) * 100}%`,
                        backgroundColor: '#8b5cf6'
                      }}
                      title={`${point.date}: ${point.uniqueUsers} users`}
                    ></div>
                    <span className="chart-label">{point.date}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Revenue Chart */}
            <div className="chart-container">
              <h3>Revenue</h3>
              <div className="chart">
                {analytics.timeSeries?.map((point, index) => (
                  <div key={index} className="chart-bar-container">
                    <div 
                      className="chart-bar" 
                      style={{ 
                        height: `${(point.revenue / maxRevenue) * 100}%`,
                        backgroundColor: '#f59e0b'
                      }}
                      title={`${point.date}: ${formatCurrency(point.revenue)}`}
                    ></div>
                    <span className="chart-label">{point.date}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Revenue by Plan */}
          {analytics.revenue?.revenueByPlan && Object.keys(analytics.revenue.revenueByPlan).length > 0 && (
            <div className="revenue-by-plan">
              <h2>Revenue by Plan</h2>
              <div className="plan-revenue-list">
                {Object.entries(analytics.revenue.revenueByPlan).map(([planId, revenue]) => (
                  <div key={planId} className="plan-revenue-item">
                    <span className="plan-name">{planId}</span>
                    <span className="plan-revenue">{formatCurrency(revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default AdminAnalytics;

