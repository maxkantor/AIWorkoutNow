import type { AffiliateProduct } from '../seo/workoutPlanLibrary';
import './EquipmentRecommendations.css';

interface EquipmentRecommendationsProps {
  products: AffiliateProduct[];
  title?: string;
}

const DISCLOSURE = 'As an Amazon Associate, we earn from qualifying purchases.';

const AMAZON_SEARCH_BASE = 'https://www.amazon.com/s?k=';

/** Always returns a valid external Amazon URL (search). Never returns "#" or empty. */
function getAmazonHref(product: AffiliateProduct): string {
  const placeholder = (product.amazonUrlPlaceholder || '').trim();
  if (placeholder.startsWith('https://') || placeholder.startsWith('http://')) {
    return placeholder;
  }
  const query = encodeURIComponent(product.name || 'fitness equipment');
  const url = `${AMAZON_SEARCH_BASE}${query}`;
  return url;
}

export default function EquipmentRecommendations({
  products,
  title = 'Equipment recommendations',
}: EquipmentRecommendationsProps) {
  if (!products || products.length === 0) return null;

  return (
    <section className="equipment-recommendations" aria-labelledby="equipment-recommendations-heading">
      <h2 id="equipment-recommendations-heading" className="equipment-recommendations__title">
        {title}
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
                title="Opens Amazon search in a new tab"
              >
                View on Amazon
              </a>
            </div>
          </li>
        ))}
      </ul>
      <p className="equipment-recommendations__disclosure">{DISCLOSURE}</p>
    </section>
  );
}
