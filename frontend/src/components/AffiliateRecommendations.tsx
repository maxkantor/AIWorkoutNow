import { useTranslation } from 'react-i18next';
import { getAffiliateRecommendations, AffiliateProduct } from '../services/recommendations/affiliateRecommendations';
import type { WorkoutInputs } from '../services/recommendations/affiliateRecommendations';
import { trackAffiliateClickGA4 } from '../utils/affiliateTracking';
import { trackAffiliateClick } from '../services/api';
import { getDeviceId } from '../utils/storage';
import './AffiliateRecommendations.css';

interface AffiliateRecommendationsProps {
  preferences: WorkoutInputs;
  workoutId: string;
}

function AffiliateRecommendations({ preferences, workoutId }: AffiliateRecommendationsProps) {
  const { t } = useTranslation();
  const products = getAffiliateRecommendations(preferences);

  if (products.length === 0) return null;

  const handleClick = (product: AffiliateProduct) => {
    // GA4 event before navigation
    trackAffiliateClickGA4({
      provider: 'amazon',
      itemTitle: product.title,
      category: product.category,
      placement: 'post_workout',
      workoutType: preferences.workoutType,
      equipmentAvailable: preferences.equipment,
    });

    // Backend tracking (uses searchQuery as identifier)
    const deviceId = getDeviceId();
    trackAffiliateClick(deviceId, product.searchQuery, workoutId, product.category);

    window.open(product.affiliateUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <section className="affiliate-recommendations" aria-labelledby="affiliate-recommendations-heading">
      <h3 id="affiliate-recommendations-heading" className="affiliate-recommendations-title">
        {t('products.subtitle')}
      </h3>
      <div className="affiliate-recommendations-list" role="list">
        {products.map((product, index) => (
          <article key={index} className="affiliate-recommendations-card" role="listitem">
            <h4 className="affiliate-recommendations-card-title">{product.title}</h4>
            <p className="affiliate-recommendations-card-desc">{product.description}</p>
            <p className="affiliate-recommendations-card-why">
              <em><strong>{t('products.why')}</strong> {product.why}</em>
            </p>
            <a
              href={product.affiliateUrl}
              target="_blank"
              rel="sponsored noopener noreferrer"
              className="affiliate-recommendations-button"
              onClick={(e) => {
                e.preventDefault();
                handleClick(product);
              }}
              aria-label={t('products.ariaViewOnAmazon', { title: product.title })}
            >
              {t('products.button')}
            </a>
          </article>
        ))}
      </div>
      <p className="affiliate-recommendations-disclosure">
        <small>{t('products.disclaimer')}</small>
      </p>
    </section>
  );
}

export default AffiliateRecommendations;
