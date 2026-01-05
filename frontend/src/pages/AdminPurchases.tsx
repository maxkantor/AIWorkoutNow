import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { getAllPurchases, StripePurchase } from '../services/api';
import './AdminPurchases.css';

function AdminPurchases() {
  const [purchases, setPurchases] = useState<StripePurchase[]>([]);
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

    loadPurchases(token);
  }, [navigate]);

  const loadPurchases = async (token: string) => {
    try {
      const data = await getAllPurchases(token);
      setPurchases(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load purchases');
      if (err.message?.includes('401') || err.message?.includes('unauthorized')) {
        localStorage.removeItem('admin_token');
        navigate('/admin');
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredPurchases = filter === 'all'
    ? purchases
    : purchases.filter(p => (p.status || p.paymentStatus).toLowerCase() === filter.toLowerCase());

  const totalRevenue = filteredPurchases
    .filter(p => (p.status || p.paymentStatus) === 'completed')
    .reduce((sum, p) => sum + (p.amount || p.amountTotal), 0);

  if (loading) {
    return (
      <div className="admin-purchases">
        <div className="container">
          <div className="loading">Loading purchases...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Stripe Purchases - Admin Dashboard</title>
      </Helmet>
      
      <div className="admin-purchases">
        <div className="container">
          <div className="page-header">
            <h1>Stripe Purchases</h1>
            <Link to="/admin/dashboard" className="btn btn-secondary">Back to Dashboard</Link>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="purchases-stats">
            <div className="stat-card">
              <h3>Total Revenue</h3>
              <p className="stat-value">${totalRevenue.toFixed(2)}</p>
            </div>
            <div className="stat-card">
              <h3>Total Purchases</h3>
              <p className="stat-value">{filteredPurchases.length}</p>
            </div>
            <div className="stat-card">
              <h3>Completed</h3>
              <p className="stat-value">
                {filteredPurchases.filter(p => (p.status || p.paymentStatus) === 'completed').length}
              </p>
            </div>
          </div>

          <div className="filter-bar">
            <button
              onClick={() => setFilter('all')}
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
            >
              Completed
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilter('failed')}
              className={`filter-btn ${filter === 'failed' ? 'active' : ''}`}
            >
              Failed
            </button>
          </div>

          <div className="purchases-table">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Email</th>
                  <th>Pack Type</th>
                  <th>Amount</th>
                  <th>Tokens</th>
                  <th>Status</th>
                  <th>Payment Intent</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="no-data">No purchases found</td>
                  </tr>
                ) : (
                  filteredPurchases.map((purchase) => (
                    <tr key={purchase.purchaseId}>
                      <td>{new Date(purchase.createdAt).toLocaleString()}</td>
                      <td>{purchase.customerName || purchase.deviceId.substring(0, 8)}</td>
                      <td>{purchase.customerEmail || '-'}</td>
                      <td>
                        <span className="pack-badge">{purchase.packType || purchase.planName}</span>
                      </td>
                      <td className="amount">${(purchase.amount || purchase.amountTotal).toFixed(2)}</td>
                      <td>{purchase.tokensPurchased || '-'}</td>
                      <td>
                        <span className={`status-badge status-${(purchase.status || purchase.paymentStatus).toLowerCase()}`}>
                          {purchase.status || purchase.paymentStatus}
                        </span>
                      </td>
                      <td className="payment-id">
                        {purchase.stripePaymentIntentId ? purchase.stripePaymentIntentId.substring(0, 20) + '...' : purchase.purchaseId.substring(0, 20) + '...'}
                      </td>
                      <td>
                        <Link
                          to={`/admin/customers/${purchase.deviceId}`}
                          className="btn btn-sm btn-primary"
                        >
                          View Customer
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

export default AdminPurchases;
