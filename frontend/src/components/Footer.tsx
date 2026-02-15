import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './Footer.css';

function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="footer" role="contentinfo">
      <div className="container">
        <div className="footer-content">
          <section className="footer-section">
            <h3>AIWorkoutNow</h3>
            <p>{t('footer.tagline')}</p>
          </section>
          <nav className="footer-section" aria-label="Legal links">
            <h4>{t('footer.legal')}</h4>
            <ul role="list">
              <li><Link to="/privacy">{t('footer.links.privacy')}</Link></li>
              <li><Link to="/disclaimer">{t('footer.links.disclaimer')}</Link></li>
              <li><Link to="/about">{t('footer.links.about')}</Link></li>
            </ul>
          </nav>
          <nav className="footer-section" aria-label="Support links">
            <h4>{t('footer.support')}</h4>
            <ul role="list">
              <li><Link to="/contact">{t('footer.links.contact')}</Link></li>
              <li><Link to="/faq">{t('footer.links.faq')}</Link></li>
              <li><Link to="/platform">{t('footer.links.platform')}</Link></li>
            </ul>
          </nav>
        </div>
        <div className="footer-bottom">
          <div className="footer-bottom-row">
            <div className="footer-bottom-meta">
              <p>{t('footer.copyright', { year: currentYear })}</p>
              <p className="affiliate-disclosure">
                {t('footer.amazonDisclosure')}
              </p>
            </div>
            <span className="footer-bottom-credit">
              Engineered by MK AI & Performance Systems
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;


