import { useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import { useTranslation } from 'react-i18next';
import './PaymentCancel.css';

function PaymentCancel() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleGoHome = () => {
    navigate('/');
  };

  const handleTryAgain = () => {
    navigate('/');
    // Scroll to pricing section after navigation
    setTimeout(() => {
      const pricingSection = document.querySelector('.pricing-plans-section');
      if (pricingSection) {
        pricingSection.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  return (
    <>
      <SEO
        title={t('pages.paymentCancel.seo.title')}
        description={t('pages.paymentCancel.seo.description')}
        canonicalUrl="https://aiworkoutnow.com/payment-cancel"
        robots="noindex, nofollow"
      />

      <div className="payment-cancel-container">
        <div className="payment-cancel-card">
          <div className="cancel-icon">✕</div>
          <h1>{t('pages.paymentCancel.title')}</h1>
          <p className="cancel-message">
            {t('pages.paymentCancel.message')}
          </p>
          <p className="cancel-submessage">
            {t('pages.paymentCancel.submessage')}
          </p>

          <div className="button-group">
            <button onClick={handleTryAgain} className="cta-button primary">
              {t('pages.paymentCancel.tryAgain')}
            </button>
            <button onClick={handleGoHome} className="cta-button secondary">
              {t('pages.paymentCancel.goHome')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default PaymentCancel;
