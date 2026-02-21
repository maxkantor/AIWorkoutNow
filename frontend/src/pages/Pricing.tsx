import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { useTranslation } from 'react-i18next';
import { buildProductOffer } from '../seo/schema';
import { buildBreadcrumbListSchema } from '../seo/schema';
import Breadcrumbs from '../components/Breadcrumbs';
import PricingPlans from '../components/PricingPlans';
import './About.css';

function Pricing() {
  const { t } = useTranslation();
  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: t('pages.pricing.title'), path: '/pricing' },
  ];

  return (
    <>
      <SEO
        title={t('pages.pricing.seo.title')}
        description={t('pages.pricing.seo.description')}
        canonicalPath="/pricing"
        jsonLd={[
          buildBreadcrumbListSchema(breadcrumbs),
          buildProductOffer({
            name: 'AIWorkoutNow Workout Credits',
            description: t('pages.pricing.seo.description'),
            url: 'https://aiworkoutnow.com/pricing',
            offers: [
              { price: '0', name: 'Free (3 workouts)' },
              { price: '9.99', name: '10 workouts' },
              { price: '19.99', name: '30 workouts' },
              { price: '49.99', name: '100 workouts' },
            ],
          }),
        ]}
      />
      <div className="about-page">
        <div className="container">
          <Breadcrumbs items={breadcrumbs} className="mb-4" />
          <div className="content-card">
            <h1>{t('pages.pricing.title')}</h1>
            <p className="lead mb-6">{t('pages.pricing.intro')}</p>
            <PricingPlans showHeader={false} vertical={true} />
            <p className="mt-6">
              <Link to="/" className="text-blue-600 hover:underline">
                ← Back to generator
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default Pricing;
