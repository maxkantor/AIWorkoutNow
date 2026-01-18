import { useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import { useTranslation } from 'react-i18next';
import './Disclaimer.css';

function Disclaimer() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  return (
    <>
      <SEO
        title={t('pages.disclaimer.seo.title')}
        description={t('pages.disclaimer.seo.description')}
        canonicalUrl="https://aiworkoutnow.com/disclaimer"
      />
      
      <div className="disclaimer-page">
        <div className="container">
          <button onClick={() => navigate('/')} className="back-button">
            {t('pages.disclaimer.backToHome')}
          </button>
          <div className="content-card">
            <h1>{t('pages.disclaimer.title')}</h1>
            
            <section>
              <h2>{t('pages.disclaimer.sections.medicalTitle')}</h2>
              <p>{t('pages.disclaimer.sections.medicalBody')}</p>
            </section>

            <section>
              <h2>{t('pages.disclaimer.sections.fitnessTitle')}</h2>
              <p>{t('pages.disclaimer.sections.fitnessBody')}</p>
              <ul>
                {(t('pages.disclaimer.sections.fitnessBullets', { returnObjects: true }) as unknown as string[]).map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2>{t('pages.disclaimer.sections.warrantyTitle')}</h2>
              <p>{t('pages.disclaimer.sections.warrantyBody')}</p>
            </section>

            <section>
              <h2>{t('pages.disclaimer.sections.liabilityTitle')}</h2>
              <p>{t('pages.disclaimer.sections.liabilityBody')}</p>
            </section>

            <section>
              <h2>{t('pages.disclaimer.sections.adviceTitle')}</h2>
              <p>{t('pages.disclaimer.sections.adviceBody')}</p>
            </section>

            <section>
              <h2>{t('pages.disclaimer.sections.riskTitle')}</h2>
              <p>{t('pages.disclaimer.sections.riskBody')}</p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

export default Disclaimer;


