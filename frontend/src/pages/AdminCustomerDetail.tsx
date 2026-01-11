import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  getCustomer,
  getCustomerActivities,
  resetUserTokens,
  getCustomersByEmail,
  resetTokensByEmail,
  deleteCustomer,
  AdminCustomerDetails,
  AdminCustomerSummary,
  CustomerActivity,
} from '../services/api';
import './AdminCustomerDetail.css';

function AdminCustomerDetail() {
  const { deviceId } = useParams<{ deviceId: string }>();
  const [customer, setCustomer] = useState<AdminCustomerDetails | null>(null);
  const [activities, setActivities] = useState<CustomerActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showResetByEmailModal, setShowResetByEmailModal] = useState(false);
  const [newTokenCount, setNewTokenCount] = useState(0);
  const [resetReason, setResetReason] = useState('');
  const [resetting, setResetting] = useState(false);
  const [linkedDevices, setLinkedDevices] = useState<AdminCustomerSummary[]>([]);
  const [loadingLinkedDevices, setLoadingLinkedDevices] = useState(false);
  const navigate = useNavigate();

  const normalizeDetail = (c: AdminCustomerDetails): AdminCustomerDetails => {
    const freeUsed = c.freeWorkoutsUsed ?? 0;
    const freeRemaining = c.freeWorkoutsRemaining ?? Math.max(0, 3 - freeUsed);
    const normalizedStatus = c.statusLabel || 'Free';
    const isDeactivated = normalizedStatus === 'Deactivated' || c.isDeactivated;
    const remainingTokens = isDeactivated ? 0 : (c.remainingTokens ?? 0);
    const remainingWorkouts = isDeactivated
      ? 0
      : (c.remainingWorkouts ?? remainingTokens + freeRemaining);
    return {
      ...c,
      statusLabel: normalizedStatus,
      remainingTokens,
      generatedWorkouts: c.generatedWorkouts ?? 0,
      purchasesCount: c.purchasesCount ?? 0,
      totalSpentCents: c.totalSpentCents ?? 0,
      totalSpentFormatted: c.totalSpentFormatted ?? '$0.00',
      freeWorkoutsUsed: freeUsed,
      freeWorkoutsRemaining: freeRemaining,
      remainingWorkouts,
    };
  };

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

  // Set default token count when modal opens
  useEffect(() => {
    if (showResetModal && customer) {
      console.log('[Reset] Modal opened, setting default token count to:', customer.remainingTokens);
      setNewTokenCount(customer.remainingTokens);
    }
  }, [showResetModal, customer]);

  const loadCustomerData = async (token: string, id: string) => {
    try {
      const [customerData, activitiesData] = await Promise.all([
        getCustomer(token, id),
        getCustomerActivities(token, id, 50),
      ]);
      const normalized = normalizeDetail(customerData);
      setCustomer(normalized);
      setActivities(activitiesData);
      setNewTokenCount(normalized.remainingTokens);
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
      const normalized = (data.customers || []).map((c) => ({
        ...c,
      }));
      setLinkedDevices(normalized);
    } catch (err: any) {
      // Silently fail - email might not have linked devices
      setLinkedDevices([]);
    } finally {
      setLoadingLinkedDevices(false);
    }
  };

  const handleResetTokens = async () => {
    console.log('[Reset] handleResetTokens called');
    console.log('[Reset] deviceId:', deviceId);
    console.log('[Reset] customer:', customer);
    console.log('[Reset] newTokenCount:', newTokenCount);
    console.log('[Reset] newTokenCount type:', typeof newTokenCount);
    console.log('[Reset] newTokenCount isNaN:', isNaN(newTokenCount));
    
    if (!deviceId || !customer) {
      console.error('[Reset] Missing deviceId or customer:', { deviceId, customer });
      setError('Missing device ID or customer data');
      return;
    }

    // Convert to number if it's a string
    const tokenCountNum = typeof newTokenCount === 'string' ? parseInt(newTokenCount, 10) : newTokenCount;
    console.log('[Reset] tokenCountNum:', tokenCountNum);
    
    if (tokenCountNum < 0 || isNaN(tokenCountNum)) {
      console.error('[Reset] Invalid token count:', tokenCountNum);
      setError('Please enter a valid workout count (0 or greater)');
      return;
    }

    const token = localStorage.getItem('admin_token');
    if (!token) {
      console.error('[Reset] No admin token found');
      setError('Not authenticated. Please log in again.');
      navigate('/admin');
      return;
    }

    console.log('[Reset] Starting reset for device:', deviceId);
    console.log('[Reset] New token count:', tokenCountNum);
    console.log('[Reset] Previous count:', customer.remainingTokens);
    
    setResetting(true);
    setError(null);
    
    try {
      console.log('[Reset] Calling resetUserTokens API...');
      await resetUserTokens(
        token,
        deviceId,
        tokenCountNum,
        customer.remainingTokens,
        resetReason
      );
      
      console.log('[Reset] Reset successful, reloading customer data...');
      
      // Reload customer data
      await loadCustomerData(token, deviceId);
      setShowResetModal(false);
      setResetReason('');
      setNewTokenCount(0);
      
      // Trigger refresh on home page if it's open
      window.dispatchEvent(new CustomEvent('refreshAccessStatus'));
      
      // Show success message
      alert(`Successfully reset workouts to ${tokenCountNum} for this device.`);
    } catch (err: any) {
      console.error('[Reset] Error:', err);
      console.error('[Reset] Error stack:', err.stack);
      const errorMessage = err.message || 'Failed to reset workouts';
      setError(errorMessage);
      alert(`Error: ${errorMessage}`);
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
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => {
                  console.log('[Reset] Button clicked, opening modal');
                  console.log('[Reset] DeviceId:', deviceId);
                  console.log('[Reset] Customer:', customer);
                  setError(null);
                  setShowResetModal(true);
                }}
                className="btn btn-warning"
              >
                Reset This Device
              </button>
              {customer.email && (
                <button
                  onClick={() => setShowResetByEmailModal(true)}
                  className="btn btn-warning"
                  style={{ backgroundColor: '#dc2626' }}
                >
                  Reset All Devices (by Email)
                </button>
              )}
              <button
                onClick={async () => {
                  if (!window.confirm('Are you sure you want to deactivate this customer? They will be marked as inactive and hidden from the customer list, but their data will be preserved.')) {
                    return;
                  }
                  try {
                    const token = localStorage.getItem('admin_token');
                    if (!token) {
                      navigate('/admin');
                      return;
                    }
                    await deleteCustomer(token, deviceId!);
                    navigate('/admin/customers');
                  } catch (err: any) {
                    setError(err.message || 'Failed to deactivate customer');
                  }
                }}
                className="btn"
                style={{ 
                  background: '#dc2626', 
                  color: 'white',
                  border: 'none'
                }}
              >
                Deactivate Customer
              </button>
            </div>
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
              {customer.email && linkedDevices.length > 1 && (
                <div className="info-row">
                  <span className="label">Linked Devices:</span>
                  <span className="value">{linkedDevices.length} device(s)</span>
                </div>
              )}
              <div className="info-row">
                <span className="label">Name:</span>
                <span className="value">{customer.name || 'Not provided'}</span>
              </div>
              <div className="info-row">
                <span className="label">Status:</span>
                <span className={`badge ${customer.statusLabel === 'Paid' ? 'badge-paid' : customer.statusLabel === 'Deactivated' ? 'badge-inactive' : 'badge-free'}`}>
                  {customer.statusLabel}
                </span>
              </div>
            </div>

            <div className="info-card">
              <h3>Account Stats</h3>
              <div className="info-row">
                <span className="label">💪Remaining Workouts:</span>
                <span className="value highlight">{customer.remainingWorkouts}</span>
              </div>
              <div className="info-row">
                <span className="label">Generated Workouts:</span>
                <span className="value">{customer.generatedWorkouts}</span>
              </div>
              <div className="info-row">
                <span className="label">Total Purchases:</span>
                <span className="value">{customer.purchasesCount}</span>
              </div>
              <div className="info-row">
                <span className="label">Total Spent:</span>
                <span className="value highlight">{customer.totalSpentFormatted}</span>
              </div>
            </div>

            <div className="info-card">
              <h3>Activity Timeline</h3>
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
        <div className="modal-overlay" onClick={() => {
          console.log('[Reset] Modal overlay clicked, closing modal');
          setShowResetModal(false);
          setError(null);
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Reset Workouts (This Device Only)</h2>
            {error && (
              <div className="error-message" style={{ color: '#dc2626', marginBottom: '1rem', padding: '0.5rem', backgroundColor: '#fee2e2', borderRadius: '4px' }}>
                {error}
              </div>
            )}
            <form onSubmit={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('[Reset] ===== FORM SUBMITTED =====');
              console.log('[Reset] newTokenCount:', newTokenCount);
              console.log('[Reset] deviceId:', deviceId);
              
              if (!resetting) {
                await handleResetTokens();
              }
            }}>
              <div className="form-group">
                <label>Current 💪Remaining Workouts: {customer.remainingWorkouts}</label>
              </div>
              <div className="form-group">
                <label>New Workout Count:</label>
                <input
                  type="number"
                  value={newTokenCount}
                  onChange={(e) => setNewTokenCount(parseInt(e.target.value) || 0)}
                  min="0"
                  className="input"
                  required
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
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('[Reset] Cancel button clicked');
                    setShowResetModal(false);
                    setError(null);
                  }}
                  className="btn btn-secondary"
                  disabled={resetting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onMouseDown={(e) => {
                    console.log('[Reset] Submit button mouse down!');
                    e.stopPropagation();
                  }}
                  onMouseUp={(e) => {
                    console.log('[Reset] Submit button mouse up!');
                    e.stopPropagation();
                  }}
                  onClick={() => {
                    console.log('[Reset] ===== SUBMIT BUTTON CLICKED =====');
                    // Don't preventDefault here - let form handle it
                  }}
                  className="btn btn-warning"
                  disabled={resetting}
                  style={{ cursor: resetting ? 'not-allowed' : 'pointer' }}
                >
                  {resetting ? 'Resetting...' : 'Reset This Device'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showResetByEmailModal && customer.email && (
        <div className="modal-overlay" onClick={() => setShowResetByEmailModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Reset Workouts on All Devices</h2>
            <p style={{ color: '#dc2626', fontWeight: 'bold', marginBottom: '1rem' }}>
              ⚠️ This will reset workouts on ALL devices linked to: {customer.email}
            </p>
            {loadingLinkedDevices ? (
              <div>Loading linked devices...</div>
            ) : linkedDevices.length > 0 ? (
              <div style={{ marginBottom: '1rem' }}>
                <strong>Linked Devices ({linkedDevices.length}):</strong>
                <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                  {linkedDevices.map((device: any) => (
                    <li key={device.deviceId}>
                      {device.deviceId.substring(0, 12)}... - {device.remainingWorkouts} workouts
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div style={{ marginBottom: '1rem', color: '#6b7280' }}>
                No other devices found for this email
              </div>
            )}
            <div className="form-group">
              <label>New Workout Count (for all devices):</label>
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
                placeholder="Reason for resetting workouts on all devices..."
                className="input"
                rows={3}
              />
            </div>
            <div className="modal-actions">
              <button
                onClick={() => setShowResetByEmailModal(false)}
                className="btn btn-secondary"
                disabled={resetting}
              >
                Cancel
              </button>
              <button
                onClick={handleResetByEmail}
                className="btn btn-warning"
                disabled={resetting}
                style={{ backgroundColor: '#dc2626' }}
              >
                {resetting ? 'Resetting...' : `Reset All ${linkedDevices.length} Device(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AdminCustomerDetail;
