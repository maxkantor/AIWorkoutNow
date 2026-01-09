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
    : purchases.filter(p => {
        const status = (p as any).status || p.status || p.paymentStatus || 'pending';
        return status.toLowerCase() === filter.toLowerCase();
      });

  // AGGRESSIVE FIX: Calculate revenue from ALL purchases (not filtered)
  const totalRevenue = purchases
    .filter(p => {
      const status = (p as any).status || p.status || p.paymentStatus || 'pending';
      return status === 'completed';
    })
    .reduce((sum, p) => sum + ((p as any).amount || p.amount || p.amountTotal || 0), 0);
  
  // Calculate completed count from ALL purchases
  const completedCount = purchases.filter(p => {
    const status = (p as any).status || p.status || p.paymentStatus || 'pending';
    return status === 'completed';
  }).length;

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
              <p className="stat-value">{purchases.length}</p>
            </div>
            <div className="stat-card">
              <h3>Completed</h3>
              <p className="stat-value">{completedCount}</p>
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
                  <th>💪Remaining Workouts</th>
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
                  filteredPurchases.map((purchase) => {
                    // Fix date parsing - handle both createdAt and PurchasedAt
                    const dateStr = (purchase as any).purchasedAt || purchase.createdAt;
                    let purchaseDate: Date;
                    try {
                      purchaseDate = dateStr ? new Date(dateStr) : new Date();
                      if (isNaN(purchaseDate.getTime())) {
                        purchaseDate = new Date();
                      }
                    } catch {
                      purchaseDate = new Date();
                    }
                    
                    // Fix status - use Status field from enriched response
                    const status = (purchase as any).status || purchase.status || purchase.paymentStatus || 'pending';
                    
                    return (
                      <tr key={purchase.purchaseId}>
                        <td>{purchaseDate.toLocaleString()}</td>
                        <td>{purchase.customerName || purchase.deviceId?.substring(0, 12) || 'Unknown'}</td>
                        <td>{purchase.customerEmail || '-'}</td>
                        <td>
                          <span className="pack-badge">{purchase.packType || purchase.planName || 'Unknown'}</span>
                        </td>
                        <td className="amount">${((purchase as any).amount || purchase.amount || purchase.amountTotal || 0).toFixed(2)}</td>
                        <td>{(purchase as any).tokensGranted || purchase.tokensPurchased || '-'}</td>
                        <td>
                          <span className={`status-badge status-${status.toLowerCase()}`}>
                            {status}
                          </span>
                        </td>
                        <td className="payment-id">
                          {(purchase as any).stripePaymentIntentId || purchase.stripePaymentIntentId 
                            ? ((purchase as any).stripePaymentIntentId || purchase.stripePaymentIntentId).substring(0, 20) + '...' 
                            : purchase.purchaseId.substring(0, 20) + '...'}
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
                    );
                  })
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
