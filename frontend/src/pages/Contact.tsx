import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { submitContact } from '../services/api';
import './Contact.css';

function Contact() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    name?: string;
    email?: string;
    subject?: string;
    message?: string;
  }>({});

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    const errors: { name?: string; email?: string; subject?: string; message?: string } = {};

    if (!name.trim()) {
      errors.name = 'Name is required';
    } else if (name.length > 100) {
      errors.name = 'Name must be 100 characters or less';
    }

    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!subject.trim()) {
      errors.subject = 'Subject is required';
    } else if (subject.length > 200) {
      errors.subject = 'Subject must be 200 characters or less';
    }

    if (!message.trim()) {
      errors.message = 'Message is required';
    } else if (message.length > 5000) {
      errors.message = 'Message must be 5000 characters or less';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationErrors({});

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await submitContact(name.trim(), email.trim(), subject.trim(), message.trim());
      setSuccess(true);
      setName('');
      setEmail('');
      setSubject('');
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
        <title>Contact Us - AIWorkoutNow | Get Support & Help</title>
        <meta name="description" content="Get in touch with AIWorkoutNow. We're here to help with your fitness journey. Contact our support team for questions, feedback, or assistance." />
        <meta name="keywords" content="contact AIWorkoutNow, fitness support, workout help, customer service, AI fitness support" />
        <meta property="og:title" content="Contact Us - AIWorkoutNow" />
        <meta property="og:description" content="Get in touch with AIWorkoutNow. We're here to help with your fitness journey." />
        <meta property="og:url" content="https://aiworkoutnow.com/contact" />
        <link rel="canonical" href="https://aiworkoutnow.com/contact" />
      </Helmet>
      
      <div className="contact-page">
        <div className="container">
          <button onClick={() => navigate('/')} className="back-button">
            ← Back to Home
          </button>
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
                <label htmlFor="name">Your Name</label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (validationErrors.name) {
                      setValidationErrors({ ...validationErrors, name: undefined });
                    }
                  }}
                  className={`input ${validationErrors.name ? 'error' : ''}`}
                  required
                  maxLength={100}
                  placeholder="John Doe"
                />
                {validationErrors.name && (
                  <span className="error-text">{validationErrors.name}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="email">Your Email</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (validationErrors.email) {
                      setValidationErrors({ ...validationErrors, email: undefined });
                    }
                  }}
                  className={`input ${validationErrors.email ? 'error' : ''}`}
                  required
                  placeholder="your.email@example.com"
                />
                {validationErrors.email && (
                  <span className="error-text">{validationErrors.email}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="subject">Subject</label>
                <input
                  type="text"
                  id="subject"
                  value={subject}
                  onChange={(e) => {
                    setSubject(e.target.value);
                    if (validationErrors.subject) {
                      setValidationErrors({ ...validationErrors, subject: undefined });
                    }
                  }}
                  className={`input ${validationErrors.subject ? 'error' : ''}`}
                  required
                  maxLength={200}
                  placeholder="What is this regarding?"
                />
                {validationErrors.subject && (
                  <span className="error-text">{validationErrors.subject}</span>
                )}
                <small className="char-count">{subject.length}/200</small>
              </div>

              <div className="form-group">
                <label htmlFor="message">Message</label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    if (validationErrors.message) {
                      setValidationErrors({ ...validationErrors, message: undefined });
                    }
                  }}
                  className={`input ${validationErrors.message ? 'error' : ''}`}
                  required
                  rows={6}
                  maxLength={5000}
                  placeholder="Tell us what's on your mind..."
                />
                {validationErrors.message && (
                  <span className="error-text">{validationErrors.message}</span>
                )}
                <small className="char-count">{message.length}/5000</small>
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

