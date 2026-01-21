import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { useTranslation } from 'react-i18next';
import './Sitemap.css';

function Sitemap() {
  const { t } = useTranslation();
  
  const pages = [
    { path: '/', title: t('pages.sitemap.home'), description: t('pages.sitemap.homeDesc') },
    { path: '/ai-workout-generator', title: t('pages.sitemap.generator'), description: t('pages.sitemap.generatorDesc') },
    { path: '/workout-plans', title: t('pages.sitemap.plans'), description: t('pages.sitemap.plansDesc') },
    { path: '/about', title: t('pages.sitemap.about'), description: t('pages.sitemap.aboutDesc') },
    { path: '/faq', title: t('pages.sitemap.faq'), description: t('pages.sitemap.faqDesc') },
    { path: '/contact', title: t('pages.sitemap.contact'), description: t('pages.sitemap.contactDesc') },
    { path: '/privacy', title: t('pages.sitemap.privacy'), description: t('pages.sitemap.privacyDesc') },
    { path: '/disclaimer', title: t('pages.sitemap.disclaimer'), description: t('pages.sitemap.disclaimerDesc') },
  ];

  return (
    <>
      <SEO
        title={t('pages.sitemap.seo.title')}
        description={t('pages.sitemap.seo.description')}
        canonicalUrl="https://aiworkoutnow.com/sitemap"
      />
      
      <div className="sitemap-page">
        <div className="container">
          <div className="content-card">
            <h1>{t('pages.sitemap.title')}</h1>
            <p className="sitemap-intro">{t('pages.sitemap.intro')}</p>
            
            <nav className="sitemap-nav" aria-label="Site map">
              <ul className="sitemap-list">
                {pages.map((page) => (
                  <li key={page.path} className="sitemap-item">
                    <Link to={page.path} className="sitemap-link">
                      <span className="sitemap-link-title">{page.title}</span>
                      <span className="sitemap-link-path">{page.path}</span>
                    </Link>
                    <p className="sitemap-description">{page.description}</p>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="sitemap-footer">
              <p>
                <strong>{t('pages.sitemap.xmlTitle')}</strong>{' '}
                <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer">
                  /sitemap.xml
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Sitemap;
