/**
 * JSON-LD SoftwareApplication schema (HealthApplication, Web)
 * Use on homepage and tool pages.
 */
export interface SoftwareApplicationSchema {
  '@context': 'https://schema.org';
  '@type': 'SoftwareApplication';
  name: string;
  applicationCategory: string;
  operatingSystem: string;
  url: string;
  description: string;
  offers?: { '@type': 'Offer'; price: string; priceCurrency: string };
}

const SITE_URL = 'https://aiworkoutnow.com';

export function buildSoftwareApplication(params: {
  name?: string;
  description: string;
  url?: string;
  price?: string;
  priceCurrency?: string;
}): SoftwareApplicationSchema {
  const schema: SoftwareApplicationSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: params.name ?? 'AIWorkoutNow',
    applicationCategory: 'HealthApplication',
    operatingSystem: 'Web',
    url: params.url ?? SITE_URL,
    description: params.description,
  };
  if (params.price != null) {
    schema.offers = {
      '@type': 'Offer',
      price: params.price,
      priceCurrency: params.priceCurrency ?? 'USD',
    };
  }
  return schema;
}
