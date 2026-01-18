import SEO from '../components/SEO';
import { useTranslation } from 'react-i18next';
import './About.css';

function Faq() {
  const { t } = useTranslation();
  const faq = t('pages.faq.items', { returnObjects: true }) as unknown as Array<{ q: string; a: string }>;

  return (
    <>
      <SEO
        title={t('pages.faq.seo.title')}
        description={t('pages.faq.seo.description')}
        canonicalUrl="https://aiworkoutnow.com/faq"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faq.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        }}
      />

      <div className="about-page">
        <div className="container">
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

