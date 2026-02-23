/**
 * Centralized Amazon Associates affiliate link builder.
 * Fetches tag from backend API (SSM /aiworkoutnow/amazon-associate-id).
 */

import { getAmazonAssociateTag } from '../services/api';

const FALLBACK_TAG = 'aiworkoutnow-20';
let cachedTag: string | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Fetch affiliate tag from API and cache it. Call early (e.g. App mount).
 */
export async function initAffiliateTag(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      const tag = await getAmazonAssociateTag();
      if (tag) cachedTag = tag;
    } catch {
      // Keep fallback on error
    }
  })();
  return initPromise;
}

/**
 * Get the cached affiliate tag. Returns fallback until initAffiliateTag() completes.
 */
export function getAffiliateTag(): string {
  return cachedTag || FALLBACK_TAG;
}

/**
 * Build an Amazon search URL with affiliate tag.
 * @param query - Search query (e.g., "Resistance Bands Set")
 * @param affiliateTag - Optional override; uses cached tag if not provided
 */
export function buildAmazonSearchUrl(query: string, affiliateTag?: string): string {
  const tag = affiliateTag ?? getAffiliateTag();
  const encodedQuery = encodeURIComponent(query);
  return `https://www.amazon.com/s?k=${encodedQuery}&tag=${encodeURIComponent(tag)}`;
}
