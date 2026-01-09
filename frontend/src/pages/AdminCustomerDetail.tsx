import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  getCustomer,
  getCustomerActivities,
  resetUserTokens,
  getCustomersByEmail,
  resetTokensByEmail,
  CustomerSummary,
  CustomerActivity,
} from '../services/api';
import './AdminCustomerDetail.css';

function AdminCustomerDetail() {
  const { deviceId } = useParams<{ deviceId: string }>();
  const [customer, setCustomer] = useState<CustomerSummary | null>(null);
  const [activities, setActivities] = useState<CustomerActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showResetByEmailModal, setShowResetByEmailModal] = useState(false);
  const [newTokenCount, setNewTokenCount] = useState(0);
  const [resetReason, setResetReason] = useState('');
  const [resetting, setResetting] = useState(false);
  const [linkedDevices, setLinkedDevices] = useState<any[]>([]);
  const [loadingLinkedDevices, setLoadingLinkedDevices] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token || !deviceId) {
      navigate('/admin');
      return;
    }

    loadCustomerData(token, deviceId);
  }, [deviceId, navigate]);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token && customer?.email) {
      loadLinkedDevices(token, customer.email);
    }
  }, [customer?.email]);

  const loadCustomerData = async (token: string, id: string) => {
    try {
      const [customerData, activitiesData] = await Promise.all([
        getCustomer(token, id),
        getCustomerActivities(token, id, 50),
      ]);
      setCustomer(customerData);
      setActivities(activitiesData);
      setNewTokenCount(customerData.tokensRemaining);
    } catch (err: any) {
      setError(err.message || 'Failed to load customer data');
      if (err.message?.includes('401') || err.message?.includes('unauthorized')) {
        localStorage.removeItem('admin_token');
        navigate('/admin');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadLinkedDevices = async (token: string, email: string) => {
    try {
      setLoadingLinkedDevices(true);
      const data = await getCustomersByEmail(token, email);
      setLinkedDevices(data.customers || []);
    } catch (err: any) {
      // Silently fail - email might not have linked devices
      setLinkedDevices([]);
    } finally {
      setLoadingLinkedDevices(false);
    }
  };

  const handleResetTokens = async () => {
    if (!deviceId || !customer) return;

    const token = localStorage.getItem('admin_token');
    if (!token) return;

    setResetting(true);
    try {
      await resetUserTokens(
        token,
        deviceId,
        newTokenCount,
        customer.tokensRemaining,
        resetReason
      );
      
      // Reload customer data
      await loadCustomerData(token, deviceId);
      setShowResetModal(false);
      setResetReason('');
    } catch (err: any) {
      setError(err.message || 'Failed to reset workouts');
    } finally {
      setResetting(false);
    }
  };

  const handleResetByEmail = async () => {
    if (!customer?.email) return;

    const token = localStorage.getItem('admin_token');
    if (!token) return;

    setResetting(true);
    try {
      const result = await resetTokensByEmail(
        token,
        customer.email,
        newTokenCount,
        resetReason || `Reset all devices for ${customer.email}`
      );
      
      // Reload customer data and linked devices
      await loadCustomerData(token, deviceId!);
      await loadLinkedDevices(token, customer.email);
      setShowResetByEmailModal(false);
      setResetReason('');
      alert(result.message);
    } catch (err: any) {
      setError(err.message || 'Failed to reset workouts on all devices');
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-customer-detail">
        <div className="container">
          <div className="loading">Loading customer data...</div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="admin-customer-detail">
        <div className="container">
          <div className="error-message">Customer not found</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Customer Details - Admin Dashboard</title>
      </Helmet>
      
      <div className="admin-customer-detail">
        <div className="container">
          <div className="page-header">
            <div>
              <Link to="/admin/customers" className="back-link">← Back to Customers</Link>
              <h1>Customer Details</h1>
            </div>
            <button
              onClick={() => setShowResetModal(true)}
              className="btn btn-warning"
            >
              Reset Workouts
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="customer-info-grid">
            <div className="info-card">
              <h3>Basic Information</h3>
              <div className="info-row">
                <span className="label">Device ID:</span>
                <span className="value">{customer.deviceId}</span>
              </div>
              <div className="info-row">
                <span className="label">Email:</span>
                <span className="value">{customer.email || 'Not provided'}</span>
              </div>
              <div className="info-row">
                <span className="label">Name:</span>
                <span className="value">{customer.name || 'Not provided'}</span>
              </div>
              <div className="info-row">
                <span className="label">User Type:</span>
                <span className={`badge ${customer.isPaidUser ? 'badge-paid' : 'badge-free'}`}>
                  {customer.isPaidUser ? 'Paid User' : 'Free User'}
                </span>
              </div>
            </div>

            <div className="info-card">
              <h3>Account Stats</h3>
              <div className="info-row">
                <span className="label">💪Remaining Workouts:</span>
                <span className="value highlight">{customer.tokensRemaining}</span>
              </div>
              <div className="info-row">
                <span className="label">Total Workouts:</span>
                <span className="value">{customer.totalWorkouts}</span>
              </div>
              <div className="info-row">
                <span className="label">Total Purchases:</span>
                <span className="value">{customer.totalPurchases}</span>
              </div>
              <div className="info-row">
                <span className="label">Total Spent:</span>
                <span className="value highlight">${customer.totalSpent.toFixed(2)}</span>
              </div>
            </div>

            <div className="info-card">
              <h3>Activity Timeline</h3>
              <div className="info-row">
                <span className="label">First Seen:</span>
                <span className="value">
                  {customer.firstSeen
                    ? new Date(customer.firstSeen).toLocaleString()
                    : 'Unknown'}
                </span>
              </div>
              <div className="info-row">
                <span className="label">Last Activity:</span>
                <span className="value">
                  {customer.lastActivity
                    ? new Date(customer.lastActivity).toLocaleString()
                    : 'Unknown'}
                </span>
              </div>
            </div>
          </div>

          <div className="activities-section">
            <h2>Recent Activity</h2>
            {activities.length === 0 ? (
              <p className="no-data">No activity recorded</p>
            ) : (
              <div className="activities-list">
                {activities.map((activity) => (
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
                        <span className="activity-type">{activity.activityType}</span>
                        <span className="activity-time">
                          {new Date(activity.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showResetModal && (
        <div className="modal-overlay" onClick={() => setShowResetModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Reset User Workouts</h2>
            <div className="form-group">
              <label>Current 💪Remaining Workouts: {customer.tokensRemaining}</label>
            </div>
            <div className="form-group">
              <label>New Workout Count:</label>
              <input
                type="number"
                value={newTokenCount}
                onChange={(e) => setNewTokenCount(parseInt(e.target.value) || 0)}
                min="0"
                className="input"
              />
            </div>
            <div className="form-group">
              <label>Reason (optional):</label>
              <textarea
                value={resetReason}
                onChange={(e) => setResetReason(e.target.value)}
                placeholder="Reason for resetting workouts..."
                className="input"
                rows={3}
              />
            </div>
            <div className="modal-actions">
              <button
                onClick={() => setShowResetModal(false)}
                className="btn btn-secondary"
                disabled={resetting}
              >
                Cancel
              </button>
              <button
                onClick={handleResetTokens}
                className="btn btn-warning"
                disabled={resetting}
              >
                {resetting ? 'Resetting...' : 'Reset Tokens'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AdminCustomerDetail;
