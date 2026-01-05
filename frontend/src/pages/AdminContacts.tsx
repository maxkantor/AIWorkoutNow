import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { getAllContacts, ContactMessage } from '../services/api';
import './AdminContacts.css';

function AdminContacts() {
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

    loadContacts(token);
  }, [navigate]);

  const loadContacts = async (token: string) => {
    try {
      const data = await getAllContacts(token);
      setContacts(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load contacts');
      if (err.message?.includes('401') || err.message?.includes('unauthorized')) {
        localStorage.removeItem('admin_token');
        navigate('/admin');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-contacts">
        <div className="container">
          <div className="loading">Loading contacts...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Contact Messages - Admin Dashboard</title>
      </Helmet>
      
      <div className="admin-contacts">
        <div className="container">
          <div className="page-header">
            <h1>Contact Messages</h1>
            <Link to="/admin/dashboard" className="btn btn-secondary">Back to Dashboard</Link>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="contacts-list">
            {contacts.length === 0 ? (
              <div className="no-data">No contact messages</div>
            ) : (
              contacts.map((contact) => (
                <Link
                  key={contact.messageId}
                  to={`/admin/contacts/${contact.messageId}`}
                  className="contact-card"
                >
                  <div className="contact-header">
                    <div className="contact-email">{contact.email}</div>
                    <div className="contact-date">
                      {new Date(contact.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="contact-message">
                    {contact.message.length > 150
                      ? `${contact.message.substring(0, 150)}...`
                      : contact.message}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default AdminContacts;
