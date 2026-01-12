import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { getAllCustomers, deleteCustomer, AdminCustomerSummary } from '../services/api';
import './AdminCustomers.css';

function AdminCustomers() {
  const [customers, setCustomers] = useState<AdminCustomerSummary[]>([]);
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

    const handleRefresh = () => {
      const refreshedToken = localStorage.getItem('admin_token');
      if (refreshedToken) {
        loadCustomers(refreshedToken);
      } else {
        navigate('/admin');
      }
    };

    window.addEventListener('adminCustomersRefresh', handleRefresh);
    return () => {
      window.removeEventListener('adminCustomersRefresh', handleRefresh);
    };
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

  const handleDelete = async (deviceId: string) => {
    if (!window.confirm('Are you sure you want to deactivate this customer? They will be marked as inactive and hidden from the customer list, but their data will be preserved.')) {
      return;
    }

    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        navigate('/admin');
        return;
      }

      await deleteCustomer(token, deviceId);
      // Reload customers list
      await loadCustomers(token);
    } catch (err: any) {
      alert(err.message || 'Failed to delete customer');
    }
  };

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
                  <th>DEVICE</th>
                  <th>EMAIL</th>
                  <th>NAME</th>
                  <th>STATUS</th>
                  <th>TOKENS</th>
                  <th>GENERATED WORKOUTS</th>
                  <th>REMAINING WORKOUTS</th>
                  <th>PURCHASES</th>
                  <th>TOTAL SPENT</th>
                  <th>LAST ACTIVITY</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="no-data">No customers found</td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => {
                    const status = customer.statusLabel || 'Free';
                    return (
                      <tr key={customer.deviceId}>
                        <td className="device-id">{customer.deviceId.substring(0, 8)}...</td>
                        <td>{customer.email || '-'}</td>
                        <td>{customer.name || '-'}</td>
                        <td>
                          <span className={`badge ${status === 'Paid' ? 'badge-paid' : status === 'Deactivated' ? 'badge-inactive' : 'badge-free'}`}>
                            {status}
                          </span>
                        </td>
                        <td className="numeric">{customer.remainingTokens}</td>
                        <td className="numeric">{customer.generatedWorkouts}</td>
                        <td className="numeric">
                          {customer.remainingWorkouts}/{customer.totalWorkouts ?? customer.remainingWorkouts}
                        </td>
                        <td className="numeric">{customer.purchasesCount}</td>
                        <td className="numeric">{customer.totalSpentFormatted}</td>
                        <td>
                          {customer.lastActivityIso
                            ? new Date(customer.lastActivityIso).toLocaleDateString()
                            : '-'}
                        </td>
                        <td>
                          <div className="actions">
                            <Link
                              to={`/admin/customers/${customer.deviceId}`}
                              className="btn btn-sm btn-primary"
                            >
                              View
                            </Link>
                            <button
                              onClick={() => handleDelete(customer.deviceId)}
                              className="btn btn-sm btn-danger"
                            >
                              Deactivate
                            </button>
                          </div>
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

export default AdminCustomers;
