import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import './PaymentCancel.css';

function PaymentCancel() {
  const navigate = useNavigate();

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
      <Helmet>
        <title>Payment Cancelled - AIWorkoutNow</title>
        <meta name="description" content="Your payment was cancelled. You can try again anytime." />
      </Helmet>

      <div className="payment-cancel-container">
        <div className="payment-cancel-card">
          <div className="cancel-icon">✕</div>
          <h1>Payment Cancelled</h1>
          <p className="cancel-message">
            Your payment was not completed. No charges were made.
          </p>
          <p className="cancel-submessage">
            You can try again anytime. Your 3 free workouts are still available!
          </p>

          <div className="button-group">
            <button onClick={handleTryAgain} className="cta-button primary">
              Try Again
            </button>
            <button onClick={handleGoHome} className="cta-button secondary">
              Go Home
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default PaymentCancel;
