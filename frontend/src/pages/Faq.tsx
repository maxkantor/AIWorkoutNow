import SEO from '../components/SEO';
import { useTranslation } from 'react-i18next';
import Breadcrumbs from '../components/Breadcrumbs';
import { buildBreadcrumbListSchema, buildFAQPageSchema } from '../seo/schema';
import FAQAccordion from '../components/FAQAccordion';
import { FAQ } from '../data/faq';
import './About.css';

const faqItems = FAQ.map(({ question, answer }) => ({ question, answer }));

function Faq() {
  const { t } = useTranslation();
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

