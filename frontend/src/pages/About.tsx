import { useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import { useTranslation } from 'react-i18next';
import { getArray } from '../i18n/getArray';
import './About.css';

function About() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  return (
    <>
      <SEO
        title={t('pages.about.seo.title')}
        description={t('pages.about.seo.description')}
        canonicalUrl="https://aiworkoutnow.com/about"
      />
      
      <div className="about-page">
        <div className="container">
          <button onClick={() => navigate('/')} className="back-button">
            {t('pages.about.backToHome')}
          </button>
          <div className="content-card">
            <h1>{t('pages.about.title')}</h1>
            
            <section>
              <h2>{t('pages.about.missionTitle')}</h2>
              <p>{t('pages.about.missionBody')}</p>
            </section>

            <section>
              <h2>{t('pages.about.howTitle')}</h2>
              <p>{t('pages.about.howBody')}</p>
            </section>

            <section>
              <h2>{t('pages.about.whyTitle')}</h2>
              <ul>
                {getArray<{ strong: string; text: string }>(t('pages.about.whyBullets', { returnObjects: true }), []).map((b) => (
                  <li key={b.strong}>
                    <strong>{b.strong}</strong> {b.text}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2>{t('pages.about.contactTitle')}</h2>
              <p>
                {t('pages.about.contactBody')}{' '}
                <a href="/contact">{t('pages.about.contactLinkText')}</a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

export default About;


