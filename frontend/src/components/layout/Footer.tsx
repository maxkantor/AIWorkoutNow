import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './Footer.css';

function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer" role="contentinfo">
      <div className="footer__container">
        <div className="footer__columns" role="navigation" aria-label="Footer navigation">
          <section className="footer__brand" aria-labelledby="footer-brand-heading">
            <h2 id="footer-brand-heading" className="footer__brand-name">
              AIWorkoutNow
            </h2>
            <p className="footer__brand-tagline">{t('footer.tagline')}</p>
            <p className="footer__trust">{t('footer.brandTagline')}</p>
          </section>

          <nav className="footer__nav" aria-labelledby="footer-legal-heading">
            <h3 id="footer-legal-heading" className="footer__nav-heading">
              {t('footer.legal')}
            </h3>
            <ul className="footer__list" role="list">
              <li><Link to="/privacy">{t('footer.links.privacy')}</Link></li>
              <li><Link to="/disclaimer">{t('footer.links.disclaimer')}</Link></li>
              <li><Link to="/about">{t('footer.links.about')}</Link></li>
            </ul>
          </nav>

          <nav className="footer__nav" aria-labelledby="footer-support-heading">
            <h3 id="footer-support-heading" className="footer__nav-heading">
              {t('footer.support')}
            </h3>
            <ul className="footer__list" role="list">
              <li><Link to="/contact">{t('footer.links.contact')}</Link></li>
              <li><Link to="/faq">{t('footer.links.faq')}</Link></li>
              <li><Link to="/platform">{t('footer.links.platform')}</Link></li>
            </ul>
          </nav>
        </div>

        <div className="footer__bottom">
          <div className="footer__bottom-row">
            <div className="footer__bottom-left">
              <p>{t('footer.copyright', { year: currentYear })}</p>
              <p className="footer__affiliate">{t('footer.amazonDisclosure')}</p>
            </div>
            <span className="footer__bottom-right">{t('footer.engineeredBy')}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
