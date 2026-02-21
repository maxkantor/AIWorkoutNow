/**
 * JSON-LD Product + Offer schema for pricing pages
 */
export interface ProductOfferSchema {
  '@context': 'https://schema.org';
  '@type': 'Product';
  name: string;
  description: string;
  url: string;
  offers: {
    '@type': 'Offer';
    price: string;
    priceCurrency: string;
    availability?: string;
    url?: string;
  } | Array<{
    '@type': 'Offer';
    price: string;
    priceCurrency: string;
    availability?: string;
    name?: string;
  }>;
}

const SITE_URL = 'https://aiworkoutnow.com';

export function buildProductOffer(params: {
  name: string;
  description: string;
  url?: string;
  offers: Array<{ price: string; priceCurrency?: string; name?: string }>;
}): ProductOfferSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: params.name,
    description: params.description,
    url: params.url ?? `${SITE_URL}/pricing`,
    offers: params.offers.map((o) => ({
      '@type': 'Offer' as const,
      price: o.price,
      priceCurrency: o.priceCurrency ?? 'USD',
      availability: 'https://schema.org/InStock',
      ...(o.name && { name: o.name }),
    })),
  };
}
