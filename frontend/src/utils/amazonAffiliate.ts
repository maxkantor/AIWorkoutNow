/**
 * Centralized Amazon Associates affiliate link builder.
 * Use VITE_AMAZON_ASSOCIATE_TAG env var or fallback to default.
 */

const DEFAULT_AFFILIATE_TAG = 'aiworkoutnow-20';

export function getAffiliateTag(): string {
  const env = (import.meta as any).env;
  return (env?.VITE_AMAZON_ASSOCIATE_TAG as string)?.trim() || DEFAULT_AFFILIATE_TAG;
}

/**
 * Build an Amazon search URL with affiliate tag.
 * @param query - Search query (e.g., "Resistance Bands Set")
 * @param affiliateTag - Optional override; uses getAffiliateTag() if not provided
 */
export function buildAmazonSearchUrl(query: string, affiliateTag?: string): string {
  const tag = affiliateTag ?? getAffiliateTag();
  const encodedQuery = encodeURIComponent(query);
  return `https://www.amazon.com/s?k=${encodedQuery}&tag=${encodeURIComponent(tag)}`;
}
