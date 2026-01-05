import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { getAllCustomers, CustomerSummary } from '../services/api';
import './AdminCustomers.css';

function AdminCustomers() {
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin');
      return;
    }

    loadCustomers(token);
  }, [navigate]);

  const loadCustomers = async (token: string) => {
    try {
      const data = await getAllCustomers(token);
      setCustomers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load customers');
      if (err.message?.includes('401') || err.message?.includes('unauthorized')) {
        localStorage.removeItem('admin_token');
        navigate('/admin');
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.deviceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="admin-customers">
        <div className="container">
          <div className="loading">Loading customers...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Customers - Admin Dashboard</title>
      </Helmet>
      
      <div className="admin-customers">
        <div className="container">
          <div className="page-header">
            <h1>Customers</h1>
            <Link to="/admin/dashboard" className="btn btn-secondary">Back to Dashboard</Link>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="search-bar">
            <input
              type="text"
              placeholder="Search by device ID, email, or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="customers-table">
            <table>
              <thead>
                <tr>
                  <th>Device ID</th>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Tokens</th>
                  <th>Workouts</th>
                  <th>Purchases</th>
                  <th>Total Spent</th>
                  <th>Last Activity</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="no-data">No customers found</td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <tr key={customer.deviceId}>
                      <td className="device-id">{customer.deviceId.substring(0, 8)}...</td>
                      <td>{customer.email || '-'}</td>
                      <td>{customer.name || '-'}</td>
                      <td>
                        <span className={`badge ${customer.isPaidUser ? 'badge-paid' : 'badge-free'}`}>
                          {customer.isPaidUser ? 'Paid' : 'Free'}
                        </span>
                      </td>
                      <td>{customer.tokensRemaining}</td>
                      <td>{customer.totalWorkouts}</td>
                      <td>{customer.totalPurchases}</td>
                      <td>${customer.totalSpent.toFixed(2)}</td>
                      <td>
                        {customer.lastActivity
                          ? new Date(customer.lastActivity).toLocaleDateString()
                          : '-'}
                      </td>
                      <td>
                        <Link
                          to={`/admin/customers/${customer.deviceId}`}
                          className="btn btn-sm btn-primary"
                        >
                          View
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

export default AdminCustomers;
