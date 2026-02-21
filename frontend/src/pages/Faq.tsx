import SEO from '../components/SEO';
import { useTranslation } from 'react-i18next';
import { getArray } from '../i18n/getArray';
import Breadcrumbs from '../components/Breadcrumbs';
import { buildBreadcrumbListSchema } from '../seo/schema';
import './About.css';

function Faq() {
  const { t } = useTranslation();
  const faq = getArray<{ q: string; a: string }>(t('pages.faq.items', { returnObjects: true }), []);
  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: t('pages.faq.title'), path: '/faq' },
  ];

  return (
    <>
      <SEO
        title={t('pages.faq.seo.title')}
        description={t('pages.faq.seo.description')}
        canonicalPath="/faq"
        jsonLd={[
          buildBreadcrumbListSchema(breadcrumbs),
          {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faq.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        },
        ]}
      />
      <div className="about-page">
        <div className="container">
          <Breadcrumbs items={breadcrumbs} className="mb-4" />
          <div className="content-card">
            <h1>{t('pages.faq.title')}</h1>

            {faq.map((item) => (
              <section key={item.q}>
                <h2>{item.q}</h2>
                <p>{item.a}</p>
              </section>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default Faq;

