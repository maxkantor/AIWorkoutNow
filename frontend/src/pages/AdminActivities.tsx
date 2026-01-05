import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { getAllActivities, CustomerActivity } from '../services/api';
import './AdminActivities.css';

function AdminActivities() {
  const [activities, setActivities] = useState<CustomerActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin');
      return;
    }

    loadActivities(token);
  }, [navigate]);

  const loadActivities = async (token: string) => {
    try {
      const data = await getAllActivities(token, 200);
      setActivities(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load activities');
      if (err.message?.includes('401') || err.message?.includes('unauthorized')) {
        localStorage.removeItem('admin_token');
        navigate('/admin');
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredActivities = filter === 'all'
    ? activities
    : activities.filter(a => a.activityType === filter);

  const activityTypes = Array.from(new Set(activities.map(a => a.activityType)));

  if (loading) {
    return (
      <div className="admin-activities">
        <div className="container">
          <div className="loading">Loading activities...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>All Activities - Admin Dashboard</title>
      </Helmet>
      
      <div className="admin-activities">
        <div className="container">
          <div className="page-header">
            <h1>All Activities</h1>
            <Link to="/admin/dashboard" className="btn btn-secondary">Back to Dashboard</Link>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="filter-bar">
            <button
              onClick={() => setFilter('all')}
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            >
              All ({activities.length})
            </button>
            {activityTypes.map(type => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`filter-btn ${filter === type ? 'active' : ''}`}
              >
                {type.replace(/_/g, ' ')} ({activities.filter(a => a.activityType === type).length})
              </button>
            ))}
          </div>

          <div className="activities-list">
            {filteredActivities.length === 0 ? (
              <div className="no-data">No activities found</div>
            ) : (
              filteredActivities.map((activity) => (
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
                      <span className="activity-device">Device: {activity.deviceId.substring(0, 8)}...</span>
                      <span className="activity-time">
                        {new Date(activity.timestamp).toLocaleString()}
                      </span>
                      {activity.workoutId && (
                        <Link to={`/admin/customers/${activity.deviceId}`} className="activity-link">
                          View Customer
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default AdminActivities;
