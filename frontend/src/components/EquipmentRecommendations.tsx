import { useTranslation } from 'react-i18next';
import type { AffiliateProduct } from '../seo/workoutPlanLibrary';
import { buildAmazonSearchUrl } from '../utils/amazonAffiliate';
import './EquipmentRecommendations.css';

interface EquipmentRecommendationsProps {
  products: AffiliateProduct[];
  title?: string;
}

/** Always returns a valid external Amazon URL with affiliate tag. Never returns "#" or empty. */
function getAmazonHref(product: AffiliateProduct): string {
  const placeholder = (product.amazonUrlPlaceholder || '').trim();
  if (placeholder.startsWith('https://') || placeholder.startsWith('http://')) {
    return placeholder;
  }
  return buildAmazonSearchUrl(product.name || 'fitness equipment');
}

export default function EquipmentRecommendations({
  products,
  title,
}: EquipmentRecommendationsProps) {
  const { t } = useTranslation();
  if (!products || products.length === 0) return null;
  const sectionTitle = title ?? t('pages.workoutPlan.sectionEquipment', { defaultValue: 'Equipment recommendations' });
  const viewOnAmazon = t('products.button', { defaultValue: 'View on Amazon' });
  const disclosure = t('products.disclaimer', { defaultValue: 'As an Amazon Associate, we earn from qualifying purchases.' });

  return (
    <section className="equipment-recommendations" aria-labelledby="equipment-recommendations-heading">
      <h2 id="equipment-recommendations-heading" className="equipment-recommendations__title">
        {sectionTitle}
      </h2>
      <ul className="equipment-recommendations__list">
        {products.map((product, i) => (
          <li key={i} className="equipment-recommendations__card">
            <div className="equipment-recommendations__card-inner">
              {product.badge && (
                <span className="equipment-recommendations__badge" aria-hidden="true">
                  {product.badge}
                </span>
              )}
              <h3 className="equipment-recommendations__name">{product.name}</h3>
              <p className="equipment-recommendations__description">{product.description}</p>
              <a
                href={getAmazonHref(product)}
                target="_blank"
                rel="nofollow sponsored noopener noreferrer"
                className="equipment-recommendations__link"
                title={t('products.ariaViewOnAmazon', { title: product.name, defaultValue: 'Opens Amazon search in a new tab' })}
              >
                {viewOnAmazon}
              </a>
            </div>
          </li>
        ))}
      </ul>
      <p className="equipment-recommendations__disclosure">{disclosure}</p>
    </section>
  );
}
