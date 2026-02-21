import type { AffiliateProduct } from '../seo/workoutPlanLibrary';
import './EquipmentRecommendations.css';

interface EquipmentRecommendationsProps {
  products: AffiliateProduct[];
  title?: string;
}

const DISCLOSURE = 'As an Amazon Associate, we earn from qualifying purchases.';

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
                href={product.amazonUrlPlaceholder.startsWith('http') ? product.amazonUrlPlaceholder : '#'}
                target="_blank"
                rel="nofollow sponsored noopener noreferrer"
                className="equipment-recommendations__link"
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
