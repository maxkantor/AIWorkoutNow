import './AffiliateProducts.css';

interface AffiliateProductsProps {
  workoutType: string;
}

function AffiliateProducts({ workoutType }: AffiliateProductsProps) {
  // Map workout types to relevant Amazon products
  const getProductsForWorkoutType = (type: string) => {
    const productMap: Record<string, any[]> = {
      'full-body': [
        { name: 'Adjustable Dumbbells', asin: 'B08XYZ1234', category: 'equipment' },
        { name: 'Yoga Mat', asin: 'B08ABC5678', category: 'equipment' },
        { name: 'Resistance Bands Set', asin: 'B08DEF9012', category: 'equipment' },
      ],
      'cardio': [
        { name: 'Jump Rope', asin: 'B08GHI3456', category: 'equipment' },
        { name: 'Foam Roller', asin: 'B08JKL7890', category: 'recovery' },
        { name: 'Heart Rate Monitor', asin: 'B08MNO1234', category: 'tracking' },
      ],
      'strength': [
        { name: 'Adjustable Dumbbells', asin: 'B08XYZ1234', category: 'equipment' },
        { name: 'Weight Bench', asin: 'B08PQR5678', category: 'equipment' },
        { name: 'Protein Powder', asin: 'B08STU9012', category: 'nutrition' },
      ],
      'yoga': [
        { name: 'Yoga Mat', asin: 'B08ABC5678', category: 'equipment' },
        { name: 'Yoga Blocks', asin: 'B08VWX3456', category: 'equipment' },
        { name: 'Yoga Strap', asin: 'B08YZA7890', category: 'equipment' },
      ],
    };

    return productMap[type] || productMap['full-body'];
  };

  const products = getProductsForWorkoutType(workoutType);

  // Replace with your actual Amazon Associate tag
  const associateTag = 'aiworkoutnow-20';

  const generateAffiliateLink = (asin: string) => {
    return `https://www.amazon.com/dp/${asin}?tag=${associateTag}&linkCode=ogi&th=1&psc=1`;
  };

  return (
    <div className="affiliate-products">
      <h3 className="affiliate-title">Recommended Equipment & Products</h3>
      <p className="affiliate-disclosure">
        As an Amazon Associate, we earn from qualifying purchases. These products may enhance your workout experience.
      </p>
      
      <div className="products-grid">
        {products.map((product, index) => (
          <div key={index} className="product-card">
            <div className="product-info">
              <h4>{product.name}</h4>
              <span className="product-category">{product.category}</span>
            </div>
            <a
              href={generateAffiliateLink(product.asin)}
              target="_blank"
              rel="noopener noreferrer"
              className="product-link"
            >
              View on Amazon →
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AffiliateProducts;


