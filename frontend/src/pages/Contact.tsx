import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import { useTranslation } from 'react-i18next';
import { submitContact } from '../services/api';
import './Contact.css';

function Contact() {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
      errors.name = t('pages.contact.validation.nameRequired');
    } else if (name.length > 100) {
      errors.name = t('pages.contact.validation.nameMax');
    }

    if (!email.trim()) {
      errors.email = t('pages.contact.validation.emailRequired');
    } else if (!validateEmail(email)) {
      errors.email = t('pages.contact.validation.emailInvalid');
    }

    if (!subject.trim()) {
      errors.subject = t('pages.contact.validation.subjectRequired');
    } else if (subject.length > 200) {
      errors.subject = t('pages.contact.validation.subjectMax');
    }

    if (!message.trim()) {
      errors.message = t('pages.contact.validation.messageRequired');
    } else if (message.length > 5000) {
      errors.message = t('pages.contact.validation.messageMax');
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
      <SEO
        title={t('pages.contact.seo.title')}
        description={t('pages.contact.seo.description')}
        canonicalUrl="https://aiworkoutnow.com/contact"
      />
      
      <div className="contact-page">
        <div className="container">
          <button onClick={() => navigate('/')} className="back-button">
            {t('pages.contact.backToHome')}
          </button>
          <div className="content-card">
            <h1>{t('pages.contact.title')}</h1>
            <p>{t('pages.contact.intro')}</p>

            {success && (
              <div className="success-message">
                {t('pages.contact.success')}
              </div>
            )}

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="contact-form">
              <div className="form-group">
                <label htmlFor="name">{t('pages.contact.form.name')}</label>
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
                  placeholder={t('pages.contact.form.placeholders.name')}
                />
                {validationErrors.name && (
                  <span className="error-text">{validationErrors.name}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="email">{t('pages.contact.form.email')}</label>
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
                  placeholder={t('pages.contact.form.placeholders.email')}
                />
                {validationErrors.email && (
                  <span className="error-text">{validationErrors.email}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="subject">{t('pages.contact.form.subject')}</label>
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
                  placeholder={t('pages.contact.form.placeholders.subject')}
                />
                {validationErrors.subject && (
                  <span className="error-text">{validationErrors.subject}</span>
                )}
                <small className="char-count">{subject.length}/200</small>
              </div>

              <div className="form-group">
                <label htmlFor="message">{t('pages.contact.form.message')}</label>
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
                  placeholder={t('pages.contact.form.placeholders.message')}
                />
                {validationErrors.message && (
                  <span className="error-text">{validationErrors.message}</span>
                )}
                <small className="char-count">{message.length}/5000</small>
              </div>

              <button type="submit" className="btn" disabled={loading}>
                {loading ? t('pages.contact.form.sending') : t('pages.contact.form.send')}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

export default Contact;


