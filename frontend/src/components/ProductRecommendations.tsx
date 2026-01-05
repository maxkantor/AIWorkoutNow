import { trackAffiliateClick } from '../services/api';
import { getDeviceId } from '../utils/storage';
import { ProductRecommendation } from '../services/api';
import './ProductRecommendations.css';

interface ProductRecommendationsProps {
  products?: ProductRecommendation[];
  workoutId: string;
}

function ProductRecommendations({ products, workoutId }: ProductRecommendationsProps) {
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
    <div className="product-recommendations">
      <h3>Recommended Equipment</h3>
      <p className="product-recommendations-subtitle">
        Enhance your workout with these recommended products
      </p>
      <div className="product-grid">
        {products.map((product, index) => (
          <div key={index} className="product-card">
            {product.imageUrl && (
              <div className="product-image">
                <img src={product.imageUrl} alt={product.title} />
              </div>
            )}
            <div className="product-info">
              <h4 className="product-title">{product.title}</h4>
              {product.description && (
                <p className="product-description">{product.description}</p>
              )}
              {product.reason && (
                <p className="product-reason">
                  <strong>Why:</strong> {product.reason}
                </p>
              )}
              {product.price && (
                <p className="product-price">{product.price}</p>
              )}
              <button
                className="product-button"
                onClick={() => handleProductClick(product)}
              >
                View on Amazon
              </button>
              <p className="product-disclaimer">
                <small>As an Amazon Associate, we earn from qualifying purchases.</small>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProductRecommendations;
