import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { getAdminStats, getAllActivities, getAllContacts, CustomerActivity, ContactMessage } from '../services/api';
import './AdminDashboard.css';

function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [activities, setActivities] = useState<CustomerActivity[]>([]);
  const [contacts, setContacts] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin');
      return;
    }

    loadData(token);
  }, [navigate]);

  const loadData = async (token: string) => {
    try {
      const [statsData, activitiesData, contactsData] = await Promise.all([
        getAdminStats(token),
        getAllActivities(token, 10).catch(() => []),
        getAllContacts(token).catch(() => [])
      ]);
      setStats(statsData);
      setActivities(activitiesData);
      setContacts(contactsData.slice(0, 5)); // Show latest 5 contacts
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
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

          {/* Navigation Buttons */}
          <div className="dashboard-nav-grid">
            <Link to="/admin/customers" className="nav-card">
              <div className="nav-icon">👥</div>
              <h3>Customers</h3>
              <p>View all customers and their details</p>
            </Link>
            <Link to="/admin/purchases" className="nav-card">
              <div className="nav-icon">💰</div>
              <h3>Purchases</h3>
              <p>View token purchases and revenue</p>
            </Link>
            <Link to="/admin/activities" className="nav-card">
              <div className="nav-icon">📊</div>
              <h3>Activities</h3>
              <p>View all user activities</p>
            </Link>
            <Link to="/admin/contacts" className="nav-card">
              <div className="nav-icon">📧</div>
              <h3>Contacts</h3>
              <p>View contact form messages</p>
            </Link>
            <Link to="/admin/analytics" className="nav-card">
              <div className="nav-icon">📊</div>
              <h3>Analytics</h3>
              <p>GA4-like analytics dashboard</p>
            </Link>
          </div>

          {/* Recent Activity */}
          <div className="dashboard-section">
            <h2>Recent Activity</h2>
            {activities.length === 0 && contacts.length === 0 ? (
              <p>No recent activity</p>
            ) : (
              <div className="activity-list">
                {activities.slice(0, 5).map((activity) => (
                  <div key={activity.activityId} className="activity-item">
                    <div className="activity-icon">
                      {activity.activityType === 'workout_generated' && '💪'}
                      {activity.activityType === 'token_purchased' && '💰'}
                      {activity.activityType === 'contact_submitted' && '📧'}
                      {activity.activityType === 'tokens_reset' && '🔄'}
                      {!['workout_generated', 'token_purchased', 'contact_submitted', 'tokens_reset'].includes(activity.activityType) && '📝'}
                    </div>
                    <div className="activity-content">
                      <div className="activity-description">{activity.description}</div>
                      <div className="activity-meta">
                        <span className="activity-type">{activity.activityType.replace(/_/g, ' ')}</span>
                        <span className="activity-time">
                          {new Date(activity.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {contacts.slice(0, 3).map((contact) => (
                  <div key={contact.messageId} className="activity-item">
                    <div className="activity-icon">📧</div>
                    <div className="activity-content">
                      <div className="activity-description">
                        New contact message from {contact.email}
                      </div>
                      <div className="activity-meta">
                        <span className="activity-type">Contact</span>
                        <span className="activity-time">
                          {new Date(contact.createdAt).toLocaleString()}
                        </span>
                        <Link to={`/admin/contacts/${contact.messageId}`} className="activity-link">
                          View
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="view-all-links">
                  <Link to="/admin/activities">View All Activities →</Link>
                  <Link to="/admin/contacts">View All Contacts →</Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default AdminDashboard;


