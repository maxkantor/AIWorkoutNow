import { useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import { useTranslation } from 'react-i18next';
import { getArray } from '../i18n/getArray';
import './Privacy.css';

function Privacy() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  
  return (
    <>
      <SEO
        title={t('pages.privacy.seo.title')}
        description={t('pages.privacy.seo.description')}
        canonicalUrl="https://aiworkoutnow.com/privacy"
      />
      
      <div className="privacy-page">
        <div className="container">
          <button onClick={() => navigate('/')} className="back-button">
            {t('pages.privacy.backToHome')}
          </button>
          <div className="content-card">
            <h1>{t('pages.privacy.title')}</h1>
            <p className="last-updated">
              {t('pages.privacy.lastUpdated', {
                date: new Date().toLocaleDateString(i18n.resolvedLanguage || i18n.language),
              })}
            </p>
            
            <section>
              <h2>{t('pages.privacy.sections.introTitle')}</h2>
              <p>{t('pages.privacy.sections.introBody')}</p>
            </section>

            <section>
              <h2>{t('pages.privacy.sections.collectTitle')}</h2>
              <h3>{t('pages.privacy.sections.deviceTitle')}</h3>
              <p>{t('pages.privacy.sections.deviceBody')}</p>
              
              <h3>{t('pages.privacy.sections.prefsTitle')}</h3>
              <p>{t('pages.privacy.sections.prefsBody')}</p>
            </section>

            <section>
              <h2>{t('pages.privacy.sections.useTitle')}</h2>
              <ul>
                {getArray<string>(t('pages.privacy.sections.useBullets', { returnObjects: true }), []).map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2>{t('pages.privacy.sections.storageTitle')}</h2>
              <p>{t('pages.privacy.sections.storageBody')}</p>
            </section>

            <section>
              <h2>{t('pages.privacy.sections.thirdPartyTitle')}</h2>
              <p>{t('pages.privacy.sections.thirdPartyBody')}</p>
            </section>

            <section>
              <h2>{t('pages.privacy.sections.rightsTitle')}</h2>
              <p>{t('pages.privacy.sections.rightsBody')}</p>
            </section>

            <section>
              <h2>{t('pages.privacy.sections.contactTitle')}</h2>
              <p>
                {t('pages.privacy.sections.contactBody')}{' '}
                <a href="/contact">{t('footer.links.contact')}</a>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

export default Privacy;


