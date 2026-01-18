import { trackAffiliateClick } from '../services/api';
import { getDeviceId } from '../utils/storage';
import { ProductRecommendation } from '../services/api';
import { useTranslation } from 'react-i18next';
import './ProductRecommendations.css';

interface ProductRecommendationsProps {
  products?: ProductRecommendation[];
  workoutId: string;
}

function ProductRecommendations({ products, workoutId }: ProductRecommendationsProps) {
  const { t } = useTranslation();
  if (!products || products.length === 0) {
    return null;
  }

  const handleProductClick = async (product: ProductRecommendation) => {
    const deviceId = getDeviceId();
    
    // Track the click
    await trackAffiliateClick(
      deviceId,
      product.asin,
      workoutId,
      product.category
    );
    
    // Open affiliate link in new tab
    window.open(product.affiliateLink, '_blank', 'noopener,noreferrer');
  };

  return (
    <section className="product-recommendations" aria-labelledby="products-heading">
      <h3 id="products-heading">{t('products.heading')}</h3>
      <p className="product-recommendations-subtitle">
        {t('products.subtitle')}
      </p>
      <div className="product-grid" role="list">
        {products.map((product, index) => (
          <article key={index} className="product-card" role="listitem">
            {product.imageUrl && (
              <div className="product-image">
                <img 
                  src={product.imageUrl} 
                  alt={product.title}
                  loading="lazy"
                  decoding="async"
                />
              </div>
            )}
            <div className="product-info">
              <h4 className="product-title">{product.title}</h4>
              {product.description && (
                <p className="product-description">{product.description}</p>
              )}
              {product.reason && (
                <p className="product-reason">
                  <strong>{t('products.why')}</strong> {product.reason}
                </p>
              )}
              {product.price && (
                <p className="product-price">{product.price}</p>
              )}
              <button
                className="product-button"
                onClick={() => handleProductClick(product)}
                aria-label={t('products.ariaViewOnAmazon', { title: product.title })}
              >
                {t('products.button')}
              </button>
              <p className="product-disclaimer">
                <small>{t('products.disclaimer')}</small>
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default ProductRecommendations;
