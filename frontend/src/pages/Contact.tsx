import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { submitContact } from '../services/api';
import './Contact.css';

function Contact() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await submitContact(email, message);
      setSuccess(true);
      setEmail('');
      setMessage('');
    } catch (err: any) {
      setError(err.message || 'Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Contact Us - AIWorkoutNow</title>
        <meta name="description" content="Get in touch with AIWorkoutNow. We'd love to hear your feedback, questions, or suggestions." />
      </Helmet>
      
      <div className="contact-page">
        <div className="container">
          <div className="content-card">
            <h1>Contact Us</h1>
            <p>
              Have a question, suggestion, or feedback? We'd love to hear from you! 
              Fill out the form below and we'll get back to you as soon as possible.
            </p>

            {success && (
              <div className="success-message">
                Thank you for your message! We'll get back to you soon.
              </div>
            )}

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="contact-form">
              <div className="form-group">
                <label htmlFor="email">Your Email</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  required
                  placeholder="your.email@example.com"
                />
              </div>

              <div className="form-group">
                <label htmlFor="message">Message</label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="input"
                  required
                  rows={6}
                  placeholder="Tell us what's on your mind..."
                />
              </div>

              <button type="submit" className="btn" disabled={loading}>
                {loading ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

export default Contact;

