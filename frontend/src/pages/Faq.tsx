import SEO from '../components/SEO';
import { useTranslation } from 'react-i18next';
import Breadcrumbs from '../components/Breadcrumbs';
import { buildBreadcrumbListSchema, buildFAQPageSchema } from '../seo/schema';
import FAQAccordion from '../components/FAQAccordion';
import { FAQ_IDS } from '../data/faq';
import { safeT } from '../i18n/safeT';
import './About.css';

function Faq() {
  const { t } = useTranslation();
  const faqItems = FAQ_IDS.map((id) => ({
    question: safeT(t, `pages.faq.items.${id}.q`),
    answer: safeT(t, `pages.faq.items.${id}.a`),
  }));
  const breadcrumbs = [
    { name: safeT(t, 'common.home'), path: '/' },
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
          buildFAQPageSchema(faqItems),
        ]}
      />
      <div className="about-page">
        <div className="container">
          <Breadcrumbs items={breadcrumbs} className="mb-4" />
          <div className="content-card">
            <h1>{t('pages.faq.title')}</h1>
            <FAQAccordion items={faqItems} id="faq-page-heading" />
          </div>
        </div>
      </div>
    </>
  );
}

export default Faq;

