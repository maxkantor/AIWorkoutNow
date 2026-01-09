import { useState } from 'react';
import './TokenPacks.css';

function TokenPacks() {
  const [selectedPack, setSelectedPack] = useState<string | null>(null);

  const packs = [
    {
      id: 'weekly',
      name: 'Weekly Pack',
      price: 1.99,
      tokens: 7,
      description: 'Perfect for trying out unlimited workouts',
      popular: false,
    },
    {
      id: 'monthly',
      name: 'Monthly Pack',
      price: 3.99,
      tokens: 30,
      description: 'Best value for regular users',
      popular: true,
    },
    {
      id: 'challenge',
      name: 'Challenge Pack',
      price: 1.49,
      tokens: 7,
      description: '7-Day Fat Loss or Strength Challenge',
      popular: false,
    },
    {
      id: 'annual',
      name: 'Annual Pack',
      price: 19.99,
      tokens: 365,
      description: 'Unlimited workouts for a full year',
      popular: false,
    },
  ];

  const handlePurchase = async (packId: string) => {
    setSelectedPack(packId);
    // In production, this would integrate with Stripe
    // For now, we'll show a message
    alert(`Stripe integration needed for ${packId} pack. This will redirect to Stripe checkout.`);
  };

  return (
    <div className="token-packs">
      <h2 className="section-title">Unlock Unlimited Workouts</h2>
      <p className="section-subtitle">
        Purchase token packs to generate unlimited AI workouts, save your progress, and access premium features.
      </p>
      
      <div className="packs-grid">
        {packs.map((pack) => (
          <div
            key={pack.id}
            className={`pack-card ${pack.popular ? 'popular' : ''} ${selectedPack === pack.id ? 'selected' : ''}`}
          >
            {pack.popular && <div className="popular-badge">Most Popular</div>}
            <h3>{pack.name}</h3>
            <div className="pack-price">
              <span className="price-amount">${pack.price}</span>
            </div>
            <div className="pack-tokens">{pack.tokens} Workouts</div>
            <p className="pack-description">{pack.description}</p>
            <ul className="pack-features">
              <li>✓ Unlimited AI workouts</li>
              <li>✓ Save workouts</li>
              <li>✓ Progress tracking</li>
              <li>✓ Custom preferences</li>
              <li>✓ Offline access</li>
            </ul>
            <button
              className="btn pack-button"
              onClick={() => handlePurchase(pack.id)}
            >
              Purchase Now
            </button>
          </div>
        ))}
      </div>
      
      <p className="pack-note">
        * 1 workout = 1 remaining workout. Workouts never expire. No subscription required.
      </p>
    </div>
  );
}

export default TokenPacks;

