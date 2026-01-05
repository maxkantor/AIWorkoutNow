import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { getContact, replyToContact, ContactMessage, ContactReply } from '../services/api';
import './AdminContactDetail.css';

function AdminContactDetail() {
  const { messageId } = useParams<{ messageId: string }>();
  const [contact, setContact] = useState<ContactMessage | null>(null);
  const [replies, setReplies] = useState<ContactReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token || !messageId) {
      navigate('/admin');
      return;
    }

    loadContact(token, messageId);
  }, [messageId, navigate]);

  const loadContact = async (token: string, id: string) => {
    try {
      const data = await getContact(token, id);
      setContact(data.message);
      setReplies(data.replies);
    } catch (err: any) {
      setError(err.message || 'Failed to load contact');
      if (err.message?.includes('401') || err.message?.includes('unauthorized')) {
        localStorage.removeItem('admin_token');
        navigate('/admin');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async () => {
    if (!messageId || !replyText.trim()) return;

    const token = localStorage.getItem('admin_token');
    if (!token) return;

    setSending(true);
    try {
      await replyToContact(token, messageId, replyText);
      setReplyText('');
      // Reload to get the new reply
      await loadContact(token, messageId);
    } catch (err: any) {
      setError(err.message || 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-contact-detail">
        <div className="container">
          <div className="loading">Loading contact...</div>
        </div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="admin-contact-detail">
        <div className="container">
          <div className="error-message">Contact not found</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Contact Details - Admin Dashboard</title>
      </Helmet>
      
      <div className="admin-contact-detail">
        <div className="container">
          <div className="page-header">
            <div>
              <Link to="/admin/contacts" className="back-link">← Back to Contacts</Link>
              <h1>Contact Message</h1>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="contact-detail-card">
            <div className="contact-meta">
              <div className="meta-item">
                <span className="label">From:</span>
                <span className="value">{contact.email}</span>
              </div>
              <div className="meta-item">
                <span className="label">Date:</span>
                <span className="value">{new Date(contact.createdAt).toLocaleString()}</span>
              </div>
            </div>
            <div className="contact-message-content">
              <h3>Message</h3>
              <p>{contact.message}</p>
            </div>
          </div>

          {replies.length > 0 && (
            <div className="replies-section">
              <h2>Replies ({replies.length})</h2>
              <div className="replies-list">
                {replies.map((reply) => (
                  <div key={reply.replyId} className="reply-item">
                    <div className="reply-header">
                      <span className="reply-admin">Admin</span>
                      <span className="reply-date">
                        {new Date(reply.createdAt || reply.repliedAt).toLocaleString()}
                      </span>
                      {reply.sent && <span className="reply-sent">✓ Sent</span>}
                    </div>
                    <div className="reply-text">{reply.replyText || reply.replyMessage}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="reply-section">
            <h2>Send Reply</h2>
            <div className="reply-form">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your reply here..."
                className="reply-textarea"
                rows={6}
              />
              <button
                onClick={handleSendReply}
                disabled={!replyText.trim() || sending}
                className="btn btn-primary"
              >
                {sending ? 'Sending...' : 'Send Reply'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default AdminContactDetail;
